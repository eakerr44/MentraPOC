import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageCircle, 
  Send, 
  Clock, 
  CheckCircle, 
  Lightbulb,
  Heart,
  Target,
  TrendingUp,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AIReflectionPrompt {
  id: string;
  prompt: string;
  response?: string;
  generatedAt: string;
  respondedAt?: string;
  promptType: 'emotional-exploration' | 'learning-reflection' | 'goal-setting' | 'problem-solving' | 'gratitude-appreciation' | 'growth-mindset';
  developmentLevel: string;
  personalizedElements?: Record<string, string>;
  templateUsed?: string;
  metadata?: {
    contentTriggers: string[];
    themes: string[];
    complexity: string;
    learningProfileSummary?: any;
  };
}

interface ReflectionPromptProps {
  prompt: AIReflectionPrompt;
  onSubmitResponse: (promptId: string, response: string) => Promise<void>;
  isSubmitting?: boolean;
  readOnly?: boolean;
  showMetadata?: boolean;
}

const PROMPT_TYPE_CONFIG = {
  'emotional-exploration': {
    icon: Heart,
    label: 'Emotional Exploration',
    color: 'text-pink-600 bg-pink-50 border-pink-200',
    description: 'Exploring your feelings and emotional responses'
  },
  'learning-reflection': {
    icon: Brain,
    label: 'Learning Reflection',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Thinking about your learning process'
  },
  'goal-setting': {
    icon: Target,
    label: 'Goal Setting',
    color: 'text-green-600 bg-green-50 border-green-200',
    description: 'Planning and setting goals for growth'
  },
  'problem-solving': {
    icon: HelpCircle,
    label: 'Problem Solving',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    description: 'Working through challenges and difficulties'
  },
  'gratitude-appreciation': {
    icon: Sparkles,
    label: 'Gratitude & Appreciation',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    description: 'Recognizing positive experiences and growth'
  },
  'growth-mindset': {
    icon: TrendingUp,
    label: 'Growth Mindset',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    description: 'Building resilience and learning from challenges'
  }
};

export const ReflectionPrompt: React.FC<ReflectionPromptProps> = ({
  prompt,
  onSubmitResponse,
  isSubmitting = false,
  readOnly = false,
  showMetadata = false
}) => {
  const [response, setResponse] = useState(prompt.response || '');
  const [isExpanded, setIsExpanded] = useState(!prompt.response);
  const [showDetails, setShowDetails] = useState(false);
  const [charCount, setCharCount] = useState(prompt.response?.length || 0);

  const config = PROMPT_TYPE_CONFIG[prompt.promptType];
  const Icon = config?.icon || MessageCircle;
  const isAnswered = !!prompt.response;

  useEffect(() => {
    setCharCount(response.length);
  }, [response]);

  const handleSubmit = async () => {
    if (!response.trim() || isSubmitting) return;
    
    try {
      await onSubmitResponse(prompt.id, response.trim());
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 ${
      isAnswered 
        ? 'bg-gray-50 border-gray-200' 
        : `${config?.color} border-2`
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            isAnswered ? 'bg-gray-200 text-gray-600' : config?.color.split(' ')[1] + ' ' + config?.color.split(' ')[0]
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <h4 className={`font-medium ${
                isAnswered ? 'text-gray-700' : config?.color.split(' ')[0]
              }`}>
                {config?.label || 'Reflection Prompt'}
              </h4>
              {isAnswered && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
            </div>
            <p className="text-sm text-gray-500">
              {config?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {formatDate(prompt.generatedAt)}
          </span>
          
          {showMetadata && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Metadata Details */}
      {showDetails && showMetadata && prompt.metadata && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-medium text-gray-700">Development Level:</span>
              <div className="text-gray-600">{prompt.developmentLevel.replace('_', ' ')}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Content Themes:</span>
              <div className="text-gray-600">{prompt.metadata.themes.join(', ') || 'General'}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Triggers:</span>
              <div className="text-gray-600">
                {prompt.metadata.contentTriggers.slice(0, 3).join(', ')}
                {prompt.metadata.contentTriggers.length > 3 && '...'}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Complexity:</span>
              <div className="text-gray-600 capitalize">{prompt.metadata.complexity}</div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Text */}
      <div className="mb-4">
        <div className={`p-4 rounded-lg border-l-4 ${
          isAnswered 
            ? 'bg-white border-gray-300' 
            : 'bg-white border-l-blue-400'
        }`}>
          <div className="flex items-start space-x-3">
            <Lightbulb className={`w-5 h-5 mt-0.5 ${
              isAnswered ? 'text-gray-400' : 'text-blue-500'
            }`} />
            <p className="text-gray-800 leading-relaxed">
              {prompt.prompt}
            </p>
          </div>
        </div>
      </div>

      {/* Response Section */}
      {isAnswered ? (
        // Display existing response
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-700 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Your Response
            </h5>
            <div className="text-xs text-gray-500 flex items-center space-x-3">
              <span>{getWordCount(prompt.response!)} words</span>
              <span>•</span>
              <span>Answered {formatDate(prompt.respondedAt!)}</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {prompt.response}
            </p>
          </div>

          {!readOnly && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              {isExpanded ? 'Hide' : 'Edit'} response
              {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
          )}
        </div>
      ) : (
        // Response input for new prompts
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-700 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Your Response
            </h5>
            <div className="text-xs text-gray-500">
              {charCount} characters • {getWordCount(response)} words
            </div>
          </div>
        </div>
      )}

      {/* Response Input (shown when expanding or for new prompts) */}
      {(isExpanded && !readOnly) && (
        <div className="space-y-3 mt-3">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Take your time to reflect and share your thoughts..."
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={6}
            disabled={isSubmitting}
          />
          
          {/* Response Guidelines */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">Reflection Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Be honest about your thoughts and feelings</li>
                  <li>Consider specific examples from your experience</li>
                  <li>Think about what you learned or how you grew</li>
                  <li>There are no right or wrong answers - this is your space</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Press Ctrl+Enter to submit quickly
            </div>
            
            <div className="flex items-center space-x-3">
              {isAnswered && (
                <button
                  onClick={() => {
                    setResponse(prompt.response || '');
                    setIsExpanded(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={!response.trim() || isSubmitting}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  !response.trim() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {isAnswered ? 'Update Response' : 'Submit Response'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encouragement Message for Completed Prompts */}
      {isAnswered && !isExpanded && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <p className="text-sm font-medium">
              Great reflection! Your thoughtful response shows real growth in self-awareness.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 