import React, { useState, useEffect } from 'react';
import { ReflectionPrompt } from './ReflectionPrompt';
import JournalApiService from '../../services/journalApi';
import { AIReflectionPrompt } from '../../types/journal';
import { 
  Brain, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';

interface ReflectionPromptsProps {
  entryId: string;
  journalContent: string;
  emotionalState?: any;
  readOnly?: boolean;
  showMetadata?: boolean;
  className?: string;
}

const PROMPT_TYPE_OPTIONS = [
  { value: 'emotional-exploration', label: 'Emotional Exploration', icon: '❤️' },
  { value: 'learning-reflection', label: 'Learning Reflection', icon: '🧠' },
  { value: 'goal-setting', label: 'Goal Setting', icon: '🎯' },
  { value: 'problem-solving', label: 'Problem Solving', icon: '❓' },
  { value: 'gratitude-appreciation', label: 'Gratitude & Appreciation', icon: '✨' },
  { value: 'growth-mindset', label: 'Growth Mindset', icon: '📈' }
];

export const ReflectionPrompts: React.FC<ReflectionPromptsProps> = ({
  entryId,
  journalContent,
  emotionalState,
  readOnly = false,
  showMetadata = false,
  className = ''
}) => {
  const [prompts, setPrompts] = useState<AIReflectionPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showGenerationOptions, setShowGenerationOptions] = useState(false);
  const [generationSettings, setGenerationSettings] = useState({
    maxPrompts: 3,
    preferredTypes: [] as string[]
  });

  // Load existing prompts on mount
  useEffect(() => {
    loadPrompts();
  }, [entryId]);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await JournalApiService.getPrompts(entryId);
      setPrompts(response.prompts || []);
    } catch (error: any) {
      console.error('Failed to load reflection prompts:', error);
      setError('Failed to load reflection prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewPrompts = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await JournalApiService.generateReflectionPrompts(entryId, {
        content: journalContent,
        maxPrompts: generationSettings.maxPrompts,
        preferredTypes: generationSettings.preferredTypes
      });

      // Add new prompts to the list
      setPrompts(prev => [...response.prompts, ...prev]);
      setShowGenerationOptions(false);
      
      // Auto-expand if there were no prompts before
      if (prompts.length === 0) {
        setIsExpanded(true);
      }

    } catch (error: any) {
      console.error('Failed to generate reflection prompts:', error);
      setError(error.message || 'Failed to generate reflection prompts');
    } finally {
      setIsGenerating(false);
    }
  };

  const submitResponse = async (promptId: string, response: string) => {
    try {
      setIsSubmitting(promptId);
      setError(null);

      const updatedPrompt = await JournalApiService.submitReflectionResponse(promptId, response);
      
      // Update the prompt in the list
      setPrompts(prev => prev.map(p => 
        p.id === promptId ? { ...p, response, respondedAt: updatedPrompt.respondedAt } : p
      ));

    } catch (error: any) {
      console.error('Failed to submit response:', error);
      setError(error.message || 'Failed to submit response');
      throw error; // Re-throw to let the prompt component handle it
    } finally {
      setIsSubmitting(null);
    }
  };

  const handlePreferredTypeToggle = (type: string) => {
    setGenerationSettings(prev => ({
      ...prev,
      preferredTypes: prev.preferredTypes.includes(type)
        ? prev.preferredTypes.filter(t => t !== type)
        : [...prev.preferredTypes, type]
    }));
  };

  const getPromptStats = () => {
    const total = prompts.length;
    const answered = prompts.filter(p => p.response).length;
    const pending = total - answered;
    
    return { total, answered, pending };
  };

  const stats = getPromptStats();

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Clock className="w-5 h-5 text-gray-400 mr-2 animate-spin" />
          <span className="text-gray-600">Loading reflection prompts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 flex items-center">
                AI Reflection Prompts
                {stats.total > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {stats.answered}/{stats.total} completed
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500">
                Personalized prompts to deepen your learning reflection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!readOnly && (
              <>
                <button
                  onClick={() => setShowGenerationOptions(!showGenerationOptions)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Generation Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                
                <button
                  onClick={generateNewPrompts}
                  disabled={isGenerating}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center ${
                    isGenerating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Generate Prompts
                    </>
                  )}
                </button>
              </>
            )}

            {prompts.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Generation Settings */}
        {showGenerationOptions && !readOnly && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of prompts to generate
              </label>
              <select
                value={generationSettings.maxPrompts}
                onChange={(e) => setGenerationSettings(prev => ({ 
                  ...prev, 
                  maxPrompts: parseInt(e.target.value) 
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>1 prompt</option>
                <option value={2}>2 prompts</option>
                <option value={3}>3 prompts</option>
                <option value={4}>4 prompts</option>
                <option value={5}>5 prompts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred prompt types (optional)
              </label>
              <div className="space-y-2">
                {PROMPT_TYPE_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={generationSettings.preferredTypes.includes(option.value)}
                      onChange={() => handlePreferredTypeToggle(option.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {option.icon} {option.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                If none selected, the AI will choose the most relevant types based on your journal content.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowGenerationOptions(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generateNewPrompts}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Prompts
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Statistics */}
        {stats.total > 0 && (
          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              {stats.answered} answered
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-yellow-600 mr-1" />
              {stats.pending} pending
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Prompts List */}
      {isExpanded && (
        <div className="p-4">
          {prompts.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No reflection prompts yet
              </h4>
              <p className="text-gray-500 mb-4">
                Generate AI-powered prompts to deepen your learning reflection and self-awareness.
              </p>
              {!readOnly && (
                <button
                  onClick={generateNewPrompts}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate First Prompts
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {prompts.map(prompt => (
                <ReflectionPrompt
                  key={prompt.id}
                  prompt={prompt}
                  onSubmitResponse={submitResponse}
                  isSubmitting={isSubmitting === prompt.id}
                  readOnly={readOnly}
                  showMetadata={showMetadata}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed State */}
      {!isExpanded && prompts.length > 0 && (
        <div className="p-4 text-center">
          <p className="text-gray-600">
            {stats.total} reflection prompt{stats.total !== 1 ? 's' : ''} available
            {stats.pending > 0 && (
              <span className="text-yellow-600"> • {stats.pending} pending response{stats.pending !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}; 