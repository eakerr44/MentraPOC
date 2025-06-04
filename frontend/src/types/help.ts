export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type ContentType = 
  | 'user-guide' 
  | 'quick-reference' 
  | 'faq' 
  | 'troubleshooting' 
  | 'api-docs' 
  | 'setup-guide';

export type ContentCategory = 
  | 'getting-started'
  | 'daily-use'
  | 'advanced-features'
  | 'troubleshooting'
  | 'account-management'
  | 'privacy-safety'
  | 'technical-support';

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  type: ContentType;
  category: ContentCategory;
  targetRoles: UserRole[];
  tags: string[];
  lastUpdated: string;
  readTime: number; // estimated read time in minutes
  featured: boolean;
  searchKeywords: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  articles: HelpArticle[];
  targetRoles: UserRole[];
  order: number;
}

export interface SearchFilters {
  role?: UserRole;
  type?: ContentType;
  category?: ContentCategory;
  tags?: string[];
}

export interface SearchResult {
  article: HelpArticle;
  relevanceScore: number;
  matchedText: string;
  matchedKeywords: string[];
}

export interface HelpNavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: string;
  children?: HelpNavigationItem[];
}

export interface HelpStats {
  totalArticles: number;
  articlesForRole: Record<UserRole, number>;
  mostViewedArticles: HelpArticle[];
  recentlyUpdated: HelpArticle[];
} 