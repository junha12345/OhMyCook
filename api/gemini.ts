
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { UserSettings, Recipe, RecipeFilters, ChatMessage } from '../types';
import { translations } from '../i18n';
import { getIngredientTranslation } from "../data/ingredients";

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
      recipeName: { type: Type.STRING, description: 'Creative name of the recipe, in the requested language.' },
      englishRecipeName: { type: Type.STRING, description: 'The English name of the recipe. Mandatory.' },
      description: { type: Type.STRING, description: 'A short, enticing description.' },
      cuisine: { type: Type.STRING, description: 'The type of cuisine.' },
      cookTime: { type: Type.INTEGER, description: 'Estimated cooking time in minutes.' },
      difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
      spiciness: { type: Type.INTEGER, description: 'Spiciness level from 1 to 5.' },
      calories: { type: Type.INTEGER, description: 'Estimated calories per serving.' },
      servings: { type: Type.INTEGER, description: 'Number of servings.' },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of main ingredient NAMES only (no quantities yet).' },
      missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Names of ingredients the user is missing.' },
    },
    required: ['recipeName', 'englishRecipeName', 'description', 'cuisine', 'cookTime', 'difficulty', 'spiciness', 'calories', 'servings', 'ingredients']
  }
};

// Stage 2: Detailed Instructions Schema
const recipeDetailSchema = {
  type: Type.OBJECT,
  properties: {
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Detailed list of ingredients with specific QUANTITIES (e.g., "200g Pork Belly").' },
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
    instructions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Detailed step-by-step cooking instructions.' },
  },
  required: ['ingredients', 'instructions']
};


