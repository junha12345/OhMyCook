
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserSettings, ChatMessage, Recipe } from '../types';
import { SendIcon, LogoIcon, MicIcon, MicOffIcon } from './icons';
import Spinner from './Spinner';
import { useLanguage } from '../context/LanguageContext';
import Header from './Header';

interface ChatHistory {
  key: string;
  recipeName?: string;
  summary: string;
  timestamp: number;
  messages: ChatMessage[];
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}


interface AIChefProps {
  settings: UserSettings;
  onBack: () => void;
  recipeContext: Recipe | null;
  showBack?: boolean;
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
  openedFromRecipe?: Recipe | null;
  onCloseRecipeContext?: () => void;
  allChatHistories?: Record<string, ChatMessage[]>;
  onLoadHistory?: (key: string) => void;
}

const AIChef: React.FC<AIChefProps> = ({
  settings,
  onBack,
  recipeContext,
  showBack = true,
  initialMessages = [],
  onMessagesUpdate,
  openedFromRecipe,
  onCloseRecipeContext,
  allChatHistories = {},
  onLoadHistory
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestedQuestions, setShowSuggestedQuestions] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  // Build history list from all chat histories
  const historyList: ChatHistory[] = Object.entries(allChatHistories)
    .filter(([key, msgs]) => msgs.length > 0)
    .map(([key, msgs]: [string, ChatMessage[]]) => {
      const isRecipe = key !== '__general__';
      const firstUserMsg = msgs.find(m => m.role === 'user');
      const summary = firstUserMsg?.parts[0]?.text.slice(0, 50) || t('chatHistory');
      return {
        key,
        recipeName: isRecipe ? key : undefined,
        summary,
        timestamp: Date.now(),
        messages: msgs
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, recipeContext]);

  // Sync messages to parent when they change (auto-save)
  useEffect(() => {
    if (onMessagesUpdate) {
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
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!messageText) setInput('');
    setIsLoading(true);
    setError(null);
    setShowSuggestedQuestions(false);

    console.log('Sending message:', textToSend);
    console.log('History length:', messages.length);

    const history = updatedMessages.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(p => ({ text: p.text }))
    }));

    try {
      const { chatWithAIChef } = await import('../services/geminiService');
      console.log('=== AI Chef Request Start ===');
      console.log('Recipe context:', recipeContext?.recipeName);
      console.log('Language:', language);
      console.log('History length:', history.length);
      console.log('User message:', textToSend);
      console.log('Calling AI Chef API with history:', history);

      const responseText = await chatWithAIChef(history, textToSend, settings, language, recipeContext);
      console.log('=== AI Chef Response ===');
      console.log('Response:', responseText);

      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
      setMessages(prev => [...prev, modelMessage]);
      setShowSuggestedQuestions(true);
      console.log('=== AI Chef Request End ===');
    } catch (err) {
      console.error('=== AI Chef Error ===');
      console.error('Error details:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        setError(err.message);
      } else {
        console.error('Unknown error type:', err);
        setError('An unknown error occurred.');
      }
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
    <div
      className={`flex flex-col h-full min-h-[100dvh] bg-background overflow-hidden ${
        !showBack ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-surface gap-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showBack && (
            <button onClick={handleBack} className="text-text-primary text-lg flex-shrink-0">
              ← {t('back')}
            </button>
          )}
          <h2 className="text-sm sm:text-base font-bold text-text-primary truncate">{headerTitle}</h2>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-3 py-1.5 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-dark transition-colors flex-shrink-0"
        >
          {showHistory ? t('hideHistory') || 'Hide' : t('showHistory') || 'History'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {/* History List View */}
          {showHistory && (
            historyList.length > 0 ? (
              <div className="mb-6 space-y-2">
                <h3 className="text-sm font-bold text-text-primary mb-3">{t('chatHistoryList') || '대화 기록'}</h3>
                {historyList.map(hist => (
                  <button
                    key={hist.key}
                    onClick={() => {
                      setShowHistory(false);
                      onLoadHistory?.(hist.key);
                    }}
                    className="w-full text-left bg-surface border border-line-light rounded-lg p-3 hover:bg-brand-light transition-colors"
                  >
                    {hist.recipeName && (
                      <div className="text-xs font-bold text-brand-primary mb-1">
                        🍳 {hist.recipeName}
                      </div>
                    )}
                    {!hist.recipeName && (
                      <div className="text-xs font-bold text-text-secondary mb-1">
                        💬 {t('generalChat') || '일반 대화'}
                      </div>
                    )}
                    <div className="text-sm text-text-primary line-clamp-2">
                      {hist.summary}...
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {hist.messages.length} {t('messages') || 'messages'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-secondary">{t('noChatHistory') || '아직 대화 내역이 없습니다.'}</p>
                <p className="text-sm text-text-secondary mt-2">{t('startChatting') || '질문을 시작해보세요!'}</p>
              </div>
            )
          )}

          {/* Suggested Questions - scrollable */}
          {!showHistory && showSuggestedQuestions && messages.length > 0 && (
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

          {/* Initial Greeting - only show if no chat history and not showing history list */}
          {!showHistory && messages.length === 0 && (
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
          {!showHistory && messages.length === 0 && (
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

          {/* Messages - only show when not in history list view */}
          {!showHistory && messages.map((msg, index) => (
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
            onClick={() => {
              if (isListening) {
                recognitionRef.current?.stop();
                setIsListening(false);
              } else {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                  alert(t('browserNotSupported') || "Browser does not support voice input.");
                  return;
                }
                const recognition = new SpeechRecognition();
                recognition.lang = language === 'ko' ? 'ko-KR' : 'en-US';
                recognition.interimResults = false;
                recognition.lang = language === 'ko' ? 'ko-KR' : 'en-US';
                recognition.interimResults = false;
                recognition.continuous = false; // Auto-send requires stopping after one phrase usually, or just detecting end
                recognition.maxAlternatives = 1;
                recognition.maxAlternatives = 1;

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => {
                  setIsListening(false);
                  // Auto-send if we have input
                  setInput(prev => {
                    if (prev.trim()) {
                      // We need to call handleSend, but we can't easily access the latest state inside this closure unless we use a ref or controlled effect.
                      // Actually, setInput updater is safe. But calling handleSend(prev) might use stale state?
                      // Better to trigger a send effect or just call a ref-held function.
                      // For simplicity, let's just trigger a click on the send button programmatically or use a timeout?
                      // Cleanest: Use a useEffect that watches `isListening` going from true to false with `input` present? 
                      // But `onend` fires even if error. 
                      // Let's use a small timeout to trigger send.
                      setTimeout(() => {
                        const sendBtn = document.getElementById('chat-send-button');
                        if (sendBtn) sendBtn.click();
                      }, 100);
                    }
                    return prev;
                  });
                };
                recognition.onerror = (event: any) => {
                  console.error("Speech recognition error", event.error);
                  setIsListening(false);
                };
                recognition.onresult = (event: any) => {
                  const current = event.resultIndex;
                  const transcript = event.results[current][0].transcript;
                  setInput(prev => {
                    const trimmedPrev = prev.trim();
                    return trimmedPrev ? `${trimmedPrev} ${transcript}` : transcript;
                  });
                };

                recognitionRef.current = recognition;
                recognition.start();
              }
            }}
            className={`p-3 rounded-xl transition-colors flex items-center justify-center aspect-square ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            disabled={isLoading}
          >
            {isListening ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            id="chat-send-button"
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