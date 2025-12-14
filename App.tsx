import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocalStorage } from './hooks/useLocalStorage';
import { UserSettings, Ingredient, ShoppingListItem, Recipe, User, ChatMessage, CommunityPost, RecipeFilters, CommunityComment } from './types';
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
  const [users, setUsers] = useLocalStorage<User[]>('ohmycook-users', []); // Keep mainly for non-auth legacy or fallback? Actually we migrate off this.
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  // Use local storage for ingredients/shopping list (device specific is fine for now, or migrate later)
  const userStorageSuffix = currentUser?.email ?? 'guest';
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>(`ohmycook-ingredients-${userStorageSuffix}`, []);
  const [shoppingList, setShoppingList] = useLocalStorage<ShoppingListItem[]>(`ohmycook-shoppinglist-${userStorageSuffix}`, []);
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>(`ohmycook-savedrecipes-${userStorageSuffix}`, []);

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

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
  const [currentChatKey, setCurrentChatKey] = useState<string>('__general__');
  const [chatOpenedFromRecipe, setChatOpenedFromRecipe] = useState<Recipe | null>(null);
  const [openedRecipeModal, setOpenedRecipeModal] = useState<Recipe | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const { language, t } = useLanguage();

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is no rows
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setSettings({
          cookingLevel: (data.cooking_level as any) || 'Beginner',
          allergies: data.allergies || [],
          preferredCuisines: data.preferred_cuisines || [],
          dislikedIngredients: data.disliked_ingredients || [],
          availableTools: data.available_tools || [],
          spicinessPreference: data.spiciness_preference || 3,
          maxCookTime: data.max_cook_time || 30,
          nickname: data.nickname || '',
          profileImage: data.profile_image || '',
        });

        const user: User = {
          id: userId,
          email: email,
          hasCompletedOnboarding: data.has_completed_onboarding || false
        };
        setCurrentUser(user);

        if (data.has_completed_onboarding) {
          // Stay on current view if already set, or default?
          // If this is initial load:
          if (isInitialLoad) {
            setCurrentView('tab');
            setCurrentTab('cook');
          }
        } else {
          setCurrentView('onboarding');
        }

      } else {
        // No profile yet, create one? Or wait for onboarding save?
        // Just set basic user
        const user: User = { id: userId, email, hasCompletedOnboarding: false };
        setCurrentUser(user);
        setCurrentView('onboarding');
      }
    } catch (error) {
      console.error('Profile fetch unexpected error:', error);
    }
  };

  const fetchCommunityPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      return;
    }

    if (data) {
      const mappedPosts: CommunityPost[] = data.map(p => ({
        id: p.id,
        authorEmail: 'hidden', // DB might not return email if not joined, assume hidden or join profiles
        authorName: 'Chef', // We might need to join profiles to get names. For now simplified.
        // Logic improvement: we should join with profiles table to get nickname/image
        // For now, let's keep it simple or fetch separately. 
        // Actually, let's try to select author_id and maybe we can fetch profile later?
        // Or better:
        // .select('*, profiles(nickname, profile_image)')
        // But let's assume standard structure first.
        recipe: p.recipe,
        note: p.note,
        createdAt: p.created_at,
        likes: p.likes || [],
        comments: [] // We need to fetch comments separately or join
      }));

      // Enhanced fetch with joins if possible, but keeping it simple first to avoid heavy join logic without types
      // Let's rely on simple fetch first.
      setCommunityPosts(mappedPosts);
    }
  };

  // Improved fetch with Joins
  const fetchCommunityPostsDetailed = async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles:author_id (nickname, profile_image),
        community_comments (id, content, created_at, author_id)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error("Posts fetch error:", error);
    else if (data) {
      const posts: CommunityPost[] = data.map((p: any) => ({
        id: p.id,
        authorEmail: '', // Not exposing email publicly for privacy usually, or fetch if needed
        authorName: p.profiles?.nickname || 'Unknown Chef',
        authorProfileImage: p.profiles?.profile_image,
        recipe: p.recipe,
        note: p.note,
        createdAt: p.created_at,
        likes: p.likes || [],
        comments: p.community_comments?.map((c: any) => ({
          id: c.id,
          content: c.content,
          createdAt: c.created_at,
          authorEmail: '',
          authorName: 'User', // Need recursive join or separate fetch for comment authors? 
          // For MVP, just show content
        })) || []
      }));
      setCommunityPosts(posts);
    }
  };


  useEffect(() => {
    // Initial Auth Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setCurrentUser(null);
        setSettings(defaultSettings);
      }
      setIsInitialLoad(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setSettings(defaultSettings);
        setCurrentView('tab');
        setCurrentTab('cook');
      }
    });

    // Fetch Community Posts
    fetchCommunityPostsDetailed();

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
    if (tab === 'community') fetchCommunityPostsDetailed(); // Refresh posts on tab enter
    setCurrentView('tab');
  };

  const handleStartChat = (recipe: Recipe) => {
    const recipeKey = recipe.recipeName;
    setChatContext(recipe);
    setCurrentChatKey(recipeKey);
    setChatOpenedFromRecipe(recipe);
    setOpenedRecipeModal(recipe);
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
    setCurrentChatKey('__general__');
    setChatOpenedFromRecipe(null);
  };

  const handleSaveSettings = async (newSettings: UserSettings, initialIngredients: string[] = []) => {
    // Optimistic update
    setSettings(newSettings);

    // Save to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        nickname: newSettings.nickname,
        cooking_level: newSettings.cookingLevel,
        allergies: newSettings.allergies,
        preferred_cuisines: newSettings.preferredCuisines,
        disliked_ingredients: newSettings.dislikedIngredients,
        available_tools: newSettings.availableTools,
        spiciness_preference: newSettings.spicinessPreference,
        max_cook_time: newSettings.maxCookTime,
        profile_image: newSettings.profileImage,
        has_completed_onboarding: true,
        updated_at: new Date(),
      });

      if (error) {
        console.error("Error saving profile to Supabase:", error);
        // Revert or show toast?
      } else {
        // Update Local User State
        setCurrentUser(prev => prev ? { ...prev, hasCompletedOnboarding: true } : null);
      }
    }

    if (initialIngredients.length > 0) {
      const currentIngredientNames = new Set(ingredients.map(i => i.name));
      const newIngredientsToAdd = initialIngredients
        .filter(name => !currentIngredientNames.has(name))
        .map(name => ({ name, quantity: t('basicUnit') }));

      setIngredients(prev => [...prev, ...newIngredientsToAdd]);
      // TODO: Sync ingredients to Supabase table 'user_ingredients' (Later phase)
    }

    // Always navigate home
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
    // Auth component handles Supabase login, which triggers onAuthStateChange.
    // So here we mostly just handle View transitions if needed, but onAuthStateChange does it better.
    // We can keep this for manual overrides or legacy.
    // Actually Auth.tsx calls onLogin AFTER successful supabase auth usually?
    // Let's rely on the useEffect hook for state updates.
    // But we might need to force re-render or clearing view.
  };

  const handleSignup = (newUser: Pick<User, 'email' | 'password'>) => {
    // Handled by Auth.tsx mostly.
    return { ok: true as const };
  };

  const handleRecipeDetailsLoaded = (updatedRecipe: Recipe) => {
    setSavedRecipes(prev => prev.map(r => r.recipeName === updatedRecipe.recipeName ? { ...r, ...updatedRecipe, isDetailsLoaded: true } : r));
    setCachedRecipes(prev => prev.map(r => r.recipeName === updatedRecipe.recipeName ? { ...r, ...updatedRecipe } : r));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // State clearing handled in useEffect
  };

  const handleCreateCommunityPost = async (recipe: Recipe, note?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // Should be logged in

    const newPost = {
      author_id: session.user.id,
      recipe: recipe,
      note: note,
      likes: []
    };

    const { error } = await supabase.from('community_posts').insert(newPost);

    if (error) {
      console.error("Error creating post:", error);
    } else {
      // Refresh posts
      fetchCommunityPostsDetailed();
    }
  };

  const handleToggleCommunityLike = async (postId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const userId = session.user.id;

    const post = communityPosts.find(p => p.id === postId);
    if (!post) return;

    const hasLiked = post.likes.includes(session.user.email); // Wait, likes array in DB stores what? IDs or Emails? 
    // Usually IDs. Let's switch to checking ID if we change DB schema to array of UUIDs.
    // For now, let's stick to simple text array. Ideally ID.
    // But currentUser.email is simpler for display. 
    // Let's assume we store IDs in DB for robustness.

    // UPDATE: Schema said `likes text[]`. Let's use User IDs.
    const hasLikedId = post.likes.includes(userId);

    const newLikes = hasLikedId
      ? post.likes.filter(id => id !== userId)
      : [...post.likes, userId];

    // Optimistic Update
    setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p));

    const { error } = await supabase
      .from('community_posts')
      .update({ likes: newLikes })
      .eq('id', postId);

    if (error) console.error("Like update failed:", error);
  };

  const handleAddCommunityComment = async (postId: string, content: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !content.trim()) return;

    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      author_id: session.user.id,
      content: content
    });

    if (error) console.error("Comment failed:", error);
    else fetchCommunityPostsDetailed();
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
            initialMessages={chatHistories['__general__'] || []}
            onMessagesUpdate={(messages) => handleChatMessagesUpdate('__general__', messages)}
            allChatHistories={chatHistories}
            onLoadHistory={(key) => {
              const isRecipe = key !== '__general__';
              if (isRecipe) {
                const recipe = cachedRecipes.find(r => r.recipeName === key) || savedRecipes.find(r => r.recipeName === key);
                if (recipe) {
                  setChatContext(recipe);
                  setCurrentChatKey(key);
                  handleNavigate('chat');
                }
              } else {
                setChatContext(null);
                setCurrentChatKey('__general__');
              }
            }}
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
              return (
                <PageTransition key="chat" direction={navigationDirection}>
                  <AIChef
                    settings={settings}
                    onBack={handleChatBack}
                    recipeContext={chatContext}
                    initialMessages={chatHistories[currentChatKey] || []}
                    onMessagesUpdate={(messages) => handleChatMessagesUpdate(currentChatKey, messages)}
                    openedFromRecipe={chatOpenedFromRecipe}
                    onCloseRecipeContext={() => setChatOpenedFromRecipe(null)}
                    allChatHistories={chatHistories}
                    onLoadHistory={(key) => {
                      const isRecipe = key !== '__general__';
                      if (isRecipe) {
                        // Find recipe in cached or saved recipes
                        const recipe = cachedRecipes.find(r => r.recipeName === key) || savedRecipes.find(r => r.recipeName === key);
                        if (recipe) {
                          setChatContext(recipe);
                          setCurrentChatKey(key);
                          setChatOpenedFromRecipe(null);
                        }
                      } else {
                        setChatContext(null);
                        setCurrentChatKey(key);
                        setChatOpenedFromRecipe(null);
                      }
                    }}
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