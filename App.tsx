import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { UserSettings, Ingredient, ShoppingListItem, Recipe, User, ChatMessage } from './types';
import IngredientManager from './components/IngredientManager';
import RecipeRecommendations from './components/RecipeRecommendations';
import AIChef from './components/AIChef';
import PopularRecipes from './components/PopularRecipes';
import Onboarding from './components/Onboarding';
import ShoppingList from './components/ShoppingList';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Spinner from './components/Spinner';
import SavedRecipes from './components/SavedRecipes';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import BottomNavigation from './components/BottomNavigation';
import Profile from './components/Profile';

const defaultSettings: UserSettings = {
  cookingLevel: 'Beginner',
  allergies: [],
  preferredCuisines: [],
  dislikedIngredients: [],
  availableTools: [],
  spicinessPreference: 3,
  maxCookTime: 30,
};

type Tab = 'cook' | 'chat' | 'popular' | 'profile';
type View = 'tab' | 'onboarding' | 'recommendations' | 'chat' | 'shoppingList' | 'savedRecipes' | 'auth';

// Main App Content Component
const AppContent: React.FC = () => {
  const [settings, setSettings] = useLocalStorage<UserSettings>('ohmycook-settings', defaultSettings);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('ohmycook-ingredients', []);
  const [shoppingList, setShoppingList] = useLocalStorage<ShoppingListItem[]>('ohmycook-shoppinglist', []);
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>('ohmycook-savedrecipes', []);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Navigation State
  const [currentView, setCurrentView] = useState<View>('tab');
  const [currentTab, setCurrentTab] = useState<Tab>('cook');
  const [previousView, setPreviousView] = useState<View>('tab');
  const [chatContext, setChatContext] = useState<Recipe | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [chatOpenedFromRecipe, setChatOpenedFromRecipe] = useState<Recipe | null>(null);
  const [openedRecipeModal, setOpenedRecipeModal] = useState<Recipe | null>(null);

  const [users, setUsers] = useLocalStorage<User[]>('ohmycook-users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('ohmycook-currentUser', null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const { language, t } = useLanguage();

  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('appTitle');
  }, [language, t]);

  const handleNavigate = (view: View) => {
    setPreviousView(currentView);
    setCurrentView(view);
  };

  const handleTabChange = (tab: Tab) => {
    setCurrentTab(tab);
    setCurrentView('tab');
  };

  const handleStartChat = (recipe: Recipe) => {
    setChatContext(recipe);
    setChatOpenedFromRecipe(recipe);
    setOpenedRecipeModal(recipe); // Remember which modal was open
    handleNavigate('chat');
  };

  const handleChatMessagesUpdate = (recipeKey: string, messages: ChatMessage[]) => {
    setChatHistories(prev => ({
      ...prev,
      [recipeKey]: messages
    }));
  };

  const handleChatBack = () => {
    setCurrentView(previousView);
    // Keep openedRecipeModal so RecipeRecommendations can reopen it
    // Clear chatOpenedFromRecipe after navigating back
    setChatOpenedFromRecipe(null);
  };

  const handleSaveSettings = (newSettings: UserSettings, initialIngredients: string[] = []) => {
    setSettings(newSettings);

    if (initialIngredients.length > 0) {
      const currentIngredientNames = new Set(ingredients.map(i => i.name));
      const newIngredientsToAdd = initialIngredients
        .filter(name => !currentIngredientNames.has(name))
        .map(name => ({ name, quantity: t('basicUnit') }));

      setIngredients(prev => [...prev, ...newIngredientsToAdd]);
    }

    // Mark onboarding as complete for the current user
    if (currentUser && !currentUser.hasCompletedOnboarding) {
      const updatedUsers = users.map(user =>
        user.email === currentUser.email
          ? { ...user, hasCompletedOnboarding: true }
          : user
      );
      setUsers(updatedUsers);
      setCurrentUser(prevUser => (prevUser ? { ...prevUser, hasCompletedOnboarding: true } : null));
    }

    setCurrentView('tab');
    setCurrentTab('cook');
  };

  const handleToggleShoppingListItem = (itemName: string) => {
    setShoppingList(prev => {
      const exists = prev.some(item => item.name === itemName);
      if (exists) {
        return prev.filter(item => item.name !== itemName);
      } else {
        return [...prev, { name: itemName }];
      }
    });
  };

  const handleToggleSaveRecipe = (recipeToToggle: Recipe) => {
    setSavedRecipes(prev => {
      const exists = prev.some(r => r.recipeName === recipeToToggle.recipeName);
      if (exists) {
        return prev.filter(r => r.recipeName !== recipeToToggle.recipeName);
      } else {
        return [...prev, recipeToToggle];
      }
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.hasCompletedOnboarding) {
      setCurrentView('tab');
      setCurrentTab('cook');
    } else {
      setCurrentView('onboarding');
    }
  };

  const handleSignup = (newUser: Pick<User, 'email' | 'password'>) => {
    setUsers(prev => [...prev, { ...newUser, hasCompletedOnboarding: false }]);
    setCurrentView('auth');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('tab');
    setCurrentTab('cook'); // Or stay on profile? Better to go to home/auth.
    // If we want to force login on home screen, we can do that in renderTab.
    // But current logic allows guest browsing for some parts?
    // Actually, LandingPage is shown if !currentUser.
  };

  const renderTab = () => {
    switch (currentTab) {
      case 'cook':
        return (
          <IngredientManager
            ingredients={ingredients}
            setIngredients={setIngredients}
            // onBack removed as it is main tab
            onGenerateRecipe={() => handleNavigate('recommendations')}
          />
        );
      case 'chat':
        return (
          <AIChef
            settings={settings}
            onBack={() => { }} // Tab view, no back action
            showBack={false}
            recipeContext={null} // General chat
          />
        );
      case 'popular':
        return (
          <PopularRecipes
            onBack={() => { }} // No back needed for main tab
            shoppingList={shoppingList}
            onToggleShoppingListItem={handleToggleShoppingListItem}
            savedRecipes={savedRecipes}
            onToggleSaveRecipe={handleToggleSaveRecipe}
            onStartChat={handleStartChat}
            initialOpenedRecipe={openedRecipeModal}
            onRecipeModalChange={setOpenedRecipeModal}
          />
        );
      case 'profile':
        return (
          <Profile
            user={currentUser}
            settings={settings}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onUpdateSettings={handleSaveSettings}
          />
        );
      default:
        return null;
    }
  };

  const renderView = () => {
    if (isInitialLoad) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;

    // Global Auth Check for main flows if needed, but LandingPage handles guests.
    if (!currentUser && currentView !== 'auth' && currentView !== 'onboarding') {
      return (
        <LandingPage
          onGetStarted={() => { setAuthMode('signup'); setCurrentView('auth'); }}
          onLogin={() => { setAuthMode('login'); setCurrentView('auth'); }}
        />
      );
    }

    switch (currentView) {
      case 'auth':
        return <Auth onLogin={handleLogin} onSignup={handleSignup} users={users} onBack={() => { setCurrentView('tab'); setCurrentTab('cook'); }} initialMode={authMode} />;
      case 'onboarding':
        return <Onboarding initialSettings={settings} onSave={handleSaveSettings} onBack={() => { setCurrentView(currentUser ? 'tab' : 'auth'); }} />;

      case 'recommendations':
        return <RecipeRecommendations
          ingredients={ingredients}
          onBack={() => { setCurrentView('tab'); setCurrentTab('cook'); setOpenedRecipeModal(null); }}
          shoppingList={shoppingList}
          onToggleShoppingListItem={handleToggleShoppingListItem}
          savedRecipes={savedRecipes}
          onToggleSaveRecipe={handleToggleSaveRecipe}
          onStartChat={handleStartChat}
          initialOpenedRecipe={openedRecipeModal}
          onRecipeModalChange={setOpenedRecipeModal}
        />;

      case 'chat':
        const recipeKey = chatContext?.recipeName || '__general__';
        return <AIChef
          settings={settings}
          onBack={handleChatBack}
          recipeContext={chatContext}
          initialMessages={chatHistories[recipeKey] || []}
          onMessagesUpdate={(messages) => handleChatMessagesUpdate(recipeKey, messages)}
          openedFromRecipe={chatOpenedFromRecipe}
          onCloseRecipeContext={() => setChatOpenedFromRecipe(null)}
        />;

      case 'shoppingList':
        return <ShoppingList shoppingList={shoppingList} setShoppingList={setShoppingList} onBack={() => { setCurrentView('tab'); setCurrentTab('profile'); }} />;

      case 'savedRecipes':
        return <SavedRecipes
          savedRecipes={savedRecipes}
          onBack={() => { setCurrentView('tab'); setCurrentTab('profile'); }}
          shoppingList={shoppingList}
          onToggleShoppingListItem={handleToggleShoppingListItem}
          onToggleSaveRecipe={handleToggleSaveRecipe}
          onStartChat={handleStartChat}
        />;

      case 'tab':
      default:
        return (
          <>
            <div className="pb-20">
              {renderTab()}
            </div>
            <BottomNavigation currentTab={currentTab} onTabChange={handleTabChange} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans transition-colors duration-300 max-w-lg mx-auto relative shadow-2xl">
      {renderView()}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;