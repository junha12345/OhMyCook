import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Ingredient } from '../types';
import { XIcon } from './icons';
import { getIngredientEmoji, getIngredientTranslation } from '../data/ingredients';

interface IngredientSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredients: Ingredient[];
    selectedIngredients: string[];
    onToggle: (name: string) => void;
}

const IngredientSelectionModal: React.FC<IngredientSelectionModalProps> = ({
    isOpen,
    onClose,
    ingredients,
    selectedIngredients,
    onToggle
}) => {
    const { t, language } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-scale-in">
                <div className="p-4 border-b border-line-light flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-primary">
                        {t('selectIngredients') || "Select Ingredients"}
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-gray-100">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-grow">
                    {ingredients.length === 0 ? (
                        <p className="text-center text-text-secondary py-10">{t('noIngredients') || "No ingredients found. Add some to your fridge!"}</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {ingredients.map(ing => (
                                <button
                                    key={ing.name}
                                    onClick={() => onToggle(ing.name)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedIngredients.includes(ing.name)
                                            ? 'bg-brand-primary/10 border-brand-primary'
                                            : 'bg-background border-line-light hover:border-brand-primary/50'
                                        }`}
                                >
                                    <span className="text-2xl">{getIngredientEmoji(ing.name)}</span>
                                    <div className="flex flex-col items-start">
                                        <span className={`text-sm font-bold ${selectedIngredients.includes(ing.name) ? 'text-brand-primary' : 'text-text-primary'}`}>
                                            {getIngredientTranslation(ing.name, language)}
                                        </span>
                                    </div>
                                    {selectedIngredients.includes(ing.name) && (
                                        <div className="ml-auto w-4 h-4 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                                            ✓
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-line-light">
                    <button
                        onClick={onClose}
                        className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl hover:bg-brand-dark transition-colors"
                    >
                        {t('done') || "Done"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IngredientSelectionModal;
