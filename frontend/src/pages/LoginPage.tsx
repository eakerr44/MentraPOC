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

      await login(demoUser);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-journal-sand flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="/assets/logo/logo_with_words.png" 
            alt="Mentra"
            className="h-20 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-charcoal">
          Welcome back to Mentra
        </h2>
        <p className="mt-2 text-center text-sm text-charcoal-light">
          Sign in to continue your learning journey
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card bg-white py-8 px-6 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full justify-center"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Demo Account</span>
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>Email: demo@mentra.com</p>
              <p>Password: demo123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 