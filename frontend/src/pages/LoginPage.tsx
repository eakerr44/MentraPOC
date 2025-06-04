import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Navigate } from 'react-router-dom';
import '../styles/brand.css';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('demo@mentra.com');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Demo user for testing
      const demoUser = {
        id: 'demo-user-1',
        email,
        firstName: 'Demo',
        lastName: 'User',
        role: 'student' as const,
        createdAt: new Date().toISOString()
      };

      await login(demoUser, 'demo-token');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen layout-container flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/assets/logo/logo_with_words.png" 
              alt="Mentra - AI-native learning platform"
              className="h-16 w-auto"
            />
          </div>
          <h2 className="text-heading text-center">
            Welcome to Mentra
          </h2>
          <p className="mt-2 text-body text-center text-gray-600">
            Sign in to continue your learning journey
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-field"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-caption text-gray-500">
              Demo credentials are pre-filled for testing
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}; 