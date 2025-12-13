
import React, { useState } from 'react';
import { Recipe, ShoppingListItem } from '../types';
import { ClockIcon, FireIcon, XIcon, BookmarkIcon, ChatBubbleIcon, CheckCircleIcon, CircleIcon } from './icons';
import { useLanguage } from '../context/LanguageContext';
import ImageWithFallback from './ImageWithFallback';
import Spinner from './Spinner';

interface RecipeCardProps {
    recipe: Recipe;
    onSelect: () => void;
}

const Tag: React.FC<{ children: React.ReactNode; color: 'red' | 'green' | 'yellow' | 'blue' | 'purple' }> = ({ children, color }) => {
    const colors = {
        red: 'bg-red-100 text-red-800',
        green: 'bg-green-100 text-green-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        blue: 'bg-blue-100 text-blue-800',
        purple: 'bg-purple-100 text-purple-800',
    }
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded ${colors[color]}`}>{children}</span>
}


const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSelect }) => {
    const { t } = useLanguage();

    let imageUrl: string;
    if (recipe.imageUrl) {
        imageUrl = recipe.imageUrl
    } else {
        let query: string;
        if (recipe.englishRecipeName) {
            query = recipe.englishRecipeName;
        } else {
            const match = recipe.recipeName.match(/\((.*?)\)/);
            query = match && match[1] ? match[1] : recipe.recipeName.split('(')[0];
        }
        imageUrl = `https://source.unsplash.com/112x180/?${query.trim().replace(/\s+/g, ',')},food`;
    }

    const cuisineColors: { [key: string]: 'red' | 'blue' | 'green' | 'purple' | 'yellow' } = {
        Korean: 'red',
        Western: 'blue',
        Japanese: 'green',
        Chinese: 'purple',
    };
    const cuisineColor = cuisineColors[recipe.cuisine] || 'yellow';


    return (
        <div onClick={onSelect} className="bg-surface rounded-2xl shadow-subtle overflow-hidden flex cursor-pointer hover:shadow-lg transition-shadow">
            <ImageWithFallback src={imageUrl} alt={recipe.recipeName} className="w-28 h-auto object-cover" />
            <div className="p-4 flex flex-col justify-between flex-grow">
                <div>
                    <h4 className="font-bold text-text-primary mb-2 line-clamp-1">{recipe.recipeName}</h4>
                    <div className="flex items-center gap-4 text-xs text-text-secondary mb-3">
                        <div className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{recipe.cookTime} {t('time')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span>{recipe.servings} {t('servings')}</span>
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-text-secondary mb-3" title={`Spiciness ${recipe.spiciness}/5`}>
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => <FireIcon key={i} className={`w-4 h-4 ${i <= recipe.spiciness ? 'text-red-500' : 'text-gray-300'}`} isFilled={i <= recipe.spiciness} />)}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Tag color={cuisineColor}>{recipe.cuisine}</Tag>
                    <Tag color="green">{t('ownedIngredients', { count: recipe.ingredients.length - (recipe.missingIngredients?.length || 0) })}</Tag>
                </div>
            </div>
        </div>
    );
};