async function handleGetRecipeRecommendations(ai: GoogleGenAI, payload: { ingredients: string[], priorityIngredients: string[], filters: RecipeFilters, language: 'en' | 'ko' }): Promise<Recipe[]> {
    const { ingredients, priorityIngredients, filters, language } = payload;
    const model = 'gemini-2.5-flash';
    const t = (key: keyof typeof translations.en) => translations[language][key];

    const recipeConditions = `
      - ${t('cuisine')}: ${filters.cuisine === 'any' ? t('any') : t(filters.cuisine as keyof typeof translations.en)}
      - ${t('servings')}: ${filters.servings}
      - ${t('spiciness')}: ${t(filters.spiciness as keyof typeof translations.en)}
      - ${t('difficulty')}: ${t(filters.difficulty as keyof typeof translations.en)}
      - ${t('maxCookTime')}: ${filters.maxCookTime} ${t('minutes')}
    `;
    
    const translatedIngredients = language === 'ko'
      ? ingredients.map(name => getIngredientTranslation(name, 'ko'))
      : ingredients;
      
    const translatedPriorityIngredients = language === 'ko'
      ? priorityIngredients.map(name => getIngredientTranslation(name, 'ko'))
      : priorityIngredients;

    const priorityPromptPart = {
      en: priorityIngredients.length > 0 ? `\nPRIORITY: You MUST create recipes that prominently feature as many of the following priority ingredients as possible: ${priorityIngredients.join(', ')}.` : '',
      ko: priorityIngredients.length > 0 ? `\n우선순위: 다음 우선 재료들을 최대한 많이 사용하는 레시피를 만들어야 합니다: ${translatedPriorityIngredients.join(', ')}.` : ''
    };

    const prompts = {
      en: `
        You are an expert chef creating recipes for the "OhMyCook" app.
        I have the following ingredients: ${ingredients.join(', ')}.
        Please recommend 3 diverse and delicious recipes matching these conditions:
        ${recipeConditions}
        ${priorityPromptPart.en}
        
        **IMPORTANT: This is the OVERVIEW stage.**
        - Provide the recipe name, description, and metadata.
        - For 'ingredients', just list the NAMES of the ingredients used (e.g. "Onion", "Pork"). Do not include quantities yet.
        - Do not include 'instructions' or 'substitutions' yet.
        - If I am missing main ingredients, list their names in 'missingIngredients'.
      `,
      ko: `
        당신은 "OhMyCook" 앱을 위한 전문 셰프입니다.
        제가 가진 재료는 다음과 같습니다: ${translatedIngredients.join(', ')}.
        다음 조건에 맞는 3가지 레시피를 추천해주세요:
        ${recipeConditions}
        ${priorityPromptPart.ko}
        
        **중요: 이것은 '개요' 단계입니다.**
        - 레시피 이름, 설명, 기본 정보만 제공하세요.
        - 'ingredients'에는 수량 없이 사용되는 재료의 '이름'만 나열하세요 (예: "양파", "돼지고기").
        - 'instructions'(조리법)이나 'substitutions'(대체재)는 아직 포함하지 마세요.
        - 없는 재료는 'missingIngredients'에 이름만 적어주세요.
      `,
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompts[language],
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
    
    const translatedIngredients = language === 'ko'
      ? ingredients.map(name => getIngredientTranslation(name, 'ko'))
      : ingredients;

    const prompts = {
        en: `
          I have selected the recipe: "${recipeName}".
          My available ingredients are: ${ingredients.join(', ')}.
          
          Please provide the DETAILED info for this recipe:
          1. 'ingredients': Full list with specific QUANTITIES (e.g., "1/2 onion, chopped", "200g Pork").
          2. 'instructions': Step-by-step detailed cooking guide.
          3. 'substitutions': If I am missing any required ingredients based on my list, suggest specific substitutions here.
        `,
        ko: `
          제가 선택한 레시피는 "${recipeName}"입니다.
          제가 가진 재료는: ${translatedIngredients.join(', ')}.
          
          이 레시피에 대한 '상세 정보'를 제공해주세요:
          1. 'ingredients': 정확한 계량/수량이 포함된 상세 재료 목록 (예: "양파 1/2개", "돼지고기 200g").
          2. 'instructions': 단계별 상세 조리 방법.
          3. 'substitutions': 제 재료 목록에 없는 필수 재료가 있다면, 여기서 구체적인 대체재를 제안해주세요.
        `
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompts[language],
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
    
    const systemInstructions = {
        en: `You are 'AI Chef', a helpful and friendly cooking assistant for the OhMyCook app. Your answers should be in English. Keep them concise, friendly, and easy to understand. The user's profile is: Cooking Level: ${settings.cookingLevel}, Allergies: ${settings.allergies.join(', ') || 'None'}, Available Tools: ${settings.availableTools.join(', ') || 'Basic'}.`,
        ko: `당신은 OhMyCook 앱의 도움이 되고 친절한 요리 도우미 'AI 셰프'입니다. 답변은 한국어로 해주세요. 간결하고 친근하며 이해하기 쉽게 답변해주세요. 사용자의 프로필은 다음과 같습니다: 요리 수준: ${settings.cookingLevel}, 알레르기: ${settings.allergies.join(', ') || '없음'}, 사용 가능한 도구: ${settings.availableTools.join(', ') || '기본'}.`
    }
    
    let finalSystemInstruction = systemInstructions[language];
    if (recipeContext) {
        const recipeInfoEn = `\n\nYou are currently assisting with this specific recipe: "${recipeContext.recipeName}".\n- Description: ${recipeContext.description}\n- Ingredients: ${recipeContext.ingredients.join(', ')}\n\nAnswer any questions in relation to this recipe.`;
        const recipeInfoKo = `\n\n현재 "${recipeContext.recipeName}" 레시피에 대해 도움을 주고 있습니다.\n- 설명: ${recipeContext.description}\n- 재료: ${recipeContext.ingredients.join(', ')}\n\n이 레시피와 관련된 질문에 답변해주세요.`;
        finalSystemInstruction += language === 'ko' ? recipeInfoKo : recipeInfoEn;
    }

    const chatHistory = history.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => ({text: p.text}))
    }));

    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: finalSystemInstruction,
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