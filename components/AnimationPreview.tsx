
import React from 'react';
import Header from './Header';
import { cookingAnimation, platingAnimation } from './animations';
import { useLanguage } from '../context/LanguageContext';

interface AnimationPreviewProps {
  onBack: () => void;
}

const AnimationPreview: React.FC<AnimationPreviewProps> = ({ onBack }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header title="애니메이션 미리보기" onBack={onBack} />
      <div className="flex-grow p-6 overflow-y-auto text-center">
        <h1 className="text-2xl font-bold mb-8">로딩 애니메이션 미리보기</h1>
        
        <div className="bg-surface rounded-2xl p-6 mb-8 shadow-subtle">
          <h2 className="text-xl font-bold text-brand-primary mb-4">{t('loadingRecipes')} (50% 미만)</h2>
          <img 
            src={cookingAnimation} 
            alt="Cooking animation"
            className="w-40 h-40 mx-auto border border-line-light rounded-lg"
          />
        </div>

        <div className="bg-surface rounded-2xl p-6 shadow-subtle">
          <h2 className="text-xl font-bold text-brand-primary mb-4">{t('loadingRecipesAlmostDone')} (50% 이상)</h2>
          <img 
            src={platingAnimation} 
            alt="Plating animation"
            className="w-40 h-40 mx-auto border border-line-light rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default AnimationPreview;
