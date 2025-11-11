


import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { UserSettings, Ingredient, ShoppingListItem, Recipe, User } from './types';
import Header from './components/Header';
import IngredientManager from './components/IngredientManager';
import RecipeRecommendations from './components/RecipeRecommendations';
import AIChef from './components/AIChef';
import PopularRecipes from './components/PopularRecipes';
import Onboarding from './components/Onboarding';
import ShoppingList from './components/ShoppingList';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LogoIcon, ProfileIcon, FridgeIcon, SpatulaIcon, ChatBubbleIcon, TrendingUpIcon, CameraIcon, ShoppingCartIcon, BookmarkIcon } from './components/icons';
import { INGREDIENT_DATA } from './data/ingredients';
import Spinner from './components/Spinner';
import SavedRecipes from './components/SavedRecipes';
import Auth from './components/Auth';

const defaultSettings: UserSettings = {
  cookingLevel: 'Beginner',
  allergies: [],
  preferredCuisines: [],
  dislikedIngredients: [],
  availableTools: [],
  spicinessPreference: 3,
  maxCookTime: 30,
};

type View = 'home' | 'onboarding' | 'ingredients' | 'recommendations' | 'chat' | 'popular' | 'scan' | 'shoppingList' | 'savedRecipes' | 'auth';


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

