// Dashboard Customization TypeScript Types
// Task 5.7: Implement dashboard customization and preference settings
// Comprehensive type definitions for dashboard layouts, themes, preferences, and analytics

// ========== CORE WIDGET TYPES ==========

export interface DashboardWidget {
  id: string;
  templateId: string;
  widgetKey: string;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  customProps: Record<string, any>;
  templateName: string;
  templateCategory: string;
  componentName: string;
  defaultProps: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  componentName: string;
  defaultSize: WidgetSize;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  resizable: boolean;
  movable: boolean;
  defaultProps: Record<string, any>;
  availableForRoles: UserRole[];
  requiresPermissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
  lastUpdated: string;
  totalWidgets: number;
}

export interface DashboardLayoutData {
  widgets: WidgetLayoutData[];
}

export interface WidgetLayoutData {
  templateId: string;
  widgetKey: string;
  title?: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  visible?: boolean;
  locked?: boolean;
  customProps?: Record<string, any>;
}

// ========== THEME TYPES ==========

export interface DashboardThemePreferences {
  id?: number;
  userId: number;
  themeName: ThemeName;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundType: BackgroundType;
  backgroundValue?: string;
  fontFamily: FontFamily;
  fontSizeScale: number;
  borderRadius: number;
  shadowIntensity: ShadowIntensity;
  animationEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  customCss?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeColor {
  name: string;
  value: string;
  description: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  backgroundType: BackgroundType;
  backgroundValue?: string;
}

// ========== BEHAVIOR PREFERENCES TYPES ==========

export interface DashboardBehaviorPreferences {
  id?: number;
  userId: number;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  defaultTimeframe: Timeframe;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showAnimations: boolean;
  showTooltips: boolean;
  keyboardShortcutsEnabled: boolean;
  defaultView?: string;
  quickActions: QuickAction[];
  dataDensity: DataDensity;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  shortcut?: string;
  enabled: boolean;
}

// ========== LAYOUT PRESET TYPES ==========

export interface DashboardLayoutPreset {
  id: number;
  userId: number;
  name: string;
  description: string;
  isDefault: boolean;
  isPublic: boolean;
  layoutData: DashboardLayoutData;
  thumbnailUrl?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedDashboardTemplate {
  id: number;
  name: string;
  description: string;
  createdBy?: number;
  creatorName?: string;
  templateData: DashboardLayoutData;
  targetRole: UserRole;
  category: TemplateCategory;
  difficultyLevel: DifficultyLevel;
  isOfficial: boolean;
  isFeatured: boolean;
  downloadCount: number;
  ratingAverage: number;
  ratingCount: number;
  tags: string[];
  previewImages: string[];
  requirements: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRating {
  id: number;
  templateId: number;
  userId: number;
  rating: number;
  review?: string;
  createdAt: string;
}

// ========== ANALYTICS TYPES ==========

export interface DashboardUsageAnalytics {
  id: number;
  userId: number;
  sessionId: string;
  widgetId?: string;
  actionType: AnalyticsActionType;
  actionDetails?: Record<string, any>;
  durationSeconds?: number;
  timestamp: string;
  userAgent?: string;
  screenResolution?: string;
  deviceType?: DeviceType;
}

export interface DashboardRecommendation {
  recommendationType: RecommendationType;
  title: string;
  description: string;
  actionData: Record<string, any>;
  priority: number;
}

export interface AnalyticsData {
  actionType: AnalyticsActionType;
  widgetId?: string;
  interactionCount: number;
  avgDuration?: number;
  date: string;
}

export interface SystemAnalytics {
  actionType: AnalyticsActionType;
  totalInteractions: number;
  uniqueUsers: number;
  avgDuration?: number;
  date: string;
}

// ========== WIDGET CATEGORY TYPES ==========

export interface WidgetCategoryInfo {
  category: string;
  widgetCount: number;
}

// ========== API RESPONSE TYPES ==========

export interface DashboardCustomizationApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
}

export interface LayoutApiResponse extends DashboardCustomizationApiResponse<DashboardLayout> {
  layout: DashboardLayout;
  userId: number;
}

export interface SaveLayoutApiResponse extends DashboardCustomizationApiResponse {
  result: {
    success: boolean;
    widgetCount: number;
    savedAt: string;
  };
  sessionId: string;
}

export interface AddWidgetApiResponse extends DashboardCustomizationApiResponse {
  widget: DashboardWidget;
  position: {
    x: number;
    y: number;
  };
}

export interface ThemeApiResponse extends DashboardCustomizationApiResponse<DashboardThemePreferences> {
  preferences: DashboardThemePreferences;
}

export interface BehaviorApiResponse extends DashboardCustomizationApiResponse<DashboardBehaviorPreferences> {
  preferences: DashboardBehaviorPreferences;
}

export interface PresetsApiResponse extends DashboardCustomizationApiResponse<DashboardLayoutPreset[]> {
  presets: DashboardLayoutPreset[];
}

export interface WidgetTemplatesApiResponse extends DashboardCustomizationApiResponse<DashboardWidgetTemplate[]> {
  templates: DashboardWidgetTemplate[];
  userRole: UserRole;
}

export interface CategoriesApiResponse extends DashboardCustomizationApiResponse<WidgetCategoryInfo[]> {
  categories: WidgetCategoryInfo[];
}

export interface SharedTemplatesApiResponse extends DashboardCustomizationApiResponse<SharedDashboardTemplate[]> {
  templates: SharedDashboardTemplate[];
  userRole: UserRole;
}

export interface RecommendationsApiResponse extends DashboardCustomizationApiResponse<DashboardRecommendation[]> {
  recommendations: DashboardRecommendation[];
}

export interface AnalyticsApiResponse extends DashboardCustomizationApiResponse<AnalyticsData[]> {
  analytics: AnalyticsData[];
  timeframe: string;
}

export interface ExportApiResponse extends DashboardCustomizationApiResponse {
  data: DashboardExportData;
}

export interface ImportApiResponse extends DashboardCustomizationApiResponse {
  results: {
    layout?: SaveLayoutApiResponse['result'];
    theme?: ThemeApiResponse;
    behavior?: BehaviorApiResponse;
  };
  importedAt: string;
}

// ========== EXPORT/IMPORT TYPES ==========

export interface DashboardExportData {
  version: string;
  exportedAt: string;
  userId: number;
  layout: DashboardLayout;
  theme: DashboardThemePreferences;
  behavior: DashboardBehaviorPreferences;
}

export interface DashboardImportData {
  version: string;
  layout?: {
    widgets: DashboardWidget[];
  };
  theme?: Partial<DashboardThemePreferences>;
  behavior?: Partial<DashboardBehaviorPreferences>;
}

// ========== CUSTOMIZATION CONTEXT TYPES ==========

export interface DashboardCustomizationState {
  layout: DashboardLayout | null;
  themePreferences: DashboardThemePreferences | null;
  behaviorPreferences: DashboardBehaviorPreferences | null;
  availableTemplates: DashboardWidgetTemplate[];
  sharedTemplates: SharedDashboardTemplate[];
  layoutPresets: DashboardLayoutPreset[];
  recommendations: DashboardRecommendation[];
  loading: {
    layout: boolean;
    theme: boolean;
    behavior: boolean;
    templates: boolean;
    presets: boolean;
    saving: boolean;
  };
  errors: {
    layout: string | null;
    theme: string | null;
    behavior: string | null;
    templates: string | null;
    presets: string | null;
    general: string | null;
  };
  editMode: boolean;
  selectedWidget: string | null;
  draggedWidget: DashboardWidget | null;
  clipboardLayout: DashboardLayoutData | null;
}

export interface DashboardCustomizationActions {
  // Layout actions
  loadLayout: () => Promise<void>;
  saveLayout: (layoutData: DashboardLayoutData, options?: SaveLayoutOptions) => Promise<void>;
  addWidget: (templateId: string, config?: Partial<WidgetConfig>) => Promise<void>;
  removeWidget: (widgetKey: string) => Promise<void>;
  updateWidgetPosition: (widgetKey: string, position: WidgetPosition) => Promise<void>;
  updateWidgetSettings: (widgetKey: string, settings: WidgetSettings) => Promise<void>;
  
