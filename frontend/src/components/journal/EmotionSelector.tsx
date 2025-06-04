import React, { useState } from 'react';
import { EmotionSelectorProps, EmotionType, EmotionalState } from '../../types/journal';
import { Heart, Smile, Frown, Meh, Zap, Brain } from 'lucide-react';

export const EmotionSelector: React.FC<EmotionSelectorProps> = ({
  selectedEmotion,
  onEmotionChange,
  disabled = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Emotion categories with icons and colors
  const emotionCategories = {
    positive: {
      label: 'Positive',
      icon: Smile,
      color: 'text-green-600',
      emotions: [
        { type: 'happy' as EmotionType, label: 'Happy', emoji: '😊' },
        { type: 'excited' as EmotionType, label: 'Excited', emoji: '🤩' },
        { type: 'proud' as EmotionType, label: 'Proud', emoji: '😌' },
        { type: 'grateful' as EmotionType, label: 'Grateful', emoji: '🙏' },
        { type: 'calm' as EmotionType, label: 'Calm', emoji: '😌' },
        { type: 'confident' as EmotionType, label: 'Confident', emoji: '😎' },
      ]
    },
    challenging: {
      label: 'Challenging',
      icon: Frown,
      color: 'text-red-600',
      emotions: [
        { type: 'sad' as EmotionType, label: 'Sad', emoji: '😢' },
        { type: 'frustrated' as EmotionType, label: 'Frustrated', emoji: '😤' },
        { type: 'anxious' as EmotionType, label: 'Anxious', emoji: '😰' },
        { type: 'angry' as EmotionType, label: 'Angry', emoji: '😠' },
        { type: 'disappointed' as EmotionType, label: 'Disappointed', emoji: '😞' },
        { type: 'overwhelmed' as EmotionType, label: 'Overwhelmed', emoji: '😵' },
      ]
    },
    learning: {
      label: 'Learning',
      icon: Brain,
      color: 'text-blue-600',
      emotions: [
        { type: 'confused' as EmotionType, label: 'Confused', emoji: '🤔' },
        { type: 'curious' as EmotionType, label: 'Curious', emoji: '🧐' },
        { type: 'surprised' as EmotionType, label: 'Surprised', emoji: '😲' },
        { type: 'bored' as EmotionType, label: 'Bored', emoji: '😴' },
        { type: 'tired' as EmotionType, label: 'Tired', emoji: '😴' },
      ]
    },
    neutral: {
      label: 'Neutral',
      icon: Meh,
      color: 'text-gray-600',
      emotions: [
        { type: 'neutral' as EmotionType, label: 'Neutral', emoji: '😐' },
      ]
    }
  };

  const handleEmotionSelect = (emotionType: EmotionType) => {
    const newEmotion: EmotionalState = {
      primary: emotionType,
      intensity: selectedEmotion?.intensity || 3,
      confidence: selectedEmotion?.confidence || 0.8,
      secondary: selectedEmotion?.secondary || [],
    };
    onEmotionChange(newEmotion);
    setShowDetails(true);
  };

  const handleIntensityChange = (intensity: 1 | 2 | 3 | 4 | 5) => {
    if (selectedEmotion) {
      onEmotionChange({
        ...selectedEmotion,
        intensity,
      });
    }
  };

  const handleSecondaryEmotionToggle = (emotionType: EmotionType) => {
    if (!selectedEmotion) return;

    const secondary = selectedEmotion.secondary || [];
    const updatedSecondary = secondary.includes(emotionType)
      ? secondary.filter(e => e !== emotionType)
      : [...secondary.slice(0, 2), emotionType]; // Max 3 secondary emotions

    onEmotionChange({
      ...selectedEmotion,
      secondary: updatedSecondary,
    });
  };

  const getEmotionLabel = (emotionType: EmotionType) => {
    for (const category of Object.values(emotionCategories)) {
      const emotion = category.emotions.find(e => e.type === emotionType);
      if (emotion) return emotion;
    }
    return { type: emotionType, label: emotionType, emoji: '😐' };
  };

  const intensityLabels = {
    1: 'Very Mild',
    2: 'Mild',
    3: 'Moderate',
    4: 'Strong',
    5: 'Very Strong',
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        <Heart className="w-4 h-4 inline mr-1" />
        How are you feeling?
      </label>

      {/* Primary emotion selection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(emotionCategories).map(([categoryKey, category]) => {
          const Icon = category.icon;
          const hasSelectedFromCategory = selectedEmotion && 
            category.emotions.some(e => e.type === selectedEmotion.primary);

          return (
            <div key={categoryKey} className="space-y-2">
              <div className={`text-xs font-medium ${category.color} flex items-center`}>
                <Icon className="w-3 h-3 mr-1" />
                {category.label}
              </div>
              
              <div className="space-y-1">
                {category.emotions.map((emotion) => {
                  const isSelected = selectedEmotion?.primary === emotion.type;
                  
                  return (
                    <button
                      key={emotion.type}
                      type="button"
                      onClick={() => handleEmotionSelect(emotion.type)}
                      disabled={disabled}
                      className={`w-full p-2 text-left text-sm border rounded-md transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="mr-2">{emotion.emoji}</span>
                      {emotion.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed emotion configuration */}
      {selectedEmotion && showDetails && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-blue-900">
              You're feeling {getEmotionLabel(selectedEmotion.primary).label} 
              {getEmotionLabel(selectedEmotion.primary).emoji}
            </h4>
            <button
              onClick={() => setShowDetails(false)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Collapse
            </button>
          </div>

          {/* Intensity slider */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Intensity: {intensityLabels[selectedEmotion.intensity]}
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleIntensityChange(level as 1 | 2 | 3 | 4 | 5)}
                  disabled={disabled}
                  className={`w-8 h-8 rounded-full border-2 transition-colors ${
                    selectedEmotion.intensity >= level
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <span className="sr-only">Intensity {level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Secondary emotions */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Any other feelings? (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(emotionCategories).flatMap(category => category.emotions)
                .filter(emotion => emotion.type !== selectedEmotion.primary)
                .slice(0, 12) // Limit options
                .map((emotion) => {
                  const isSelected = selectedEmotion.secondary?.includes(emotion.type);
                  
                  return (
                    <button
                      key={emotion.type}
                      type="button"
                      onClick={() => handleSecondaryEmotionToggle(emotion.type)}
                      disabled={disabled}
                      className={`px-3 py-1 text-xs border rounded-full transition-colors ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {emotion.emoji} {emotion.label}
                    </button>
                  );
                })}
            </div>
            {selectedEmotion.secondary && selectedEmotion.secondary.length >= 3 && (
              <div className="text-xs text-blue-700 mt-1">
                Maximum 3 additional emotions selected
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!selectedEmotion && (
        <div className="flex items-center justify-center space-x-4 py-4 text-sm text-gray-500">
          <span>Quick select:</span>
          <button
            onClick={() => handleEmotionSelect('happy')}
            className="hover:text-green-600"
          >
            😊 Happy
          </button>
          <button
            onClick={() => handleEmotionSelect('neutral')}
            className="hover:text-gray-700"
          >
            😐 Neutral
          </button>
          <button
            onClick={() => handleEmotionSelect('confused')}
            className="hover:text-blue-600"
          >
            🤔 Confused
          </button>
        </div>
      )}

      {/* Clear selection */}
      {selectedEmotion && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              onEmotionChange(undefined as any);
              setShowDetails(false);
            }}
            disabled={disabled}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear emotion
          </button>
        </div>
      )}
    </div>
  );
}; 