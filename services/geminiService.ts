
import { UserSettings, Recipe, RecipeFilters, ChatMessage } from '../types';

async function callGeminiApi(action: string, payload: any) {
  const MAX_RETRIES = 3;
  let delay = 1000; // Start with a 1-second delay

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
      });

      if (response.ok) {
        return await response.json(); // Success
      }

      // Handle non-OK responses below
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // If parsing fails, it's not a JSON response (e.g., Vercel timeout page)
        // We don't retry on these as they are likely not temporary model issues.
        throw new Error(errorText || `API call failed with status: ${response.status}`);
      }

      const errorMessage = errorData.error || '';
      // Check for the specific "overloaded" message from the Gemini API
      const isRetryable = errorMessage.includes("overloaded") || errorMessage.includes("503");

      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(`Attempt ${attempt}: Model is overloaded. Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Double the delay for the next attempt (exponential backoff)
        continue; // Go to the next iteration of the loop
      } else {
        // If it's not a retryable error, or we've exhausted retries, throw the error.
        throw new Error(errorMessage || `API call failed with status: ${response.status}`);
      }

    } catch (error) {
      // This catches network errors or errors thrown from the block above
      if (attempt < MAX_RETRIES) {
        console.warn(`Attempt ${attempt} failed with error: ${error}. Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      } else {
        // If this was the last attempt, re-throw the error to be displayed to the user.
        console.error(`Error in ${action} after ${MAX_RETRIES} attempts:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during the API call.');
      }
    }
  }
  
  // This should not be reachable if the loop logic is correct
  throw new Error(`API call for ${action} failed after all retries.`);
}


export async function getRecipeRecommendations(ingredients: string[], priorityIngredients: string[], filters: RecipeFilters, language: 'en' | 'ko'): Promise<Recipe[]> {
  const payload = { ingredients, priorityIngredients, filters, language };
  const data = await callGeminiApi('getRecipeRecommendations', payload);
  return data.result;
}

export async function getRecipeDetails(recipeName: string, ingredients: string[], language: 'en' | 'ko'): Promise<Partial<Recipe>> {
  const payload = { recipeName, ingredients, language };
  const data = await callGeminiApi('getRecipeDetails', payload);
  return data.result;
}

export async function analyzeReceipt(base64Image: string): Promise<string[]> {
  const payload = { base64Image };
  const data = await callGeminiApi('analyzeReceipt', payload);
  return data.result;
}

export async function chatWithAIChef(history: ChatMessage[], message: string, settings: UserSettings, language: 'en' | 'ko', recipeContext?: Recipe | null): Promise<string> {
  const payload = { history, message, settings, language, recipeContext };
  const data = await callGeminiApi('chatWithAIChef', payload);
  return data.result;
}