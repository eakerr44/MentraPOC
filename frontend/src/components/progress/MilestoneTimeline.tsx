import React from 'react';
import { Award, Star, Heart, BookOpen, Zap } from 'lucide-react';
import { MilestoneTimelineProps, ProgressMilestone } from '../../types/progress';

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
  maxItems = 5,
  onMilestoneClick
}) => {
  const displayedMilestones = milestones.slice(0, maxItems);

  const getCategoryIcon = (category: ProgressMilestone['category']) => {
    switch (category) {
      case 'writing':
        return <BookOpen className="w-4 h-4" />;
      case 'emotional':
        return <Heart className="w-4 h-4" />;
      case 'reflection':
        return <Star className="w-4 h-4" />;
      case 'consistency':
        return <Zap className="w-4 h-4" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: ProgressMilestone['category']) => {
    switch (category) {
      case 'writing':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'emotional':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'reflection':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'consistency':
        return 'bg-purple-100 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getSignificanceStyles = (significance: ProgressMilestone['significance']) => {
    switch (significance) {
      case 'high':
        return 'ring-2 ring-yellow-400 ring-opacity-50';
      case 'medium':
        return 'ring-1 ring-blue-400 ring-opacity-50';
      default:
        return '';
    }
  };

  if (displayedMilestones.length === 0) {
    return (
      <div className="text-center py-8">
        <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No milestones achieved yet</p>
        <p className="text-sm text-gray-400 mt-1">Keep learning to unlock achievements!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedMilestones.map((milestone, index) => (
        <div
          key={milestone.type + milestone.achievedDate}
          className={`relative flex items-start space-x-4 p-4 rounded-lg border ${
            onMilestoneClick ? 'cursor-pointer hover:bg-gray-50' : ''
          } transition-colors ${getSignificanceStyles(milestone.significance)}`}
          onClick={() => onMilestoneClick && onMilestoneClick(milestone)}
        >
          {/* Timeline connector */}
          {index < displayedMilestones.length - 1 && (
            <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
          )}

          {/* Milestone icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${getCategoryColor(milestone.category)}`}>
            {getCategoryIcon(milestone.category)}
          </div>

          {/* Milestone content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {milestone.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {milestone.description}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{new Date(milestone.achievedDate).toLocaleDateString()}</span>
                  <span className="mx-2">•</span>
                  <span className="capitalize">{milestone.category}</span>
                  {milestone.significance === 'high' && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-yellow-600 font-medium">Major Achievement</span>
                    </>
                  )}
                </div>
              </div>

              {/* Significance indicator */}
              {milestone.significance === 'high' && (
                <div className="flex-shrink-0 ml-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {milestones.length > maxItems && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Showing {maxItems} of {milestones.length} milestones
          </p>
        </div>
      )}
    </div>
  );
}; 