  // Theme actions
  loadThemePreferences: () => Promise<void>;
  updateThemePreferences: (preferences: Partial<DashboardThemePreferences>) => Promise<void>;
  applyThemePreset: (preset: ThemePreset) => Promise<void>;
  resetTheme: () => Promise<void>;
  
  // Behavior actions
  loadBehaviorPreferences: () => Promise<void>;
  updateBehaviorPreferences: (preferences: Partial<DashboardBehaviorPreferences>) => Promise<void>;
  resetBehavior: () => Promise<void>;
  
  // Preset actions
  loadLayoutPresets: () => Promise<void>;
  saveLayoutAsPreset: (name: string, description?: string) => Promise<void>;
  applyLayoutPreset: (presetId: number) => Promise<void>;
  deleteLayoutPreset: (presetId: number) => Promise<void>;
  
  // Template actions
  loadWidgetTemplates: () => Promise<void>;
  loadSharedTemplates: (options?: SharedTemplateOptions) => Promise<void>;
  applySharedTemplate: (templateId: number) => Promise<void>;
  
  // UI actions
  setEditMode: (enabled: boolean) => void;
  selectWidget: (widgetKey: string | null) => void;
  setDraggedWidget: (widget: DashboardWidget | null) => void;
  copyLayout: () => void;
  pasteLayout: () => Promise<void>;
  