// Receipt Scanner Page Component
const ReceiptScanner: React.FC<{ onBack: () => void, onScanComplete: (newIngredients: string[]) => void }> = ({ onBack, onScanComplete }) => {
  const { t } = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(t('cameraError'));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };
  
  const takePicture = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if(context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            await processImage(blob);
          }
        }, 'image/jpeg');
      }
    }
    stopCamera();
  };
  
  const processImage = async (image: File | Blob) => {
    setIsScanning(true);
    setError(null);
    try {
      const { analyzeReceipt } = await import('./services/geminiService');
      const file = image instanceof File ? image : new File([image], "receipt.jpg", { type: 'image/jpeg' });
      const base64Image = await fileToBase64(file);
      const items = await analyzeReceipt(base64Image);
      onScanComplete(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => stopCamera(); // Cleanup on unmount
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <Header title={t('receiptScan')} onBack={onBack} />
      <div className="flex-grow p-6 overflow-y-auto">
        <div className="bg-brand-primary/10 text-brand-dark p-6 rounded-2xl mb-6">
          <h2 className="text-xl font-bold mb-2">{t('scanReceiptTitle')}</h2>
          <p className="text-sm">{t('scanReceiptDescription')}</p>
        </div>

        {isCameraOn ? (
           <div className="w-full p-4 border bg-surface rounded-2xl shadow-subtle mb-6">
            <video ref={videoRef} className="w-full rounded-lg" playsInline/>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <button onClick={takePicture} className="w-full mt-4 bg-brand-primary text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
              <CameraIcon className="w-5 h-5" />
              <span>{t('takePhoto')}</span>
            </button>
          </div>
        ) : (
          <div className="w-full p-8 border-2 border-dashed bg-surface border-line-light rounded-2xl flex flex-col items-center justify-center text-center mb-6">
            {isScanning ? <Spinner /> : <CameraIcon className="w-16 h-16 text-brand-primary mb-4" />}
            <p className="text-text-primary font-semibold mb-2">{t('scanReceiptPrompt')}</p>
            <p className="text-text-secondary text-sm mb-6">{t('scanReceiptFormats')}</p>
            <div className="flex gap-4">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-brand-primary text-white font-bold py-3 px-6 rounded-xl">
                {t('uploadFile')}
              </button>
              <button onClick={startCamera} className="bg-surface border border-line-dark font-bold text-text-primary py-3 px-6 rounded-xl">
                {t('takePhoto')}
              </button>
            </div>
          </div>
        )}
        
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        
        <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl">
          <h3 className="font-bold mb-2">{t('photoTipsTitle')}</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>{t('photoTip1')}</li>
            <li>{t('photoTip2')}</li>
            <li>{t('photoTip3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const HomeHeader: React.FC<{
  currentUser: User | null;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}> = ({ currentUser, onNavigate, onLogout }) => {
  const { t, language, setLanguage } = useLanguage();
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <LogoIcon className="w-7 h-7" />
          </div>
          <span className="font-bold text-xl text-text-primary">{t('mainTitle')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')} className="text-xs font-bold text-text-secondary bg-surface border border-line-light px-2 py-1 rounded-md">
            {language === 'en' ? 'KO' : 'EN'}
          </button>
          {currentUser ? (
            <>
              <button onClick={() => onNavigate('onboarding')} className="text-text-primary p-2" title={t('profileTitle')}><ProfileIcon className="w-6 h-6"/></button>
              <button onClick={() => onNavigate('savedRecipes')} className="text-text-primary p-2" title={t('savedRecipesTitle')}><BookmarkIcon className="w-6 h-6"/></button>
              <button onClick={() => onNavigate('shoppingList')} className="text-text-primary p-2" title={t('shoppingListTitle')}><ShoppingCartIcon className="w-6 h-6"/></button>
              <button onClick={onLogout} className="text-sm bg-gray-200 px-3 py-1.5 rounded-md font-semibold">{t('logout')}</button>
            </>
          ) : (
            <button onClick={() => onNavigate('auth')} className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg">
              {t('login')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


// Home Screen Component
const HomeScreen: React.FC<{ onNavigate: (view: View) => void, currentUser: User | null }> = ({ onNavigate, currentUser }) => {
  const { t } = useLanguage();

  const menuItems = [
    { view: 'ingredients', icon: FridgeIcon, title: t('ingredientsTitle'), subtitle: t('ingredientsSubtitle') },
    { view: 'recommendations', icon: SpatulaIcon, title: t('recommendationsTitle'), subtitle: t('recommendationsSubtitle') },
    { view: 'popular', icon: TrendingUpIcon, title: t('popularTitle'), subtitle: t('popularSubtitle') },
    { view: 'chat', icon: ChatBubbleIcon, title: t('chatTitle'), subtitle: t('chatSubtitle') },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="text-center my-8">
        <h1 className="text-3xl font-bold text-text-primary">{currentUser ? t('welcomeUser', {email: currentUser.email.split('@')[0]}) : t('mainTitle')}</h1>
        <p className="text-text-secondary mt-2">{t('mainSubtitle')}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {menuItems.map(item => (
          <button key={item.view} onClick={() => onNavigate(item.view as View)} className="bg-surface p-4 rounded-2xl shadow-subtle text-left hover:scale-105 transition-transform duration-200">
            <item.icon className="w-14 h-14 p-3 bg-brand-light text-brand-primary rounded-xl mb-4" />
            <h2 className="font-bold text-text-primary">{item.title}</h2>
            <p className="text-xs text-text-secondary mt-1">{item.subtitle}</p>
          </button>
        ))}
      </div>
      <footer className="text-center py-8 mt-8">
        <p className="text-sm text-text-secondary">{t('homeFooter')}</p>
      </footer>
    </div>
  );
};

// Main App Content Component
const AppContent: React.FC = () => {
  const [settings, setSettings] = useLocalStorage<UserSettings>('ohmycook-settings', defaultSettings);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('ohmycook-ingredients', []);
  const [shoppingList, setShoppingList] = useLocalStorage<ShoppingListItem[]>('ohmycook-shoppinglist', []);
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>('ohmycook-savedrecipes', []);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [currentView, setCurrentView] = useState<View>('home');
  const [previousView, setPreviousView] = useState<View>('home');
  const [chatContext, setChatContext] = useState<Recipe | null>(null);

  const [users, setUsers] = useLocalStorage<User[]>('ohmycook-users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('ohmycook-currentUser', null);

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
  
  const handleStartChat = (recipe: Recipe) => {
    setChatContext(recipe);
    handleNavigate('chat');
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

      // Also update the currentUser state to reflect the change immediately
      setCurrentUser(prevUser => (prevUser ? { ...prevUser, hasCompletedOnboarding: true } : null));
    }

    setCurrentView('home');
  };
  
  const handleScanComplete = (scannedItems: string[]) => {
      const allValidEnglishIngredients = new Set(Object.keys(INGREDIENT_DATA));
      const currentIngredientNames = new Set(ingredients.map(i => i.name));

      const newIngredientsToAdd = scannedItems
        .filter(name => allValidEnglishIngredients.has(name) && !currentIngredientNames.has(name))
        .map(name => ({ name, quantity: '1' }));
      
      setIngredients(prev => [...prev, ...newIngredientsToAdd]);
      setCurrentView('ingredients');
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
      setCurrentView('home');
    } else {
      setCurrentView('onboarding');
    }
  };

  const handleSignup = (newUser: Pick<User, 'email' | 'password'>) => {
    setUsers(prev => [...prev, { ...newUser, hasCompletedOnboarding: false }]);
    // Go back to auth view for user to log in
    setCurrentView('auth');
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
  };

  const renderView = () => {
    if (isInitialLoad) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;

    switch (currentView) {
      case 'auth':
        return <Auth onLogin={handleLogin} onSignup={handleSignup} users={users} onBack={() => setCurrentView('home')} />;
      case 'onboarding':
        return <Onboarding initialSettings={settings} onSave={handleSaveSettings} onBack={() => setCurrentView(currentUser ? 'home' : 'auth')} />;
      case 'ingredients':
        return <IngredientManager ingredients={ingredients} setIngredients={setIngredients} onBack={() => setCurrentView('home')} onNavigate={handleNavigate} />;
      case 'recommendations':
        return <RecipeRecommendations 
                  ingredients={ingredients} 
                  onBack={() => setCurrentView('home')} 
                  shoppingList={shoppingList} 
                  onToggleShoppingListItem={handleToggleShoppingListItem}
                  savedRecipes={savedRecipes}
                  onToggleSaveRecipe={handleToggleSaveRecipe}
                  onStartChat={handleStartChat}
                />;
      case 'chat':
        return <AIChef 
                  settings={settings} 
                  onBack={() => { setCurrentView(previousView); setChatContext(null); }}
                  recipeContext={chatContext} 
                />;
      case 'popular':
        return <PopularRecipes 
                  onBack={() => setCurrentView('home')}
                  shoppingList={shoppingList}
                  onToggleShoppingListItem={handleToggleShoppingListItem}
                  savedRecipes={savedRecipes}
                  onToggleSaveRecipe={handleToggleSaveRecipe}
                  onStartChat={handleStartChat}
                />;
      case 'scan':
        return <ReceiptScanner onBack={() => setCurrentView('ingredients')} onScanComplete={handleScanComplete} />;
      case 'shoppingList':
        return <ShoppingList shoppingList={shoppingList} setShoppingList={setShoppingList} onBack={() => setCurrentView('home')} />;
      case 'savedRecipes':
        return <SavedRecipes 
                  savedRecipes={savedRecipes} 
                  onBack={() => setCurrentView('home')}
                  shoppingList={shoppingList}
                  onToggleShoppingListItem={handleToggleShoppingListItem}
                  onToggleSaveRecipe={handleToggleSaveRecipe}
                  onStartChat={handleStartChat}
                />;
      case 'home':
      default:
        return (
          <>
            <HomeHeader currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />
            <HomeScreen onNavigate={handleNavigate} currentUser={currentUser} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans transition-colors duration-300 max-w-lg mx-auto">
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