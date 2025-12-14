
export interface UserSettings {
  cookingLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  allergies: string[];
  preferredCuisines: string[];
  dislikedIngredients: string[];
  availableTools: string[];
  spicinessPreference: number;
  maxCookTime: number;
  nickname: string;
  profileImage?: string;
}

export interface Recipe {
  recipeName: string;
  englishRecipeName?: string;
  description: string;
  cookTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  spiciness: number;
  calories: number;
  servings: number;
  ingredients: string[]; // Initially just names, later strings with quantities
  missingIngredients?: string[];
  substitutions?: { missing: string; substitute: string; }[];
  instructions: string[]; // Empty initially
  cuisine: string;
  isDetailsLoaded?: boolean; // Flag to check if details are fetched
  imageSearchQuery?: string;
  imageUrl?: string;
}

export interface CommunityComment {
  id: string;
  authorEmail: string;
  authorName?: string;
  authorProfileImage?: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorEmail: string;
  authorName?: string;
  authorProfileImage?: string;
  recipe: Recipe;
  note?: string;
  createdAt: string;
  likes: string[];
  comments: CommunityComment[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface RecipeFilters {
  cuisine: 'any' | 'korean' | 'japanese' | 'chinese' | 'western';
  servings: number;
  spiciness: 'mild' | 'medium' | 'spicy';
  difficulty: 'easy' | 'medium' | 'hard';
  maxCookTime: number;
}

export interface ShoppingListItem {
  name: string; // The canonical English name
}

export interface User {
  id?: string; // Supabase UUID
  email: string;
  password?: string;
  hasCompletedOnboarding: boolean;
}

export interface UserProfileRecord {
  id: string;
  email: string;
  display_name?: string | null;
  has_completed_onboarding?: boolean;
  preferred_cuisines?: string[];
}

export interface RecipeSearchCount {
  recipe_name: string;
  search_count: number;
}

export interface UserIngredientRecord {
  user_id: string;
  ingredient_name: string;
  quantity: string;
}