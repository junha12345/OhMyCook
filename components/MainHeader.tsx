import React from 'react';
import { LogoIcon } from './icons';
import { useLanguage } from '../context/LanguageContext';

const MainHeader: React.FC = () => {
    const { t } = useLanguage();
    return (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-line-light">
            <div className="container mx-auto px-4 py-3 flex items-center h-16">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                        <LogoIcon className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-xl text-text-primary">OhMyCook</span>
                </div>
            </div>
        </header>
    );
};

export default MainHeader;
