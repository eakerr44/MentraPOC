import React, { useState, useEffect } from 'react';
import EmotionalIntelligenceApiService from '../../services/emotionalIntelligenceApi';
import { 
  EIDashboard, 
  EIDashboardProps,
  EmotionalIntelligenceError 
} from '../../types/emotional-intelligence';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Lightbulb,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Heart,
  Zap,
  Users,
  Award,
  Clock,
  BookOpen,
  Settings,
  Info
} from 'lucide-react';

export const EmotionalIntelligenceDashboard: React.FC<EIDashboardProps> = ({
  studentId,
  refreshInterval = 300000, // 5 minutes
  showRecommendations = true,
  className = ''
}) => {
  const [dashboard, setDashboard] = useState<EIDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedTab, setSelectedTab] = useState<'overview' | 'competencies' | 'growth' | 'recommendations'>('overview');

  // Load dashboard data
  useEffect(() => {
    loadDashboard();
    
    // Set up refresh interval
    const interval = setInterval(loadDashboard, refreshInterval);
    return () => clearInterval(interval);
  }, [studentId, refreshInterval]);

  const loadDashboard = async () => {
    try {
      setError(null);
      const data = await EmotionalIntelligenceApiService.getDashboard(studentId);
      setDashboard(data);
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('Failed to load EI dashboard:', error);
      setError(error.message || 'Failed to load emotional intelligence dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadDashboard();
  };

  const formatScore = (score: number) => {
    return Math.round(score);
  };

  const getScoreColor = (score: number) => {
    return EmotionalIntelligenceApiService.getScoreColor(score);
  };

  const getScoreLevel = (score: number) => {
    return EmotionalIntelligenceApiService.getScoreLevel(score);
  };

  const formatGrowthTrend = (trend: string) => {
    return EmotionalIntelligenceApiService.formatGrowthTrend(trend);
  };

  const getDataQualityInfo = (quality: string) => {
    return EmotionalIntelligenceApiService.getDataQualityDescription(quality);
  };

  if (loading && !dashboard) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mr-3" />
          <span className="text-lg text-gray-600">Analyzing your emotional intelligence...</span>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const dataQualityInfo = getDataQualityInfo(dashboard.summary.dataQuality);
  const growthTrendInfo = formatGrowthTrend(dashboard.growthTrend);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Emotional Intelligence Dashboard</h1>
              <p className="text-blue-100">
                Your journey to understanding emotions and building stronger relationships
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold">
              {formatScore(dashboard.summary.overallScore)}
            </div>
            <div className="text-sm text-blue-100">Overall EI Score</div>
            <div className="text-xs text-blue-200 mt-1">
              Last updated: {new Date(dashboard.summary.lastAnalysis).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'competencies', label: 'Competencies', icon: Target },
              { id: 'growth', label: 'Growth', icon: TrendingUp },
              { id: 'recommendations', label: 'Recommendations', icon: Lightbulb }
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
        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Brain className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">
                        {formatScore(dashboard.summary.overallScore)}
                      </div>
                      <div className="text-sm text-blue-700">Overall Score</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <BookOpen className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {dashboard.emotionalVocabulary.size}
                      </div>
                      <div className="text-sm text-green-700">Emotion Words</div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-6 h-6 text-purple-600 mr-3" />
                    <div>
                      <div className="text-lg font-bold text-purple-900 flex items-center">
                        {growthTrendInfo.icon}
                        <span className="ml-1">{growthTrendInfo.label}</span>
                      </div>
                      <div className="text-sm text-purple-700">Growth Trend</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Info className="w-6 h-6 text-yellow-600 mr-3" />
                    <div>
                      <div className="text-lg font-bold text-yellow-900">
                        {dashboard.summary.dataQuality}
                      </div>
                      <div className="text-sm text-yellow-700">Data Quality</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Quality Alert */}
              {dashboard.summary.dataQuality === 'Low' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Limited Data Available</h4>
                      <p className="text-yellow-700 text-sm mt-1">{dataQualityInfo.description}</p>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-yellow-800">To improve analysis:</p>
                        <ul className="text-sm text-yellow-700 list-disc list-inside mt-1">
                          {dataQualityInfo.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Insights */}
              {dashboard.recentInsights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                    Recent Insights
                  </h3>
                  <div className="grid gap-4">
                    {dashboard.recentInsights.map((insight, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className={`p-2 rounded-lg mr-3 ${
                            insight.significance === 'high' ? 'bg-red-100 text-red-600' :
                            insight.significance === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {insight.type === 'strength' ? <Award className="w-4 h-4" /> :
                             insight.type === 'growth' ? <TrendingUp className="w-4 h-4" /> :
                             <Brain className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{insight.title}</h4>
                            <p className="text-gray-600 text-sm mt-1">{insight.description}</p>
                            {insight.recommendations.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-gray-700">Recommendations:</div>
                                <ul className="text-xs text-gray-600 list-disc list-inside">
                                  {insight.recommendations.slice(0, 2).map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emotional Vocabulary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-red-500" />
                  Your Emotional Vocabulary
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {dashboard.emotionalVocabulary.recent.map((emotion, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {emotion}
                      </span>
                    ))}
                    {dashboard.emotionalVocabulary.size > dashboard.emotionalVocabulary.recent.length && (
                      <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">
                        +{dashboard.emotionalVocabulary.size - dashboard.emotionalVocabulary.recent.length} more
                      </span>
                    )}
                  </div>
                  {dashboard.emotionalVocabulary.size === 0 && (
                    <p className="text-gray-500 text-sm">
                      Start tracking emotions in your journal entries to build your emotional vocabulary.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'competencies' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">EI Competency Breakdown</h3>
              
              <div className="grid gap-4">
                {Object.entries(EmotionalIntelligenceApiService.formatCompetencyScores(dashboard.competencyScores)).map(([competency, score]) => {
                  const scoreNum = typeof score === 'number' ? score : 0;
                  const level = getScoreLevel(scoreNum);
                  const colorClass = getScoreColor(scoreNum);
                  
                  return (
                    <div key={competency} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{competency}</h4>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${colorClass}`}>
                            {formatScore(scoreNum)}
                          </span>
                          <span className="text-gray-500 text-sm ml-1">/ 100</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, scoreNum))}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${colorClass}`}>{level}</span>
                        <span className="text-gray-500">
                          {scoreNum >= 70 ? 'Strength' : scoreNum >= 55 ? 'Developing' : 'Focus Area'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strengths and Development Areas */}
              <div className="grid md:grid-cols-2 gap-6">
                {dashboard.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Award className="w-4 h-4 text-green-600 mr-2" />
                      Your Strengths
                    </h4>
                    <div className="space-y-2">
                      {dashboard.strengths.map((strength, index) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="font-medium text-green-900">{strength.competency}</div>
                          <div className="text-sm text-green-700">
                            Score: {formatScore(strength.score)} ({strength.level})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashboard.developmentAreas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Target className="w-4 h-4 text-blue-600 mr-2" />
                      Development Opportunities
                    </h4>
                    <div className="space-y-2">
                      {dashboard.developmentAreas.map((area, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="font-medium text-blue-900">{area.competency}</div>
                          <div className="text-sm text-blue-700">
                            Score: {formatScore(area.score)} ({area.level})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'growth' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Growth & Progress</h3>
              
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 flex items-center">
                      {growthTrendInfo.icon}
                      <span className="ml-2">{growthTrendInfo.label}</span>
                    </h4>
                    <p className="text-gray-600 mt-1">Your overall emotional intelligence development</p>
                  </div>
                  <TrendingUp className={`w-12 h-12 ${growthTrendInfo.color}`} />
                </div>
              </div>

              {/* Milestones */}
              {dashboard.milestones.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    Your Milestones
                  </h4>
                  <div className="space-y-3">
                    {dashboard.milestones.slice(0, 5).map((milestone, index) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="p-2 bg-green-100 rounded-full mr-3">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{milestone.description}</div>
                          <div className="text-sm text-gray-500">
                            {EmotionalIntelligenceApiService.formatMilestoneDate(milestone.date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dashboard.milestones.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Milestones Yet</h4>
                  <p className="text-gray-500">
                    Keep journaling and tracking emotions to unlock your first milestone!
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'recommendations' && showRecommendations && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Personalized Recommendations</h3>
              
              {dashboard.topRecommendations.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.topRecommendations.map((recommendation, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start">
                        <div className="p-2 bg-blue-100 rounded-lg mr-4">
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2">{recommendation.title}</h4>
                          <p className="text-gray-600 mb-3">{recommendation.description}</p>
                          
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Action Steps:</div>
                            <ul className="space-y-1">
                              {recommendation.actions.map((action, actionIndex) => (
                                <li key={actionIndex} className="text-sm text-gray-600 flex items-start">
                                  <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-1" />
                            Timeframe: {recommendation.timeframe}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h4>
                  <p className="text-gray-500">
                    Complete more journal entries and emotional tracking to receive personalized recommendations.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Next analysis recommended: {new Date(dashboard.nextAnalysisDate).toLocaleDateString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Updating...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}; 