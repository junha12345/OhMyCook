
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { UserSettings, Recipe, RecipeFilters, ChatMessage } from '../types';

// This tells Vercel to run this as an edge function, which is fast and efficient.
export const config = {
  runtime: 'edge',
};

// Stage 1: Fast Overview Schema
const recipeOverviewSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      recipeName: { type: Type.STRING, description: 'Creative name of the recipe, in the target language.' },
      englishRecipeName: { type: Type.STRING, description: 'The English name of the recipe. Mandatory.' },
      description: { type: Type.STRING, description: 'A short, enticing description in the target language.' },
      cuisine: { type: Type.STRING, description: 'The type of cuisine.' },
      cookTime: { type: Type.INTEGER, description: 'Estimated cooking time in minutes.' },
      difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
      spiciness: { type: Type.INTEGER, description: 'Spiciness level from 1 to 5.' },
      calories: { type: Type.INTEGER, description: 'Estimated calories per serving.' },
      servings: { type: Type.INTEGER, description: 'Number of servings.' },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of main ingredient NAMES only (e.g. "Onion"). Do not include quantities yet. In the target language.' },
      missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Names of ingredients the user is missing. In the target language.' },
    },
    required: ['recipeName', 'englishRecipeName', 'description', 'cuisine', 'cookTime', 'difficulty', 'spiciness', 'calories', 'servings', 'ingredients']
  }
};

// Stage 2: Detailed Instructions Schema
const recipeDetailSchema = {
  type: Type.OBJECT,
  properties: {
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Detailed list of ingredients with specific QUANTITIES (e.g., "200g Pork Belly", "1/2 Onion"). In the target language.' },
    substitutions: {
      type: Type.ARRAY,
      description: 'List of substitutions for missing ingredients.',
      items: {
        type: Type.OBJECT,
        properties: {
          missing: { type: Type.STRING, description: 'The ingredient the user is missing.' },
          substitute: { type: Type.STRING, description: 'A suggested substitute.' }
        },
        required: ['missing', 'substitute']
      }
    },
    instructions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Detailed step-by-step cooking instructions in the target language.' },
  },
  required: ['ingredients', 'instructions']
};


async function handleGetRecipeRecommendations(ai: GoogleGenAI, payload: { ingredients: string[], priorityIngredients: string[], filters: RecipeFilters, language: 'en' | 'ko' }): Promise<Recipe[]> {
    const { ingredients, priorityIngredients, filters, language } = payload;
    const model = 'gemini-2.5-flash';
    
    // Construct the prompt in English for better model performance
    const targetLanguage = language === 'ko' ? 'Korean' : 'English';
    const cuisineFilter = filters.cuisine === 'any' ? 'Any' : filters.cuisine;
    
    const prompt = `
      You are an expert chef creating recipes for the "OhMyCook" app.
      
      CONTEXT:
      - User Ingredients: ${ingredients.join(', ')}.
      - Priority Ingredients (Must use if possible): ${priorityIngredients.join(', ')}.
      
      FILTERS:
      - Cuisine: ${cuisineFilter}
      - Servings: ${filters.servings}
      - Spiciness: ${filters.spiciness}
      - Difficulty: ${filters.difficulty}
      - Max Cook Time: ${filters.maxCookTime} minutes
      
      TASK:
      Recommend 3 diverse and delicious recipes matching these conditions.
      
      IMPORTANT OUTPUT INSTRUCTIONS:
      1. **Language**: Return all user-facing text (name, description, ingredients list) in **${targetLanguage}**.
      2. **Overview Only**: This is the first stage. 
         - For 'ingredients', list ONLY the names (e.g., "Onion", "Pork"). DO NOT include quantities.
         - Do NOT include 'instructions' or 'substitutions' yet.
         - If main ingredients are missing from the user's list, add them to 'missingIngredients'.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: recipeOverviewSchema,
          temperature: 0.7,
        }
    });
      
    const jsonText = response.text.trim();
    const recipes = JSON.parse(jsonText);
    
    // Mark as details NOT loaded
    return recipes.map((r: any) => ({
      ...r,
      instructions: [],
      substitutions: [],
      isDetailsLoaded: false
    }));
}

async function handleGetRecipeDetails(ai: GoogleGenAI, payload: { recipeName: string, ingredients: string[], language: 'en' | 'ko' }): Promise<Partial<Recipe>> {
    const { recipeName, ingredients, language } = payload;
    const model = 'gemini-2.5-flash';
    const targetLanguage = language === 'ko' ? 'Korean' : 'English';

    const prompt = `
      You are an expert chef.
      
      CONTEXT:
      - Selected Recipe: "${recipeName}"
      - User Ingredients: ${ingredients.join(', ')}
      
      TASK:
      Provide the **detailed** cooking information for this recipe.
      
      IMPORTANT OUTPUT INSTRUCTIONS:
      1. **Language**: Return all text in **${targetLanguage}**.
      2. **Ingredients**: Provide the full list of ingredients with **specific quantities** (e.g., "200g Pork", "1/2 Onion", "1 tsp Salt").
      3. **Instructions**: Provide detailed, step-by-step cooking instructions.
      4. **Substitutions**: If the user is missing any required ingredients based on their list, suggest specific substitutions.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: recipeDetailSchema,
          temperature: 0.5,
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
}

