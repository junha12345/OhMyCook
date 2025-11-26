
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { UserSettings, Recipe, RecipeFilters, ChatMessage } from '../types';
import { translations } from '../i18n';
import { getIngredientTranslation } from "../data/ingredients";

// This tells Vercel to run this as an edge function, which is fast and efficient.
export const config = {
  runtime: 'edge',
};

const recipeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      recipeName: { type: Type.STRING, description: 'Creative name of the recipe, in the requested language (e.g., "Kimchi Jjigae" for English, "김치찌개" for Korean).' },
      englishRecipeName: { type: Type.STRING, description: 'The English name of the recipe (e.g., "Kimchi Stew"). This is mandatory and used for image searches. Do not include parentheses.' },
      description: { type: Type.STRING, description: 'A short, enticing description.' },
      cuisine: { type: Type.STRING, description: 'The type of cuisine, e.g., Korean, Western, Chinese, Japanese.' },
      cookTime: { type: Type.INTEGER, description: 'Estimated cooking time in minutes.' },
      difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
      spiciness: { type: Type.INTEGER, description: 'Spiciness level from 1 (not spicy) to 5 (very spicy).' },
      calories: { type: Type.INTEGER, description: 'Estimated calories per serving.' },
      servings: { type: Type.INTEGER, description: 'Number of servings the recipe makes.' },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of all ingredients needed.' },
      missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Ingredients the user is missing.' },
      substitutions: {
        type: Type.ARRAY,
        description: 'List of objects, where each object represents a missing ingredient and its suggested substitute.',
        items: {
          type: Type.OBJECT,
          properties: {
            missing: { type: Type.STRING, description: 'The ingredient the user is missing.' },
            substitute: { type: Type.STRING, description: 'A suggested substitute for the missing ingredient.' }
          },
          required: ['missing', 'substitute']
        }
      },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Step-by-step cooking instructions.' },
    },
    required: ['recipeName', 'englishRecipeName', 'description', 'cuisine', 'cookTime', 'difficulty', 'spiciness', 'calories', 'servings', 'ingredients', 'instructions']
  }
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
      en: priorityIngredients.length > 0 ? `\nPRIORITY: You MUST create recipes that prominently feature as many of the following priority ingredients as possible: ${priorityIngredients.join(', ')}. These are ingredients the user wants to use up.` : '',
      ko: priorityIngredients.length > 0 ? `\n우선순위: 다음 우선 재료들을 최대한 많이 사용하는 레시피를 만들어야 합니다: ${translatedPriorityIngredients.join(', ')}. 사용자가 먼저 소진하고 싶어하는 재료들입니다.` : ''
    };

    const prompts = {
      en: `
        You are an expert chef creating recipes for the "OhMyCook" app.
        I have the following ingredients: ${ingredients.join(', ')}.
        Please recommend 3 diverse and delicious recipes I can make in English that strictly match these conditions:
        ${recipeConditions}
        ${priorityPromptPart.en}
        
        CRITICAL: You must generate a complete response in under 25 seconds to avoid a server timeout.

        IMPORTANT RULE: Base your recommendations on the ingredients I have. For any recipe that requires ingredients I don't have, you MUST provide a common, sensible substitute in the 'substitutions' field. If you cannot find a suitable substitute for a missing ingredient, you MUST NOT recommend that recipe. Your primary goal is to provide actionable recipes I can cook by acquiring just a few common substitutes.
        
        For each recipe, provide all the detailed information as per the schema. Make sure to list all ingredients I am missing in the 'missingIngredients' field.
      `,
      ko: `
        당신은 "OhMyCook" 앱을 위한 전문 셰프입니다.
        제가 가진 재료는 다음과 같습니다: ${translatedIngredients.join(', ')}.
        다음 조건에 정확히 맞는 다양하고 맛있는 한국어 레시피 3가지를 추천해주세요:
        ${recipeConditions}
        ${priorityPromptPart.ko}
        
        매우 중요: 서버 시간 초과를 피하기 위해 25초 이내에 완전한 응답을 생성해야 합니다.

        중요 규칙: 제가 가진 재료를 기반으로 레시피를 추천해주세요. 만약 레시피에 제가 가지지 않은 재료가 필요하다면, 반드시 'substitutions' 필드에 일반적이고 합리적인 대체 재료를 제안해야 합니다. 만약 없는 재료에 대한 적절한 대체재를 찾을 수 없다면, 그 레시피는 절대 추천해서는 안 됩니다. 당신의 최우선 목표는 제가 몇 가지 일반적인 대체 재료만 구하면 바로 요리할 수 있는 실행 가능한 레시피를 제공하는 것입니다.

        각 레시피에 대해, 스키마에 따라 모든 자세한 정보를 제공해주세요. 제가 가지고 있지 않은 모든 재료는 'missingIngredients' 필드에 반드시 기입해주세요.
      `,
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompts[language],
        config: {
          responseMimeType: "application/json",
          responseSchema: recipeSchema,
          temperature: 0.7,
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
