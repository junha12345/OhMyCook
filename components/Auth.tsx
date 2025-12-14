import React, { useState } from 'react';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LogoIcon } from './icons';
import { supabase } from '../services/supabaseClient';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  onBack: () => void;
  initialMode?: 'login' | 'signup';
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onBack, initialMode = 'login' }) => {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLoginMode) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const signedInUser = data.user;

        if (signedInUser) {
          onAuthSuccess({
            id: signedInUser.id,
            email: signedInUser.email ?? '',
            hasCompletedOnboarding: Boolean(signedInUser.user_metadata?.hasCompletedOnboarding),
          });
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        const createdUser = data.session?.user ?? data.user;

        if (createdUser) {
          onAuthSuccess({
            id: createdUser.id,
            email: createdUser.email ?? '',
            hasCompletedOnboarding: Boolean(createdUser.user_metadata?.hasCompletedOnboarding),
          });
          setMessage(t('signupSuccess'));
        } else {
          setMessage('Check your email to confirm your signup.');
          setIsLoginMode(true);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('invalidCredentials');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
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

        <div className="bg-surface p-8 rounded-2xl shadow-subtle">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full border border-line-light text-text-primary font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-background"
          >
            <span role="img" aria-label="Google">
              📈
            </span>
            Continue with Google
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-line-light" />
            <span className="px-3 text-xs uppercase tracking-widest text-text-secondary">or</span>
            <div className="flex-1 h-px bg-line-light" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-text-secondary block mb-1">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                className="w-full bg-background border border-line-light rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              />
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            {message && <p className="text-green-500 text-xs text-center">{message}</p>}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-xl disabled:opacity-60"
              >
                {loading ? t('loading') : t(isLoginMode ? 'login' : 'signup')}
              </button>
            </div>
          </form>
        </div>

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