import React, { useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useJournalStore } from '../../stores/journalStore';
import { JournalEntryEditorProps, EmotionalState } from '../../types/journal';
import JournalApiService from '../../services/journalApi';
import { TagInput } from './TagInput';
import { PrivacyControls } from './PrivacyControls';
import { EmotionSelector } from './EmotionSelector';
import { ReflectionPrompts } from './ReflectionPrompts';
import { 
  Save, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const JournalEntryEditor: React.FC<JournalEntryEditorProps> = ({
  entry,
  onSave,
  onCancel,
  isLoading = false,
  autoSave = true,
}) => {
  const {
    draft,
    updateDraft,
    isSaving,
    isAutoSaving,
    error,
    settings,
    suggestedTags,
    clearError,
  } = useJournalStore();

  const quillRef = useRef<ReactQuill>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [showReflectionPrompts, setShowReflectionPrompts] = React.useState(false);
  const [savedEntry, setSavedEntry] = React.useState<any>(null);

  // Rich text editor configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false, // Disable match visual formatting
    }
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent', 'blockquote', 'code-block',
    'color', 'background', 'link'
  ];

  // Handle content changes
  const handleContentChange = useCallback((content: string) => {
    updateDraft({ content });
  }, [updateDraft]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateDraft({ title: e.target.value });
  }, [updateDraft]);

  // Validate form data
  const validateForm = useCallback(() => {
    if (!draft) return { isValid: false, errors: ['No draft data'] };
    
    const validation = JournalApiService.validateEntryData({
      title: draft.title,
      content: draft.content,
      plainTextContent: JournalApiService.convertToPlainText(draft.content),
      tags: draft.tags,
      isPrivate: draft.isPrivate,
      isShareableWithTeacher: draft.isShareableWithTeacher,
      isShareableWithParent: draft.isShareableWithParent,
      emotionalState: draft.emotionalState as EmotionalState | undefined,
      mood: draft.mood,
    });

    return validation;
  }, [draft]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!draft) return;

    const validation = validateForm();
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      return;
    }

    try {
      const plainTextContent = JournalApiService.convertToPlainText(draft.content);
      const entryData = {
        title: draft.title,
        content: draft.content,
        plainTextContent,
        tags: draft.tags,
        isPrivate: draft.isPrivate,
        isShareableWithTeacher: draft.isShareableWithTeacher,
        isShareableWithParent: draft.isShareableWithParent,
        emotionalState: draft.emotionalState as EmotionalState | undefined,
        mood: draft.mood,
      };

      if (entry) {
        await onSave({ id: entry.id, ...entryData });
        setSavedEntry({ ...entry, ...entryData });
      } else {
        await onSave(entryData);
        setSavedEntry({ id: Date.now().toString(), ...entryData });
      }
      
      // Show reflection prompts after successful save if enabled
      if (settings?.enableAIPrompts && draft.content.trim().length > 50) {
        setShowReflectionPrompts(true);
      }
    } catch (error: any) {
      console.error('Save failed:', error);
    }
  }, [draft, entry, onSave, validateForm, settings]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (window.confirm('Are you sure you want to discard your changes?')) {
      onCancel();
    }
  }, [onCancel]);

  // Focus title on mount
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleCancel]);

  // Calculate word count
  const wordCount = draft ? JournalApiService.countWords(
    JournalApiService.convertToPlainText(draft.content)
  ) : 0;

  const readingTime = draft ? JournalApiService.estimateReadingTime(
    JournalApiService.convertToPlainText(draft.content)
  ) : 0;

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  const validation = validateForm();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Main Editor */}
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {entry ? 'Edit Entry' : 'New Journal Entry'}
            </h2>
            {isAutoSaving && (
              <div className="flex items-center text-sm text-blue-600">
                <Clock className="w-4 h-4 mr-1" />
                Auto-saving...
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Word count and reading time */}
            <div className="text-sm text-gray-500">
              {wordCount} words • {readingTime} min read
            </div>
            
            {/* Privacy indicator */}
            <div className="flex items-center text-sm">
              {draft.isPrivate ? (
                <><EyeOff className="w-4 h-4 mr-1" /> Private</>
              ) : (
                <><Eye className="w-4 h-4 mr-1" /> Shareable</>
              )}
            </div>
            
            {/* Cancel button */}
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={clearError}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Validation errors */}
        {!validation.isValid && validation.errors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <div className="text-yellow-800 font-medium">Please fix the following issues:</div>
                <ul className="list-disc list-inside text-yellow-700 mt-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main editor area */}
        <div className="p-6 space-y-6">
          {/* Title input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              ref={titleRef}
              id="title"
              type="text"
              value={draft.title}
              onChange={handleTitleChange}
              placeholder="Enter a title for your journal entry..."
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
            <div className="mt-1 text-sm text-gray-500">
              {draft.title.length}/200 characters
            </div>
          </div>

          {/* Emotional state selector */}
          <EmotionSelector
            selectedEmotion={draft.emotionalState}
            onEmotionChange={(emotion: EmotionalState) => updateDraft({ emotionalState: emotion })}
          />

          {/* Rich text editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={draft.content}
                onChange={handleContentChange}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Start writing your thoughts..."
                style={{ minHeight: '300px' }}
              />
            </div>
          </div>

          {/* Tags input */}
          <TagInput
            tags={draft.tags}
            onTagsChange={(tags: string[]) => updateDraft({ tags })}
            suggestions={suggestedTags}
            maxTags={20}
          />

          {/* Privacy controls */}
          <PrivacyControls
            isPrivate={draft.isPrivate}
            isShareableWithTeacher={draft.isShareableWithTeacher}
            isShareableWithParent={draft.isShareableWithParent}
            onPrivacyChange={(privacy: any) => updateDraft(privacy)}
          />
        </div>

        {/* Footer with save button */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {autoSave && settings?.autoSaveInterval && (
              <div>Auto-save every {settings.autoSaveInterval} seconds</div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving || !validation.isValid || isLoading}
              className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center ${
                validation.isValid && !isSaving && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {entry ? 'Update Entry' : 'Save Entry'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Reflection Prompts Section */}
      {savedEntry && settings?.enableAIPrompts && (
        <div className="transition-all duration-300">
          <div className="bg-white rounded-lg shadow-lg border border-blue-200">
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Ready for Deeper Reflection?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Generate AI-powered prompts to explore your thoughts and feelings more deeply
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowReflectionPrompts(!showReflectionPrompts)}
                  className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showReflectionPrompts ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {showReflectionPrompts && (
              <div className="p-0">
                <ReflectionPrompts
                  entryId={savedEntry.id}
                  journalContent={savedEntry.plainTextContent || savedEntry.content}
                  emotionalState={savedEntry.emotionalState}
                  readOnly={false}
                  showMetadata={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 