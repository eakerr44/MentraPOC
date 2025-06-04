// Data Visualization Components for Learning Analytics
// Task 5.5: Create data visualization components for learning analytics

import React from 'react';

// Core chart components
export { ProgressChart } from './ProgressChart';
export { LearningAnalytics } from './LearningAnalytics';
export { EngagementVisualization } from './EngagementVisualization';
export { GoalTrackingVisualization } from './GoalTrackingVisualization';

// Enhanced progress components (maintain backward compatibility)
export { TrendIndicatorComponent as TrendIndicator } from '../progress/TrendIndicator';
export { MilestoneTimeline } from '../progress/MilestoneTimeline';
export { ProgressCard } from '../progress/ProgressCard';

// Re-export types for external use
export type {
  ProgressChartProps,
  LineChartData,
  BarChartData,
  RadarChartData,
  TrendIndicatorProps,
  ProgressCardProps,
  MilestoneTimelineProps
} from '../../types/progress';

// Chart utilities and configurations
export const CHART_COLORS = {
  primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
  success: ['#10B981', '#22C55E', '#84CC16'],
  warning: ['#F59E0B', '#F97316', '#EAB308'],
  error: ['#EF4444', '#F87171', '#FB7185'],
  info: ['#3B82F6', '#60A5FA', '#93C5FD'],
  neutral: ['#6B7280', '#9CA3AF', '#D1D5DB']
};

export const CHART_THEMES = {
  default: {
    backgroundColor: 'white',
    textColor: '#374151',
    gridColor: '#F3F4F6',
    tooltipStyle: {
      backgroundColor: 'white',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  },
  dark: {
    backgroundColor: '#1F2937',
    textColor: '#F9FAFB',
    gridColor: '#374151',
    tooltipStyle: {
      backgroundColor: '#374151',
      border: '1px solid #4B5563',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
    }
  }
};

// Common chart options
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  colors: CHART_COLORS.primary,
  formatValue: (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    if (value < 1) return value.toFixed(2);
    return Math.round(value).toString();
  }
};

// Data transformation utilities
export const transformDataForChart = (
  data: any[],
  type: 'line' | 'bar' | 'radar',
  options: {
    xKey?: string;
    yKeys?: string[];
    groupBy?: string;
  } = {}
) => {
  const { xKey = 'date', yKeys = ['value'], groupBy } = options;
  
  if (type === 'radar') {
    return data.map(item => ({
      category: item[xKey],
      ...yKeys.reduce((acc, key) => {
        acc[key] = item[key] || 0;
        return acc;
      }, {} as any)
    }));
  }

  if (groupBy) {
    const grouped = data.reduce((acc, item) => {
      const group = item[groupBy];
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([group, items]) => ({
      [xKey]: group,
      ...yKeys.reduce((acc, key) => {
        acc[key] = (items as any[]).reduce((sum: number, item: any) => sum + (item[key] || 0), 0);
        return acc;
      }, {} as any)
    }));
  }

  return data.map(item => ({
    [xKey]: item[xKey],
    ...yKeys.reduce((acc, key) => {
      acc[key] = item[key] || 0;
      return acc;
    }, {} as any)
  }));
};

// Chart component factory for custom visualizations
export const createCustomChart = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  defaultProps: Partial<T> = {}
) => {
  return (props: T) => {
    const mergedProps = { ...defaultProps, ...props };
    return React.createElement(Component, mergedProps);
  };
}; 