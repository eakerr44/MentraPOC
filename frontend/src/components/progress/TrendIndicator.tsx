import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TrendIndicatorProps } from '../../types/progress';

export const TrendIndicatorComponent: React.FC<TrendIndicatorProps> = ({
  metric,
  value,
  trend,
  change,
  changePercentage,
  color,
  icon,
  size = 'medium',
  showValue = true,
  showChange = true
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'p-3 text-sm';
      case 'large':
        return 'p-6 text-lg';
      default:
        return 'p-4 text-base';
    }
  };

  const getTrendIcon = () => {
    const iconSize = size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-6 h-6' : 'w-4 h-4';
    
    switch (trend) {
      case 'up':
        return <TrendingUp className={`${iconSize} text-green-500`} />;
      case 'down':
        return <TrendingDown className={`${iconSize} text-red-500`} />;
      default:
        return <Minus className={`${iconSize} text-gray-500`} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatMetricName = (metricName: string) => {
    // Convert metric names like 'WRITING_GROWTH_word_count' to readable format
    const parts = metricName.split('_');
    if (parts.length > 2) {
      // Take the last part and format it
      return parts[parts.length - 1]
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }
    return metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (val: number) => {
    if (val === undefined || val === null) return '—';
    
    // Format based on the metric type
    if (metric.includes('percentage') || metric.includes('rate')) {
      return `${val.toFixed(1)}%`;
    } else if (val > 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    } else if (val < 1 && val > 0) {
      return val.toFixed(2);
    } else {
      return Math.round(val).toString();
    }
  };

  return (
    <div className={`bg-white rounded-lg border ${getTrendColor()} ${getSizeClasses()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          {getTrendIcon()}
        </div>
      </div>

      <div className="mb-1">
        <h4 className={`font-medium text-gray-900 ${
          size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm'
        }`}>
          {formatMetricName(metric)}
        </h4>
      </div>

      {showValue && (
        <div className={`font-bold ${
          size === 'small' ? 'text-lg' : size === 'large' ? 'text-3xl' : 'text-xl'
        }`} style={{ color }}>
          {formatValue(value)}
        </div>
      )}

      {showChange && (changePercentage !== undefined || change !== undefined) && (
        <div className={`text-xs flex items-center mt-1 ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 
          'text-gray-600'
        }`}>
          {changePercentage !== undefined ? (
            <span>
              {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
            </span>
          ) : change !== undefined ? (
            <span>
              {change > 0 ? '+' : ''}{formatValue(change)}
            </span>
          ) : null}
          {(changePercentage !== undefined || change !== undefined) && (
            <span className="ml-1 text-gray-500">vs prev</span>
          )}
        </div>
      )}
    </div>
  );
}; 