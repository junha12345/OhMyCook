import React from 'react';
import { ChefHatIcon, TrendingUpIcon, ProfileIcon } from './icons';
import { useLanguage } from '../context/LanguageContext';

type Tab = 'cook' | 'popular' | 'profile';

interface BottomNavigationProps {
    currentTab: Tab;
    onTabChange: (tab: Tab) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentTab, onTabChange }) => {
    const { t } = useLanguage();

    const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
        { id: 'cook', icon: ChefHatIcon, label: t('cook') || 'Cook' },
        { id: 'popular', icon: TrendingUpIcon, label: t('popular') || 'Popular' },
        { id: 'profile', icon: ProfileIcon, label: t('profile') || 'Profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 max-w-lg mx-auto">
            <div className="flex justify-between items-center">
                {tabs.map((tab) => {
                    const isActive = currentTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className="flex flex-col items-center gap-1 min-w-[64px]"
                        >
                            <div
                                className={`p-2 rounded-full transition-all duration-300 ${isActive
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 transform -translate-y-4 border-4 border-white'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <tab.icon className={`w-6 h-6 ${isActive ? 'w-7 h-7' : ''}`} />
                            </div>
                            <span
                                className={`text-xs font-medium transition-colors duration-200 ${isActive ? 'text-orange-500 font-bold opacity-100 transform -translate-y-2' : 'text-gray-400'
                                    }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNavigation;
