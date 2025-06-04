import React, { useState, useRef, KeyboardEvent } from 'react';
import { TagInputProps } from '../../types/journal';
import { X, Tag } from 'lucide-react';

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  suggestions = [],
  maxTags = 20,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    suggestion =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(suggestion)
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (
      trimmedTag &&
      !tags.includes(trimmedTag) &&
      tags.length < maxTags &&
      trimmedTag.length <= 50
    ) {
      onTagsChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(e.target.value.length > 0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Tag className="w-4 h-4 inline mr-1" />
        Tags ({tags.length}/{maxTags})
      </label>
      
      <div className="relative">
        {/* Tags and input container */}
        <div className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <div className="flex flex-wrap gap-2">
            {/* Display existing tags */}
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
              >
                {tag}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            
            {/* Input field */}
            {!disabled && tags.length < maxTags && (
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(inputValue.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={tags.length === 0 ? "Add tags..." : ""}
                className="flex-1 min-w-[100px] border-0 outline-0 bg-transparent text-sm"
                maxLength={50}
              />
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="mt-1 text-xs text-gray-500">
        Press Enter or comma to add a tag. Press Backspace to remove the last tag.
        {tags.length >= maxTags && (
          <span className="text-orange-600 ml-2">Maximum tags reached</span>
        )}
      </div>

      {/* Character count for current input */}
      {inputValue.length > 0 && (
        <div className="mt-1 text-xs text-gray-400">
          {inputValue.length}/50 characters
        </div>
      )}
    </div>
  );
}; 