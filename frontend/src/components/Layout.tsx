import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import '../styles/brand.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊', emoji: '🏠' },
    { name: 'Journal', href: '/journal', icon: '📝', emoji: '📓' },
    { name: 'Problems', href: '/problems', icon: '🧩', emoji: '🎯' },
    { name: 'Help', href: '/help', icon: '💡', emoji: '❓' },
  ];

  const isActive = (href: string) => location.pathname === href;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  const getRoleClass = (role: string) => {
    switch (role) {
      case 'student': return 'role-student';
      case 'teacher': return 'role-teacher';
      case 'parent': return 'role-parent';
      case 'admin': return 'role-admin';
      default: return 'role-student';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'student': return 'Student';
      case 'teacher': return 'Teacher';
      case 'parent': return 'Parent';
      case 'admin': return 'Admin';
      default: return 'User';
    }
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  return (
    <div className="layout-container">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 flex z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity animate-fade-in" />
          <div className="relative flex-1 flex flex-col max-w-xs w-full sidebar animate-slide-in">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition-colors focus:outline-none"
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              {/* Mobile Logo */}
              <div className="flex-shrink-0 flex items-center px-4 mb-8">
                <div className="logo-container">
                  <img 
                    src="/assets/logo/mentra-icon.svg" 
                    alt="Mentra" 
                    className="logo-image"
                  />
                  <span className="logo-text">Mentra</span>
                </div>
              </div>
              
              {/* Mobile Navigation */}
              <nav className="px-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="nav-icon">{item.emoji}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 sidebar">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Desktop Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <div className="logo-container">
                <img 
                  src="/assets/logo/mentra-logo.svg" 
                  alt="Mentra" 
                  className="h-8 w-auto"
                />
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="flex-1 px-2 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.emoji}</span>
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Sprig Encouragement */}
            <div className="mt-auto px-4 py-4">
              <div className="card" style={{background: 'linear-gradient(135deg, var(--mentra-blue-pale), var(--growth-green-pale))'}}>
                <div className="flex items-center gap-3">
                  <span style={{fontSize: '24px'}}>🌱</span>
                  <div>
                    <p className="text-caption font-medium" style={{color: 'var(--text-charcoal)'}}>
                      Keep growing!
                    </p>
                    <p className="text-caption" style={{color: 'var(--text-charcoal-light)', fontSize: '10px'}}>
                      You're doing great today ✨
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <header className="header sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Mobile menu button and title */}
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors focus:outline-none"
                  style={{color: 'var(--text-charcoal-light)'}}
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Page title for mobile */}
                <h1 className="lg:hidden ml-2 text-lg font-semibold" style={{color: 'var(--text-charcoal)'}}>
                  {navigation.find(item => isActive(item.href))?.name || 'Mentra'}
                </h1>

                {/* Desktop breadcrumb */}
                <div className="hidden lg:flex items-center gap-2">
                  <img 
                    src="/assets/logo/mentra-icon.svg" 
                    alt="Mentra" 
                    className="h-6 w-6"
                  />
                  <span className="text-caption" style={{color: 'var(--text-charcoal-light)'}}>
                    {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
                  </span>
                </div>
              </div>
              
              {/* User menu */}
              <div className="flex items-center">
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none"
                  >
                    {/* User avatar */}
                    <div className="flex-shrink-0">
                      {user?.avatar ? (
                        <img
                          className="user-avatar"
                          src={user.avatar}
                          alt={`${user.firstName} ${user.lastName}`}
                        />
                      ) : (
                        <div className="user-avatar">
                          {getUserInitials(user?.firstName, user?.lastName)}
                        </div>
                      )}
                    </div>
                    
                    {/* User info */}
                    <div className="hidden sm:block text-left">
                      <p className="text-body font-medium" style={{color: 'var(--text-charcoal)'}}>
                        {user?.firstName} {user?.lastName}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-caption px-2 py-1 rounded-full ${getRoleClass(user?.role || '')}`}>
                          {getRoleName(user?.role || '')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Dropdown arrow */}
                    <svg
                      className={`flex-shrink-0 h-4 w-4 transition-transform duration-200 ${
                        userMenuOpen ? 'transform rotate-180' : ''
                      }`}
                      style={{color: 'var(--text-charcoal-lighter)'}}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* User dropdown menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 user-menu animate-fade-in z-50">
                      {/* User info section */}
                      <div className="user-info">
                        <p className="text-body font-medium" style={{color: 'var(--text-charcoal)'}}>
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-caption" style={{color: 'var(--text-charcoal-light)'}}>{user?.email}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-caption mt-2 ${getRoleClass(user?.role || '')}`}>
                          {getRoleName(user?.role || '')} Account
                        </span>
                      </div>
                      
                      {/* Menu items */}
                      <div className="py-1">
                        <button
                          onClick={() => {/* TODO: Profile settings */}}
                          className="menu-item"
                        >
                          <svg className="h-4 w-4" style={{color: 'var(--text-charcoal-lighter)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </button>
                        
                        <button
                          onClick={() => {/* TODO: Preferences */}}
                          className="menu-item"
                        >
                          <svg className="h-4 w-4" style={{color: 'var(--text-charcoal-lighter)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Preferences
                        </button>
                        
                        <Link
                          to="/help"
                          className="menu-item"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <svg className="h-4 w-4" style={{color: 'var(--text-charcoal-lighter)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Help & Support
                        </Link>
                      </div>
                      
                      {/* Logout section */}
                      <div className="border-t pt-1" style={{borderColor: 'var(--journal-sand-dark)'}}>
                        <button
                          onClick={handleLogout}
                          className="menu-item danger"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6" style={{background: 'var(--journal-sand)'}}>
          {children}
        </main>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}; 