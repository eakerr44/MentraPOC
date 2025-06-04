import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Brain, Clock, Award } from 'lucide-react';

// Types for learning analytics
interface LearningMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  unit?: string;
}

interface PerformanceData {
  period: string;
  accuracy: number;
  engagement: number;
  timeSpent: number;
  problemsSolved: number;
}

interface SkillCompetency {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  progress: number;
  assessments: number;
}

interface LearningAnalyticsProps {
  studentId?: string;
  timeframe?: string;
  showComparison?: boolean;
  viewMode?: 'student' | 'teacher' | 'parent';
}

// Performance Metrics Card
const MetricCard: React.FC<{
  metric: LearningMetric;
  icon: React.ReactNode;
  color: string;
}> = ({ metric, icon, color }) => {
  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getChangeColor = () => {
    if (metric.change > 0) return 'text-green-600';
    if (metric.change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${color}`}>
            {icon}
          </div>
          {getTrendIcon()}
        </div>
        {metric.target && (
          <div className="text-xs text-gray-500">
            Target: {metric.target}{metric.unit}
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-gray-700 mb-1">{metric.name}</h3>
      
      <div className="flex items-end space-x-2">
        <span className="text-2xl font-bold text-gray-900">
          {metric.value}{metric.unit}
        </span>
        {metric.change !== 0 && (
          <span className={`text-sm ${getChangeColor()}`}>
            {metric.change > 0 ? '+' : ''}{metric.change}{metric.unit}
          </span>
        )}
      </div>

      {metric.target && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress to target</span>
            <span>{Math.round((metric.value / metric.target) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Performance Trend Chart
const PerformanceTrend: React.FC<{
  data: PerformanceData[];
  height?: number;
}> = ({ data, height = 300 }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            
            <Bar
              yAxisId="right"
              dataKey="problemsSolved"
              fill="#3B82F6"
              name="Problems Solved"
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="accuracy"
              stroke="#10B981"
              strokeWidth={2}
              name="Accuracy %"
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="engagement"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Engagement %"
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Skill Competency Radar
const SkillCompetencyChart: React.FC<{
  skills: SkillCompetency[];
  height?: number;
}> = ({ skills, height = 400 }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Skill Competencies</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Bars */}
        <div className="space-y-4">
          {skills.map((skill, index) => (
            <div key={skill.skill} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                <span className="text-sm text-gray-500">
                  {skill.currentLevel}/{skill.targetLevel}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(skill.currentLevel / skill.targetLevel) * 100}%`,
                    backgroundColor: COLORS[index % COLORS.length]
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>{skill.assessments} assessments</span>
                <span>{Math.round((skill.currentLevel / skill.targetLevel) * 100)}% complete</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pie Chart */}
        <div style={{ height: Math.min(height, 300) }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={skills.map((skill, index) => ({
                  name: skill.skill,
                  value: skill.currentLevel,
                  fill: COLORS[index % COLORS.length]
                }))}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {skills.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Time Spent Analysis
const TimeAnalysis: React.FC<{
  data: { category: string; hours: number; sessions: number }[];
  height?: number;
}> = ({ data, height = 300 }) => {
  const total = data.reduce((sum, item) => sum + item.hours, 0);
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Time Distribution</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time breakdown */}
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-700">{item.category}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {item.hours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500">
                  {item.sessions} sessions
                </div>
              </div>
            </div>
          ))}
          
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total</span>
              <span className="text-sm font-bold text-gray-900">{total.toFixed(1)}h</span>
            </div>
          </div>
        </div>

        {/* Pie chart */}
        <div style={{ height: Math.min(height, 250) }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.map((item, index) => ({
                  ...item,
                  fill: COLORS[index % COLORS.length]
                }))}
                cx="50%"
                cy="50%"
                outerRadius={60}
                dataKey="hours"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}h`, 'Hours']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Main Learning Analytics Component
export const LearningAnalytics: React.FC<LearningAnalyticsProps> = ({
  studentId,
  timeframe = '30d',
  showComparison = false,
  viewMode = 'student'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data - in real implementation, this would come from API
  const metrics: LearningMetric[] = [
    {
      name: 'Problem Solving Accuracy',
      value: 87,
      change: 5,
      trend: 'up',
      target: 90,
      unit: '%'
    },
    {
      name: 'Daily Engagement',
      value: 45,
      change: -3,
      trend: 'down',
      target: 60,
      unit: ' min'
    },
    {
      name: 'Learning Streak',
      value: 12,
      change: 2,
      trend: 'up',
      unit: ' days'
    },
    {
      name: 'Concepts Mastered',
      value: 24,
      change: 4,
      trend: 'up',
      target: 30,
      unit: ''
    }
  ];

  const performanceData: PerformanceData[] = [
    { period: 'Week 1', accuracy: 75, engagement: 80, timeSpent: 120, problemsSolved: 15 },
    { period: 'Week 2', accuracy: 82, engagement: 85, timeSpent: 135, problemsSolved: 18 },
    { period: 'Week 3', accuracy: 78, engagement: 75, timeSpent: 110, problemsSolved: 12 },
    { period: 'Week 4', accuracy: 87, engagement: 90, timeSpent: 150, problemsSolved: 22 }
  ];

  const skillData: SkillCompetency[] = [
    { skill: 'Mathematics', currentLevel: 8, targetLevel: 10, progress: 80, assessments: 12 },
    { skill: 'Reading Comprehension', currentLevel: 9, targetLevel: 10, progress: 90, assessments: 8 },
    { skill: 'Problem Solving', currentLevel: 7, targetLevel: 10, progress: 70, assessments: 15 },
    { skill: 'Creative Writing', currentLevel: 6, targetLevel: 10, progress: 60, assessments: 6 },
    { skill: 'Critical Thinking', currentLevel: 8, targetLevel: 10, progress: 80, assessments: 10 }
  ];

  const timeData = [
    { category: 'Math Practice', hours: 8.5, sessions: 12 },
    { category: 'Reading', hours: 6.2, sessions: 8 },
    { category: 'Writing', hours: 4.1, sessions: 6 },
    { category: 'Problem Solving', hours: 5.8, sessions: 10 },
    { category: 'Review', hours: 2.4, sessions: 5 }
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [studentId, timeframe]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">⚠️ Error Loading Analytics</div>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          metric={metrics[0]}
          icon={<Target className="w-5 h-5 text-white" />}
          color="bg-blue-500"
        />
        <MetricCard
          metric={metrics[1]}
          icon={<Clock className="w-5 h-5 text-white" />}
          color="bg-green-500"
        />
        <MetricCard
          metric={metrics[2]}
          icon={<Award className="w-5 h-5 text-white" />}
          color="bg-yellow-500"
        />
        <MetricCard
          metric={metrics[3]}
          icon={<Brain className="w-5 h-5 text-white" />}
          color="bg-purple-500"
        />
      </div>

      {/* Performance Trend */}
      <PerformanceTrend data={performanceData} height={350} />

      {/* Skills and Time Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SkillCompetencyChart skills={skillData} />
        <TimeAnalysis data={timeData} />
      </div>

      {/* Additional insights for teacher/parent view */}
      {viewMode !== 'student' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">🎯 Strengths</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Consistent daily engagement</li>
                <li>• Strong performance in reading comprehension</li>
                <li>• Improving problem-solving accuracy</li>
              </ul>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">🌱 Growth Areas</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Creative writing needs more practice</li>
                <li>• Math concepts require reinforcement</li>
                <li>• Time management during problem solving</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 