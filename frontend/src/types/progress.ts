// Progress visualization type definitions

export interface ProgressMetric {
  values: ProgressDataPoint[];
  current: number;
  average: number;
  growth: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  metricType: string;
  calculatedAt: string;
  confidence: number;
}

export interface ProgressDataPoint {
  period: string;
  value: number;
  date: string | Date;
}

export interface ProgressMetrics {
  type: string;
  name: string;
  categories: string[];
  metrics: Record<string, ProgressMetric>;
  summary: {
    total: number;
    averageGrowth: number;
  };
  trends: Record<string, any>;
}

export interface GrowthTrend {
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  correlation: number;
  volatility: number;
  prediction: number;
}

export interface GrowthTrends {
  [metricType: string]: {
    [metricName: string]: GrowthTrend;
  };
}

export interface ProgressMilestone {
  type: string;
  title: string;
  description: string;
  achievedDate: string;
  category: 'writing' | 'emotional' | 'reflection' | 'consistency';
  significance: 'low' | 'medium' | 'high';
}

export interface ProgressProjection {
  projectedValues: number[];
  confidence: number;
  scenarios: Record<string, any>;
  recommendations: string[];
}

export interface ProgressProjections {
  [metricType: string]: {
    [metricName: string]: ProgressProjection;
  };
}

export interface OverallProgress {
  score: number;
  level: 'Beginning' | 'Developing' | 'Advanced';
  components: Record<string, any>;
  interpretation: string;
  nextMilestone: string;
}

export interface ProgressInsight {
  type: 'strength' | 'opportunity' | 'achievement';
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
}

export interface TimeWindow {
  days: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export interface TimeSeriesData {
  periods: number;
  totalDataPoints: number;
  dateRange: {
    start: string | Date;
    end: string | Date;
  };
}

export interface VisualizationData {
  lineCharts: Record<string, any>;
  barCharts: Record<string, any>;
  radarCharts: Record<string, any>;
  heatmaps: Record<string, any>;
  progressBars: Record<string, any>;
  trendIndicators: Record<string, any>;
  timelineData: Record<string, any>;
}

export interface ProgressAnalysis {
  studentId: string;
  analysisDate: string;
  timeWindow: TimeWindow;
  timeSeriesData: TimeSeriesData;
  progressMetrics: Record<string, ProgressMetrics>;
  growthTrends: GrowthTrends;
  milestones: ProgressMilestone[];
  projections: ProgressProjections;
  overallProgress: OverallProgress;
  insights: ProgressInsight[];
  visualizationData: VisualizationData;
  metadata: {
    calculationTime: string;
    cacheUsed: boolean;
    confidence: number;
  };
}

export interface ProgressSummary {
  studentId: string;
  lastUpdated: string;
  quickStats: {
    totalEntries: number;
    totalReflections: number;
    currentStreak: number;
    overallScore: number;
  };
  recentProgress: {
    level: string;
    interpretation: string;
    nextMilestone: string;
  };
  topInsights: ProgressInsight[];
  recentMilestones: ProgressMilestone[];
  growthAreas: {
    strongest: string;
    developing: string;
  };
  visualizationData: {
    progressChart: Record<string, any>;
    competencyRadar: Record<string, any>;
    trendIndicators: Record<string, any>;
  };
}

export interface MetricTypeInfo {
  name: string;
  metrics: string[];
  categories: string[];
}

export interface TimePeriodInfo {
  label: string;
  days: number;
  segments: number;
}

export interface ProgressConfig {
  metricTypes: Record<string, MetricTypeInfo>;
  timePeriods: Record<string, TimePeriodInfo>;
  availableVisualizations: string[];
}

// Chart-specific types for visualization components
export interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
  }[];
}

export interface RadarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    pointBackgroundColor: string;
    pointBorderColor: string;
  }[];
}

export interface TrendIndicator {
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercentage: number;
  color: string;
  icon: string;
}

export interface ProgressCardData {
  title: string;
  value: number | string;
  change?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
  description?: string;
}

// API request/response types
export interface ProgressAnalysisRequest {
  studentId?: string;
  timeWindowDays?: number;
  timePeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  metricTypes?: string[];
  includeProjections?: boolean;
  includeMilestones?: boolean;
}

export interface ProgressMetricsRequest {
  studentId?: string;
  metricType: string;
  timeWindowDays?: number;
  timePeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export interface ProgressTrendsRequest {
  studentId?: string;
  timeWindowDays?: number;
  timePeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export interface ProgressMilestonesRequest {
  studentId?: string;
  timeWindowDays?: number;
}

export interface ProgressProjectionsRequest {
  studentId?: string;
  timeWindowDays?: number;
  timePeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

// Component prop types
export interface ProgressVisualizationProps {
  studentId?: string;
  timeWindowDays?: number;
  timePeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  metricTypes?: string[];
  height?: number;
  showControls?: boolean;
  onDataChange?: (data: any) => void;
}

export interface ProgressDashboardProps {
  studentId?: string;
  viewMode?: 'student' | 'teacher' | 'parent';
  embedded?: boolean;
  onMilestoneClick?: (milestone: ProgressMilestone) => void;
  onInsightClick?: (insight: ProgressInsight) => void;
}

export interface ProgressChartProps {
  data: LineChartData | BarChartData | RadarChartData;
  type: 'line' | 'bar' | 'radar';
  title: string;
  height?: number;
  options?: any;
  loading?: boolean;
  error?: string;
}

export interface MilestoneTimelineProps {
  milestones: ProgressMilestone[];
  maxItems?: number;
  onMilestoneClick?: (milestone: ProgressMilestone) => void;
}

export interface ProgressCardProps extends ProgressCardData {
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface TrendIndicatorProps extends TrendIndicator {
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  showChange?: boolean;
}

// Error types
export class ProgressError extends Error {
  type: string;
  details: Record<string, any>;
  timestamp: string;

  constructor(message: string, type: string, details: Record<string, any> = {}) {
    super(message);
    this.name = 'ProgressError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Utility types
export type ProgressMetricType = 'WRITING_GROWTH' | 'EMOTIONAL_GROWTH' | 'REFLECTION_DEPTH' | 'LEARNING_CONSISTENCY' | 'OVERALL_DEVELOPMENT';

export type TimePeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type ChartType = 'line' | 'bar' | 'radar' | 'doughnut' | 'polar' | 'scatter';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export type ProgressLevel = 'Beginning' | 'Developing' | 'Advanced';

export type MilestoneCategory = 'writing' | 'emotional' | 'reflection' | 'consistency';

export type InsightType = 'strength' | 'opportunity' | 'achievement';

export type ImpactLevel = 'low' | 'medium' | 'high'; 