  // Utility actions
  trackInteraction: (actionType: AnalyticsActionType, details?: Record<string, any>) => Promise<void>;
  loadRecommendations: () => Promise<void>;
  exportConfiguration: () => Promise<DashboardExportData>;
  importConfiguration: (data: DashboardImportData) => Promise<void>;
  resetToDefaults: (options: ResetOptions) => Promise<void>;
}

// ========== COMPONENT PROP TYPES ==========

export interface DashboardCustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: CustomizationTab;
  onTabChange?: (tab: CustomizationTab) => void;
}

export interface WidgetCustomizationProps {
  widget: DashboardWidget;
  onUpdate: (settings: WidgetSettings) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export interface ThemeCustomizationProps {
  preferences: DashboardThemePreferences;
  onUpdate: (preferences: Partial<DashboardThemePreferences>) => Promise<void>;
  onReset: () => Promise<void>;
}

export interface LayoutCustomizationProps {
  layout: DashboardLayout;
  availableTemplates: DashboardWidgetTemplate[];
  onAddWidget: (templateId: string, config?: Partial<WidgetConfig>) => Promise<void>;
  onUpdateLayout: (layoutData: DashboardLayoutData) => Promise<void>;
  onSaveAsPreset: (name: string, description?: string) => Promise<void>;
}

export interface TemplateGalleryProps {
  templates: SharedDashboardTemplate[];
  userRole: UserRole;
  onApplyTemplate: (templateId: number) => Promise<void>;
  onFilterChange?: (filters: TemplateFilters) => void;
}

// ========== UTILITY TYPES ==========

export interface SaveLayoutOptions {
  saveAsPreset?: boolean;
  presetName?: string;
  presetDescription?: string;
}

export interface WidgetConfig {
  title?: string;
  width: number;
  height: number;
  customProps?: Record<string, any>;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface WidgetSettings {
  title?: string;
  visible?: boolean;
  locked?: boolean;
  customProps?: Record<string, any>;
}

export interface SharedTemplateOptions {
  category?: TemplateCategory;
  featured?: boolean;
  official?: boolean;
  limit?: number;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  difficulty?: DifficultyLevel;
  featured?: boolean;
  official?: boolean;
  search?: string;
}

export interface ResetOptions {
  resetLayout?: boolean;
  resetTheme?: boolean;
  resetBehavior?: boolean;
}

// ========== ENUM TYPES ==========

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type WidgetSize = 'small' | 'medium' | 'large' | 'xl';

export type WidgetCategory = 'overview' | 'analytics' | 'goals' | 'social' | 'tools';

export type ThemeName = 'default' | 'dark' | 'light' | 'high_contrast' | 'custom';

export type BackgroundType = 'solid' | 'gradient' | 'pattern' | 'image';

export type FontFamily = 'system' | 'sans-serif' | 'serif' | 'monospace';

export type ShadowIntensity = 'none' | 'light' | 'medium' | 'strong';

export type Timeframe = '7d' | '30d' | '90d' | 'all';

export type DataDensity = 'compact' | 'comfortable' | 'spacious';

export type DateFormat = 'relative' | 'absolute' | 'iso';

export type NumberFormat = 'full' | 'compact' | 'abbreviated';

export type TemplateCategory = 'productivity' | 'analytics' | 'minimal' | 'comprehensive';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export type AnalyticsActionType = 
  | 'view' 
  | 'interact' 
  | 'resize' 
  | 'move' 
  | 'configure' 
  | 'widget_added' 
  | 'widget_removed' 
  | 'widget_moved' 
  | 'widget_configured' 
  | 'layout_saved' 
  | 'theme_updated' 
  | 'behavior_preferences_updated' 
  | 'preset_applied';

export type RecommendationType = 
  | 'layout_template' 
  | 'add_widget' 
  | 'optimize_layout' 
  | 'theme_suggestion' 
  | 'feature_tip';

export type CustomizationTab = 
  | 'layout' 
  | 'widgets' 
  | 'theme' 
  | 'behavior' 
  | 'presets' 
  | 'templates';

// ========== ERROR TYPES ==========

export interface DashboardCustomizationError extends Error {
  code?: string;
  context?: Record<string, any>;
}

export class LayoutValidationError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'LayoutValidationError';
  }
}

export class ThemeValidationError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ThemeValidationError';
  }
}

