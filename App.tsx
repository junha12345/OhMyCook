import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
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
import PageTransition from './components/PageTransition';
import {
  getUserIngredients,
  getUserSavedRecipes,
  replaceUserIngredients,
  replaceUserSavedRecipes,
  saveUserProfile,
} from './services/supabaseService';

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
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [ingredientsLoaded, setIngredientsLoaded] = useState(false);
  const [savedRecipesLoaded, setSavedRecipesLoaded] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState<View>('tab');
  const [currentTab, setCurrentTab] = useState<Tab>('cook');
  const [previousView, setPreviousView] = useState<View>('tab');
  const [navigationDirection, setNavigationDirection] = useState<'left' | 'right' | 'fade'>('left');
  const [chatContext, setChatContext] = useState<Recipe | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [chatOpenedFromRecipe, setChatOpenedFromRecipe] = useState<Recipe | null>(null);
  const [openedRecipeModal, setOpenedRecipeModal] = useState<Recipe | null>(null);

  const [users, setUsers] = useLocalStorage<User[]>('ohmycook-users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('ohmycook-currentUser', null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const { language, t } = useLanguage();

  const generateUserId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  };

  const getUserScopedKey = (key: string, userId?: string | null) => `ohmycook-${key}-${userId ?? 'guest'}`;

  const loadCachedState = <T,>(key: string, fallback: T) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch (error) {
      console.error('Failed to parse cached state', error);
      return fallback;
    }
  };

  const persistCachedState = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to persist cached state', error);
    }
  };

  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    let needsUpdate = false;
    const updatedUsers = users.map(user => {
      if (user.id) return user;
      needsUpdate = true;
      return { ...user, id: generateUserId() };
    });

    if (needsUpdate) {
      setUsers(updatedUsers);

      if (currentUser) {
        const refreshedUser = updatedUsers.find(user => user.email === currentUser.email);
        if (refreshedUser) {
          setCurrentUser(refreshedUser);
        }
      }
    }
  }, [users, currentUser, setUsers, setCurrentUser]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('appTitle');
  }, [language, t]);

  useEffect(() => {
    if (!currentUser) return;

    const settingsKey = getUserScopedKey('settings', currentUser.id);
    const ingredientsKey = getUserScopedKey('ingredients', currentUser.id);
    const savedRecipesKey = getUserScopedKey('savedrecipes', currentUser.id);
    const shoppingListKey = getUserScopedKey('shoppinglist', currentUser.id);

    persistCachedState(settingsKey, settings);
    persistCachedState(ingredientsKey, ingredients);
    persistCachedState(savedRecipesKey, savedRecipes);
    persistCachedState(shoppingListKey, shoppingList);
  }, [currentUser, settings, ingredients, savedRecipes, shoppingList]);

  useEffect(() => {
    if (!currentUser || !ingredientsLoaded) return;

    const pushIngredients = async () => {
      try {
        await replaceUserIngredients(currentUser.id, ingredients);
      } catch (error) {
        console.error('Failed to persist ingredients to Supabase', error);
      }
    };

    pushIngredients();
  }, [currentUser, ingredients, ingredientsLoaded]);

  useEffect(() => {
    if (!currentUser || !savedRecipesLoaded) return;

    const pushSavedRecipes = async () => {
      try {
        await replaceUserSavedRecipes(currentUser.id, savedRecipes);
      } catch (error) {
        console.error('Failed to persist saved recipes to Supabase', error);
      }
    };

    pushSavedRecipes();
  }, [currentUser, savedRecipes, savedRecipesLoaded]);

  useEffect(() => {
    if (!currentUser) {
      setSettings(defaultSettings);
      setIngredients([]);
      setSavedRecipes([]);
      setShoppingList([]);
      setIngredientsLoaded(false);
      setSavedRecipesLoaded(false);
      return;
    }

    const settingsKey = getUserScopedKey('settings', currentUser.id);
    const ingredientsKey = getUserScopedKey('ingredients', currentUser.id);
    const savedRecipesKey = getUserScopedKey('savedrecipes', currentUser.id);
    const shoppingListKey = getUserScopedKey('shoppinglist', currentUser.id);

    const cachedSettings = loadCachedState<UserSettings>(settingsKey, defaultSettings);
    setSettings(cachedSettings);
    setIngredients(loadCachedState<Ingredient[]>(ingredientsKey, []));
    setSavedRecipes(loadCachedState<Recipe[]>(savedRecipesKey, []));
    setShoppingList(loadCachedState<ShoppingListItem[]>(shoppingListKey, []));

    setIngredientsLoaded(false);
    setSavedRecipesLoaded(false);

    const syncUserData = async () => {
      try {
        await saveUserProfile({
          id: currentUser.id,
          email: currentUser.email,
          display_name: currentUser.email.split('@')[0],
          has_completed_onboarding: currentUser.hasCompletedOnboarding,
          preferred_cuisines: cachedSettings.preferredCuisines,
        });

        const [remoteIngredients, remoteSavedRecipes] = await Promise.all([
          getUserIngredients(currentUser.id).catch(() => []),
          getUserSavedRecipes(currentUser.id).catch(() => []),
        ]);

        setIngredients(
          remoteIngredients.length
            ? remoteIngredients.map(item => ({ name: item.ingredient_name, quantity: item.quantity }))
            : [],
        );

        setSavedRecipes(remoteSavedRecipes.length ? remoteSavedRecipes.map(item => item.recipe_data) : []);
      } catch (error) {
        console.error('Failed to sync user data from Supabase', error);
      } finally {
        setIngredientsLoaded(true);
        setSavedRecipesLoaded(true);
      }
    };

    syncUserData();
  }, [currentUser]);

  const handleNavigate = (view: View, isBack: boolean = false) => {
    setPreviousView(currentView);
    setNavigationDirection(isBack ? 'right' : 'left');
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
    setNavigationDirection('right');
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
    if (currentUser) {
      const hasCompletedOnboarding = currentUser.hasCompletedOnboarding || initialIngredients.length > 0;
      if (!currentUser.hasCompletedOnboarding && hasCompletedOnboarding) {
        const updatedUsers = users.map(user =>
          user.email === currentUser.email
            ? { ...user, hasCompletedOnboarding: true }
            : user
        );
        setUsers(updatedUsers);
        setCurrentUser(prevUser => (prevUser ? { ...prevUser, hasCompletedOnboarding: true } : null));
      }

      (async () => {
        try {
          await saveUserProfile({
            id: currentUser.id,
            email: currentUser.email,
            display_name: currentUser.email.split('@')[0],
            has_completed_onboarding: hasCompletedOnboarding,
            preferred_cuisines: newSettings.preferredCuisines,
          });
        } catch (error) {
          console.error('Failed to persist user settings', error);
        }
      })();
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
    const userWithId = user.id ? user : { ...user, id: generateUserId() };

    if (!user.id) {
      setUsers(prev => prev.map(u => (u.email === user.email ? userWithId : u)));
    }

    setCurrentUser(userWithId);

    (async () => {
      try {
        await saveUserProfile({
          id: userWithId.id,
          email: userWithId.email,
          display_name: userWithId.email.split('@')[0],
          has_completed_onboarding: userWithId.hasCompletedOnboarding,
          preferred_cuisines: settings.preferredCuisines,
        });
      } catch (error) {
        console.error('Failed to save login profile', error);
      }
    })();

    if (userWithId.hasCompletedOnboarding) {
      setCurrentView('tab');
      setCurrentTab('cook');
    } else {
      setCurrentView('onboarding');
    }
  };

  const handleSignup = (newUser: Pick<User, 'email' | 'password'>) => {
    const userWithId: User = { ...newUser, id: generateUserId(), hasCompletedOnboarding: false };
    setUsers(prev => [...prev, userWithId]);
    setCurrentUser(userWithId);

    (async () => {
      try {
        await saveUserProfile({
          id: userWithId.id,
          email: userWithId.email,
          display_name: userWithId.email.split('@')[0],
          has_completed_onboarding: false,
          preferred_cuisines: [],
        });
      } catch (error) {
        console.error('Failed to save signup profile', error);
      }
    })();

    setCurrentView('onboarding');
  };

  const handleLogout = () => {
    setSettings(defaultSettings);
    setIngredients([]);
    setSavedRecipes([]);
    setShoppingList([]);
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
          onGetStarted={() => { setNavigationDirection('fade'); setAuthMode('signup'); setCurrentView('auth'); }}
          onLogin={() => { setNavigationDirection('fade'); setAuthMode('login'); setCurrentView('auth'); }}
        />
      );
    }

    return (
      <AnimatePresence mode="wait" custom={navigationDirection}>
        {(() => {
          switch (currentView) {
            case 'auth':
              return (
                <PageTransition key="auth" direction={navigationDirection}>
                  <Auth onLogin={handleLogin} onSignup={handleSignup} users={users} onBack={() => { setNavigationDirection('right'); setCurrentView('tab'); setCurrentTab('cook'); }} initialMode={authMode} />
                </PageTransition>
              );
            case 'onboarding':
              return (
                <PageTransition key="onboarding" direction={navigationDirection}>
                  <Onboarding initialSettings={settings} onSave={handleSaveSettings} onBack={() => { setNavigationDirection('right'); setCurrentView(currentUser ? 'tab' : 'auth'); }} />
                </PageTransition>
              );

            case 'recommendations':
              return (
                <PageTransition key="recommendations" direction={navigationDirection}>
                  <RecipeRecommendations
                    ingredients={ingredients}
                    onBack={() => { setNavigationDirection('right'); setCurrentView('tab'); setCurrentTab('cook'); setOpenedRecipeModal(null); }}
                    shoppingList={shoppingList}
                    onToggleShoppingListItem={handleToggleShoppingListItem}
                    savedRecipes={savedRecipes}
                    onToggleSaveRecipe={handleToggleSaveRecipe}
                    onStartChat={handleStartChat}
                    initialOpenedRecipe={openedRecipeModal}
                    onRecipeModalChange={setOpenedRecipeModal}
                  />
                </PageTransition>
              );

            case 'chat':
              const recipeKey = chatContext?.recipeName || '__general__';
              return (
                <PageTransition key="chat" direction={navigationDirection}>
                  <AIChef
                    settings={settings}
                    onBack={handleChatBack}
                    recipeContext={chatContext}
                    initialMessages={chatHistories[recipeKey] || []}
                    onMessagesUpdate={(messages) => handleChatMessagesUpdate(recipeKey, messages)}
                    openedFromRecipe={chatOpenedFromRecipe}
                    onCloseRecipeContext={() => setChatOpenedFromRecipe(null)}
                  />
                </PageTransition>
              );

            case 'shoppingList':
              return (
                <PageTransition key="shoppingList" direction={navigationDirection}>
                  <ShoppingList shoppingList={shoppingList} setShoppingList={setShoppingList} onBack={() => { setNavigationDirection('right'); setCurrentView('tab'); setCurrentTab('profile'); }} />
                </PageTransition>
              );

            case 'savedRecipes':
              return (
                <PageTransition key="savedRecipes" direction={navigationDirection}>
                  <SavedRecipes
                    savedRecipes={savedRecipes}
                    onBack={() => { setNavigationDirection('right'); setCurrentView('tab'); setCurrentTab('profile'); }}
                    shoppingList={shoppingList}
                    onToggleShoppingListItem={handleToggleShoppingListItem}
                    onToggleSaveRecipe={handleToggleSaveRecipe}
                    onStartChat={handleStartChat}
                  />
                </PageTransition>
              );

            case 'tab':
            default:
              return (
                <div key="tab" className="h-full">
                  {renderTab()}
                  <BottomNavigation currentTab={currentTab} onTabChange={handleTabChange} />
                </div>
              );
          }
        })()}
      </AnimatePresence>
    );
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-background text-text-primary font-sans transition-colors duration-300 relative w-full">
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