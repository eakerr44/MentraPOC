import React from 'react';
import { Lock, Users, User, Eye } from 'lucide-react';

interface PrivacyControlsProps {
  isPrivate: boolean;
  isShareableWithTeacher: boolean;
  isShareableWithParent: boolean;
  onPrivacyChange: (privacy: {
    isPrivate: boolean;
    isShareableWithTeacher: boolean;
    isShareableWithParent: boolean;
  }) => void;
  disabled?: boolean;
}

export const PrivacyControls: React.FC<PrivacyControlsProps> = ({
  isPrivate,
  isShareableWithTeacher,
  isShareableWithParent,
  onPrivacyChange,
  disabled = false,
}) => {
  const handlePrivacyOptionChange = (option: 'private' | 'teacher' | 'parent' | 'public') => {
    switch (option) {
      case 'private':
        onPrivacyChange({
          isPrivate: true,
          isShareableWithTeacher: false,
          isShareableWithParent: false,
        });
        break;
      case 'teacher':
        onPrivacyChange({
          isPrivate: false,
          isShareableWithTeacher: true,
          isShareableWithParent: false,
        });
        break;
      case 'parent':
        onPrivacyChange({
          isPrivate: false,
          isShareableWithTeacher: false,
          isShareableWithParent: true,
        });
        break;
      case 'public':
        onPrivacyChange({
          isPrivate: false,
          isShareableWithTeacher: true,
          isShareableWithParent: true,
        });
        break;
    }
  };

  // Determine current privacy setting
  const getCurrentSetting = () => {
    if (isPrivate) return 'private';
    if (isShareableWithTeacher && isShareableWithParent) return 'public';
    if (isShareableWithTeacher) return 'teacher';
    if (isShareableWithParent) return 'parent';
    return 'private'; // Default fallback
  };

  const currentSetting = getCurrentSetting();

  const privacyOptions = [
    {
      id: 'private',
      label: 'Private',
      description: 'Only you can see this entry',
      icon: Lock,
      color: 'text-red-600 bg-red-50 border-red-200',
    },
    {
      id: 'teacher',
      label: 'Share with Teacher',
      description: 'Your teacher can see this entry',
      icon: User,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      id: 'parent',
      label: 'Share with Parent',
      description: 'Your parent can see this entry',
      icon: Users,
      color: 'text-green-600 bg-green-50 border-green-200',
    },
    {
      id: 'public',
      label: 'Share with Both',
      description: 'Both teacher and parent can see this entry',
      icon: Eye,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Privacy Settings
      </label>
      
      <div className="space-y-3">
        {privacyOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = currentSetting === option.id;
          
          return (
            <label
              key={option.id}
              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? option.color
                  : 'border-gray-200 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="privacy"
                value={option.id}
                checked={isSelected}
                onChange={() => handlePrivacyOptionChange(option.id as any)}
                disabled={disabled}
                className="sr-only"
              />
              
              <div className="flex items-center w-full">
                <Icon 
                  className={`w-5 h-5 mr-3 ${
                    isSelected ? option.color.split(' ')[0] : 'text-gray-400'
                  }`} 
                />
                
                <div className="flex-1">
                  <div className={`font-medium ${
                    isSelected ? option.color.split(' ')[0] : 'text-gray-900'
                  }`}>
                    {option.label}
                  </div>
                  <div className={`text-sm ${
                    isSelected 
                      ? `${option.color.split(' ')[0]} opacity-80`
                      : 'text-gray-500'
                  }`}>
                    {option.description}
                  </div>
                </div>
                
                {isSelected && (
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    option.color.split(' ')[0]
                  } border-current`}>
                    <div className={`w-2 h-2 rounded-full ${
                      option.color.split(' ')[1]
                    } mx-auto mt-0.5`} />
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Privacy explanation */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <div className="text-sm text-gray-600">
          <strong>Privacy Note:</strong> You can change these settings anytime after saving. 
          Private entries are always encrypted and secure. Shared entries help your teacher 
          and parent support your learning journey.
        </div>
      </div>
    </div>
  );
}; 