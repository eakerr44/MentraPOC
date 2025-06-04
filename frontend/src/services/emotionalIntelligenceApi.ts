import axios from 'axios';
import {
  EmotionalIntelligenceAnalysis,
  EIAnalysisRequest,
  EICompetencyResponse,
  EIGrowthResponse,
  EIPatternsResponse,
  EIRecommendationsResponse,
  EIDashboard,
  EIMilestoneRequest,
  EmotionalIntelligenceError
} from '../types/emotional-intelligence';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // Longer timeout for analysis operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class EmotionalIntelligenceApiService {
  // Get comprehensive emotional intelligence analysis
  static async getAnalysis(
    studentId?: string,
    options: EIAnalysisRequest = {}
  ): Promise<EmotionalIntelligenceAnalysis> {
    try {
      const endpoint = studentId 
        ? `/journal/emotional-intelligence/analysis/${studentId}`
        : '/journal/emotional-intelligence/analysis';
      
      const response = await api.get<EmotionalIntelligenceAnalysis>(endpoint, {
        params: options
      });
      
      return response.data;
    } catch (error: any) {
      throw new EmotionalIntelligenceError(
        'Failed to get emotional intelligence analysis',
        'ANALYSIS_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get emotional intelligence competency breakdown
  static async getCompetencies(studentId?: string): Promise<EICompetencyResponse> {
    try {
      const endpoint = studentId 
        ? `/journal/emotional-intelligence/competencies/${studentId}`
        : '/journal/emotional-intelligence/competencies';
      
      const response = await api.get<EICompetencyResponse>(endpoint);
      
      return response.data;
    } catch (error: any) {
      throw new EmotionalIntelligenceError(
        'Failed to get emotional intelligence competencies',
        'API_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get emotional growth tracking over time
  static async getGrowthAnalysis(
    studentId?: string,
    timeWindowDays: number = 60
  ): Promise<EIGrowthResponse> {
    try {
      const endpoint = studentId 
        ? `/journal/emotional-intelligence/growth/${studentId}`
        : '/journal/emotional-intelligence/growth';
      
      const response = await api.get<EIGrowthResponse>(endpoint, {
        params: { timeWindowDays }
      });
      
      return response.data;
    } catch (error: any) {
      throw new EmotionalIntelligenceError(
        'Failed to get emotional growth analysis',
        'API_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get emotional patterns and insights
  static async getPatterns(studentId?: string): Promise<EIPatternsResponse> {
    try {
      const endpoint = studentId 
        ? `/journal/emotional-intelligence/patterns/${studentId}`
        : '/journal/emotional-intelligence/patterns';
      
      const response = await api.get<EIPatternsResponse>(endpoint);
      
      return response.data;
    } catch (error: any) {
      throw new EmotionalIntelligenceError(
        'Failed to get emotional patterns',
        'API_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get personalized EI recommendations
  static async getRecommendations(studentId?: string): Promise<EIRecommendationsResponse> {
    try {
      const endpoint = studentId 
        ? `/journal/emotional-intelligence/recommendations/${studentId}`
        : '/journal/emotional-intelligence/recommendations';
      
      const response = await api.get<EIRecommendationsResponse>(endpoint);
      
      return response.data;
    } catch (error: any) {
      throw new EmotionalIntelligenceError(
        'Failed to get emotional intelligence recommendations',
        'API_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Track emotional intelligence milestone achievements
  static async trackMilestone(
    milestone: EIMilestoneRequest,
    studentId?: string
  ): Promise<{ success: boolean; message: string; milestone: any }> {
    try {
      const endpoint = studentId 
        ? `/journal/emotional-intelligence/milestones/${studentId}`
        : '/journal/emotional-intelligence/milestones';
      
      const response = await api.post(endpoint, milestone);
      
      return response.data;
    } catch (error: any) {
      throw new EmotionalIntelligenceError(
        'Failed to track milestone',
        'API_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Get emotional intelligence dashboard data
  static async getDashboard(studentId?: string): Promise<EIDashboard> {
    try {
      const endpoint = studentId 
        ? `/journal/emotional-intelligence/dashboard/${studentId}`
        : '/journal/emotional-intelligence/dashboard';
      
      const response = await api.get<EIDashboard>(endpoint);
      
      return response.data;
    } catch (error: any) {
      // Handle insufficient data case gracefully
      if (error.response?.data?.message?.includes('No emotional data')) {
        return {
          summary: {
            overallScore: 0,
            dataQuality: 'Low',
            confidence: 0,
            timeWindow: 30,
            lastAnalysis: new Date().toISOString()
          },
          competencyScores: {
            selfAwareness: 0,
            selfRegulation: 0,
            motivation: 0,
            empathy: 0,
            socialSkills: 0,
            overall: 0
          },
          recentInsights: [],
          topRecommendations: [],
          emotionalVocabulary: { size: 0, recent: [] },
          growthTrend: 'insufficient_data',
          strengths: [],
          developmentAreas: [],
          milestones: [],
          nextAnalysisDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
      }
      
      throw new EmotionalIntelligenceError(
        'Failed to get emotional intelligence dashboard',
        'API_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Check health of emotional intelligence analyzer
  static async checkHealth(): Promise<any> {
    try {
      const response = await api.get('/journal/emotional-intelligence/health');
      return response.data;
    } catch (error: any) {
      throw new EmotionalIntelligenceError(
        'Failed to check EI analyzer health',
        'API_ERROR',
        error.response?.data || error.message
      );
    }
  }

  // Helper method to format competency scores for visualization
  static formatCompetencyScores(scores: any) {
    return {
      'Self-Awareness': scores.selfAwareness || 0,
      'Self-Regulation': scores.selfRegulation || 0,
      'Motivation': scores.motivation || 0,
      'Empathy': scores.empathy || 0,
      'Social Skills': scores.socialSkills || 0
    };
  }

  // Helper method to get score color based on level
  static getScoreColor(score: number): string {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Helper method to get score level description
  static getScoreLevel(score: number): string {
    if (score >= 85) return 'Advanced';
    if (score >= 70) return 'Proficient';
    if (score >= 55) return 'Developing';
    return 'Emerging';
  }

  // Helper method to format growth trend
  static formatGrowthTrend(trend: string): { label: string; color: string; icon: string } {
    switch (trend) {
      case 'strong_growth':
        return { label: 'Strong Growth', color: 'text-green-600', icon: '📈' };
      case 'moderate_growth':
        return { label: 'Moderate Growth', color: 'text-blue-600', icon: '📊' };
      case 'stable':
        return { label: 'Stable', color: 'text-gray-600', icon: '➡️' };
      case 'insufficient_data':
        return { label: 'Need More Data', color: 'text-yellow-600', icon: '📊' };
      default:
        return { label: 'Unknown', color: 'text-gray-500', icon: '❓' };
    }
  }

  // Helper method to categorize insights by significance
  static categorizeInsights(insights: any[]) {
    return {
      high: insights.filter(i => i.significance === 'high'),
      medium: insights.filter(i => i.significance === 'medium'),
      low: insights.filter(i => i.significance === 'low')
    };
  }

  // Helper method to get recommendations by timeframe
  static getRecommendationsByTimeframe(recommendations: any) {
    if (!recommendations) return { immediate: [], shortTerm: [], longTerm: [] };
    
    return {
      immediate: recommendations.immediate || [],
      shortTerm: recommendations.shortTerm || [],
      longTerm: recommendations.longTerm || []
    };
  }

  // Helper method to format milestone date
  static formatMilestoneDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Helper method to get data quality description
  static getDataQualityDescription(quality: string): { description: string; suggestions: string[] } {
    switch (quality.toLowerCase()) {
      case 'high':
        return {
          description: 'Excellent data quality for reliable analysis',
          suggestions: ['Continue regular emotional tracking', 'Explore advanced insights']
        };
      case 'moderate':
        return {
          description: 'Good data quality with room for improvement',
          suggestions: ['Add more journal entries', 'Respond to reflection prompts', 'Track emotions consistently']
        };
      case 'low':
        return {
          description: 'Limited data available for analysis',
          suggestions: [
            'Start journaling regularly with emotion tracking',
            'Respond to AI reflection prompts',
            'Use the emotion selector consistently',
            'Write detailed entries about your daily experiences'
          ]
        };
      default:
        return {
          description: 'Data quality assessment unavailable',
          suggestions: ['Begin emotional tracking to enable analysis']
        };
    }
  }

  // Helper method to validate analysis request parameters
  static validateAnalysisRequest(request: EIAnalysisRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (request.timeWindowDays && (request.timeWindowDays < 1 || request.timeWindowDays > 365)) {
      errors.push('Time window must be between 1 and 365 days');
    }
    
    if (request.studentAge && (request.studentAge < 5 || request.studentAge > 18)) {
      errors.push('Student age must be between 5 and 18 years');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to calculate confidence level description
  static getConfidenceDescription(confidence: number): string {
    if (confidence >= 0.8) return 'High confidence in analysis results';
    if (confidence >= 0.6) return 'Moderate confidence in analysis results';
    if (confidence >= 0.4) return 'Limited confidence - more data recommended';
    return 'Low confidence - significantly more data needed for reliable analysis';
  }

  // Helper method to get competency improvement suggestions
  static getCompetencyImprovementSuggestions(competency: string, score: number): string[] {
    const suggestions: Record<string, Record<string, string[]>> = {
      'self-awareness': {
        low: ['Practice daily emotion check-ins', 'Keep a feelings journal', 'Ask yourself "How am I feeling right now?" throughout the day'],
        medium: ['Explore triggers for different emotions', 'Notice patterns in your emotional responses', 'Practice mindful self-observation'],
        high: ['Help others develop emotional awareness', 'Mentor peers in emotional intelligence', 'Apply insights in leadership situations']
      },
      'self-regulation': {
        low: ['Learn basic breathing techniques', 'Practice the pause-and-think method', 'Identify your emotional triggers'],
        medium: ['Develop a toolkit of coping strategies', 'Practice emotional regulation in challenging situations', 'Learn advanced stress management techniques'],
        high: ['Model emotional regulation for others', 'Coach others in self-regulation skills', 'Apply regulation skills in high-pressure situations']
      },
      'motivation': {
        low: ['Set small, achievable goals', 'Celebrate small wins', 'Find your personal "why"'],
        medium: ['Create long-term goal plans', 'Build intrinsic motivation', 'Connect goals to personal values'],
        high: ['Inspire others through your motivation', 'Take on leadership roles', 'Drive positive change in your community']
      },
      'empathy': {
        low: ['Practice active listening', 'Ask others about their feelings', 'Read books with diverse characters'],
        medium: ['Volunteer in your community', 'Practice perspective-taking exercises', 'Engage in cross-cultural experiences'],
        high: ['Become a peer counselor', 'Lead empathy-building activities', 'Advocate for others in need']
      },
      'social-skills': {
        low: ['Practice basic conversation skills', 'Join group activities', 'Learn conflict resolution basics'],
        medium: ['Take on team projects', 'Practice public speaking', 'Develop networking skills'],
        high: ['Lead teams and organizations', 'Mentor others in social skills', 'Build bridges between different groups']
      }
    };

    const level = score >= 70 ? 'high' : score >= 55 ? 'medium' : 'low';
    const competencyKey = competency.toLowerCase().replace(/[^a-z]/g, '-');
    
    return suggestions[competencyKey]?.[level] || ['Continue practicing and developing this competency'];
  }
}

export default EmotionalIntelligenceApiService; 