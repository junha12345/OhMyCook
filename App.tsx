import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocalStorage } from './hooks/useLocalStorage';
import { UserSettings, Ingredient, ShoppingListItem, Recipe, User, ChatMessage, CommunityPost, RecipeFilters } from './types';
import IngredientManager from './components/IngredientManager';
import RecipeRecommendations from './components/RecipeRecommendations';
import AIChef from './components/AIChef';
import Community from './components/Community';
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
import { supabase } from './services/supabaseClient';

const defaultSettings: UserSettings = {
  cookingLevel: 'Beginner',
  allergies: [],
  preferredCuisines: [],
  dislikedIngredients: [],
  availableTools: [],
  spicinessPreference: 3,
  maxCookTime: 30,
  nickname: '',
  profileImage: '',
};

type Tab = 'cook' | 'chat' | 'community' | 'profile';
type View = 'tab' | 'onboarding' | 'recommendations' | 'chat' | 'shoppingList' | 'savedRecipes' | 'auth';

// Main App Content Component
const AppContent: React.FC = () => {
  const [users, setUsers] = useLocalStorage<User[]>('ohmycook-users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('ohmycook-currentUser', null);

  const userStorageSuffix = currentUser?.email ?? 'guest';

  const [settings, setSettings] = useLocalStorage<UserSettings>(`ohmycook-settings-${userStorageSuffix}`, defaultSettings);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>(`ohmycook-ingredients-${userStorageSuffix}`, []);
  const [shoppingList, setShoppingList] = useLocalStorage<ShoppingListItem[]>(`ohmycook-shoppinglist-${userStorageSuffix}`, []);
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>(`ohmycook-savedrecipes-${userStorageSuffix}`, []);
  const [communityPosts, setCommunityPosts] = useLocalStorage<CommunityPost[]>('ohmycook-community-posts', []);

  const defaultRecipeFilters: RecipeFilters = {
    cuisine: 'any',
    servings: 2,
    spiciness: 'medium',
    difficulty: 'medium',
    maxCookTime: 45,
  };

  const [cachedRecipes, setCachedRecipes] = useLocalStorage<Recipe[]>(`ohmycook-recipes-${userStorageSuffix}`, []);
  const [cachedRecipeFilters, setCachedRecipeFilters] = useLocalStorage<RecipeFilters>(`ohmycook-recipefilters-${userStorageSuffix}`, defaultRecipeFilters);
  const [cachedPriorityIngredients, setCachedPriorityIngredients] = useLocalStorage<string[]>(`ohmycook-priority-${userStorageSuffix}`, []);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Navigation State
  const [currentView, setCurrentView] = useState<View>('tab');
  const [currentTab, setCurrentTab] = useState<Tab>('cook');
  const [previousView, setPreviousView] = useState<View>('tab');
  const [navigationDirection, setNavigationDirection] = useState<'left' | 'right' | 'fade'>('left');
  const [chatContext, setChatContext] = useState<Recipe | null>(null);
  const [chatHistories, setChatHistories] = useLocalStorage<Record<string, ChatMessage[]>>(`ohmycook-chatHistories-${userStorageSuffix}`, {});
  const [chatOpenedFromRecipe, setChatOpenedFromRecipe] = useState<Recipe | null>(null);
  const [openedRecipeModal, setOpenedRecipeModal] = useState<Recipe | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const { language, t } = useLanguage();

  useEffect(() => {
    setIsInitialLoad(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        const email = session.user.email;
        // Check if user exists in local storage
        setUsers(prevUsers => {
          const existingUser = prevUsers.find(u => u.email === email);
          if (existingUser) {
            setCurrentUser(existingUser);
            if (existingUser.hasCompletedOnboarding) {
              setCurrentView('tab');
              setCurrentTab('cook');
            } else {
              setCurrentView('onboarding');
            }
            return prevUsers;
          } else {
            // New user from social auth
            const newUser: User = {
              email,
              hasCompletedOnboarding: false,
            };
            setCurrentUser(newUser); // Will trigger onboarding if not completed
            setCurrentView('onboarding'); // Force onboarding for new Google users
            return [...prevUsers, newUser];
          }
        });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentView('tab');
        setCurrentTab('cook');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('appTitle');
  }, [language, t]);

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
    const normalizedRecipe: Recipe = recipeToToggle.isDetailsLoaded === false ? { ...recipeToToggle, isDetailsLoaded: true } : recipeToToggle;
    setSavedRecipes(prev => {
      const exists = prev.some(r => r.recipeName === normalizedRecipe.recipeName);
      if (exists) {
        return prev.filter(r => r.recipeName !== normalizedRecipe.recipeName);
      } else {
        return [...prev, normalizedRecipe];
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
    const exists = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (exists) {
      return { ok: false, reason: 'duplicate' as const };
    }
    setUsers(prev => [...prev, { ...newUser, hasCompletedOnboarding: false }]);
    setCurrentView('auth');
    return { ok: true as const };
  };

  const handleRecipeDetailsLoaded = (updatedRecipe: Recipe) => {
    setSavedRecipes(prev => prev.map(r => r.recipeName === updatedRecipe.recipeName ? { ...r, ...updatedRecipe, isDetailsLoaded: true } : r));
    setCachedRecipes(prev => prev.map(r => r.recipeName === updatedRecipe.recipeName ? { ...r, ...updatedRecipe } : r));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentView('tab');
    setCurrentTab('cook'); // Or stay on profile? Better to go to home/auth.
    // If we want to force login on home screen, we can do that in renderTab.
    // But current logic allows guest browsing for some parts?
    // Actually, LandingPage is shown if !currentUser.
  };

  const handleCreateCommunityPost = (recipe: Recipe, note?: string) => {
    if (!currentUser) return;

    const displayName = settings.nickname || currentUser.email.split('@')[0];
    const newPost: CommunityPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      authorEmail: currentUser.email,
      authorName: displayName,
      authorProfileImage: settings.profileImage || undefined,
      recipe,
      note,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
    };

    setCommunityPosts((prev) => [newPost, ...prev]);
  };

  const handleToggleCommunityLike = (postId: string) => {
    if (!currentUser) return;
    setCommunityPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const hasLiked = post.likes.includes(currentUser.email);
        return {
          ...post,
          likes: hasLiked
            ? post.likes.filter((email) => email !== currentUser.email)
            : [...post.likes, currentUser.email],
        };
      })
    );
  };

  const handleAddCommunityComment = (postId: string, content: string) => {
    if (!currentUser || !content.trim()) return;
    const displayName = settings.nickname || currentUser.email.split('@')[0];
    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      authorEmail: currentUser.email,
      authorName: displayName,
      authorProfileImage: settings.profileImage || undefined,
      content,
      createdAt: new Date().toISOString(),
    };

    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, comments: [...post.comments, newComment] } : post
      )
    );
  };

  const renderTab = () => {
    switch (currentTab) {
      case 'cook':
        return (
          <IngredientManager
            ingredients={ingredients}
            setIngredients={setIngredients}
            onLogoClick={() => { setCurrentView('tab'); setCurrentTab('cook'); }}
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
      case 'community':
        return (
          <Community
            currentUser={currentUser}
            currentUserProfileImage={settings.profileImage}
            savedRecipes={savedRecipes}
            posts={communityPosts}
            onCreatePost={handleCreateCommunityPost}
            onToggleLike={handleToggleCommunityLike}
            onAddComment={handleAddCommunityComment}
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
            onLogoClick={() => { setCurrentView('tab'); setCurrentTab('cook'); }}
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
                    cachedRecipes={cachedRecipes}
                    onRecipesChange={setCachedRecipes}
                    filters={cachedRecipeFilters}
                    onFiltersChange={setCachedRecipeFilters}
                    priorityIngredients={cachedPriorityIngredients}
                    onPriorityIngredientsChange={setCachedPriorityIngredients}
                    onRecipeDetailsLoaded={handleRecipeDetailsLoaded}
                    onLogoClick={() => { setCurrentView('tab'); setCurrentTab('cook'); }}
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