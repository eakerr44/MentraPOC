import { HelpArticle, SearchFilters, SearchResult, UserRole } from '../types/help';
import { helpArticles } from './helpData';

export class HelpSearchService {
  /**
   * Search through help articles with intelligent relevance scoring
   */
  static search(query: string, filters?: SearchFilters): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const results: SearchResult[] = [];

    for (const article of helpArticles) {
      // Apply role filter
      if (filters?.role && !article.targetRoles.includes(filters.role)) {
        continue;
      }

      // Apply type filter
      if (filters?.type && article.type !== filters.type) {
        continue;
      }

      // Apply category filter
      if (filters?.category && article.category !== filters.category) {
        continue;
      }

      // Apply tag filter
      if (filters?.tags && !filters.tags.some(tag => article.tags.includes(tag))) {
        continue;
      }

      const searchResult = this.calculateRelevance(article, searchTerms, query);
      if (searchResult.relevanceScore > 0) {
        results.push(searchResult);
      }
    }

    // Sort by relevance score (descending)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get popular search suggestions based on user role
   */
  static getSearchSuggestions(role?: UserRole): string[] {
    const suggestions: Record<UserRole | 'general', string[]> = {
      student: [
        'how to journal',
        'AI helper',
        'password reset',
        'privacy settings',
        'achievement badges',
        'goals'
      ],
      teacher: [
        'classroom management',
        'student progress',
        'assignments',
        'intervention tools',
        'parent communication',
        'dashboard analytics'
      ],
      parent: [
        'child dashboard',
        'engagement levels',
        'support at home',
        'teacher communication',
        'privacy safety',
        'learning tips'
      ],
      admin: [
        'setup guide',
        'configuration',
        'troubleshooting',
        'user management',
        'security',
        'deployment'
      ],
      general: [
        'getting started',
        'password reset',
        'browser compatibility',
        'privacy safety',
        'troubleshooting',
        'help'
      ]
    };

    return role ? suggestions[role] : suggestions.general;
  }

