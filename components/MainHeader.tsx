import React from 'react';
import { LogoIcon, ArrowLeftIcon } from './icons';
import { useLanguage } from '../context/LanguageContext';

interface MainHeaderProps {
    onBack?: () => void;
    onLogoClick?: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({ onBack, onLogoClick }) => {
    useLanguage();
    return (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-line-light">
            <div className="container mx-auto px-4 py-3 flex items-center h-16">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button onClick={onBack} className="mr-2 p-1 -ml-1 text-text-primary hover:text-brand-primary">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onLogoClick}
                        className={`w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center ${onLogoClick ? 'hover:scale-105 transition-transform' : ''}`}
                        aria-label="Go home"
                    >
                        <LogoIcon className="w-7 h-7 text-white" />
                    </button>
                    <span className="font-bold text-xl text-text-primary">OhMyCook</span>
                </div>
            </div>
        </header>
    );
};

export default MainHeader;
