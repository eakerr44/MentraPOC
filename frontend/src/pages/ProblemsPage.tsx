import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import AITutorApiService, { ChatMessage, TutorSession } from '../services/aiTutorApi';
import { SprigIcon, sprigIcons } from '../components/SprigIcon';
import { Send, AlertCircle } from 'lucide-react';

export const ProblemsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [currentSession, setCurrentSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const subjects = [
    { id: '', name: 'Any subject', icon: '🤔' },
    { id: 'math', name: 'Mathematics', icon: '🔢' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'english', name: 'English', icon: '📝' },
    { id: 'history', name: 'History', icon: '📚' },
    { id: 'art', name: 'Art', icon: '🎨' },
  ];

  useEffect(() => {
    loadSuggestedQuestions();
  }, [selectedSubject]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestedQuestions = async () => {
    try {
      const response = await AITutorApiService.getSuggestedQuestions(selectedSubject || undefined);
      setSuggestedQuestions(response.questions);
    } catch (error) {
      console.warn('Failed to load suggested questions:', error);
    }
  };

  const startNewSession = async (initialQuestion?: string) => {
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

      if (initialQuestion) {
        setInputMessage('');
        await sendMessage(response.session.id, initialQuestion);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (sessionId: string, message: string) => {
    try {
      setIsTyping(true);
      setError(null);

      const response = await AITutorApiService.sendMessage(sessionId, message, {
        subject: selectedSubject || undefined,
        emotionalState: 'engaged'
      });

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      // Add AI response
      setMessages(prev => [...prev, userMessage, response.message]);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const message = inputMessage.trim();
    setInputMessage('');

    if (!currentSession) {
      await startNewSession(message);
    } else {
      await sendMessage(currentSession.id, message);
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    setInputMessage(question);
    if (!currentSession) {
      await startNewSession(question);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => (
        <p key={index} className={line.trim() ? 'mb-2 last:mb-0' : 'mb-1'}>
          {line || '\u00A0'}
        </p>
      ));
  };

  if (error) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
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
    <div className="h-screen bg-white flex flex-col">
      {/* Simple Header */}
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
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SprigIcon type={sprigIcons.happy} size="lg" className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  Welcome to your AI Tutor!
                </h2>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                  I'm here to help you learn by asking the right questions and guiding your thinking. 
                  What would you like to explore today?
                </p>
                
                {suggestedQuestions.length > 0 && (
                  <div className="space-y-3 max-w-lg mx-auto">
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
            ) : (
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
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
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
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message AI Tutor"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                  rows={1}
                  disabled={isLoading || isTyping}
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                  }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || isTyping}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 