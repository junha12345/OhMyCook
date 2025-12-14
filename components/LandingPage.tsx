import React from 'react';
import { useLanguage } from '../context/LanguageContext';
// Assuming the image is in the root and configured to be imported. 
// If it's a static asset, we might reference it by string path if Vite is configured to serve root.
// However, referencing it as an import is safer in Vite for assets.
// Since the file is in the root where App.tsx is, we can try to import it.
// Note: Typescript might complain if .png module definition is missing.
// I will assume standard Vite setup where imports work or url reference works.
// Given strict TS, I'll use a relative path string which Vite usually resolves if in public, 
// but here it is in root. 
// Let's try importing.
// import landingHero from '../landing_hero.png'; 

import { LogoIcon } from './icons';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const { t } = useLanguage();

  return (
    <div className="h-[100dvh] bg-background flex flex-col items-center justify-between p-6 overflow-y-auto">
      <div className="w-full flex-grow flex flex-col items-center justify-center space-y-8">
        <div className="w-full max-w-sm aspect-square rounded-full overflow-hidden shadow-xl border-4 border-surface relative">
          {/* Using the image we added */}
          <img
            src="/landing_hero.png"
            alt="Delicious Food"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
            }}
          />
        </div>

        <div className="text-center space-y-4 max-w-sm">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg">
              <LogoIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-text-primary leading-tight">
              {t('mainTitle')}
            </h1>
          </div>
          <p className="text-text-secondary text-lg">
            {t('mainSubtitle')}
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 mb-8">
        <button
          onClick={onGetStarted}
          className="w-full bg-brand-primary text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-brand-dark transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {t('getStarted') || "Get Started"}
        </button>

        <button
          onClick={onLogin}
          className="w-full bg-surface text-brand-primary font-bold py-4 px-6 rounded-xl border-2 border-brand-primary/20 hover:bg-brand-light transition-all"
        >
          {t('login') || "I already have an account"}
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
