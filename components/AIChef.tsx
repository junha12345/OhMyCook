
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserSettings, ChatMessage, Recipe } from '../types';
import { SendIcon, LogoIcon } from './icons';
import Spinner from './Spinner';
import { useLanguage } from '../context/LanguageContext';
import Header from './Header';

interface AIChefProps {
  settings: UserSettings;
  onBack: () => void;
  recipeContext: Recipe | null;
  showBack?: boolean;
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
  openedFromRecipe?: Recipe | null;
  onCloseRecipeContext?: () => void;
}

const AIChef: React.FC<AIChefProps> = ({
  settings,
  onBack,
  recipeContext,
  showBack = true,
  initialMessages = [],
  onMessagesUpdate,
  openedFromRecipe,
  onCloseRecipeContext
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestedQuestions, setShowSuggestedQuestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Sync messages to parent when they change
  useEffect(() => {
    if (onMessagesUpdate && messages.length > 0) {
      onMessagesUpdate(messages);
    }
  }, [messages, onMessagesUpdate]);

  // If chat opened from a recipe with no history, start with a recipe-aware greeting
  useEffect(() => {
    if (recipeContext && openedFromRecipe && messages.length === 0) {
      const recipeName = recipeContext.recipeName.split('(')[0].trim();
      const introText = `${t('aiChefGreeting')}\n\n${t('chatAboutRecipe', { recipeName })}`;
      const introMessage: ChatMessage = { role: 'model', parts: [{ text: introText }] };
      setMessages([introMessage]);
    }
  }, [recipeContext, openedFromRecipe, messages.length, t]);

  // Handle back button
  const handleBack = () => {
    if (openedFromRecipe) {
      onCloseRecipeContext?.();
    }
    onBack();
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: textToSend }] };
    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInput('');
    setIsLoading(true);
    setError(null);
    setShowSuggestedQuestions(false);

    const history = messages.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(p => ({ text: p.text }))
    }));

    try {
      const { chatWithAIChef } = await import('../services/geminiService');
      const responseText = await chatWithAIChef(history, textToSend, settings, language, recipeContext);
      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
      setMessages(prev => [...prev, modelMessage]);
      setShowSuggestedQuestions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setShowSuggestedQuestions(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const suggestedQuestions: (keyof (typeof import('../i18n'))['translations']['en'])[] = ['suggestedQ1', 'suggestedQ2', 'suggestedQ3', 'suggestedQ4'];
  const headerTitle = recipeContext
    ? t('chatAboutRecipe', { recipeName: recipeContext.recipeName.split('(')[0].trim() })
    : t('aiChefTitle');

  return (
    <div className={`flex flex-col h-screen bg-background ${!showBack ? 'pb-24' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-surface">
        <div className="flex items-center gap-2 flex-1">
          {showBack && (
            <button onClick={handleBack} className="text-text-primary text-lg">
              ← {t('back')}
            </button>
          )}
          <h2 className="text-lg font-bold text-text-primary truncate">{headerTitle}</h2>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="px-3 py-1.5 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-dark transition-colors"
        >
          {showHistory ? t('hideHistory') || 'Hide' : t('showHistory') || 'History'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Suggested Questions - scrollable */}
          {showSuggestedQuestions && messages.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-text-secondary mb-2">{t('suggestedQuestions')}</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map(q => (
                  <button 
                    key={q} 
                    onClick={() => handleSend(t(q))} 
                    className="bg-surface border border-line-light text-sm text-text-primary px-3 py-1.5 rounded-lg hover:bg-brand-light transition-colors"
                  >
                    {t(q)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Initial Greeting - only show if no chat history */}
          {messages.length === 0 && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2 max-w-xs md:max-w-md">
                <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                  <LogoIcon className="w-5 h-5 text-white" />
                </div>
                <div className="bg-surface p-3 rounded-lg rounded-bl-none shadow-subtle">
                  <p className="text-sm text-text-primary whitespace-pre-line">
                    {recipeContext
                      ? `${t('aiChefGreeting')}\n\n${t('chatAboutRecipe', { recipeName: recipeContext.recipeName.split('(')[0].trim() })}`
                      : t('aiChefGreeting')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions for first time users - scrollable */}
          {messages.length === 0 && (
            <div className="mb-4">
              <p className="text-sm text-text-secondary mb-2">{t('suggestedQuestions')}</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map(q => (
                  <button 
                    key={q} 
                    onClick={() => handleSend(t(q))} 
                    className="bg-surface border border-line-light text-sm text-text-primary px-3 py-1.5 rounded-lg hover:bg-brand-light transition-colors"
                  >
                    {t(q)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages - filtered by history toggle */}
          {(showHistory ? messages : messages.slice(-6)).map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-surface text-text-primary rounded-bl-none shadow-subtle'}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.parts[0].text}</p>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-xl bg-surface shadow-subtle">
                <Spinner size="sm" />
              </div>
            </div>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="p-4 border-t bg-background flex-shrink-0">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('askAnything')}
            disabled={isLoading}
            className="flex-grow p-3 border border-line-light rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-text-secondary hover:bg-text-primary text-white p-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center aspect-square"
          >
            <SendIcon className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AIChef;