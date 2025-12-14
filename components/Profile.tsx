
import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { User, UserSettings } from '../types';
import MainHeader from './MainHeader';
import { ProfileIcon, BookmarkIcon, ShoppingCartIcon, CheckIcon, PencilIcon } from './icons';
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
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [editNicknameValue, setEditNicknameValue] = useState(settings.nickname || '');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const displayName = settings.nickname?.trim() || (user ? user.email.split('@')[0] : 'Guest');

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            onUpdateSettings({ ...settings, profileImage: result });
        };
        reader.readAsDataURL(file);
    };

    const handleSaveNickname = () => {
        if (editNicknameValue.trim()) {
            onUpdateSettings({ ...settings, nickname: editNicknameValue.trim() });
        }
        setIsEditingNickname(false);
    };

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
                    includeProfileStep={false}
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
                    <div className="relative">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProfileImageChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-primary overflow-hidden relative group"
                        >
                            {settings.profileImage ? (
                                <img src={settings.profileImage} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <ProfileIcon className="w-8 h-8" />
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <PencilIcon className="w-5 h-5 text-white" />
                            </div>
                        </button>
                    </div>

                    <div className="flex-1">
                        {isEditingNickname ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editNicknameValue}
                                    onChange={(e) => setEditNicknameValue(e.target.value)}
                                    className="border border-brand-primary rounded-lg px-2 py-1 text-lg font-bold w-full focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveNickname();
                                    }}
                                />
                                <button onClick={handleSaveNickname} className="text-brand-primary p-1">
                                    <CheckIcon className="w-6 h-6" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-text-primary">
                                    {displayName}
                                </h2>
                                <button onClick={() => {
                                    setEditNicknameValue(displayName);
                                    setIsEditingNickname(true);
                                }} className="text-text-secondary hover:text-brand-primary transition-colors">
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
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
