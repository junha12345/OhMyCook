import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Ingredient } from '../types';
import { XIcon } from './icons';
import { getIngredientEmoji, getIngredientTranslation, INGREDIENT_CATEGORIES, getIngredientCategory } from '../data/ingredients';

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
            <div className="bg-surface w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
                <div className="p-5 border-b border-line-light flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-primary">
                        {t('selectIngredients')}
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-gray-100">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-grow">
                    {ingredients.length === 0 ? (
                        <p className="text-center text-text-secondary py-10">{t('noIngredients')}</p>
                    ) : (
                        <div className="space-y-8">
                            {INGREDIENT_CATEGORIES.map(category => {
                                const categoryIngredients = ingredients.filter(ing => getIngredientCategory(ing.name) === category);
                                if (categoryIngredients.length === 0) return null;

                                return (
                                    <div key={category}>
                                        <h3 className="text-sm font-extrabold text-text-secondary uppercase mb-4 tracking-wider pl-1 border-b border-line-light/50 pb-2">
                                            {t(category as any)}
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {categoryIngredients.map(ing => (
                                                <button
                                                    key={ing.name}
                                                    onClick={() => onToggle(ing.name)}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${selectedIngredients.includes(ing.name)
                                                            ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary/50'
                                                            : 'bg-background border-line-light hover:border-brand-primary/50 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <span className="text-3xl filter drop-shadow-sm">{getIngredientEmoji(ing.name)}</span>
                                                    <div className="flex flex-col items-start min-w-0">
                                                        <span className={`text-sm font-bold truncate w-full text-left ${selectedIngredients.includes(ing.name) ? 'text-brand-primary' : 'text-text-primary'}`}>
                                                            {getIngredientTranslation(ing.name, language)}
                                                        </span>
                                                    </div>
                                                    {selectedIngredients.includes(ing.name) && (
                                                        <div className="ml-auto w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs flex-shrink-0">
                                                            ✓
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-line-light rounded-b-3xl bg-surface">
                    <button
                        onClick={onClose}
                        className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl hover:bg-brand-dark transition-colors shadow-lg active:scale-[0.98] transform"
                    >
                        {t('done')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IngredientSelectionModal;