export class WidgetConfigurationError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'WidgetConfigurationError';
  }
}

// ========== UTILITY FUNCTIONS TYPES ==========

export interface DashboardCustomizationHelpers {
  generateSessionId(): string;
  validateColor(color: string): boolean;
  sanitizeCustomCSS(css: string): string;
  generateWidgetKey(templateId: string): string;
  validateLayoutData(layoutData: DashboardLayoutData): boolean;
  optimizeLayout(widgets: DashboardWidget[]): DashboardWidget[];
  calculateOptimalPosition(
    existingWidgets: DashboardWidget[],
    newWidget: { width: number; height: number }
  ): { x: number; y: number };
}

// ========== CONSTANTS ==========

export const WIDGET_GRID_COLUMNS = 12;
export const WIDGET_MIN_WIDTH = 2;
export const WIDGET_MIN_HEIGHT = 2;
export const MAX_WIDGETS_PER_DASHBOARD = 20;
export const AUTO_REFRESH_MIN_INTERVAL = 30;
export const AUTO_REFRESH_MAX_INTERVAL = 3600;
export const ANALYTICS_RETENTION_DAYS = 90;

export const DEFAULT_WIDGET_SIZES: Record<WidgetSize, { width: number; height: number }> = {
  small: { width: 3, height: 2 },
  medium: { width: 4, height: 3 },
  large: { width: 6, height: 4 },
  xl: { width: 8, height: 5 }
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and modern default theme',
    preview: '/images/themes/default-preview.png',
    colors: { primary: '#667eea', secondary: '#764ba2', accent: '#ff6b6b' },
    backgroundType: 'gradient'
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Easy on the eyes dark theme',
    preview: '/images/themes/dark-preview.png',
    colors: { primary: '#4f46e5', secondary: '#1e1b4b', accent: '#f59e0b' },
    backgroundType: 'solid',
    backgroundValue: '#1a1a1a'
  },
  {
    id: 'light',
    name: 'Light & Airy',
    description: 'Bright and clean light theme',
    preview: '/images/themes/light-preview.png',
    colors: { primary: '#3b82f6', secondary: '#1e40af', accent: '#10b981' },
    backgroundType: 'gradient'
  }
];

// Re-export commonly used types for convenience
export type {
  DashboardWidget as Widget,
  DashboardWidgetTemplate as WidgetTemplate,
  DashboardThemePreferences as ThemePreferences,
  DashboardBehaviorPreferences as BehaviorPreferences,
  DashboardLayoutPreset as LayoutPreset,
  DashboardCustomizationState as CustomizationState,
  DashboardCustomizationActions as CustomizationActions
}; 