import React, { useState } from 'react';
import Header from './Header';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingListItem } from '../types';
import { XIcon, SearchIcon, PlusIcon } from './icons';
import { getIngredientCategory, getIngredientTranslation, getIngredientEmoji, ALL_INGREDIENTS, INGREDIENT_CATEGORIES } from '../data/ingredients';

interface ShoppingListProps {
  shoppingList: ShoppingListItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingListItem[]>>;
  onBack: () => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ shoppingList, setShoppingList, onBack }) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<(typeof ALL_INGREDIENTS[0])[]>([]);

  const handleRemoveItem = (itemName: string) => {
    setShoppingList(prev => prev.filter(item => item.name !== itemName));
  };

  const handleClearList = () => {
    setShoppingList([]);
  };

  const handleAddItem = (ingredientName: string) => {
    // Check if already exists
    if (shoppingList.some(i => i.name === ingredientName)) {
      setSearchTerm('');
      setSearchSuggestions([]);
      return;
    }

    setShoppingList(prev => [...prev, { name: ingredientName }]);
    setSearchTerm('');
    setSearchSuggestions([]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim().length === 0) {
      setSearchSuggestions([]);
      return;
    }

    const lowerCaseValue = value.toLowerCase();

    // Filter out items already in the shopping list
    const currentListNames = new Set(shoppingList.map(i => i.name));

    const filtered = ALL_INGREDIENTS.filter(
      ing => (ing.en.toLowerCase().includes(lowerCaseValue) || ing.ko.toLowerCase().includes(lowerCaseValue)) && !currentListNames.has(ing.en)
    ).slice(0, 20);

    setSearchSuggestions(filtered);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header title={t('shoppingListTitle')} onBack={onBack} />

      {/* Search Section */}
      <div className="p-4 pb-0 z-20 relative">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t('searchIngredients')}
            className="w-full bg-surface border border-line-light rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          />
          {searchSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 border border-line-light rounded-lg max-h-60 overflow-y-auto bg-surface shadow-lg">
              {INGREDIENT_CATEGORIES.map(category => {
                const categorySuggestions = searchSuggestions.filter(ing => getIngredientCategory(ing.en) === category);
                if (categorySuggestions.length === 0) return null;

                return (
                  <React.Fragment key={category}>
                    <li className="px-3 py-1 bg-brand-light/50 text-xs font-bold text-text-secondary uppercase">
                      {t(category as any)}
                    </li>
                    {categorySuggestions.map(ing => (
                      <li key={ing.en}>
                        <button onClick={() => handleAddItem(ing.en)} className="w-full text-left p-2 pl-4 text-sm text-text-primary hover:bg-brand-light flex items-center gap-2">
                          <span>{getIngredientEmoji(ing.en)}</span>
                          <span>{getIngredientTranslation(ing.en, language)}</span>
                          <PlusIcon className="w-4 h-4 ml-auto text-brand-primary" />
                        </button>
                      </li>
                    ))}
                  </React.Fragment>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        {shoppingList.length > 0 ? (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={handleClearList} className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors">
                {t('clearShoppingList')}
              </button>
            </div>

            <div className="space-y-6 pb-20">
              {INGREDIENT_CATEGORIES.map(category => {
                const categoryItems = shoppingList.filter(item => getIngredientCategory(item.name) === category);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-sm font-bold text-text-secondary uppercase mb-3 ml-1">
                      {t(category as any)}
                    </h3>
                    <ul className="space-y-2">
                      {categoryItems.map(item => (
                        <li key={item.name} className="flex justify-between items-center bg-surface p-3 rounded-xl shadow-subtle">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getIngredientEmoji(item.name)}</span>
                            <span className="text-text-primary font-medium">{getIngredientTranslation(item.name, language)}</span>
                          </div>
                          <button onClick={() => handleRemoveItem(item.name)} className="text-text-secondary hover:text-red-500 p-1 transition-colors">
                            <XIcon className="w-5 h-5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center opacity-70">
            <div className="text-6xl mb-6">🛒</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">
              {t('shoppingListEmpty')}
            </h3>
            <p className="text-text-secondary max-w-xs mx-auto leading-relaxed">
              {t('shoppingListDetails')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;
