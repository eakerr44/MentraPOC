import React from 'react';
import { ProgressChart as AnalyticsProgressChart } from '../analytics/ProgressChart';
import { LineChartData, BarChartData, RadarChartData, ProgressChartProps } from '../../types/progress';

// Re-export the enhanced progress chart from analytics
export const ProgressChart: React.FC<ProgressChartProps> = (props) => {
  return <AnalyticsProgressChart {...props} />;
}; 