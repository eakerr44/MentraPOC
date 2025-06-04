import React, { useState } from 'react';
import { X, Check, ExternalLink, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { NotificationItemProps } from '../../types/notifications';

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onDismiss,
  onActionComplete,
  onClick,
  compact = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.status !== 'read' && onRead) {
      setIsProcessing(true);
      try {
        await onRead(notification.id);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      setIsProcessing(true);
      try {
        await onDismiss(notification.id);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleActionComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.actionRequired && !notification.actionCompleted && onActionComplete) {
      setIsProcessing(true);
      try {
        await onActionComplete(notification.id);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
    // Auto-mark as read when clicked
    if (notification.status !== 'read' && onRead) {
      onRead(notification.id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-300 bg-gray-50';
    }
  };

  const getStatusIcon = () => {
    if (notification.status === 'read') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (notification.priority === 'urgent') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-blue-500" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const isUnread = notification.status === 'delivered' || notification.status === 'sent';

  if (compact) {
    return (
      <div
        className={`p-3 border-l-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${
          getPriorityColor(notification.priority)
        } ${isUnread ? 'bg-white' : 'bg-gray-50'}`}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <span className="text-lg">{notification.type.icon}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                {notification.title}
              </p>
              <div className="flex items-center space-x-1">
                {getStatusIcon()}
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 border-l-4 border-b border-gray-100 transition-all duration-200 hover:shadow-sm ${
        getPriorityColor(notification.priority)
      } ${isUnread ? 'bg-white' : 'bg-gray-50'} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick ? handleClick : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Icon and Status */}
          <div className="flex-shrink-0">
            <div className="relative">
              <span className="text-xl">{notification.type.icon}</span>
              {isUnread && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                {notification.title}
              </h4>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {notification.message}
            </p>
            
            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100">
                  {notification.type.category}
                </span>
                
                {notification.sender && (
                  <span className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{notification.sender.firstName} {notification.sender.lastName}</span>
                  </span>
                )}
                
                {notification.priority !== 'medium' && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {notification.priority}
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Button */}
            {notification.actionRequired && !notification.actionCompleted && notification.actionUrl && (
              <div className="mt-3">
                <a
                  href={notification.actionUrl}
                  onClick={handleActionComplete}
                  className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>{notification.actionText || 'Take Action'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            
            {notification.actionRequired && notification.actionCompleted && (
              <div className="mt-3">
                <span className="inline-flex items-center space-x-1 text-sm text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>Action completed</span>
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        {!compact && (
          <div className="flex items-center space-x-2 ml-4">
            {isUnread && onRead && (
              <button
                onClick={handleRead}
                disabled={isProcessing}
                className="p-1 text-gray-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded transition-colors"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={handleDismiss}
                disabled={isProcessing}
                className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}; 