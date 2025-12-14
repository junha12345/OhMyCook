

import React, { useRef, useState } from 'react';
import { UserSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { FireIcon, XIcon, SearchIcon, MicrowaveIcon, InductionIcon, GasStoveIcon, AirFryerIcon, OvenIcon, BlenderIcon } from './icons';
import { COMMON_INGREDIENTS, getIngredientCategory, getIngredientTranslation, ALL_INGREDIENTS, INGREDIENT_CATEGORIES, getIngredientEmoji } from '../data/ingredients';

interface OnboardingProps {
  initialSettings: UserSettings;
  onSave: (settings: UserSettings, initialIngredients: string[]) => void;
  onBack: () => void;
  skipIngredients?: boolean;
}

const ProgressBar: React.FC<{ step: number; totalSteps: number }> = ({ step, totalSteps }) => (
  <div className="w-full bg-line-light rounded-full h-1.5">
    <div
      className="bg-brand-primary h-1.5 rounded-full transition-all duration-300"
      style={{ width: `${(step / totalSteps) * 100}%` }}
    ></div>
  </div>
);

const Onboarding: React.FC<OnboardingProps> = ({ initialSettings, onSave, onBack, skipIngredients = false }) => {
  const [step, setStep] = useState(1);
  const mergedSettings: UserSettings = {
    nickname: '',
    profileImage: '',
    ...initialSettings
  };
  const [settings, setSettings] = useState<UserSettings>(mergedSettings);
  const [selectedInitialIngredients, setSelectedInitialIngredients] = useState<string[]>([]);
  const { t, language } = useLanguage();
  const totalSteps = 6;

  const [customIngredientSearch, setCustomIngredientSearch] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<(typeof ALL_INGREDIENTS[0])[]>([]);

  const [allergySearch, setAllergySearch] = useState('');
  const [allergySuggestions, setAllergySuggestions] = useState<(typeof ALL_INGREDIENTS[0])[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));
  const handleFinish = () => onSave(settings, selectedInitialIngredients);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSettings(prev => ({ ...prev, profileImage: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleNicknameChange = (value: string) => {
    setSettings(prev => ({ ...prev, nickname: value }));
  };

  const handleInitialIngredientToggle = (ingredientName: string) => {
    setSelectedInitialIngredients(prev =>
      prev.includes(ingredientName)
        ? prev.filter(i => i !== ingredientName)
        : [...prev, ingredientName]
    );
  };

  const handleCustomSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomIngredientSearch(value);

    if (value.trim().length === 0) {
      setSearchSuggestions([]);
      return;
    }

    const lowerCaseValue = value.toLowerCase();
    const filtered = ALL_INGREDIENTS.filter(
      ing => (ing.en.toLowerCase().includes(lowerCaseValue) || ing.ko.toLowerCase().includes(lowerCaseValue)) && !selectedInitialIngredients.includes(ing.en)
    ).slice(0, 20);
    setSearchSuggestions(filtered);
  };

  const handleSuggestionSelect = (ingredientName: string) => {
    handleInitialIngredientToggle(ingredientName);
    setCustomIngredientSearch('');
    setSearchSuggestions([]);
  };

  const renderStep = () => {
    switch (step) {
      case 1: // Cooking Level
        const levels: UserSettings['cookingLevel'][] = ['Beginner', 'Intermediate', 'Advanced'];
        return (
          <div>
            <h2 className="text-xl font-bold mb-1">{t('onboardingTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('onboardingSubtitle')}</p>
            <div className="space-y-3">
              {levels.map(level => {
                const emojis = { Beginner: '🐣', Intermediate: '👨‍🍳', Advanced: '👑' };
                return (
                  <button key={level} onClick={() => setSettings({ ...settings, cookingLevel: level })} className={`w-full text-left p-4 border rounded-xl transition-colors flex items-center gap-4 ${settings.cookingLevel === level ? 'border-brand-primary bg-brand-light' : 'border-line-light bg-surface'}`}>
                    <span className="text-3xl">{emojis[level]}</span>
                    <div>
                      <p className="font-bold text-lg">{t(level.toLowerCase() as any)}</p>
                      <p className="text-sm text-text-secondary">{t((level.toLowerCase() + 'Desc') as any)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 2: // Allergies
        const defaultAllergies: (keyof (typeof import('../i18n'))['translations']['en'])[] = ['egg', 'milk', 'nuts', 'shellfish', 'wheat', 'soy', 'fish'];

        const handleAllergyToggle = (allergy: string) => {
          const currentAllergies = settings.allergies;
          if (currentAllergies.includes(allergy)) {
            setSettings({ ...settings, allergies: currentAllergies.filter(a => a !== allergy) });
          } else {
            setSettings({ ...settings, allergies: [...currentAllergies, allergy] });
          }
        };

        const handleAllergySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          setAllergySearch(value);

          if (value.trim().length === 0) {
            setAllergySuggestions([]);
            return;
          }

          const lowerCaseValue = value.toLowerCase();
          const filtered = ALL_INGREDIENTS.filter(
            ing => (ing.en.toLowerCase().includes(lowerCaseValue) || ing.ko.toLowerCase().includes(lowerCaseValue)) && !settings.allergies.includes(getIngredientTranslation(ing.en, language))
          ).slice(0, 10);
          setAllergySuggestions(filtered);
        };

        const handleAllergySelect = (englishName: string) => {
          const translatedName = getIngredientTranslation(englishName, language);
          // We store the translated name or english name? The current system seems to use translated names for the buttons, 
          // but keeping English identifiers might be safer. 
          // Looking at the existing code: `t(allergyKey)` is passed to toggle. 
          // `settings.allergies` stores what is passed to toggle. 
          // If we want consistency, we should store what matches the display.
          // However, mixing translated strings in storage is risky. 
          // For now, I will match the existing pattern: store what the user sees/selects.

          if (!settings.allergies.includes(translatedName)) {
            handleAllergyToggle(translatedName);
          }
          setAllergySearch('');
          setAllergySuggestions([]);
        }

        return (
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-bold mb-1">{t('allergyTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('allergySubtitle')}</p>

            <div className="relative mb-6">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={allergySearch}
                onChange={handleAllergySearchChange}
                placeholder={t('searchIngredients')}
                className="w-full bg-surface border border-line-light rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              />
              {allergySuggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 border border-line-light rounded-lg max-h-60 overflow-y-auto bg-surface shadow-lg">
                  {allergySuggestions.map(ing => (
                    <li key={ing.en}>
                      <button onClick={() => handleAllergySelect(ing.en)} className="w-full text-left p-2 pl-4 text-sm text-text-primary hover:bg-brand-light flex items-center gap-2">
                        <span>{getIngredientEmoji(ing.en)}</span>
                        <span>{getIngredientTranslation(ing.en, language)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {defaultAllergies.map(allergyKey => {
                const allergyEmojis: Record<string, string> = {
                  egg: '🥚', milk: '🥛', nuts: '🥜', shellfish: '🦐', wheat: '🍞', soy: '🫘', fish: '🐟'
                };
                const translated = t(allergyKey);
                return (
                  <button key={allergyKey} onClick={() => handleAllergyToggle(translated)} className={`px-4 py-2 border rounded-full transition-colors flex items-center gap-2 ${settings.allergies.includes(translated) ? 'border-brand-primary bg-brand-light' : 'border-line-light bg-surface'}`}>
                    <span>{allergyEmojis[allergyKey]}</span>
                    <span>{translated}</span>
                  </button>
                );
              })}

              {/* Render selected allergies that are NOT in default list */}
              {settings.allergies.filter(a => !defaultAllergies.map(k => t(k)).includes(a)).map(allergyName => {
                // Try to find emoji if possible, otherwise generic
                // Note: allergyName here is likely translated if we followed logic above. 
                // Finding original english name to get emoji is hard if we only have translated.
                // Ideally we should refactor to store keys. But to fix this quickly:
                // We can search ALL_INGREDIENTS for name match.
                const foundIng = ALL_INGREDIENTS.find(i => getIngredientTranslation(i.en, language) === allergyName);
                const emoji = foundIng ? foundIng.emoji : '⚠️';

                return (
                  <button key={allergyName} onClick={() => handleAllergyToggle(allergyName)} className="px-4 py-2 border border-brand-primary bg-brand-light rounded-full transition-colors flex items-center gap-2 animate-fade-in">
                    <span>{emoji}</span>
                    <span>{allergyName}</span>
                    <XIcon className="w-4 h-4 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 3: // Spiciness
        const spicinessLevels = [
          { level: 1, labelKey: "mild" },
          { level: 2, labelKey: "medium" },
          { level: 3, labelKey: "spicy" },
          { level: 4, labelKey: "verySpicy" },
          { level: 5, labelKey: "extremelySpicy" },
        ] as const;

        return (
          <div>
            <h2 className="text-xl font-bold mb-1">{t('spicinessTitle')}</h2>
            <p className="text-text-secondary mb-8">{t('spicinessSubtitle')}</p>
            <div className="flex justify-center items-center gap-4">
              {spicinessLevels.map(s => (
                <button key={s.level} onClick={() => setSettings(prev => ({ ...prev, spicinessPreference: s.level }))}>
                  <FireIcon className={`w-8 h-8 transition-colors ${settings.spicinessPreference >= s.level ? 'text-brand-primary' : 'text-line-light'}`} isFilled={settings.spicinessPreference >= s.level} />
                </button>
              ))}
            </div>
            <p className="text-center text-text-secondary mt-4">{t(spicinessLevels[settings.spicinessPreference - 1].labelKey)}</p>
          </div>
        );
      case 4: // Cook Time
        const timeOptions = [
          { labelKey: 'timeUnder10', value: 10 },
          { labelKey: 'time10to30', value: 30 },
          { labelKey: 'timeOver30', value: 120 }
        ] as const;
        return (
          <div>
            <h2 className="text-xl font-bold mb-1">{t('cookTimeTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('cookTimeSubtitle')}</p>
            <div className="space-y-3">
              {timeOptions.map(option => {
                const timeEmojis: Record<number, string> = { 10: '⚡', 30: '⏰', 120: '🕰️' };
                return (
                  <button
                    key={option.labelKey}
                    onClick={() => setSettings({ ...settings, maxCookTime: option.value })}
                    className={`w-full text-left p-4 border rounded-xl transition-colors flex items-center gap-4 ${settings.maxCookTime === option.value ? 'border-brand-primary bg-brand-light' : 'border-line-light bg-surface'}`}
                  >
                    <span className="text-3xl">{timeEmojis[option.value]}</span>
                    <p className="font-bold text-lg">{t(option.labelKey)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 5: // Kitchen Tools
        const tools: (keyof (typeof import('../i18n'))['translations']['en'])[] = ['microwave', 'induction', 'gasStove', 'airFryer', 'oven', 'blender'];
        const handleToolToggle = (tool: string) => {
          const currentTools = settings.availableTools;
          if (currentTools.includes(tool)) {
            setSettings({ ...settings, availableTools: currentTools.filter(a => a !== tool) });
          } else {
            setSettings({ ...settings, availableTools: [...currentTools, tool] });
          }
        };
        return (
          <div>
            <h2 className="text-xl font-bold mb-1">{t('kitchenToolsTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('kitchenToolsSubtitle')}</p>
            <div className="grid grid-cols-3 gap-3">
              {tools.map(toolKey => {
                const ToolIcon = {
                  microwave: MicrowaveIcon,
                  induction: InductionIcon,
                  gasStove: GasStoveIcon,
                  airFryer: AirFryerIcon,
                  oven: OvenIcon,
                  blender: BlenderIcon
                }[toolKey] || MicrowaveIcon; // Fallback

                return (
                  <button key={toolKey} onClick={() => handleToolToggle(t(toolKey))} className={`py-4 border rounded-xl transition-colors text-center flex flex-col items-center justify-center gap-2 ${settings.availableTools.includes(t(toolKey)) ? 'border-brand-primary bg-brand-light' : 'border-line-light bg-surface'}`}>
                    <ToolIcon className={`w-8 h-8 ${settings.availableTools.includes(t(toolKey)) ? 'text-brand-primary' : 'text-text-secondary'}`} />
                    <span className="text-sm font-medium">{t(toolKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 6: // Profile & Initial Ingredients
        return (
          <div className="flex flex-col h-full space-y-4">
            <div className="bg-surface border border-line-light rounded-2xl shadow-sm p-4">
              <h2 className="text-xl font-bold mb-1">{t('profileSetupTitle')}</h2>
              <p className="text-text-secondary mb-4">{t('profileSetupSubtitle')}</p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center w-28">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                  <button
                    type="button"
                    onClick={handleProfileImageClick}
                    className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-line-light flex items-center justify-center overflow-hidden shadow-sm hover:border-brand-primary hover:shadow-md transition"
                  >
                    {settings.profileImage ? (
                      <img src={settings.profileImage} alt={t('profileSetupTitle')} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl text-text-secondary">+</span>
                    )}
                    <div className="absolute inset-0 rounded-full ring-2 ring-white/60 pointer-events-none"></div>
                  </button>
                  <p className="text-xs text-text-secondary mt-2 text-center leading-tight">{t('profileImageHint')}</p>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-bold text-text-secondary block mb-2">{t('profileNicknameLabel')}</label>
                  <input
                    type="text"
                    value={settings.nickname ?? ''}
                    onChange={e => handleNicknameChange(e.target.value)}
                    placeholder={t('profileNicknamePlaceholder')}
                    className="w-full bg-background border border-line-light rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  />
                  <p className="text-xs text-text-secondary mt-2">{t('profileNicknameHelper')}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold">{t('ingredientManagerTitle')}</h2>
                {skipIngredients && (
                  <span className="text-xs font-semibold text-text-secondary bg-background border border-line-light rounded-full px-3 py-1">
                    {t('ingredientsOptionalNote')}
                  </span>
                )}
              </div>

              {skipIngredients ? (
                <div className="flex-grow flex items-center justify-center text-text-secondary bg-surface border border-line-light rounded-2xl mt-2 px-4 text-center leading-relaxed">
                  <p className="text-sm">{t('ingredientsSkipDescription')}</p>
                </div>
              ) : (
                <>
                  <div className="p-4 pb-0 px-0">
                    <div className="relative mb-4">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                      <input
                        type="text"
                        value={customIngredientSearch}
                        onChange={handleCustomSearchChange}
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
                                    <button onClick={() => handleSuggestionSelect(ing.en)} className="w-full text-left p-2 pl-4 text-sm text-text-primary hover:bg-brand-light flex items-center gap-2">
                                      <span>{getIngredientEmoji(ing.en)}</span>
                                      <span>{getIngredientTranslation(ing.en, language)}</span>
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

                  <div className="flex-grow overflow-y-auto pr-2">
                    {selectedInitialIngredients.length === 0 ? (
                      <div className="text-center text-text-secondary mt-6">
                        <span className="text-6xl block mb-3 grayscale opacity-50">🥗</span>
                        <p className="text-base font-medium">{customIngredientSearch ? t('noSearchResults') : t('pleaseAddIngredients')}</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {INGREDIENT_CATEGORIES.map(category => {
                          const categoryIngredients = selectedInitialIngredients.filter(ing => getIngredientCategory(ing) === category);
                          if (categoryIngredients.length === 0) return null;

                          return (
                            <div key={category}>
                              <h3 className="text-sm font-bold text-text-secondary uppercase mb-3 ml-1">
                                {t(category as any)}
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {categoryIngredients.map(ing => (
                                  <div key={ing} className="bg-surface border border-line-light rounded-full pl-3 pr-2 py-2 shadow-sm flex items-center gap-2 animate-fade-in">
                                    <span className="text-lg leading-none">{getIngredientEmoji(ing)}</span>
                                    <span className="font-semibold text-text-primary text-sm whitespace-nowrap">
                                      {getIngredientTranslation(ing, language)}
                                    </span>
                                    <button
                                      onClick={() => handleInitialIngredientToggle(ing)}
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
                </>
              )}
            </div>
          </div>
        )
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={step === 1 ? onBack : handlePrev} className="text-text-primary text-lg">
          ← {t('previous')}
        </button>
        <span className="text-text-secondary">{step}/{totalSteps}</span>
      </div>
      <ProgressBar step={step} totalSteps={totalSteps} />

      <div className="flex-grow my-8 overflow-y-hidden">
        {renderStep()}
      </div>

      <div className="mt-auto">
        {step < totalSteps ? (
          <button onClick={handleNext} className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl">
            {t('next')}
          </button>
        ) : (
          <button onClick={handleFinish} className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl">
            {t('finish')}
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;