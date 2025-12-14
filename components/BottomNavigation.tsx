import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHatIcon, TrendingUpIcon, ProfileIcon, ChatBubbleIcon, FridgeIcon } from './icons';
import { useLanguage } from '../context/LanguageContext';

type Tab = 'cook' | 'chat' | 'popular' | 'profile';

interface BottomNavigationProps {
    currentTab: Tab;
    onTabChange: (tab: Tab) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentTab, onTabChange }) => {
    const { t } = useLanguage();

    const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
        { id: 'cook', icon: FridgeIcon, label: 'Fridge' },

        { id: 'chat', icon: ChatBubbleIcon, label: t('chat') || 'Chat' },
        { id: 'popular', icon: TrendingUpIcon, label: t('popular') || 'Popular' },
        { id: 'profile', icon: ProfileIcon, label: t('profile') || 'Profile' },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 p-2">
            <div className="flex justify-between items-center px-2">
                {tabs.map((tab) => {
                    const isActive = currentTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className="relative flex flex-col items-center justify-center w-16 h-14"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-tr from-orange-400 to-orange-500 rounded-3xl shadow-lg shadow-orange-500/30"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <div className="relative z-10 flex flex-col items-center justify-center">
                                <tab.icon
                                    className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-400'}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            initial={{ opacity: 0, height: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                            exit={{ opacity: 0, height: 0, scale: 0.5 }}
                                            className="text-[10px] font-bold text-white mt-1"
                                        >
                                            {tab.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNavigation;
