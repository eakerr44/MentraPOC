import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { SprigIcon, sprigIcons } from './SprigIcon';
import { 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  BarChart3, 
  Book, 
  Brain, 
  HelpCircle,
  X,
  Menu,
  ChevronLeft,
  Send,
  AlertCircle
} from 'lucide-react';
import AITutorApiService, { ChatMessage, TutorSession } from '../services/aiTutorApi';
import '../styles/brand.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [encouragementVisible, setEncouragementVisible] = useState(true);

  // AI Tutor state
  const [currentSession, setCurrentSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', sprigIcon: sprigIcons.dashboard },
    { name: 'Journal', href: '/journal', sprigIcon: sprigIcons.journal },
    { name: 'AI Tutor', href: '/problems', sprigIcon: sprigIcons.problems },
    { name: 'Help', href: '/help', sprigIcon: sprigIcons.help },
  ];

  const subjects = [
    { id: '', name: 'Any subject', icon: '🤔' },
    { id: 'math', name: 'Mathematics', icon: '🔢' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'english', name: 'English', icon: '📝' },
    { id: 'history', name: 'History', icon: '📚' },
    { id: 'art', name: 'Art', icon: '🎨' },
  ];

  const isActive = (href: string) => location.pathname === href;
  const isAITutorPage = location.pathname === '/problems';

  useEffect(() => {
    if (isAITutorPage) {
      loadSuggestedQuestions();
    }
  }, [selectedSubject, isAITutorPage]);

  useEffect(() => {
    if (isAITutorPage) {
      scrollToBottom();
    }
  }, [messages, isTyping, isAITutorPage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestedQuestions = useCallback(async () => {
    try {
      const response = await AITutorApiService.getSuggestedQuestions(selectedSubject || undefined);
      setSuggestedQuestions(response.questions);
    } catch (error) {
      console.warn('Failed to load suggested questions:', error);
    }
  }, [selectedSubject]);

  const startNewSession = useCallback(async (initialQuestion?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await AITutorApiService.startSession({
        subject: selectedSubject || undefined,
        initialQuestion,
        context: {
          emotionalState: 'curious',
          difficultyPreference: 'adaptive'
        }
      });

      setCurrentSession(response.session);
      setMessages(response.session.messages);
      
      // Don't call sendMessage here to avoid circular dependency
      // The initial question is already handled by the backend in the session creation
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  const sendMessage = useCallback(async (sessionId: string, message: string) => {
    try {
      setIsTyping(true);
      setError(null);

      const response = await AITutorApiService.sendMessage(sessionId, message, {
        subject: selectedSubject || undefined,
        emotionalState: 'engaged'
      });

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage, response.message]);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTyping(false);
    }
  }, [selectedSubject]);

  // Use useCallback to prevent re-renders that lose focus
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    setInputMessage(e.target.value);
  }, []);

  // Simplified send message handler
  const handleSendMessage = useCallback(async () => {
    const message = inputMessage.trim();
    if (!message) return;

    setInputMessage('');
    
    // Restore focus after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);

    try {
      if (!currentSession) {
        await startNewSession(message);
      } else {
        await sendMessage(currentSession.id, message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  }, [inputMessage, currentSession, startNewSession, sendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleSuggestedQuestion = useCallback(async (question: string) => {
    setInputMessage(question);
    if (!currentSession) {
      await startNewSession(question);
    }
  }, [currentSession, startNewSession]);

  const handleFocus = useCallback((e: React.FocusEvent) => {
    e.stopPropagation();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSendMessage();
  }, [handleSendMessage]);

  const handleInputResize = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
  }, []);

  const formatMessageContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => (
        <p key={index} className={line.trim() ? 'mb-2 last:mb-0' : 'mb-1'}>
          {line || '\u00A0'}
        </p>
      ));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const dismissEncouragement = () => {
    setEncouragementVisible(false);
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  // AI Tutor content component
  const AITutorContent = () => {
    if (error) {
      return (
        <div className="h-full bg-white flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full bg-white flex flex-col">
        {/* AI Tutor Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">AI Tutor</h1>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.icon} {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="px-4 py-8">
                <div className="text-center w-full max-w-2xl mx-auto ai-tutor-welcome">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <SprigIcon type={sprigIcons.happy} size="lg" className="text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Welcome to your AI Tutor!
                  </h2>
                  <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                    I'm here to help you learn by asking the right questions and guiding your thinking. 
                    What would you like to explore today?
                  </p>
                  
                  {/* Input Area - Directly under welcome */}
                  <div className="mb-8 max-w-lg mx-auto ai-tutor-container">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <textarea
                          ref={inputRef}
                          key="welcome-input" // Stable key
                          value={inputMessage}
                          onChange={handleInputChange}
                          onKeyPress={handleKeyPress}
                          onFocus={handleFocus}
                          onMouseDown={handleMouseDown}
                          placeholder="Message AI Tutor"
                          className="ai-tutor-input w-full px-6 py-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 text-base"
                          rows={2}
                          disabled={isLoading || isTyping}
                          style={{ position: 'relative', zIndex: 10 }}
                          autoComplete="off"
                          spellCheck="false"
                        />
                      </div>
                      <button
                        onClick={handleButtonClick}
                        disabled={!inputMessage.trim() || isLoading || isTyping}
                        className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        style={{ position: 'relative', zIndex: 10 }}
                      >
                        <Send className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  
                  {suggestedQuestions.length > 0 && (
                    <div className="space-y-3 max-w-lg mx-auto">
                      <p className="text-sm font-medium text-gray-700 mb-4">Or try one of these:</p>
                      {suggestedQuestions.slice(0, 4).map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedQuestion(question)}
                          className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all text-sm"
                        >
                          "{question}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className="group">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {message.role === 'assistant' ? (
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <SprigIcon type={sprigIcons.guiding} size="sm" className="text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {user?.firstName?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {message.role === 'assistant' ? 'AI Tutor' : user?.firstName || 'You'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="prose prose-sm max-w-none text-gray-700">
                            {formatMessageContent(message.content)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="group">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <SprigIcon type={sprigIcons.guiding} size="sm" className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">AI Tutor</span>
                            <span className="text-xs text-gray-500">thinking...</span>
                          </div>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area for active chat */}
                <div className="border-t border-gray-200 bg-white pt-4 mt-6 ai-tutor-container" style={{ position: 'relative', zIndex: 10 }}>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <textarea
                        ref={inputRef}
                        key="chat-input" // Stable key
                        value={inputMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        onFocus={handleFocus}
                        onMouseDown={handleMouseDown}
                        placeholder="Message AI Tutor"
                        className="ai-tutor-input w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                        rows={1}
                        disabled={isLoading || isTyping}
                        style={{ minHeight: '48px', maxHeight: '200px', position: 'relative', zIndex: 10 }}
                        onInput={handleInputResize}
                        autoComplete="off"
                        spellCheck="false"
                      />
                    </div>
                    <button
                      onClick={handleButtonClick}
                      disabled={!inputMessage.trim() || isLoading || isTyping}
                      className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      style={{ position: 'relative', zIndex: 10 }}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Always Open */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 sidebar">
        <div className="sidebar-content h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center p-4 border-b border-gray-200">
            <img
              src="/assets/logo/logo_with_words.png"
              alt="Mentra"
              className="w-auto object-contain"
              style={{ height: '100px', maxWidth: '220px' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2">
            <div className="space-y-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <SprigIcon type={item.sprigIcon} size="md" className="flex-shrink-0" />
                  <span className="text-base font-medium">{item.name}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-2">
            <div className="relative">
              <button
                onClick={toggleUserMenu}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {getUserInitials(user?.firstName, user?.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 capitalize truncate">
                    {user?.role}
                  </div>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-2">
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      onClick={handleLogout} 
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen ml-64">
        {/* Dismissible Encouragement Notification */}
        {encouragementVisible && !isAITutorPage && (
          <div className="sprig-encouragement">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SprigIcon type={sprigIcons.happy} size="md" />
                <div>
                  <p className="encouraging-text">
                    Keep growing!
                  </p>
                  <p className="subtitle-text">
                    You're doing great today ✨
                  </p>
                </div>
              </div>
              <button
                onClick={dismissEncouragement}
                className="ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss encouragement"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 bg-white">
          {isAITutorPage ? <AITutorContent /> : <div className="p-6">{children}</div>}
        </main>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}; 