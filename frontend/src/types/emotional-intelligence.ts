// Emotional Intelligence Competency Framework Types
export interface EICompetency {
  name: string;
  description: string;
  subCompetencies: Record<string, string>;
  indicators: string[];
}

export interface EICompetencies {
  SELF_AWARENESS: EICompetency;
  SELF_REGULATION: EICompetency;
  MOTIVATION: EICompetency;
  EMPATHY: EICompetency;
  SOCIAL_SKILLS: EICompetency;
}

// Development stages
export interface EmotionalDevelopmentStage {
  ageRange: [number, number];
  stage: string;
  capabilities: string[];
  challenges: string[];
}

export type DevelopmentStageKey = 'EARLY_ELEMENTARY' | 'LATE_ELEMENTARY' | 'MIDDLE_SCHOOL' | 'HIGH_SCHOOL';

// Assessment results
export interface EISubCompetencyAssessment {
  name: string;
  score: number;
  evidence: string[];
  confidence: number;
}

export interface EICompetencyAssessment {
  competency: string;
  score: number;
  level: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
  subCompetencies: Record<string, EISubCompetencyAssessment>;
  evidence: string[];
  recommendedActions: string[];
}

export interface EIOverallScores {
  selfAwareness: number;
  selfRegulation: number;
  motivation: number;
  empathy: number;
  socialSkills: number;
  overall: number;
}

export interface EIStrength {
  competency: string;
  score: number;
  level: string;
}

export interface EIDevelopmentArea {
  competency: string;
  score: number;
  level: string;
  recommendedActions: string[];
}

export interface EIBalanceAnalysis {
  mean: number;
  variance: number;
  balance: 'well-balanced' | 'moderately-balanced' | 'unbalanced';
  recommendation: string;
}

export interface EICompetencyAssessmentResult {
  competencyDetails: Record<string, EICompetencyAssessment>;
  overallScores: EIOverallScores;
  strengths: EIStrength[];
  developmentAreas: EIDevelopmentArea[];
  balanceAnalysis: EIBalanceAnalysis;
}

// Pattern analysis
export interface EmotionalPatternCycles {
  daily: {
    patterns: Record<number, any[]>;
    peakHours: Array<{ hour: number; count: number }>;
  };
  weekly: {
    patterns: Record<number, any[]>;
    summary: Array<{
      day: string;
      count: number;
      avgIntensity: number | null;
    }>;
  };
  monthly: {
    patterns: Record<number, any[]>;
    seasonalTrends: Record<string, number>;
  };
}

export interface EmotionalCopingPatterns {
  adaptiveCoping: number;
  avoidancePatterns: number;
  supportSeeking: number;
  strategies: string[];
}

export interface EmotionalGrowthPatterns {
  vocabularyGrowth: number;
  confidenceGrowth: number;
  complexityGrowth: number;
  trend: 'growing' | 'declining' | 'stable' | 'insufficient_data';
  indicators: string[];
}

export interface EmotionalSocialPatterns {
  socialInteractions: number;
  empathyIndicators: number;
  relationshipEmotions: string[];
  collaborationPatterns: number;
}

export interface EmotionalStabilityAnalysis {
  stabilityScore: number;
  variability: 'low' | 'moderate' | 'high' | 'unknown';
  meanIntensity: number;
  standardDeviation: number;
}

export interface EmotionalPatternAnalysis {
  patterns: {
    cycles: EmotionalPatternCycles;
    triggers: Record<string, any>;
    regulation: EmotionalCopingPatterns;
    growth: EmotionalGrowthPatterns;
    social: EmotionalSocialPatterns;
    stability: EmotionalStabilityAnalysis;
  };
  summary: {
    totalPatternsIdentified: number;
    strongestPatterns: Array<{
      type: string;
      strength: number;
      description: string;
      recommendations: string[];
    }>;
    concernAreas: string[];
    positiveIndicators: string[];
  };
}

// Growth analysis
export interface EmotionalVocabularyGrowth {
  trend: 'expanding' | 'contracting' | 'stable' | 'insufficient_data';
  growth: number;
  sizes: number[];
}

export interface EmotionalIntensityTrends {
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  change: number;
  intensities: number[];
}

export interface EmotionalConfidenceTrends {
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  change: number;
  confidences: number[];
}

export interface EmotionalComplexityGrowth {
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  change: number;
  scores: number[];
}

export interface EmotionalMilestone {
  type: 'first_entry' | 'complex_emotion' | 'high_confidence' | string;
  date: string;
  description: string;
}

export interface EmotionalGrowthProjection {
  timeframe: string;
  projection: string;
  confidence: number;
}

export interface EmotionalGrowthAnalysis {
  vocabularyGrowth: EmotionalVocabularyGrowth;
  intensityTrends: EmotionalIntensityTrends;
  confidenceTrends: EmotionalConfidenceTrends;
  complexityGrowth: EmotionalComplexityGrowth;
  milestones: EmotionalMilestone[];
  overallTrend: 'strong_growth' | 'moderate_growth' | 'stable' | 'insufficient_data';
  projections: EmotionalGrowthProjection[];
}

