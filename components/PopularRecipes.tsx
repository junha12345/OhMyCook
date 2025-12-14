import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import MainHeader from './MainHeader';
import { Recipe, ShoppingListItem } from '../types';
import { popularRecipesData } from '../data/popularRecipes';
import { RecipeDetailModal } from './RecipeCard';
import ImageWithFallback from './ImageWithFallback';


interface PopularRecipesProps {
  onBack: () => void;
  onLogoClick?: () => void;
  shoppingList: ShoppingListItem[];
  onToggleShoppingListItem: (itemName: string) => void;
  savedRecipes: Recipe[];
  onToggleSaveRecipe: (recipe: Recipe) => void;
  onStartChat: (recipe: Recipe) => void;
  initialOpenedRecipe?: Recipe | null;
  onRecipeModalChange?: (recipe: Recipe | null) => void;
}

const PopularRecipes: React.FC<PopularRecipesProps> = ({
  onBack,
  onLogoClick,
  shoppingList,
  onToggleShoppingListItem,
  savedRecipes,
  onToggleSaveRecipe,
  onStartChat,
  initialOpenedRecipe,
  onRecipeModalChange
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('today');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(initialOpenedRecipe || null);

  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    onRecipeModalChange?.(recipe);
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
    onRecipeModalChange?.(null);
  };

  // In a real app, this data would change based on the activeTab
  const recipesToShow = popularRecipesData;

  const getImageUrl = (recipe: Recipe, size: number) => {
    let query: string;
    if (recipe.englishRecipeName) {
      query = recipe.englishRecipeName;
    } else {
      const match = recipe.recipeName.match(/\((.*?)\)/);
      query = match && match[1] ? match[1] : recipe.recipeName.split('(')[0];
    }
    const queryParams = query.trim().replace(/\s+/g, ',');
    return `https://source.unsplash.com/${size}x${size}/?${queryParams},food`;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <MainHeader onBack={onBack} onLogoClick={onLogoClick} />

      <div className="p-4 flex-shrink-0">
        <div className="relative flex bg-surface p-1 rounded-xl border border-line-light">
          {/* Tab buttons with individual animated indicators */}
          <button
            onClick={() => setActiveTab('today')}
            className="relative z-10 flex-1 py-2 text-sm font-bold rounded-lg transition-colors"
          >
            <motion.div
              className="absolute inset-0 bg-brand-primary rounded-lg"
              initial={false}
              animate={{ opacity: activeTab === 'today' ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            />
            <span className={`relative z-10 ${activeTab === 'today' ? 'text-white' : 'text-text-secondary'}`}>
              {t('today')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('thisWeek')}
            className="relative z-10 flex-1 py-2 text-sm font-bold rounded-lg transition-colors"
          >
            <motion.div
              className="absolute inset-0 bg-brand-primary rounded-lg"
              initial={false}
              animate={{ opacity: activeTab === 'thisWeek' ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            />
            <span className={`relative z-10 ${activeTab === 'thisWeek' ? 'text-white' : 'text-text-secondary'}`}>
              {t('thisWeek')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('thisMonth')}
            className="relative z-10 flex-1 py-2 text-sm font-bold rounded-lg transition-colors"
          >
            <motion.div
              className="absolute inset-0 bg-brand-primary rounded-lg"
              initial={false}
              animate={{ opacity: activeTab === 'thisMonth' ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            />
            <span className={`relative z-10 ${activeTab === 'thisMonth' ? 'text-white' : 'text-text-secondary'}`}>
              {t('thisMonth')}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-grow p-4 pt-0 overflow-y-auto pb-24">
        <div className="bg-brand-primary/10 text-brand-dark p-6 rounded-2xl mb-6">
          <h2 className="text-xl font-bold mb-2">{t('popularBannerTitle')}</h2>
          <p className="text-sm">{t('popularBannerSubtitle')}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {recipesToShow.slice(0, 3).map((recipe, index) => (
            <div key={index} onClick={() => handleRecipeSelect(recipe)} className="relative rounded-2xl overflow-hidden aspect-square shadow-subtle group cursor-pointer">
              <ImageWithFallback src={getImageUrl(recipe, 300)} alt={recipe.recipeName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <span className="absolute top-2 left-2 bg-brand-primary text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{index + 1}</span>
              <p className="absolute bottom-2 left-2 text-white font-bold text-sm">{recipe.recipeName.split('(')[0]}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {recipesToShow.slice(3).map((recipe, index) => (
            <div key={index} onClick={() => handleRecipeSelect(recipe)} className="flex items-center bg-surface p-3 rounded-xl shadow-subtle cursor-pointer">
              <span className="text-lg font-bold w-8 text-center text-text-secondary">{index + 4}</span>
              <ImageWithFallback src={getImageUrl(recipe, 100)} alt={recipe.recipeName} className="w-16 h-16 rounded-lg object-cover mx-4" />
              <div className="flex-grow">
                <p className="font-bold text-text-primary">{recipe.recipeName.split('(')[0]}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetailModal
            recipe={selectedRecipe}
            onClose={handleCloseModal}
            shoppingList={shoppingList}
            onToggleShoppingListItem={onToggleShoppingListItem}
            isSaved={savedRecipes.some(r => r.recipeName === selectedRecipe.recipeName)}
            onToggleSaveRecipe={onToggleSaveRecipe}
            onStartChat={onStartChat}
            key="recipe-modal"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PopularRecipes;