async function handleAnalyzeReceipt(ai: GoogleGenAI, payload: { base64Image: string }): Promise<string[]> {
    const { base64Image } = payload;
    const model = 'gemini-2.5-flash';
    const prompt = "Analyze this receipt image. Extract only the names of the food ingredients purchased. Return the result as a JSON array of strings in English. For example: [\"Egg\", \"Green Onion\", \"Tofu\"]. Do not include quantities, prices, or any other text.";

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
}

async function handleChatWithAIChef(ai: GoogleGenAI, payload: { history: ChatMessage[], message: string, settings: UserSettings, language: 'en' | 'ko', recipeContext?: Recipe | null }): Promise<string> {
    const { history, message, settings, language, recipeContext } = payload;
    const model = 'gemini-2.5-flash';
    const targetLanguage = language === 'ko' ? 'Korean' : 'English';
    
    let systemInstruction = `
      You are 'AI Chef', a helpful and friendly cooking assistant for the OhMyCook app.
      
      USER PROFILE:
      - Cooking Level: ${settings.cookingLevel}
      - Allergies: ${settings.allergies.join(', ') || 'None'}
      - Tools: ${settings.availableTools.join(', ') || 'Basic'}
      
      INSTRUCTIONS:
      - Answer in **${targetLanguage}**.
      - Keep answers concise, friendly, and easy to understand.
    `;
    
    if (recipeContext) {
        systemInstruction += `
        
        CURRENT RECIPE CONTEXT:
        - Recipe Name: "${recipeContext.recipeName}"
        - Description: ${recipeContext.description}
        - Ingredients: ${recipeContext.ingredients.join(', ')}
        
        Answer questions specifically related to this recipe if asked.
        `;
    }

    const chatHistory = history.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => ({text: p.text}))
    }));

    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: systemInstruction,
        },
        history: chatHistory,
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message: message });
    return response.text;
}


export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    console.error("API_KEY environment variable not set on the server.");
    return new Response(JSON.stringify({ error: 'Server configuration error: API_KEY is missing.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const { action, payload } = await req.json();
    let result;

    switch (action) {
      case 'getRecipeRecommendations':
        result = await handleGetRecipeRecommendations(ai, payload);
        break;
      case 'getRecipeDetails':
        result = await handleGetRecipeDetails(ai, payload);
        break;
      case 'analyzeReceipt':
        result = await handleAnalyzeReceipt(ai, payload);
        break;
      case 'chatWithAIChef':
        result = await handleChatWithAIChef(ai, payload);
        break;
      default:
        return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error handling API request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown internal server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}