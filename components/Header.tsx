
import React from 'react';
import { BackArrowIcon } from './icons';

interface HeaderProps {
    title: string;
    onBack?: () => void;
    showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, onBack, showBack = true }) => {
    return (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-3 flex items-center relative h-16">
                {showBack && onBack && (
                    <button
                        onClick={onBack}
                        className="absolute left-4 text-text-primary p-2"
                        aria-label="Go back"
                    >
                        <BackArrowIcon className="w-6 h-6" />
                    </button>
                )}
                <h1 className="text-lg font-bold text-text-primary text-center w-full">
                    {title}
                </h1>
            </div>
        </header>
    );
};

export default Header;
