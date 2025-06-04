import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import { NotificationBellProps } from '../../types/notifications';

export const NotificationBell: React.FC<NotificationBellProps> = ({
  count,
  onClick,
  variant = 'default',
  maxCount = 99
}) => {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const hasNotifications = count > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="relative p-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
        aria-label={`Notifications (${count} unread)`}
      >
        {hasNotifications ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {displayCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        hasNotifications
          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
      aria-label={`Notifications (${count} unread)`}
    >
      <div className="relative">
        {hasNotifications ? (
          <BellRing className={`w-6 h-6 ${hasNotifications ? 'animate-pulse' : ''}`} />
        ) : (
          <Bell className="w-6 h-6" />
        )}
        
        {hasNotifications && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-lg">
            {displayCount}
          </span>
        )}
        
        {/* Animated pulse ring for urgent notifications */}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping opacity-75"></span>
        )}
      </div>
      
      <span className="sr-only">
        {count === 0 ? 'No new notifications' : `${count} unread notification${count !== 1 ? 's' : ''}`}
      </span>
    </button>
  );
}; 