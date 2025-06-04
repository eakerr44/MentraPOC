import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { JournalPage } from './pages/JournalPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { HelpPage } from './pages/HelpPage';
import { Layout } from './components/Layout';
import { useAuthStore } from './stores/authStore';

function App() {
  const { user, isAuthenticated, initializeDemoUser } = useAuthStore();

  // Auto-initialize demo user for testing
  useEffect(() => {
    initializeDemoUser();
  }, [initializeDemoUser]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
          />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/journal" element={<JournalPage />} />
                    <Route path="/problems" element={<ProblemsPage />} />
                    {/* Help system routes */}
                    <Route path="/help" element={<HelpPage userRole={user?.role || 'student'} />} />
                    <Route path="/help/article/:articleId" element={<HelpPage userRole={user?.role || 'student'} />} />
                    <Route path="/help/section/:section" element={<HelpPage userRole={user?.role || 'student'} />} />
                    <Route path="/help/search" element={<HelpPage userRole={user?.role || 'student'} />} />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 