import {
  ProgressAnalysis,
  ProgressSummary,
  ProgressMetrics,
  ProgressMilestone,
  ProgressConfig,
  ProgressAnalysisRequest,
  ProgressMetricsRequest,
  ProgressTrendsRequest,
  ProgressMilestonesRequest,
  ProgressProjectionsRequest,
  ProgressError,
  GrowthTrends,
  VisualizationData,
  LineChartData,
  BarChartData,
  RadarChartData,
  TrendIndicator,
  ProgressCardData
} from '../types/progress';

class ProgressApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl: string = '/api/journal/progress') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  // Cache management
  private getCacheKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Error handling wrapper
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = true,
    cacheTtl: number = this.CACHE_TTL
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, options.method === 'GET' ? {} : {});
    
    // Check cache for GET requests
    if (options.method !== 'POST' && useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new ProgressError(
          errorData.error || `HTTP ${response.status}`,
          'API_ERROR',
          { status: response.status, endpoint }
        );
      }

      const data = await response.json();
      
      // Cache successful GET requests
      if (options.method !== 'POST' && useCache) {
        this.setCache(cacheKey, data, cacheTtl);
      }

      return data;
    } catch (error) {
      if (error instanceof ProgressError) {
        throw error;
      }
      throw new ProgressError(
        `Failed to fetch from ${endpoint}`,
        'NETWORK_ERROR',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // Main API methods
  async getProgressAnalysis(params: ProgressAnalysisRequest = {}): Promise<ProgressAnalysis> {
    const queryParams = new URLSearchParams();
    
    if (params.timeWindowDays) queryParams.set('timeWindowDays', params.timeWindowDays.toString());
    if (params.timePeriod) queryParams.set('timePeriod', params.timePeriod);
    if (params.metricTypes) queryParams.set('metricTypes', params.metricTypes.join(','));
    if (params.includeProjections !== undefined) queryParams.set('includeProjections', params.includeProjections.toString());
    if (params.includeMilestones !== undefined) queryParams.set('includeMilestones', params.includeMilestones.toString());

    const endpoint = `/analysis${params.studentId ? `/${params.studentId}` : ''}`;
    const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

    return this.request<ProgressAnalysis>(url);
  }

  async getProgressSummary(studentId?: string): Promise<ProgressSummary> {
    const endpoint = `/summary${studentId ? `/${studentId}` : ''}`;
    return this.request<ProgressSummary>(endpoint, {}, true, this.CACHE_TTL / 2); // Shorter cache for summary
  }

  async getProgressMetrics(params: ProgressMetricsRequest): Promise<{ metrics: ProgressMetrics }> {
    const queryParams = new URLSearchParams();
    
    if (params.timeWindowDays) queryParams.set('timeWindowDays', params.timeWindowDays.toString());
    if (params.timePeriod) queryParams.set('timePeriod', params.timePeriod);

    const endpoint = `/metrics/${params.metricType}${params.studentId ? `/${params.studentId}` : ''}`;
    const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

    return this.request<{ metrics: ProgressMetrics }>(url);
  }

  async getGrowthTrends(params: ProgressTrendsRequest = {}): Promise<{
    trends: GrowthTrends;
    visualizationData: VisualizationData;
    confidence: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.timeWindowDays) queryParams.set('timeWindowDays', params.timeWindowDays.toString());
    if (params.timePeriod) queryParams.set('timePeriod', params.timePeriod);

    const endpoint = `/trends${params.studentId ? `/${params.studentId}` : ''}`;
    const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

    return this.request<{
      trends: GrowthTrends;
      visualizationData: VisualizationData;
      confidence: number;
    }>(url);
  }

  async getMilestones(params: ProgressMilestonesRequest = {}): Promise<{
    milestones: ProgressMilestone[];
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.timeWindowDays) queryParams.set('timeWindowDays', params.timeWindowDays.toString());

    const endpoint = `/milestones${params.studentId ? `/${params.studentId}` : ''}`;
    const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

    return this.request<{ milestones: ProgressMilestone[] }>(url);
  }

  async getProjections(params: ProgressProjectionsRequest = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.timeWindowDays) queryParams.set('timeWindowDays', params.timeWindowDays.toString());
    if (params.timePeriod) queryParams.set('timePeriod', params.timePeriod);

    const endpoint = `/projections${params.studentId ? `/${params.studentId}` : ''}`;
    const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

    return this.request<any>(url);
  }

  async getProgressConfig(): Promise<ProgressConfig> {
    return this.request<ProgressConfig>('/metric-types', {}, true, 60 * 60 * 1000); // 1 hour cache
  }

  // Data processing helpers
  processLineChartData(progressMetrics: Record<string, ProgressMetrics>, metricName: string): LineChartData {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    const datasets = Object.keys(progressMetrics).map((metricType, index) => {
      const metric = progressMetrics[metricType].metrics[metricName];
      if (!metric || !metric.values) return null;

      return {
        label: progressMetrics[metricType].name,
        data: metric.values.map(point => point.value),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        fill: false,
        tension: 0.4
      };
    }).filter(dataset => dataset !== null);

    // Get labels from the first available metric
    const firstMetric = Object.values(progressMetrics)[0]?.metrics[metricName];
    const labels = firstMetric?.values?.map(point => point.period) || [];

    return {
      labels,
      datasets
    };
  }

  processBarChartData(progressMetrics: Record<string, ProgressMetrics>): BarChartData {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
    
    const labels = Object.keys(progressMetrics).map(key => progressMetrics[key].name);
    const data = Object.values(progressMetrics).map(metric => {
      // Calculate average growth across all metrics in this category
      const metrics = Object.values(metric.metrics);
      const avgGrowth = metrics.reduce((sum, m) => sum + (m.growth || 0), 0) / metrics.length;
      return Math.max(0, avgGrowth); // Ensure non-negative
    });

    return {
      labels,
      datasets: [{
        label: 'Growth Percentage',
        data,
        backgroundColor: colors,
        borderColor: colors.map(color => color + 'CC')
      }]
    };
  }

  processRadarChartData(progressMetrics: Record<string, ProgressMetrics>): RadarChartData {
    const labels = Object.keys(progressMetrics).map(key => progressMetrics[key].name);
    const scores = Object.values(progressMetrics).map(metric => {
      // Calculate normalized score for radar chart (0-100)
      const avgCurrent = Object.values(metric.metrics)
        .reduce((sum, m) => sum + (m.current || 0), 0) / Object.keys(metric.metrics).length;
      return Math.min(100, Math.max(0, avgCurrent * 100));
    });

    return {
      labels,
      datasets: [{
        label: 'Current Performance',
        data: scores,
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620',
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#FFFFFF'
      }]
    };
  }

  generateTrendIndicators(growthTrends: GrowthTrends): TrendIndicator[] {
    const indicators: TrendIndicator[] = [];
    
    Object.keys(growthTrends).forEach(metricType => {
      Object.keys(growthTrends[metricType]).forEach(metricName => {
        const trend = growthTrends[metricType][metricName];
        
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';
        let color = '#6B7280'; // gray
        let icon = '→';

        if (trend.trend === 'increasing') {
          trendDirection = 'up';
          color = '#10B981'; // green
          icon = '↗';
        } else if (trend.trend === 'decreasing') {
          trendDirection = 'down';
          color = '#EF4444'; // red
          icon = '↘';
        }

        indicators.push({
          metric: `${metricType}_${metricName}`,
          value: trend.prediction,
          trend: trendDirection,
          change: trend.slope,
          changePercentage: trend.slope * 100,
          color,
          icon
        });
      });
    });

    return indicators;
  }

  generateProgressCards(summary: ProgressSummary): ProgressCardData[] {
    return [
      {
        title: 'Total Entries',
        value: summary.quickStats.totalEntries,
        icon: '📝',
        color: '#3B82F6',
        description: 'Journal entries created'
      },
      {
        title: 'Current Streak',
        value: `${summary.quickStats.currentStreak} days`,
        icon: '🔥',
        color: '#EF4444',
        description: 'Consecutive days of journaling'
      },
      {
        title: 'Overall Score',
        value: `${Math.round(summary.quickStats.overallScore * 100)}%`,
        icon: '🎯',
        color: '#10B981',
        description: 'Overall learning progress'
      },
      {
        title: 'Progress Level',
        value: summary.recentProgress.level,
        icon: '⭐',
        color: '#F59E0B',
        description: 'Current development level'
      }
    ];
  }

  // Utility methods
  formatProgressData(data: any): any {
    // Format dates, numbers, etc. for display
    if (data.analysisDate) {
      data.analysisDate = new Date(data.analysisDate).toLocaleDateString();
    }
    
    if (data.milestones) {
      data.milestones = data.milestones.map((milestone: ProgressMilestone) => ({
        ...milestone,
        achievedDate: new Date(milestone.achievedDate).toLocaleDateString()
      }));
    }

    return data;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      await this.request<any>('/health', { method: 'GET' }, false);
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
const progressApiService = new ProgressApiService();

export default progressApiService;

// Export types and error class for convenience
export { ProgressError };
export type { 
  ProgressAnalysis, 
  ProgressSummary, 
  ProgressMetrics, 
  ProgressMilestone,
  LineChartData,
  BarChartData,
  RadarChartData,
  TrendIndicator,
  ProgressCardData
}; 