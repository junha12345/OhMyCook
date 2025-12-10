import { supabaseRequest } from './supabaseClient';
import { Ingredient, RecipeSearchCount, UserIngredientRecord, UserProfileRecord } from '../types';

function encodeFilter(value: string) {
  return encodeURIComponent(value);
}

export async function saveUserProfile(profile: UserProfileRecord) {
  const payload = {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name ?? null,
    has_completed_onboarding: profile.has_completed_onboarding ?? false,
    preferred_cuisines: profile.preferred_cuisines ?? [],
  };

  const [row] = await supabaseRequest<UserProfileRecord[]>(
    '/user_profiles',
    {
      method: 'POST',
      body: JSON.stringify([payload]),
      prefer: 'resolution=merge-duplicates',
    },
  );

  return row;
}

export async function recordRecipeSearch({
  userId,
  recipeName,
  searchTerm,
}: {
  userId?: string;
  recipeName: string;
  searchTerm?: string;
}) {
  const recipeLabel = recipeName.trim();
  const term = (searchTerm ?? recipeLabel).trim();

  await supabaseRequest('/search_events', {
    method: 'POST',
    body: JSON.stringify([{ user_id: userId ?? null, recipe_name: recipeLabel, search_term: term }]),
  });

  const existing = await supabaseRequest<RecipeSearchCount[]>(
    `/recipe_search_counts?recipe_name=eq.${encodeFilter(recipeLabel)}`,
  );

  const nextCount = (existing?.[0]?.search_count ?? 0) + 1;

  const [row] = await supabaseRequest<RecipeSearchCount[]>(
    '/recipe_search_counts',
    {
      method: 'POST',
      body: JSON.stringify([{ recipe_name: recipeLabel, search_count: nextCount }]),
      prefer: 'resolution=merge-duplicates',
    },
  );

  return row;
}

export async function getPopularRecipes(limit = 10) {
  const data = await supabaseRequest<RecipeSearchCount[]>(
    `/recipe_search_counts?order=search_count.desc&limit=${limit}`,
  );

  return data ?? [];
}

export async function getUserIngredients(userId: string) {
  if (!userId) throw new Error('User ID is required to fetch ingredients.');

  const data = await supabaseRequest<UserIngredientRecord[]>(
    `/user_ingredients?user_id=eq.${encodeFilter(userId)}`,
  );

  return data ?? [];
}

export async function replaceUserIngredients(userId: string, ingredients: Ingredient[]) {
  if (!userId) throw new Error('User ID is required to update ingredients.');

  await supabaseRequest(`/user_ingredients?user_id=eq.${encodeFilter(userId)}`, {
    method: 'DELETE',
  });

  if (!ingredients.length) return [] as UserIngredientRecord[];

  const records = ingredients.map((ingredient) => ({
    user_id: userId,
    ingredient_name: ingredient.name,
    quantity: ingredient.quantity,
  }));

  const data = await supabaseRequest<UserIngredientRecord[]>(
    '/user_ingredients',
    {
      method: 'POST',
      body: JSON.stringify(records),
    },
  );

  return data ?? [];
}

export async function appendUserIngredient(userId: string, ingredient: Ingredient) {
  const [row] = await supabaseRequest<UserIngredientRecord[]>(
    '/user_ingredients',
    {
      method: 'POST',
      body: JSON.stringify([{ user_id: userId, ingredient_name: ingredient.name, quantity: ingredient.quantity }]),
      prefer: 'resolution=merge-duplicates',
    },
  );

  return row;
}
