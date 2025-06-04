import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ProgressCardProps } from '../../types/progress';

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  value,
  change,
  changePercentage,
  trend,
  icon,
  color,
  description,
  loading = false,
  onClick,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } transition-shadow ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
            style={{ backgroundColor: color }}
          >
            {icon}
          </div>
        </div>
        {trend && (
          <div className="flex items-center">
            {getTrendIcon()}
          </div>
        )}
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>

      {(change !== undefined || changePercentage !== undefined) && (
        <div className={`text-sm ${getTrendColor()} flex items-center`}>
          {changePercentage !== undefined ? (
            <span>{changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%</span>
          ) : change !== undefined ? (
            <span>{change > 0 ? '+' : ''}{change}</span>
          ) : null}
          <span className="ml-1 text-gray-500">vs last period</span>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
}; 