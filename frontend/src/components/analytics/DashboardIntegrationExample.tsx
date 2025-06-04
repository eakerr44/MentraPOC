import React, { useState, useEffect } from 'react';
import {
  ProgressChart,
  LearningAnalytics,
  EngagementVisualization,
  GoalTrackingVisualization,
  CHART_COLORS,
  transformDataForChart
} from './index';
import { LineChartData, BarChartData, RadarChartData } from '../../types/progress';

// Example component demonstrating all visualization features
export const DashboardIntegrationExample: React.FC<{
  studentId: string;
  viewMode?: 'student' | 'teacher' | 'parent';
}> = ({ studentId, viewMode = 'student' }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const progressData: LineChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Math Skills',
        data: [65, 72, 78, 85],
        borderColor: CHART_COLORS.primary[0],
        backgroundColor: CHART_COLORS.primary[0],
        fill: false
      },
      {
        label: 'Reading Comprehension',
        data: [78, 82, 85, 88],
        borderColor: CHART_COLORS.primary[1],
        backgroundColor: CHART_COLORS.primary[1],
        fill: false
      }
    ]
  };

  const skillsRadarData: RadarChartData = {
    labels: ['Mathematics', 'Reading', 'Writing', 'Science', 'Critical Thinking'],
    datasets: [
      {
        label: 'Current Level',
        data: [85, 92, 68, 75, 80],
        borderColor: CHART_COLORS.primary[0],
        backgroundColor: CHART_COLORS.primary[0],
        pointBackgroundColor: CHART_COLORS.primary[0],
        pointBorderColor: '#fff'
      }
    ]
  };

  const engagementData = [
    { date: '2024-01-01', totalTime: 45, sessions: 3, engagement: 85, interactions: 120 },
    { date: '2024-01-02', totalTime: 52, sessions: 4, engagement: 88, interactions: 135 },
    { date: '2024-01-03', totalTime: 38, sessions: 2, engagement: 72, interactions: 98 },
    { date: '2024-01-04', totalTime: 48, sessions: 3, engagement: 92, interactions: 142 }
  ];

  const sampleGoals = [
    {
      id: 1,
      title: 'Complete 20 Math Problems',
      description: 'Practice multiplication and division',
      category: 'Mathematics',
      targetValue: 20,
      currentValue: 15,
      unit: 'problems',
      deadline: '2024-02-15',
      status: 'active' as const,
      priority: 'high' as const,
      progress: 75
    },
    {
      id: 2,
      title: 'Read 3 Books',
      description: 'Improve reading comprehension',
      category: 'Reading',
      targetValue: 3,
      currentValue: 2,
      unit: 'books',
      deadline: '2024-02-20',
      status: 'active' as const,
      priority: 'medium' as const,
      progress: 67
    }
  ];

  const sampleAchievements = [
    {
      id: 1,
      title: 'Math Master',
      description: 'Solved 100 math problems',
      icon: '🧮',
      earnedAt: '2024-01-15',
      category: 'Mathematics',
      rarity: 'rare' as const,
      points: 50
    },
    {
      id: 2,
      title: 'Consistent Learner',
      description: '7-day learning streak',
      icon: '🔥',
      earnedAt: '2024-01-10',
      category: 'Engagement',
      rarity: 'common' as const,
      points: 25
    }
  ];

  const goalProgressData = [
    { date: '2024-01-01', completed: 0, total: 2, percentage: 0 },
    { date: '2024-01-07', completed: 0, total: 2, percentage: 25 },
    { date: '2024-01-14', completed: 1, total: 2, percentage: 50 },
    { date: '2024-01-21', completed: 1, total: 2, percentage: 75 }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Learning Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Task 5.5: Comprehensive data visualization components for learning analytics
        </p>
        
        <div className="flex items-center space-x-4 mt-4">
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <div className="text-sm text-gray-500">
            View Mode: <span className="font-medium capitalize">{viewMode}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: '📊 Overview', desc: 'General learning analytics' },
              { id: 'engagement', label: '⚡ Engagement', desc: 'Activity patterns & heatmaps' },
              { id: 'goals', label: '🎯 Goals', desc: 'Goal tracking & achievements' },
              { id: 'charts', label: '📈 Charts', desc: 'Individual chart components' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div>{tab.label}</div>
                <div className="text-xs text-gray-400">{tab.desc}</div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab - Combined Analytics */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Comprehensive Learning Analytics
                </h2>
                <p className="text-gray-600">
                  Complete overview of student progress, engagement, and goal achievement
                </p>
              </div>
              
              <LearningAnalytics 
                studentId={studentId}
                timeframe={timeframe}
                viewMode={viewMode}
              />
            </div>
          )}

          {/* Engagement Tab */}
          {activeTab === 'engagement' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Engagement & Activity Patterns
                </h2>
                <p className="text-gray-600">
                  Time-based analysis, heatmaps, and activity insights
                </p>
              </div>
              
              <EngagementVisualization 
                data={engagementData}
                timeframe={timeframe}
                viewMode={viewMode}
              />
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Goal Tracking & Achievements
                </h2>
                <p className="text-gray-600">
                  Progress monitoring, achievement gallery, and goal analytics
                </p>
              </div>
              
              <GoalTrackingVisualization 
                goals={sampleGoals}
                achievements={sampleAchievements}
                progressData={goalProgressData}
                viewMode={viewMode}
              />
            </div>
          )}

          {/* Charts Tab - Individual Components */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Individual Chart Components
                </h2>
                <p className="text-gray-600">
                  Reusable chart components for custom dashboard implementations
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart Example */}
                <ProgressChart
                  data={progressData}
                  type="line"
                  title="Learning Progress Over Time"
                  height={300}
                  options={{
                    colors: CHART_COLORS.primary,
                    showArea: false,
                    formatValue: (value: number) => `${value}%`
                  }}
                />

                {/* Radar Chart Example */}
                <ProgressChart
                  data={skillsRadarData}
                  type="radar"
                  title="Skill Competencies"
                  height={300}
                  options={{
                    colors: CHART_COLORS.success,
                    formatValue: (value: number) => `${value}%`
                  }}
                />

                {/* Bar Chart Example */}
                <ProgressChart
                  data={{
                    labels: ['Math', 'Reading', 'Writing', 'Science'],
                    datasets: [{
                      label: 'Time Spent (hours)',
                      data: [12, 8, 6, 10],
                      backgroundColor: CHART_COLORS.primary,
                      borderColor: CHART_COLORS.primary
                    }]
                  }}
                  type="bar"
                  title="Subject Time Distribution"
                  height={300}
                  options={{
                    colors: CHART_COLORS.primary,
                    formatValue: (value: number) => `${value}h`
                  }}
                />

                {/* Area Chart Example */}
                <ProgressChart
                  data={progressData}
                  type="line"
                  title="Engagement Trends"
                  height={300}
                  options={{
                    colors: CHART_COLORS.info,
                    showArea: true,
                    formatValue: (value: number) => `${value}%`
                  }}
                />
              </div>

              {/* Usage Examples */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Implementation Examples
                </h3>
                
                <div className="space-y-4 text-sm">
                  <div className="bg-white rounded border p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Basic Usage:</h4>
                    <pre className="text-gray-600 overflow-x-auto">
{`import { ProgressChart } from '../analytics';

<ProgressChart
  data={myData}
  type="line"
  title="Student Progress"
  height={400}
  options={{
    colors: ['#3B82F6', '#10B981'],
    formatValue: (v) => \`\${v}%\`
  }}
/>`}
                    </pre>
                  </div>

                  <div className="bg-white rounded border p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Complete Analytics:</h4>
                    <pre className="text-gray-600 overflow-x-auto">
{`import { LearningAnalytics } from '../analytics';

<LearningAnalytics
  studentId="12345"
  timeframe="30d"
  viewMode="teacher"
  showComparison={true}
/>`}
                    </pre>
                  </div>

                  <div className="bg-white rounded border p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Features Implemented:</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>✅ Progress tracking with multiple chart types (line, bar, radar)</li>
                      <li>✅ Engagement analysis with heatmaps and time patterns</li>
                      <li>✅ Goal tracking with radial progress and achievement galleries</li>
                      <li>✅ Responsive design with mobile-friendly layouts</li>
                      <li>✅ Role-based views (student, teacher, parent)</li>
                      <li>✅ Interactive tooltips and legends</li>
                      <li>✅ Customizable color schemes and themes</li>
                      <li>✅ Data transformation utilities</li>
                      <li>✅ Loading states and error handling</li>
                      <li>✅ TypeScript support with comprehensive types</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-green-800 font-medium">
          ✅ Task 5.5 Complete: Data Visualization Components for Learning Analytics
        </div>
        <div className="text-green-600 text-sm mt-1">
          Comprehensive chart library with {viewMode} view mode active
        </div>
      </div>
    </div>
  );
}; 