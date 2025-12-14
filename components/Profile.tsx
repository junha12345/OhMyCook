
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { User, UserSettings } from '../types';
import MainHeader from './MainHeader';
import { ProfileIcon, BookmarkIcon, ShoppingCartIcon } from './icons';
import Onboarding from './Onboarding';

interface ProfileProps {
    user: User | null;
    settings: UserSettings;
    onLogout: () => void;
    onNavigate: (view: any) => void;
    onUpdateSettings: (settings: UserSettings) => void;
    onLogoClick?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, settings, onLogout, onNavigate, onUpdateSettings, onLogoClick }) => {
    const { t, language, setLanguage } = useLanguage();
    const [showSettings, setShowSettings] = useState(false);
    const displayName = settings.nickname?.trim() || (user ? user.email.split('@')[0] : 'Guest');

    if (showSettings) {
        return (
            <div className="fixed inset-0 z-[100] bg-background">
                <Onboarding
                    initialSettings={settings}
                    onSave={(newSettings) => {
                        onUpdateSettings(newSettings);
                        setShowSettings(false);
                    }}
                    onBack={() => setShowSettings(false)}
                    skipIngredients={true}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pb-24">
            <MainHeader onLogoClick={onLogoClick} />

            <div className="p-6 space-y-6 overflow-y-auto">
                {/* User Info Card */}
                <div className="bg-surface p-6 rounded-2xl shadow-sm border border-line-light flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-primary overflow-hidden">
                        {settings.profileImage ? (
                            <img src={settings.profileImage} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <ProfileIcon className="w-8 h-8" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">
                            {displayName}
                        </h2>
                        <p className="text-sm text-text-secondary">{user?.email}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onNavigate('savedRecipes')}
                        className="bg-surface p-4 rounded-xl border border-line-light shadow-sm flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                        <div className="p-3 bg-red-50 text-red-500 rounded-full">
                            <BookmarkIcon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-text-primary">{t('savedRecipesTitle')}</span>
                    </button>

                    <button
                        onClick={() => onNavigate('shoppingList')}
                        className="bg-surface p-4 rounded-xl border border-line-light shadow-sm flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-full">
                            <ShoppingCartIcon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-text-primary">{t('shoppingListTitle')}</span>
                    </button>
                </div>

                {/* Settings Section */}
                <div className="space-y-3">
                    <div className="bg-surface rounded-xl border border-line-light overflow-hidden">
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-line-light last:border-0"
                        >
                            <span className="font-medium text-text-primary">{t('language')}</span>
                            <span className="text-sm font-bold text-brand-primary bg-brand-light px-3 py-1 rounded-full">
                                {language === 'en' ? 'English' : '한국어'}
                            </span>
                        </button>

                        <button
                            onClick={() => setShowSettings(true)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-line-light last:border-0"
                        >
                            <span className="font-medium text-text-primary">{t('customSettings')}</span>
                            <span className="text-text-secondary">➜</span>
                        </button>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="w-full py-4 text-red-500 font-bold bg-surface border border-red-100 rounded-xl hover:bg-red-50 transition-colors mt-auto"
                >
                    {t('logout')}
                </button>
            </div>
        </div>
    );
};

export default Profile;
