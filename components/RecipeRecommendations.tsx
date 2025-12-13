
import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Ingredient, RecipeFilters, ShoppingListItem } from '../types';
import RecipeCard, { RecipeDetailModal } from './RecipeCard';
import { Spinner, ProgressBar } from './Spinner';
import { useLanguage } from '../context/LanguageContext';
import Header from './Header';
import FilterModal from './FilterModal';
import IngredientSelectionModal from './IngredientSelectionModal';
import { getIngredientTranslation } from '../data/ingredients';
import { PlusIcon, XIcon } from './icons';

interface RecipeRecommendationsProps {
  ingredients: Ingredient[];
  onBack: () => void;
  shoppingList: ShoppingListItem[];
  onToggleShoppingListItem: (itemName: string) => void;
  savedRecipes: Recipe[];
  onToggleSaveRecipe: (recipe: Recipe) => void;
  onStartChat: (recipe: Recipe) => void;
}

const RecipeRecommendations: React.FC<RecipeRecommendationsProps> = ({ ingredients, onBack, shoppingList, onToggleShoppingListItem, savedRecipes, onToggleSaveRecipe, onStartChat }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const { t, language } = useLanguage();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
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

  const handleApplyFilters = (newFilters: RecipeFilters) => {
    setFilters(newFilters);
    setIsFilterModalOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header title={t('aiRecTitle')} onBack={onBack} />

      <div className="flex-grow p-4 overflow-y-auto">
        <div className="bg-brand-primary/10 text-brand-dark p-6 rounded-2xl mb-6 text-center">
          <h2 className="text-xl font-bold mb-2">{t('aiRecBannerTitle')}</h2>
          <p className="text-sm">{t('aiRecBannerSubtitle')}</p>
        </div>

        {ingredients.length > 0 && (
          <div className="mb-4 bg-surface p-4 rounded-2xl">
            <h3 className="font-bold text-text-primary mb-2">{t('priorityIngredientsTitle')}</h3>
            <p className="text-sm text-text-secondary mb-3">{t('priorityIngredientsSubtitle')}</p>

            <div className="flex flex-wrap gap-2">
              {/* Selected Ingredients Chips */}
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

              {/* Add Button */}
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

        <div className="flex gap-2 mb-4">
          <button onClick={() => setIsFilterModalOpen(true)} className="flex-1 bg-surface border border-line-light text-text-primary font-bold py-3 px-4 rounded-xl">
            {t('filterRecipes')}
          </button>
          <button onClick={handleFetchRecipes} disabled={isLoading} className="flex-1 bg-brand-primary text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50">
            {t('findRecipes')}
          </button>
        </div>

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
        {error && <p className="text-red-500 text-center py-4 mt-4">{error}</p>}

        {!isLoading && progress === 100 && (
          <div className="space-y-4">
            {recipes.map((recipe, index) => (
              <RecipeCard key={index} recipe={recipe} onSelect={() => handleRecipeSelect(recipe)} />
            ))}
          </div>
        )}

        {selectedRecipe && (
          <RecipeDetailModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            shoppingList={shoppingList}
            onToggleShoppingListItem={onToggleShoppingListItem}
            isSaved={savedRecipes.some(r => r.recipeName === selectedRecipe.recipeName)}
            onToggleSaveRecipe={onToggleSaveRecipe}
            onStartChat={onStartChat}
          />
        )}

        {isFilterModalOpen && (
          <FilterModal
            initialFilters={filters}
            onApply={handleApplyFilters}
            onClose={() => setIsFilterModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default RecipeRecommendations;