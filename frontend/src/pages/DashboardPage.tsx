import React from 'react';
import { useAuthStore } from '../stores/authStore';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import TeacherDashboard from '../components/dashboard/TeacherDashboard';
import ParentDashboard from '../components/dashboard/ParentDashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    // Convert string ID to number for dashboard components
    const numericId = parseInt(user.id.split('-').pop() || '1', 10) || 1;
    
    switch (user.role) {
      case 'student':
        return <StudentDashboard userId={numericId} />;
      case 'teacher':
        return <TeacherDashboard teacherId={numericId} />;
      case 'parent':
        return <ParentDashboard parentId={numericId} />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Mentra</h2>
            <p className="text-gray-600">Your dashboard is being prepared...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.firstName}!
            </h1>
            <p className="text-gray-600 mt-2">
              {user.role === 'student' && "Ready to continue your learning journey?"}
              {user.role === 'teacher' && "Let's check on your students' progress."}
              {user.role === 'parent' && "Here's how your child is doing with their learning."}
            </p>
          </div>
          
          {renderDashboard()}
        </div>
      </div>
    </div>
  );
}; 