// Development stage assessment
export interface DevelopmentStageAssessment {
  key: DevelopmentStageKey;
  ageRange: [number, number];
  stage: string;
  capabilities: string[];
  challenges: string[];
  alignment: number;
  recommendations: string[];
}

// Insights and recommendations
export interface EIInsight {
  type: 'pattern' | 'strength' | 'development_opportunity' | 'growth' | 'developmental';
  category: string;
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
}

export interface EIRecommendation {
  category: string;
  title: string;
  description: string;
  actions: string[];
  timeframe: string;
}

export interface EIRecommendations {
  immediate: EIRecommendation[];
  shortTerm: EIRecommendation[];
  longTerm: EIRecommendation[];
  exercises: Array<{
    title: string;
    description: string;
    duration: string;
  }>;
  resources: Array<{
    type: string;
    title: string;
    description: string;
  }>;
}

// Data quality and metadata
export interface EIDataQuality {
  score: number;
  level: 'High' | 'Moderate' | 'Low';
  factors: string[];
}

export interface EIAnalysisMetadata {
  dataQuality: EIDataQuality;
  confidence: number;
  nextAnalysisRecommended: string;
}

// Main analysis result
export interface EmotionalIntelligenceAnalysis {
  studentId: string;
  analysisDate: string;
  timeWindow: number;
  emotionalData: {
    summary: {
      vocabularySize: number;
      vocabularyList: string[];
      journalEntryCount: number;
      reflectionCount: number;
      averageIntensity: number | null;
      averageConfidence: number | null;
      mostFrequentEmotions: Array<{ emotion: string; count: number }>;
      timeSpan: {
        start: string;
        end: string;
      } | null;
    };
    totalDataPoints: number;
  };
  patternAnalysis: EmotionalPatternAnalysis;
  competencyAssessment: EICompetencyAssessmentResult;
  developmentStage: DevelopmentStageAssessment;
  growthAnalysis: EmotionalGrowthAnalysis;
  insights: EIInsight[];
  recommendations: EIRecommendations | null;
  metadata: EIAnalysisMetadata;
}

// Dashboard-specific types
export interface EIDashboardSummary {
  overallScore: number;
  dataQuality: string;
  confidence: number;
  timeWindow: number;
  lastAnalysis: string;
}

export interface EIDashboard {
  summary: EIDashboardSummary;
  competencyScores: EIOverallScores;
  recentInsights: EIInsight[];
  topRecommendations: EIRecommendation[];
  emotionalVocabulary: {
    size: number;
    recent: string[];
  };
  growthTrend: string;
  strengths: EIStrength[];
  developmentAreas: EIDevelopmentArea[];
  milestones: EmotionalMilestone[];
  nextAnalysisDate: string;
}

// API request/response types
export interface EIAnalysisRequest {
  timeWindowDays?: number;
  includeRecommendations?: boolean;
  studentAge?: number;
}

export interface EIMilestoneRequest {
  milestoneType: string;
  achievement: string;
  context?: string;
}

export interface EICompetencyResponse {
  competencies: EICompetencyAssessmentResult;
  developmentStage: DevelopmentStageAssessment;
  dataQuality: EIDataQuality;
  confidence: number;
}

export interface EIGrowthResponse {
  growthAnalysis: EmotionalGrowthAnalysis;
  patternAnalysis: EmotionalPatternAnalysis;
  timeWindow: number;
  dataPoints: number;
}

export interface EIPatternsResponse {
  patterns: EmotionalPatternAnalysis;
  insights: EIInsight[];
  vocabulary: string[];
  emotionFrequency: Array<{ emotion: string; count: number }>;
}

export interface EIRecommendationsResponse {
  recommendations: EIRecommendations;
  developmentStage: {
    stage: string;
    key: DevelopmentStageKey;
    alignment: number;
  };
  priorityAreas: EIDevelopmentArea[];
  strengths: EIStrength[];
}

// Component prop types
export interface EICompetencyChartProps {
  scores: EIOverallScores;
  className?: string;
  showLabels?: boolean;
  interactive?: boolean;
}

export interface EIInsightCardProps {
  insight: EIInsight;
  onActionClick?: (action: string) => void;
  showDetails?: boolean;
  className?: string;
}

export interface EIRecommendationListProps {
  recommendations: EIRecommendation[];
  title?: string;
  maxItems?: number;
  onRecommendationClick?: (recommendation: EIRecommendation) => void;
  className?: string;
}

export interface EIGrowthChartProps {
  growthAnalysis: EmotionalGrowthAnalysis;
  timeWindow: number;
  showProjections?: boolean;
  className?: string;
}

export interface EIPatternVisualizationProps {
  patterns: EmotionalPatternAnalysis;
  selectedPattern?: string;
  onPatternSelect?: (pattern: string) => void;
  className?: string;
}

export interface EIDashboardProps {
  studentId?: string;
  refreshInterval?: number;
  showRecommendations?: boolean;
  className?: string;
}

// Error types
export class EmotionalIntelligenceError extends Error {
  constructor(
    message: string,
    public code: 'ANALYSIS_ERROR' | 'INSUFFICIENT_DATA' | 'API_ERROR' | 'VALIDATION_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'EmotionalIntelligenceError';
  }
} 