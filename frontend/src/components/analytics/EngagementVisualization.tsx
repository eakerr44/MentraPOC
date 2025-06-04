import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Calendar, Clock, Activity, Zap, TrendingUp } from 'lucide-react';

// Types for engagement data
interface EngagementData {
  date: string;
  totalTime: number;
  sessions: number;
  engagement: number;
  interactions: number;
}

interface TimeOfDayData {
  hour: string;
  activity: number;
  focus: number;
}

interface WeeklyPattern {
  day: string;
  avgTime: number;
  avgSessions: number;
  avgEngagement: number;
}

interface EngagementHeatmapData {
  day: number;
  hour: number;
  value: number;
}

interface EngagementVisualizationProps {
  data: EngagementData[];
  timeframe?: string;
  showComparison?: boolean;
  viewMode?: 'student' | 'teacher' | 'parent';
}

// Daily Engagement Heatmap
const EngagementHeatmap: React.FC<{
  data: EngagementHeatmapData[];
  height?: number;
}> = ({ data, height = 200 }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getIntensityColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    if (value < 0.25) return 'bg-blue-100';
    if (value < 0.5) return 'bg-blue-200';
    if (value < 0.75) return 'bg-blue-400';
    return 'bg-blue-600';
  };

  const getValueForCell = (day: number, hour: number) => {
    const cell = data.find(d => d.day === day && d.hour === hour);
    return cell ? cell.value : 0;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Heatmap</h3>
      
      <div className="overflow-x-auto">
        <div className="grid grid-cols-25 gap-1 text-xs" style={{ minWidth: '600px' }}>
          {/* Header with hours */}
          <div></div>
          {hours.map(hour => (
            <div key={hour} className="text-center text-gray-500 font-medium">
              {hour}
            </div>
          ))}
          
          {/* Days and heatmap cells */}
          {days.map((day, dayIndex) => (
            <React.Fragment key={day}>
              <div className="text-gray-700 font-medium py-1">{day}</div>
              {hours.map(hour => {
                const value = getValueForCell(dayIndex, hour);
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={`w-6 h-6 rounded ${getIntensityColor(value)} border border-white cursor-pointer hover:opacity-80 transition-opacity`}
                    title={`${day} ${hour}:00 - Activity: ${(value * 100).toFixed(0)}%`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center mt-4 space-x-2">
          <span className="text-xs text-gray-500">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map(value => (
            <div
              key={value}
              className={`w-3 h-3 rounded ${getIntensityColor(value)} border border-gray-200`}
            />
          ))}
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>
    </div>
  );
};

// Time of Day Activity Pattern
const TimeOfDayChart: React.FC<{
  data: TimeOfDayData[];
  height?: number;
}> = ({ data, height = 300 }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Activity Pattern</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelFormatter={(value) => `${value}:00`}
            />
            <Area
              type="monotone"
              dataKey="activity"
              stackId="1"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.6}
              name="Activity Level"
            />
            <Area
              type="monotone"
              dataKey="focus"
              stackId="2"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.4}
              name="Focus Level"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Weekly Engagement Pattern
const WeeklyPatternChart: React.FC<{
  data: WeeklyPattern[];
  height?: number;
}> = ({ data, height = 300 }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Engagement Pattern</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar 
              dataKey="avgTime" 
              fill="#3B82F6" 
              radius={[2, 2, 0, 0]}
              name="Avg Time (min)"
            />
            <Line
              type="monotone"
              dataKey="avgEngagement"
              stroke="#10B981"
              strokeWidth={2}
              name="Avg Engagement %"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Engagement Score Card
const EngagementScoreCard: React.FC<{
  score: number;
  trend: number;
  breakdown: {
    consistency: number;
    participation: number;
    focus: number;
    completion: number;
  };
}> = ({ score, trend, breakdown }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`rounded-lg border p-6 ${getScoreBg(score)}`}>
      <div className="text-center mb-4">
        <div className="flex items-center justify-center mb-2">
          <Activity className="w-6 h-6 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Engagement Score</h3>
        </div>
        
        <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="text-sm text-gray-500">out of 100</div>
        
        {trend !== 0 && (
          <div className="flex items-center justify-center mt-2">
            <TrendingUp className={`w-4 h-4 mr-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend} from last week
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Breakdown</h4>
        
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 capitalize">{key}</span>
              <span className="font-medium">{value}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  value >= 80 ? 'bg-green-500' : 
                  value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Engagement Timeline
const EngagementTimeline: React.FC<{
  data: EngagementData[];
  height?: number;
}> = ({ data, height = 300 }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Over Time</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: '#3B82F6' }}
              name="Engagement %"
            />
            <Line
              type="monotone"
              dataKey="totalTime"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
              name="Total Time (min)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Main Engagement Visualization Component
export const EngagementVisualization: React.FC<EngagementVisualizationProps> = ({
  data,
  timeframe = '30d',
  showComparison = false,
  viewMode = 'student'
}) => {
  // Mock data - in real implementation, this would be processed from props
  const heatmapData: EngagementHeatmapData[] = [
    // Generate sample heatmap data
    ...Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => ({
        day,
        hour,
        value: Math.random() * (hour >= 8 && hour <= 20 ? 1 : 0.2)
      }))
    ).flat()
  ];

  const timeOfDayData: TimeOfDayData[] = [
    { hour: '6', activity: 10, focus: 15 },
    { hour: '7', activity: 25, focus: 30 },
    { hour: '8', activity: 60, focus: 70 },
    { hour: '9', activity: 80, focus: 85 },
    { hour: '10', activity: 75, focus: 80 },
    { hour: '11', activity: 70, focus: 75 },
    { hour: '12', activity: 40, focus: 35 },
    { hour: '13', activity: 50, focus: 45 },
    { hour: '14', activity: 85, focus: 90 },
    { hour: '15', activity: 90, focus: 85 },
    { hour: '16', activity: 70, focus: 75 },
    { hour: '17', activity: 45, focus: 50 },
    { hour: '18', activity: 30, focus: 35 },
    { hour: '19', activity: 20, focus: 25 },
    { hour: '20', activity: 15, focus: 20 },
    { hour: '21', activity: 10, focus: 15 }
  ];

  const weeklyData: WeeklyPattern[] = [
    { day: 'Mon', avgTime: 45, avgSessions: 3, avgEngagement: 75 },
    { day: 'Tue', avgTime: 52, avgSessions: 4, avgEngagement: 82 },
    { day: 'Wed', avgTime: 38, avgSessions: 2, avgEngagement: 68 },
    { day: 'Thu', avgTime: 48, avgSessions: 3, avgEngagement: 78 },
    { day: 'Fri', avgTime: 35, avgSessions: 2, avgEngagement: 65 },
    { day: 'Sat', avgTime: 25, avgSessions: 2, avgEngagement: 70 },
    { day: 'Sun', avgTime: 30, avgSessions: 2, avgEngagement: 72 }
  ];

  const engagementScore = {
    score: 78,
    trend: 5,
    breakdown: {
      consistency: 85,
      participation: 72,
      focus: 80,
      completion: 75
    }
  };

  return (
    <div className="space-y-6">
      {/* Engagement Score and Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <EngagementScoreCard {...engagementScore} />
        </div>
        <div className="lg:col-span-2">
          <EngagementTimeline data={data} height={280} />
        </div>
      </div>

      {/* Activity Patterns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TimeOfDayChart data={timeOfDayData} />
        <WeeklyPatternChart data={weeklyData} />
      </div>

      {/* Activity Heatmap */}
      <EngagementHeatmap data={heatmapData} />

      {/* Insights for educators */}
      {viewMode !== 'student' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">🕐 Peak Hours</h4>
              <p className="text-sm text-blue-700">
                Most active between 2-4 PM. Consider scheduling challenging tasks during this time.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">📈 Trends</h4>
              <p className="text-sm text-green-700">
                Engagement increasing by 5% week-over-week. Consistency is strong on weekdays.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">💡 Recommendations</h4>
              <p className="text-sm text-yellow-700">
                Weekend engagement could improve. Consider gamified weekend challenges.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 