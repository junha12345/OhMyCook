import React, { useState } from 'react';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LogoIcon } from './icons';
import { startGoogleSignIn } from '../services/supabaseAuth';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onSignup: (newUser: Pick<User, 'email' | 'password'>) => void;
  onBack: () => void;
  initialMode?: 'login' | 'signup';
}

const Auth: React.FC<AuthProps> = ({ users, onLogin, onSignup, onBack, initialMode = 'login' }) => {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isLoginMode) {
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError(t('invalidCredentials'));
      }
    } else {
      // Signup mode
      const userExists = users.some(u => u.email === email);
      if (userExists) {
        setError(t('userExists'));
      } else {
        onSignup({ email, password });
        setMessage(t('signupSuccess'));
        setIsLoginMode(true); // Switch to login after successful signup
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background p-6 justify-center items-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center p-2 mx-auto">
            <LogoIcon className="w-full h-full" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mt-4">{t(isLoginMode ? 'login' : 'signup')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-2xl shadow-subtle">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-text-secondary block mb-1">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-line-light rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-text-secondary block mb-1">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-background border border-line-light rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs mt-4 text-center">{error}</p>}
          {message && <p className="text-green-500 text-xs mt-4 text-center">{message}</p>}

          <div className="mt-6">
            <button type="submit" className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-xl">
              {t(isLoginMode ? 'login' : 'signup')}
            </button>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => startGoogleSignIn()}
              className="w-full bg-white border border-line-light text-text-primary font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
            >
              <svg
                aria-hidden
                focusable="false"
                className="w-5 h-5"
                viewBox="0 0 533.5 544.3"
              >
                <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.4H272v95.5h146.9c-6.3 34.1-25.2 63-53.6 82.3v68h86.7c50.7-46.6 81.5-115.4 81.5-195.4z" />
                <path fill="#34A853" d="M272 544.3c72.9 0 134.1-24.1 178.8-65.6l-86.7-68c-24.1 16.2-55 25.7-92.1 25.7-70.8 0-130.8-47.7-152.3-111.8H30.2v70.1C74.7 486.1 167.6 544.3 272 544.3z" />
                <path fill="#FBBC05" d="M119.7 324.6c-10.8-32.1-10.8-66.7 0-98.8V155.7H30.2c-43.6 87.1-43.6 191.1 0 278.2l89.5-70.1z" />
                <path fill="#EA4335" d="M272 107.7c39.7-.6 77.8 14.6 107 42.8l79.8-79.8C405 24 341.2-2.3 272 0 167.6 0 74.7 58.2 30.2 155.7l89.5 70.1C141.2 155.4 201.2 107.7 272 107.7z" />
              </svg>
              {t('continueWithGoogle')}
            </button>
            <p className="text-xs text-text-secondary text-center mt-2">{t('googleAuthNote')}</p>
          </div>
        </form>

        <div className="text-center mt-6">
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-brand-primary font-semibold">
            {t(isLoginMode ? 'switchToSignup' : 'switchToLogin')}
          </button>
        </div>

        <div className="text-center mt-4">
          <button onClick={onBack} className="text-sm text-text-secondary">
            &larr; {t('backToHome')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;