  /**
   * Get related articles based on tags and categories
   */
  static getRelatedArticles(articleId: string, maxResults: number = 5): HelpArticle[] {
    const article = helpArticles.find(a => a.id === articleId);
    if (!article) return [];

    const related = helpArticles
      .filter(a => a.id !== articleId)
      .map(a => ({
        article: a,
        score: this.calculateSimilarity(article, a)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ article }) => article);

    return related;
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevance(article: HelpArticle, searchTerms: string[], originalQuery: string): SearchResult {
    let score = 0;
    const matchedKeywords: string[] = [];
    let matchedText = '';

    const lowerQuery = originalQuery.toLowerCase();
    const articleText = `${article.title} ${article.description} ${article.content}`.toLowerCase();
    const articleKeywords = article.searchKeywords.map(k => k.toLowerCase());
    const articleTags = article.tags.map(t => t.toLowerCase());

    // Exact phrase match in title (highest weight)
    if (article.title.toLowerCase().includes(lowerQuery)) {
      score += 100;
      matchedText = article.title;
    }

    // Exact phrase match in description
    if (article.description.toLowerCase().includes(lowerQuery)) {
      score += 80;
      if (!matchedText) matchedText = article.description;
    }

    // Title word matches
    for (const term of searchTerms) {
      if (article.title.toLowerCase().includes(term)) {
        score += 50;
        matchedKeywords.push(term);
        if (!matchedText) matchedText = article.title;
      }
    }

    // Search keywords matches
    for (const term of searchTerms) {
      for (const keyword of articleKeywords) {
        if (keyword.includes(term) || term.includes(keyword)) {
          score += 30;
          matchedKeywords.push(keyword);
        }
      }
    }

    // Tag matches
    for (const term of searchTerms) {
      for (const tag of articleTags) {
        if (tag.includes(term) || term.includes(tag)) {
          score += 25;
          matchedKeywords.push(tag);
        }
      }
    }

    // Description word matches
    for (const term of searchTerms) {
      if (article.description.toLowerCase().includes(term)) {
        score += 20;
        matchedKeywords.push(term);
        if (!matchedText) matchedText = article.description;
      }
    }

    // Content matches (lower weight due to length)
    for (const term of searchTerms) {
      const contentMatches = (article.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      score += contentMatches * 5;
      if (contentMatches > 0) {
        matchedKeywords.push(term);
        if (!matchedText) {
          // Extract a snippet around the first match
          const index = article.content.toLowerCase().indexOf(term);
          const start = Math.max(0, index - 50);
          const end = Math.min(article.content.length, index + 100);
          matchedText = '...' + article.content.substring(start, end) + '...';
        }
      }
    }

    // Featured articles bonus
    if (article.featured) {
      score += 15;
    }

    // Newer articles slight bonus
    const articleDate = new Date(article.lastUpdated);
    const daysSinceUpdate = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 10;
    }

    return {
      article,
      relevanceScore: score,
      matchedText: matchedText || article.description,
      matchedKeywords: [...new Set(matchedKeywords)]
    };
  }

  /**
   * Calculate similarity between two articles for related content
   */
  private static calculateSimilarity(article1: HelpArticle, article2: HelpArticle): number {
    let score = 0;

    // Same category
    if (article1.category === article2.category) {
      score += 30;
    }

    // Same type
    if (article1.type === article2.type) {
      score += 20;
    }

    // Shared roles
    const sharedRoles = article1.targetRoles.filter(role => article2.targetRoles.includes(role));
    score += sharedRoles.length * 15;

    // Shared tags
    const sharedTags = article1.tags.filter(tag => article2.tags.includes(tag));
    score += sharedTags.length * 10;

    // Shared keywords
    const sharedKeywords = article1.searchKeywords.filter(keyword => 
      article2.searchKeywords.some(k => k.includes(keyword) || keyword.includes(k))
    );
    score += sharedKeywords.length * 5;

    return score;
  }

  /**
   * Filter articles by role and return organized sections
   */
  static getArticlesForRole(role: UserRole): { [sectionId: string]: HelpArticle[] } {
    const result: { [sectionId: string]: HelpArticle[] } = {};

    // Group articles by category for the specific role
    const roleArticles = helpArticles.filter(article => article.targetRoles.includes(role));

    for (const article of roleArticles) {
      const sectionKey = article.category;
      if (!result[sectionKey]) {
        result[sectionKey] = [];
      }
      result[sectionKey].push(article);
    }

    // Sort articles within each section by featured status and update date
    for (const section in result) {
      result[section].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      });
    }

    return result;
  }

  /**
   * Get quick answer for common questions
   */
  static getQuickAnswer(query: string): string | null {
    const lowerQuery = query.toLowerCase();

    const quickAnswers: { [key: string]: string } = {
      'reset password': 'Go to the login page and click "Forgot Password". Enter your username or email, then check your email for reset instructions.',
      'forgot password': 'Go to the login page and click "Forgot Password". Enter your username or email, then check your email for reset instructions.',
      'change password': 'Go to your profile settings and look for "Change Password" or "Security" options.',
      'login problems': 'Try clearing your browser cache, checking your internet connection, and using the correct username and password.',
      'browser support': 'Mentra works best with Chrome, Firefox, Safari, or Edge. Make sure your browser is up to date.',
      'privacy settings': 'You can control privacy settings for journal entries by choosing "Private", "Share with teacher", or "Share with parents" for each entry.',
      'ai helper': 'The AI helper provides hints and guidance without giving away answers. It\'s designed to support your learning, not replace your thinking.',
      'mobile app': 'Mentra is a web-based platform that works in your browser. No app download is needed, but some features work better on larger screens.'
    };

    for (const [key, answer] of Object.entries(quickAnswers)) {
      if (lowerQuery.includes(key)) {
        return answer;
      }
    }

    return null;
  }
} 