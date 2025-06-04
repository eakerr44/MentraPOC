import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { Target, TrendingUp, Calendar, Award, CheckCircle, Clock } from 'lucide-react';

// Types for goal tracking
interface Goal {
  id: number;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: 'active' | 'completed' | 'overdue' | 'paused';
  priority: 'low' | 'medium' | 'high';
  progress: number;
}

interface GoalProgress {
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface GoalTrackingProps {
  goals: Goal[];
  achievements: Achievement[];
  progressData: GoalProgress[];
  viewMode?: 'student' | 'teacher' | 'parent';
}

// Goal Progress Radial Chart
const GoalProgressRadial: React.FC<{
  goals: Goal[];
  height?: number;
}> = ({ goals, height = 300 }) => {
  const data = goals.slice(0, 5).map(goal => ({
    name: goal.title,
    progress: goal.progress,
    fill: goal.status === 'completed' ? '#10B981' : 
          goal.status === 'overdue' ? '#EF4444' : 
          goal.priority === 'high' ? '#F59E0B' : '#3B82F6'
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Progress</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={data}>
            <RadialBar
              dataKey="progress"
              cornerRadius={10}
              fill="#8884d8"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`${value}%`, 'Progress']}
            />
            <Legend />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Goal Status Distribution
const GoalStatusChart: React.FC<{
  goals: Goal[];
  height?: number;
}> = ({ goals, height = 250 }) => {
  const statusCounts = goals.reduce((acc, goal) => {
    acc[goal.status] = (acc[goal.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill: status === 'completed' ? '#10B981' :
          status === 'overdue' ? '#EF4444' :
          status === 'active' ? '#3B82F6' : '#6B7280'
  }));

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Status Distribution</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Goal Timeline Progress
const GoalTimelineChart: React.FC<{
  progressData: GoalProgress[];
  height?: number;
}> = ({ progressData, height = 300 }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Completion Timeline</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
              dataKey="percentage"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3B82F6' }}
              name="Completion %"
            />
            <Bar
              dataKey="completed"
              fill="#10B981"
              name="Goals Completed"
              opacity={0.7}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Individual Goal Cards
const GoalCard: React.FC<{
  goal: Goal;
  compact?: boolean;
}> = ({ goal, compact = false }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 text-green-800';
      case 'overdue': return 'bg-red-50 border-red-200 text-red-800';
      case 'active': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      default: return '🟢';
    }
  };

  const isOverdue = new Date(goal.deadline) < new Date() && goal.status !== 'completed';

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor(goal.status)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <span className="text-sm font-medium">{getPriorityIcon(goal.priority)}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(goal.status)}`}>
          {goal.status}
        </span>
      </div>

      <h4 className="font-medium mb-1">{goal.title}</h4>
      {!compact && (
        <p className="text-sm opacity-75 mb-3">{goal.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span className="font-medium">
            {goal.currentValue}/{goal.targetValue} {goal.unit}
          </span>
        </div>
        
        <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              goal.status === 'completed' ? 'bg-green-500' :
              isOverdue ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span>{goal.progress}% complete</span>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {new Date(goal.deadline).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Achievement Gallery
const AchievementGallery: React.FC<{
  achievements: Achievement[];
  maxVisible?: number;
}> = ({ achievements, maxVisible = 6 }) => {
  const [showAll, setShowAll] = useState(false);
  
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'epic': return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      case 'rare': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const visibleAchievements = showAll ? achievements : achievements.slice(0, maxVisible);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Achievements</h3>
        {achievements.length > maxVisible && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? 'Show Less' : `View All (${achievements.length})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleAchievements.map(achievement => (
          <div
            key={achievement.id}
            className={`rounded-lg border p-4 ${getRarityColor(achievement.rarity)}`}
          >
            <div className="text-center mb-3">
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <h4 className="font-medium text-sm">{achievement.title}</h4>
            </div>
            
            <p className="text-xs opacity-75 mb-2 text-center">{achievement.description}</p>
            
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium">+{achievement.points} pts</span>
              <span>{new Date(achievement.earnedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No achievements yet</p>
          <p className="text-sm">Complete goals to earn achievements!</p>
        </div>
      )}
    </div>
  );
};

// Goal Category Analysis
const GoalCategoryChart: React.FC<{
  goals: Goal[];
  height?: number;
}> = ({ goals, height = 300 }) => {
  const categoryData = goals.reduce((acc, goal) => {
    const category = goal.category;
    if (!acc[category]) {
      acc[category] = { total: 0, completed: 0, active: 0, overdue: 0 };
    }
    acc[category].total++;
    acc[category][goal.status]++;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.entries(categoryData).map(([category, data]) => ({
    category,
    completed: data.completed || 0,
    active: data.active || 0,
    overdue: data.overdue || 0,
    completionRate: Math.round((data.completed / data.total) * 100)
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Goals by Category</h3>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="category" 
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
            <Legend />
            <Bar dataKey="completed" stackId="a" fill="#10B981" name="Completed" />
            <Bar dataKey="active" stackId="a" fill="#3B82F6" name="Active" />
            <Bar dataKey="overdue" stackId="a" fill="#EF4444" name="Overdue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Main Goal Tracking Component
export const GoalTrackingVisualization: React.FC<GoalTrackingProps> = ({
  goals,
  achievements,
  progressData,
  viewMode = 'student'
}) => {
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const overdueGoals = goals.filter(g => g.status === 'overdue');

  const stats = {
    total: goals.length,
    active: activeGoals.length,
    completed: completedGoals.length,
    overdue: overdueGoals.length,
    completionRate: goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0
  };

  return (
    <div className="space-y-6">
      {/* Goal Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Goals</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          <div className="text-sm text-blue-700">Active</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-sm text-red-700">Overdue</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <GoalProgressRadial goals={activeGoals} />
        <GoalStatusChart goals={goals} />
        <GoalCategoryChart goals={goals} />
      </div>

      {/* Timeline Chart */}
      <GoalTimelineChart progressData={progressData} />

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.slice(0, 6).map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
          {activeGoals.length > 6 && (
            <div className="text-center mt-4">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All Active Goals ({activeGoals.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      <AchievementGallery achievements={achievements} />

      {/* Insights for educators */}
      {viewMode !== 'student' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">📊 Progress</h4>
              <p className="text-sm text-blue-700">
                {stats.completionRate}% completion rate. Student is {stats.completionRate > 75 ? 'excelling' : 'progressing'} with goal achievement.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ Attention Needed</h4>
              <p className="text-sm text-yellow-700">
                {stats.overdue} goal(s) overdue. Consider reviewing deadlines and providing support.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">🎯 Recommendations</h4>
              <p className="text-sm text-green-700">
                {stats.active > 5 ? 'Consider focusing on fewer goals' : 'Good goal balance'}. Celebrate recent achievements!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 