import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Recipe, Ingredient, RecipeFilters, ShoppingListItem } from '../types';
import RecipeCard, { RecipeDetailModal } from './RecipeCard';
import { Spinner, ProgressBar } from './Spinner';
import FilterModal from './FilterModal';
import { useLanguage } from '../context/LanguageContext';
import MainHeader from './MainHeader';
import IngredientSelectionModal from './IngredientSelectionModal';
import { getIngredientTranslation } from '../data/ingredients';
import { PlusIcon, XIcon, SparklesIcon } from './icons';

interface RecipeRecommendationsProps {
  ingredients: Ingredient[];
  onBack: () => void;
  shoppingList: ShoppingListItem[];
  onToggleShoppingListItem: (itemName: string) => void;
  savedRecipes: Recipe[];
  onToggleSaveRecipe: (recipe: Recipe) => void;
  onStartChat: (recipe: Recipe) => void;
  initialOpenedRecipe?: Recipe | null;
  onRecipeModalChange?: (recipe: Recipe | null) => void;
}

const RecipeRecommendations: React.FC<RecipeRecommendationsProps> = ({
  ingredients,
  onBack,
  shoppingList,
  onToggleShoppingListItem,
  savedRecipes,
  onToggleSaveRecipe,
  onStartChat,
  initialOpenedRecipe,
  onRecipeModalChange
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(initialOpenedRecipe || null);
  const { t, language } = useLanguage();
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({
    cuisine: 'any',
    servings: 2,
    spiciness: 'medium',
    difficulty: 'medium',
    maxCookTime: 45,
  });
  const [priorityIngredients, setPriorityIngredients] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const totalDuration = 5000; // Faster duration since we only fetch summaries
      const intervalDuration = 100;
      const steps = totalDuration / intervalDuration;
      const increment = 95 / steps;

      intervalRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 95;
          }
          return prev + increment;
        });
      }, intervalDuration);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (progress > 0 && progress < 100) {
        setProgress(100);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading]);


  const togglePriorityIngredient = (name: string) => {
    setPriorityIngredients(prev =>
      prev.includes(name)
        ? prev.filter(i => i !== name)
        : [...prev, name]
    );
  };

  const handleFetchRecipes = async () => {
    if (ingredients.length === 0) {
      setError(t('addIngredientsFirst'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const { getRecipeRecommendations } = await import('../services/geminiService');
      const ingredientNames = ingredients.map(ing => ing.name);
      const result = await getRecipeRecommendations(ingredientNames, priorityIngredients, filters, language);
      setRecipes(result);
      if (result.length === 0) {
        setError(t('noRecipesFound'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    onRecipeModalChange?.(recipe);

    // Lazy load details if not already loaded
    if (!recipe.isDetailsLoaded) {
      try {
        const { getRecipeDetails } = await import('../services/geminiService');
        const ingredientNames = ingredients.map(ing => ing.name);
        const details = await getRecipeDetails(recipe.recipeName, ingredientNames, language);

        const updatedRecipe = {
          ...recipe,
          ...details,
          isDetailsLoaded: true
        };

        // Update the selected recipe with details
        setSelectedRecipe(updatedRecipe);

        // Also update the recipe in the main list so we don't fetch again
        setRecipes(prev => prev.map(r => r.recipeName === recipe.recipeName ? updatedRecipe : r));
      } catch (error) {
        console.error("Failed to fetch recipe details", error);
        // Optionally handle error in modal (e.g. show "Failed to load details")
      }
    }
  };
  const defaultFilters: RecipeFilters = {
    cuisine: 'any',
    servings: 2,
    spiciness: 'medium',
    difficulty: 'medium',
    maxCookTime: 45,
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const cuisineOptions: RecipeFilters['cuisine'][] = ['any', 'korean', 'japanese', 'chinese', 'western'];
  const spicinessOptions: RecipeFilters['spiciness'][] = ['mild', 'medium', 'spicy'];
  const difficultyOptions: RecipeFilters['difficulty'][] = ['easy', 'medium', 'hard'];

  return (
    <div className="flex flex-col h-screen bg-background">
      <MainHeader onBack={onBack} />

      <div className="flex-grow p-4 overflow-y-auto">

        {ingredients.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-text-primary mb-2 text-lg">{t('priorityIngredientsTitle')}</h3>
            <p className="text-sm text-text-secondary mb-3">{t('priorityIngredientsSubtitle')}</p>

            <div className="flex flex-wrap gap-2">
              {priorityIngredients.map(name => {
                const ing = ingredients.find(i => i.name === name);
                if (!ing) return null;
                return (
                  <button
                    key={name}
                    onClick={() => togglePriorityIngredient(name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-light border border-brand-primary rounded-full text-sm font-bold text-brand-dark hover:bg-brand-primary/20 transition-colors"
                  >
                    {getIngredientTranslation(name, language)}
                    <XIcon className="w-3 h-3 ml-1" />
                  </button>
                );
              })}
              <button
                onClick={() => setIsIngredientModalOpen(true)}
                className="w-8 h-8 rounded-full border-2 border-dashed border-brand-primary/50 text-brand-primary flex items-center justify-center hover:bg-brand-primary/10 hover:border-brand-primary transition-all"
                aria-label="Add priority ingredient"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isIngredientModalOpen && (
          <IngredientSelectionModal
            isOpen={isIngredientModalOpen}
            onClose={() => setIsIngredientModalOpen(false)}
            ingredients={ingredients}
            selectedIngredients={priorityIngredients}
            onToggle={togglePriorityIngredient}
          />
        )}

        <div className="flex gap-3 mb-8 border-t border-line-light pt-6">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex-1 bg-white border border-gray-200 text-black font-bold py-4 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            {t('filterRecipes')}
          </button>

          <button
            onClick={handleFetchRecipes}
            disabled={isLoading}
            className="flex-1 bg-[#FF8C00] text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 hover:bg-[#E07B00] transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <Spinner size="sm" color="white" /> : <span>{t('findRecipes')}</span>}
          </button>
        </div>

        {isFilterModalOpen && (
          <FilterModal
            initialFilters={filters}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setIsFilterModalOpen(false);
            }}
            onClose={() => setIsFilterModalOpen(false)}
          />
        )}

        {isLoading && (
          <div className="py-8 px-4 text-center">
            <p className="text-text-primary font-semibold mb-3">
              {progress < 50 ? t('loadingRecipes') : t('loadingRecipesAlmostDone')}
            </p>
            <div className="my-6">
              <Spinner size="lg" />
            </div>
            <ProgressBar progress={progress} />
          </div>
        )}
        {!isLoading && !error && recipes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center opacity-70">
            <div className="text-6xl mb-6">🧑‍🍳</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">
              {t('recommendationPlaceholderTitle')}
            </h3>
            <p className="text-text-secondary max-w-xs mx-auto leading-relaxed">
              {t('recommendationPlaceholderSubtitle')}
            </p>
          </div>
        )}

        {error && <p className="text-red-500 text-center py-4 mt-4">{error}</p>}

        {!isLoading && progress === 100 && (
          <div className="space-y-4 pb-20">
            {recipes.map((recipe, index) => (
              <RecipeCard key={index} recipe={recipe} onSelect={() => handleRecipeSelect(recipe)} />
            ))}
          </div>
        )}

        <AnimatePresence>
          {selectedRecipe && (
            <RecipeDetailModal
              recipe={selectedRecipe}
              onClose={() => { setSelectedRecipe(null); onRecipeModalChange?.(null); }}
              shoppingList={shoppingList}
              onToggleShoppingListItem={onToggleShoppingListItem}
              isSaved={savedRecipes.some(r => r.recipeName === selectedRecipe.recipeName)}
              onToggleSaveRecipe={onToggleSaveRecipe}
              onStartChat={onStartChat}
              key="recipe-detail-modal"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecipeRecommendations;