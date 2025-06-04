import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { ProgressChartProps, LineChartData, BarChartData, RadarChartData } from '../../types/progress';

// Custom tooltip component for learning analytics
const CustomTooltip = ({ active, payload, label, formatValue }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.dataKey}:</span>{' '}
            {formatValue ? formatValue(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Progress Line Chart Component
const ProgressLineChart: React.FC<{
  data: any[];
  dataKeys: string[];
  colors: string[];
  formatValue?: (value: number) => string;
  showArea?: boolean;
}> = ({ data, dataKeys, colors, formatValue, showArea = false }) => {
  const ChartComponent = showArea ? AreaChart : LineChart;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e0e0e0' }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        <Legend />
        {dataKeys.map((key, index) => {
          const color = colors[index % colors.length];
          return showArea ? (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ) : (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

// Progress Bar Chart Component
const ProgressBarChart: React.FC<{
  data: any[];
  dataKeys: string[];
  colors: string[];
  formatValue?: (value: number) => string;
  horizontal?: boolean;
}> = ({ data, dataKeys, colors, formatValue, horizontal = false }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        layout={horizontal ? 'horizontal' : 'vertical'}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={formatValue} />
            <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={60} />
          </>
        ) : (
          <>
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatValue} />
          </>
        )}
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        <Legend />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// Progress Radar Chart Component  
const ProgressRadarChart: React.FC<{
  data: any[];
  dataKeys: string[];
  colors: string[];
  formatValue?: (value: number) => string;
}> = ({ data, dataKeys, colors, formatValue }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid stroke="#e0e0e0" />
        <PolarAngleAxis tick={{ fontSize: 11 }} />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]} 
          tick={{ fontSize: 10 }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        <Legend />
        {dataKeys.map((key, index) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 3 }}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
};

// Main Progress Chart Component
export const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  type,
  title,
  height = 300,
  options = {},
  loading = false,
  error
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg border" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-500 text-sm">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200" style={{ height }}>
        <div className="text-center">
          <div className="text-red-500 text-sm mb-1">⚠️ Chart Error</div>
          <div className="text-red-400 text-xs">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200" style={{ height }}>
        <div className="text-center">
          <div className="text-gray-500 text-sm">📊 No Data Available</div>
          <div className="text-gray-400 text-xs mt-1">Data will appear here when available</div>
        </div>
      </div>
    );
  }

  const {
    colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    formatValue,
    showArea = false,
    horizontal = false,
    ...chartOptions
  } = options;

  // Extract chart data and keys based on type
  const getChartData = () => {
    if (type === 'line') {
      const lineData = data as LineChartData;
      const chartData = lineData.labels.map((label, index) => {
        const dataPoint: any = { period: label };
        lineData.datasets.forEach(dataset => {
          dataPoint[dataset.label] = dataset.data[index] || 0;
        });
        return dataPoint;
      });
      const dataKeys = lineData.datasets.map(dataset => dataset.label);
      return { chartData, dataKeys };
    }
    
    if (type === 'bar') {
      const barData = data as BarChartData;
      const chartData = barData.labels.map((label, index) => {
        const dataPoint: any = { period: label };
        barData.datasets.forEach(dataset => {
          dataPoint[dataset.label] = dataset.data[index] || 0;
        });
        return dataPoint;
      });
      const dataKeys = barData.datasets.map(dataset => dataset.label);
      return { chartData, dataKeys };
    }
    
    if (type === 'radar') {
      const radarData = data as RadarChartData;
      const chartData = radarData.labels.map((label, index) => {
        const dataPoint: any = { category: label };
        radarData.datasets.forEach(dataset => {
          dataPoint[dataset.label] = dataset.data[index] || 0;
        });
        return dataPoint;
      });
      const dataKeys = radarData.datasets.map(dataset => dataset.label);
      return { chartData, dataKeys };
    }

    return { chartData: [], dataKeys: [] };
  };

  const { chartData, dataKeys } = getChartData();

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200" style={{ height }}>
        <div className="text-center">
          <div className="text-gray-500 text-sm">📊 No Data Available</div>
          <div className="text-gray-400 text-xs mt-1">Data will appear here when available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">{title}</h3>
      )}
      
      <div style={{ height: height - (title ? 80 : 40) }}>
        {type === 'line' && (
          <ProgressLineChart
            data={chartData}
            dataKeys={dataKeys}
            colors={colors}
            formatValue={formatValue}
            showArea={showArea}
          />
        )}
        
        {type === 'bar' && (
          <ProgressBarChart
            data={chartData}
            dataKeys={dataKeys}
            colors={colors}
            formatValue={formatValue}
            horizontal={horizontal}
          />
        )}
        
        {type === 'radar' && (
          <ProgressRadarChart
            data={chartData}
            dataKeys={dataKeys}
            colors={colors}
            formatValue={formatValue}
          />
        )}
      </div>
    </div>
  );
}; 