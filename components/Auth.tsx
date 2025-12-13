import React, { useState } from 'react';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LogoIcon } from './icons';

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