import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  BarChart3,
  LineChart,
  PieChart,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Info,
  ChevronRight,
  Star,
  Zap,
  Brain,
  Heart,
  BookOpen
} from 'lucide-react';
import progressApiService from '../../services/progressApi';
import {
  ProgressSummary,
  ProgressAnalysis,
  ProgressMilestone,
  ProgressInsight,
  ProgressCardData,
  LineChartData,
  BarChartData,
  RadarChartData,
  TrendIndicator
} from '../../types/progress';
import { ProgressChart } from './ProgressChart';
import { MilestoneTimeline } from './MilestoneTimeline';
import { ProgressCard } from './ProgressCard';
import { TrendIndicatorComponent } from './TrendIndicator';

interface ProgressDashboardProps {
  studentId?: string;
  viewMode?: 'student' | 'teacher' | 'parent';
  embedded?: boolean;
  onMilestoneClick?: (milestone: ProgressMilestone) => void;
  onInsightClick?: (insight: ProgressInsight) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  studentId,
  viewMode = 'student',
  embedded = false,
  onMilestoneClick,
  onInsightClick
}) => {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [analysis, setAnalysis] = useState<ProgressAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends' | 'milestones' | 'projections'>('overview');
  const [timeWindowDays, setTimeWindowDays] = useState(30);
  const [timePeriod, setTimePeriod] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [studentId, timeWindowDays, timePeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, analysisData] = await Promise.all([
        progressApiService.getProgressSummary(studentId),
        progressApiService.getProgressAnalysis({
          studentId,
          timeWindowDays,
          timePeriod,
          includeProjections: true,
          includeMilestones: true
        })
      ]);

      setSummary(summaryData);
      setAnalysis(analysisData);
    } catch (err) {
      console.error('Failed to load progress dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    progressApiService.clearCache();
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleMilestoneClick = (milestone: ProgressMilestone) => {
    if (onMilestoneClick) {
      onMilestoneClick(milestone);
    }
  };

  const handleInsightClick = (insight: ProgressInsight) => {
    if (onInsightClick) {
      onInsightClick(insight);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-3">
          <Info className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-red-900">Unable to load progress data</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!summary || !analysis) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No progress data yet</h3>
        <p className="text-gray-600">Start journaling to see your learning progress!</p>
      </div>
    );
  }

  const progressCards = progressApiService.generateProgressCards(summary);
  const lineChartData = progressApiService.processLineChartData(analysis.progressMetrics, 'word_count');
  const barChartData = progressApiService.processBarChartData(analysis.progressMetrics);
  const radarChartData = progressApiService.processRadarChartData(analysis.progressMetrics);
  const trendIndicators = progressApiService.generateTrendIndicators(analysis.growthTrends);

  return (
    <div className={`${embedded ? '' : 'max-w-7xl mx-auto p-6'} space-y-6`}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Learning Progress</h1>
            <p className="text-gray-600 mt-1">
              Track your growth and celebrate your achievements
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Time Period Controls */}
            <div className="flex items-center space-x-2">
              <select
                value={timeWindowDays}
                onChange={(e) => setTimeWindowDays(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
              </select>
              
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value as 'WEEKLY' | 'MONTHLY')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'trends', label: 'Growth Trends', icon: TrendingUp },
            { id: 'milestones', label: 'Milestones', icon: Award },
            { id: 'projections', label: 'Future Goals', icon: Target }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {progressCards.map((card, index) => (
              <ProgressCard key={index} {...card} />
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Writing Progress Line Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <LineChart className="w-5 h-5 mr-2 text-blue-600" />
                Writing Growth Over Time
              </h3>
              <ProgressChart
                data={lineChartData}
                type="line"
                title="Word Count Progress"
                height={300}
              />
            </div>

            {/* Growth by Category Bar Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                Growth by Category
              </h3>
              <ProgressChart
                data={barChartData}
                type="bar"
                title="Growth Percentage"
                height={300}
              />
            </div>
          </div>

          {/* Competency Radar Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-purple-600" />
              Learning Competencies
            </h3>
            <div className="max-w-md mx-auto">
              <ProgressChart
                data={radarChartData}
                type="radar"
                title="Current Skills"
                height={400}
              />
            </div>
          </div>

          {/* Recent Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-indigo-600" />
              Recent Insights
            </h3>
            <div className="space-y-3">
              {summary.topInsights.slice(0, 3).map((insight, index) => (
                <div
                  key={index}
                  onClick={() => handleInsightClick(insight)}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    </div>
                    <div className="flex items-center ml-3">
                      {insight.type === 'strength' && <Star className="w-4 h-4 text-yellow-500" />}
                      {insight.type === 'achievement' && <Award className="w-4 h-4 text-blue-500" />}
                      {insight.type === 'opportunity' && <Zap className="w-4 h-4 text-purple-500" />}
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'trends' && (
        <div className="space-y-6">
          {/* Trend Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendIndicators.slice(0, 8).map((indicator, index) => (
              <TrendIndicatorComponent key={index} {...indicator} />
            ))}
          </div>

          {/* Detailed Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.keys(analysis.progressMetrics).map((metricType) => {
              const metrics = analysis.progressMetrics[metricType];
              const chartData = progressApiService.processLineChartData(
                { [metricType]: metrics },
                Object.keys(metrics.metrics)[0]
              );

              return (
                <div key={metricType} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {metrics.name} Trends
                  </h3>
                  <ProgressChart
                    data={chartData}
                    type="line"
                    title={metrics.name}
                    height={250}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedTab === 'milestones' && (
        <div className="space-y-6">
          {/* Recent Milestones */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-600" />
              Recent Achievements
            </h3>
            <MilestoneTimeline
              milestones={summary.recentMilestones}
              onMilestoneClick={handleMilestoneClick}
            />
          </div>

          {/* All Milestones */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Milestones</h3>
            <MilestoneTimeline
              milestones={analysis.milestones}
              maxItems={10}
              onMilestoneClick={handleMilestoneClick}
            />
          </div>
        </div>
      )}

      {selectedTab === 'projections' && (
        <div className="space-y-6">
          {/* Next Milestone */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Next Milestone
            </h3>
            <p className="text-gray-700">{summary.recentProgress.nextMilestone}</p>
          </div>

          {/* Growth Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Strongest Growth Area
              </h3>
              <p className="text-gray-700">{summary.growthAreas.strongest}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-amber-600" />
                Developing Area
              </h3>
              <p className="text-gray-700">{summary.growthAreas.developing}</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-3">
              {analysis.insights
                .filter(insight => insight.actionable)
                .slice(0, 3)
                .map((insight, index) => (
                  <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900">{insight.title}</h4>
                      <p className="text-sm text-blue-700 mt-1">{insight.description}</p>
                      {insight.recommendations.length > 0 && (
                        <ul className="mt-2 text-sm text-blue-600">
                          {insight.recommendations.slice(0, 2).map((rec, recIndex) => (
                            <li key={recIndex} className="flex items-center">
                              <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 