export const RecipeDetailModal: React.FC<{
    recipe: Recipe;
    onClose: () => void;
    shoppingList: ShoppingListItem[];
    onToggleShoppingListItem: (itemName: string) => void;
    isSaved: boolean;
    onToggleSaveRecipe: (recipe: Recipe) => void;
    onStartChat: (recipe: Recipe) => void;
}> = ({ recipe, onClose, shoppingList, onToggleShoppingListItem, isSaved, onToggleSaveRecipe, onStartChat }) => {
    const { t } = useLanguage();
    const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

    const toggleIngredient = (ingredient: string) => {
        const newSet = new Set(checkedIngredients);
        if (newSet.has(ingredient)) {
            newSet.delete(ingredient);
        } else {
            newSet.add(ingredient);
        }
        setCheckedIngredients(newSet);
    };

    // Default to true if the property is missing (backward compatibility), or strictly check if false.
    const isLoadingDetails = recipe.isDetailsLoaded === false;

    let imageUrl: string;
    if (recipe.imageUrl) {
        imageUrl = recipe.imageUrl
    } else {
        let query: string;
        if (recipe.englishRecipeName) {
            query = recipe.englishRecipeName;
        } else {
            const match = recipe.recipeName.match(/\((.*?)\)/);
            query = match && match[1] ? match[1] : recipe.recipeName.split('(')[0];
        }
        imageUrl = `https://source.unsplash.com/112x180/?${query.trim().replace(/\s+/g, ',')},food`;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 font-sans animate-fade-in">
            <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col relative overflow-hidden">
                <div className="overflow-y-auto flex-grow p-6 custom-scrollbar">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-text-primary mb-4 pr-16">{recipe.recipeName}</h2>
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                            <button
                                onClick={() => onToggleSaveRecipe(recipe)}
                                className={`transition-colors hover:text-brand-primary ${isSaved ? 'text-brand-primary' : 'text-text-secondary'}`}
                                title={isSaved ? t('unsaveRecipe') : t('saveRecipe')}
                            >
                                <BookmarkIcon className="w-6 h-6" isFilled={isSaved} />
                            </button>
                            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="mb-6 rounded-xl overflow-hidden shadow-sm h-48 w-full relative">
                        <ImageWithFallback src={imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
                    </div>

                    <p className="text-text-secondary mb-6">{recipe.description}</p>

                    <div className="space-y-6 pb-16">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-2 border-b pb-1">{t('ingredients')}</h3>
                            {isLoadingDetails ? (
                                <div className="flex items-center gap-2 text-text-secondary py-2">
                                    <Spinner size="sm" />
                                    <span>{t('loadingRecipes')}</span>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {recipe.ingredients.map(ing => {
                                        const isChecked = checkedIngredients.has(ing);
                                        return (
                                            <li
                                                key={ing}
                                                onClick={() => toggleIngredient(ing)}
                                                className="flex items-start gap-3 cursor-pointer group select-none"
                                            >
                                                <div className={`mt-0.5 transition-colors ${isChecked ? 'text-brand-primary' : 'text-gray-300 group-hover:text-text-secondary'}`}>
                                                    {isChecked ? <CheckCircleIcon className="w-6 h-6" isFilled /> : <CircleIcon className="w-6 h-6" />}
                                                </div>
                                                <span className={`text-base transition-colors ${isChecked ? 'text-text-tertiary line-through decoration-text-tertiary' : 'text-text-primary'}`}>
                                                    {ing}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                                <div className="mt-3">
                                    <h4 className="font-bold text-red-600">{t('missingIngredients')}</h4>
                                    <ul className="list-disc list-inside text-red-500 space-y-1">
                                        {recipe.missingIngredients.map(ing => {
                                            const isAdded = shoppingList.some(item => item.name === ing);
                                            return (
                                                <li key={ing} className="flex justify-between items-center py-1">
                                                    <span>{ing}</span>
                                                    <button
                                                        onClick={() => onToggleShoppingListItem(ing)}
                                                        className={`text-xs font-bold px-3 py-1 rounded-full ${isAdded ? 'bg-green-600 text-white' : 'bg-brand-primary text-white'}`}
                                                    >
                                                        {isAdded ? t('addedToShoppingList') : t('addToShoppingList')}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {/* Only show substitutions if they exist and we are not loading */}
                            {!isLoadingDetails && recipe.substitutions && recipe.substitutions.length > 0 && (
                                <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                    <h4 className="font-bold text-yellow-700 mb-1">{t('substitutable')}</h4>
                                    <ul className="text-sm text-yellow-800 space-y-1">
                                        {recipe.substitutions.map((sub, idx) => (
                                            <li key={idx}><span className="font-semibold">{sub.missing}</span> → {sub.substitute}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-2 border-b pb-1">{t('instructions')}</h3>
                            {isLoadingDetails ? (
                                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                    <Spinner size="md" />
                                    <p className="text-sm text-text-secondary animate-pulse">{t('loadingRecipesAlmostDone')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recipe.instructions.map((step, index) => (
                                        <div key={index} className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <p className="text-text-primary flex-grow pt-1 leading-relaxed">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => onStartChat(recipe)}
                    className="absolute bottom-24 right-6 bg-brand-primary text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-30"
                    title={t('askAIChef')}
                >
                    <ChatBubbleIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default RecipeCard;