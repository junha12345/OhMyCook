import React, { useState, useRef } from 'react';
import { PlusIcon, SearchIcon, XIcon, CameraIcon, SpatulaIcon } from './icons';
import { Ingredient } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getIngredientCategory, getIngredientTranslation, INGREDIENT_CATEGORIES, getIngredientEmoji, ALL_INGREDIENTS } from '../data/ingredients';
import MainHeader from './MainHeader';
import Spinner from './Spinner';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  onBack?: () => void;
  onGenerateRecipe?: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const IngredientManager: React.FC<IngredientManagerProps> = ({ ingredients, setIngredients, onBack, onGenerateRecipe }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<(typeof ALL_INGREDIENTS[0])[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t, language } = useLanguage();

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setIngredients(prev => prev.filter(ing => ing.name !== ingredientToRemove));
  };

  const handleAddIngredient = (ingredientName: string) => {
    // Check if already exists
    if (ingredients.some(i => i.name === ingredientName)) {
      // Optionally show toast or shake
      setSearchTerm('');
      setSearchSuggestions([]);
      return;
    }

    setIngredients(prev => [...prev, { name: ingredientName, quantity: '1' }]); // Default quantity
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
    const currentIngredientNames = new Set(ingredients.map(i => i.name));

    const filtered = ALL_INGREDIENTS.filter(
      ing => (ing.en.toLowerCase().includes(lowerCaseValue) || ing.ko.toLowerCase().includes(lowerCaseValue)) && !currentIngredientNames.has(ing.en)
    ).slice(0, 20); // Limit results

    setSearchSuggestions(filtered);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const { analyzeReceipt } = await import('../services/geminiService');
      const base64Image = await fileToBase64(file);
      const detectedIngredients = await analyzeReceipt(base64Image);

      if (detectedIngredients.length > 0) {
        const currentIngredientNames = new Set(ingredients.map(i => i.name));
        const newIngredients = detectedIngredients
          .filter(name => !currentIngredientNames.has(name))
          .map(name => ({ name, quantity: '1' }));

        setIngredients(prev => [...prev, ...newIngredients]);
      }
    } catch (error) {
      console.error("Scan failed:", error);
      // Ideally show error toast
    } finally {
      setIsScanning(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredIngredients = ingredients.filter(ing => {
    const searchMatch = searchTerm === '' ||
      getIngredientTranslation(ing.name, 'en').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getIngredientTranslation(ing.name, 'ko').toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <MainHeader />

      <div className="p-4 pb-0">
        <div className="flex gap-2 mb-4 relative z-20">
          <div className="relative flex-grow">
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
                          <button onClick={() => handleAddIngredient(ing.en)} className="w-full text-left p-2 pl-4 text-sm text-text-primary hover:bg-brand-light flex items-center gap-2">
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

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex-none w-12 h-12 bg-surface border border-brand-primary text-brand-primary rounded-xl flex items-center justify-center hover:bg-brand-light transition-colors"
            aria-label={t('scanWithReceipt')}
          >
            {isScanning ? <Spinner /> : <CameraIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex-grow p-4 pt-0 overflow-y-auto pb-40">
        {filteredIngredients.length === 0 ? (
          <p className="text-center text-text-secondary mt-10">{searchTerm ? t('noSearchResults') : t('pleaseAddIngredients')}</p>
        ) : (
          <div className="space-y-6">
            {INGREDIENT_CATEGORIES.map(category => {
              const categoryIngredients = filteredIngredients.filter(ing => getIngredientCategory(ing.name) === category);
              if (categoryIngredients.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-bold text-text-secondary uppercase mb-3 ml-1">
                    {t(category as any)}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categoryIngredients.map(ing => (
                      <div key={ing.name} className="bg-surface border border-line-light rounded-full pl-3 pr-2 py-2 shadow-sm flex items-center gap-2">
                        <span className="text-lg leading-none">{getIngredientEmoji(ing.name)}</span>
                        <span className="font-semibold text-text-primary text-sm whitespace-nowrap">
                          {getIngredientTranslation(ing.name, language)}
                        </span>
                        <button
                          onClick={() => handleRemoveIngredient(ing.name)}
                          className="ml-1 p-1 text-text-secondary hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-4 z-30 max-w-lg mx-auto">
        <button
          onClick={() => {
            if (onGenerateRecipe) onGenerateRecipe();
          }}
          className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-brand-dark transition-colors"
        >
          <SpatulaIcon className="w-6 h-6" />
          <span>{t('generateRecipe')}</span>
        </button>
      </div>
    </div>
  );
};

export default IngredientManager;
