# 🔐 Mentra Authentication Guide

## Overview

Mentra uses a robust JWT-based authentication system with a dual-token approach for enhanced security. This guide provides comprehensive information for developers implementing authentication in their applications.

## Authentication Architecture

### Token-Based Security Model

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server    │    │   Database      │
│   Application   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │  1. Login Request     │                       │
         ├──────────────────────►│                       │
         │                       │  2. Verify User       │
         │                       ├──────────────────────►│
         │                       │  3. User Data         │
         │                       │◄──────────────────────┤
         │  4. Access + Refresh  │                       │
         │     Tokens            │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │  5. API Request       │                       │
         │     (with token)      │                       │
         ├──────────────────────►│                       │
         │                       │  6. Validate Token   │
         │                       │                       │
         │  7. Response          │                       │
         │◄──────────────────────┤                       │
```

### Dual-Token System

| Token Type | Purpose | Lifetime | Storage | Security Features |
|------------|---------|----------|---------|-------------------|
| **Access Token** | API authorization | 15 minutes | Memory/localStorage | Short-lived, frequently rotated |
| **Refresh Token** | Token renewal | 30 days | HTTP-only cookie | Long-lived, secure storage |

## 🚀 Quick Start

### 1. Basic Authentication Flow

```javascript
// 1. Register a new user
const registerData = {
  email: "student@example.com",
  password: "SecurePass123!",
  confirmPassword: "SecurePass123!",
  role: "student",
  firstName: "John",
  lastName: "Doe",
  gradeLevel: 10,
  learningStyle: "visual"
};

const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(registerData)
});

// 2. Login to get tokens
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "student@example.com",
    password: "SecurePass123!"
  }),
  credentials: 'include' // Include cookies for refresh token
});

const { accessToken, user } = await loginResponse.json();

// 3. Store access token (client-side)
localStorage.setItem('accessToken', accessToken);

// 4. Use access token for API calls
const apiResponse = await fetch('/api/dashboard/student/overview', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
});
```

### 2. Automatic Token Refresh

```javascript
class AuthenticatedAPI {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
  }

  async makeRequest(url, options = {}) {
    let response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include'
    });

    // Handle token expiration
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the original request
        response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          },
          credentials: 'include'
        });
      } else {
        // Redirect to login
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
    }

    return response;
  }

  async refreshToken() {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const { accessToken } = await response.json();
        this.accessToken = accessToken;
        localStorage.setItem('accessToken', accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    return false;
  }
}
```

## 🔒 Security Considerations

### Password Requirements

**Minimum Requirements:**
- At least 8 characters long
- Contains lowercase letter (a-z)
- Contains uppercase letter (A-Z)
- Contains digit (0-9)
- Contains special character (!@#$%^&*)

**Validation Example:**
```javascript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/;

function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  
  if (!passwordRegex.test(password)) {
    return { 
      valid: false, 
      message: "Password must contain uppercase, lowercase, number, and special character" 
    };
  }
  
  return { valid: true };
}
```

### Token Storage Best Practices

#### ✅ Secure Storage Patterns

```javascript
// ✅ Good: Short-lived access token in memory/localStorage
class SecureTokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshTokens = new Set(); // Track active refresh tokens
  }

  setAccessToken(token) {
    this.accessToken = token;
    // Optional: Store in localStorage for persistence across tabs
    localStorage.setItem('accessToken', token);
  }

  getAccessToken() {
    return this.accessToken || localStorage.getItem('accessToken');
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    // Refresh token is cleared by server (HTTP-only cookie)
  }
}
```

#### ❌ Insecure Storage Patterns

```javascript
// ❌ Bad: Never store refresh tokens in localStorage
localStorage.setItem('refreshToken', refreshToken); // NEVER DO THIS

// ❌ Bad: Never store sensitive tokens in regular cookies
document.cookie = `refreshToken=${refreshToken}`; // NEVER DO THIS

// ❌ Bad: Never log tokens
console.log('Access token:', accessToken); // NEVER DO THIS
```

### Cross-Site Request Forgery (CSRF) Protection

Mentra implements CSRF protection through:

1. **SameSite Cookies**: Refresh tokens use `SameSite=Strict`
2. **Custom Headers**: API requests require custom headers
3. **Origin Validation**: Server validates request origins

```javascript
// CSRF protection is automatic when using fetch with credentials
fetch('/api/v1/auth/refresh', {
  method: 'POST',
  credentials: 'include', // Includes SameSite cookies
  headers: {
    'Content-Type': 'application/json', // Custom header for CSRF protection
    'X-Requested-With': 'XMLHttpRequest' // Additional CSRF header
  }
});
```

## 🎭 Role-Based Access Control (RBAC)

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Student** | Individual learner | Own data, journal entries, progress |
| **Teacher** | Classroom educator | Student data in their classes, class analytics |
| **Parent** | Student guardian | Children's progress, family settings |
| **Admin** | System administrator | All data, system management |

### Permission Patterns

```javascript
// Frontend role checking
function hasPermission(user, resource, action) {
  const permissions = {
    student: {
      'own_journal': ['read', 'write'],
      'own_progress': ['read'],
      'own_goals': ['read', 'write']
    },
    teacher: {
      'student_progress': ['read'],
      'class_analytics': ['read'],
      'assignments': ['read', 'write']
    },
    parent: {
      'child_progress': ['read'],
      'family_settings': ['read', 'write']
    },
    admin: {
      '*': ['*'] // All permissions
    }
  };

  const userPerms = permissions[user.role] || {};
  const resourcePerms = userPerms[resource] || [];
  
  return resourcePerms.includes(action) || resourcePerms.includes('*') || userPerms['*']?.includes('*');
}

// Usage example
if (hasPermission(currentUser, 'student_progress', 'read')) {
  // Show student progress data
}
```

## 🔄 Session Management

### Session Lifecycle

```javascript
class SessionManager {
  constructor() {
    this.sessionId = null;
    this.user = null;
    this.tokenExpiry = null;
  }

  async startSession(email, password) {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      this.user = data.user;
      this.accessToken = data.accessToken;
      this.tokenExpiry = Date.now() + (data.expiresIn * 1000);
      
      // Set up automatic token refresh
      this.scheduleTokenRefresh();
      
      return data;
    } catch (error) {
      console.error('Session start failed:', error);
      throw error;
    }
  }

  scheduleTokenRefresh() {
    // Refresh 1 minute before expiry
    const refreshTime = this.tokenExpiry - Date.now() - 60000;
    
    if (refreshTime > 0) {
      setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  async refreshToken() {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.accessToken;
        this.tokenExpiry = Date.now() + (data.expiresIn * 1000);
        this.scheduleTokenRefresh();
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    // Refresh failed, end session
    this.endSession();
    return false;
  }

  async endSession() {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    // Clear local state
    this.user = null;
    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('accessToken');
  }

  isAuthenticated() {
    return this.user && this.accessToken && Date.now() < this.tokenExpiry;
  }
}
```

## 🛡️ Security Headers

### Required Headers for API Requests

```javascript
const securityHeaders = {
  // Authentication
  'Authorization': 'Bearer <access_token>',
  
  // Content type
  'Content-Type': 'application/json',
  
  // CSRF protection
  'X-Requested-With': 'XMLHttpRequest',
  
  // Optional: Request tracking
  'X-Request-ID': generateUUID(),
  
  // Optional: Client info
  'X-Client-Version': '1.0.0',
  'X-Client-Platform': 'web'
};
```

### Server Security Response Headers

The API automatically includes these security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

## ⚠️ Common Security Pitfalls

### 1. Token Leakage Prevention

```javascript
// ❌ Bad: Logging tokens
console.log('User data:', { ...user, accessToken }); // Exposes token

// ✅ Good: Sanitize logs
console.log('User data:', { ...user, accessToken: '[REDACTED]' });

// ❌ Bad: Sending tokens in URLs
fetch(`/api/data?token=${accessToken}`); // Token in URL/logs

// ✅ Good: Using headers
fetch('/api/data', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### 2. XSS Prevention

```javascript
// ✅ Always sanitize user input before storing
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// ✅ Use Content Security Policy
// Set in HTML meta tag or server headers
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'">
```

### 3. Session Fixation Prevention

```javascript
// ✅ Generate new session after login
class AuthService {
  async login(credentials) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    
    if (response.ok) {
      // Clear any existing session data
      this.clearClientSession();
      
      // Set new session data
      const data = await response.json();
      this.setSession(data);
    }
  }
}
```

## 🔧 Implementation Examples

### React Authentication Hook

```javascript
import { useState, useEffect, useContext, createContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem('accessToken')
  );

  useEffect(() => {
    // Check if user is logged in on app start
    if (accessToken) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await fetch('/api/v1/auth/verify', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        // Token invalid, try refresh
        await refreshToken();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      setUser(data.user);
      setAccessToken(data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    logout();
    return false;
  };

  const value = {
    user,
    login,
    logout,
    refreshToken,
    accessToken,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Protected Route Component

```javascript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
```

## 📊 Monitoring and Analytics

### Authentication Events to Track

```javascript
// Track authentication events for security monitoring
const trackAuthEvent = (event, details = {}) => {
  const eventData = {
    timestamp: new Date().toISOString(),
    event,
    userAgent: navigator.userAgent,
    ipAddress: 'tracked-server-side',
    sessionId: sessionStorage.getItem('sessionId'),
    ...details
  };

  // Send to analytics service
  fetch('/api/v1/analytics/auth-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  }).catch(console.error);
};

// Usage examples
trackAuthEvent('login_attempt', { email: 'user@example.com' });
trackAuthEvent('login_success', { userId: 123, role: 'student' });
trackAuthEvent('login_failure', { reason: 'invalid_password' });
trackAuthEvent('token_refresh', { userId: 123 });
trackAuthEvent('logout', { userId: 123, method: 'user_initiated' });
```

## 🆘 Troubleshooting

### Common Authentication Issues

#### Issue: "Token has expired"

**Symptoms:** API returns 401 Unauthorized
**Solution:**
```javascript
// Implement automatic token refresh
if (response.status === 401) {
  const refreshed = await refreshToken();
  if (refreshed) {
    // Retry original request
    return originalRequest();
  } else {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

#### Issue: "CORS errors with authentication"

**Symptoms:** Browser blocks requests, "Access-Control-Allow-Origin" errors
**Solution:**
```javascript
// Ensure credentials are included in requests
fetch('/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include', // Critical for cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(credentials)
});
```

#### Issue: "Session not persisting across browser tabs"

**Symptoms:** User logged out when opening new tab
**Solution:**
```javascript
// Store access token in localStorage for tab persistence
localStorage.setItem('accessToken', accessToken);

// Listen for storage events to sync across tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'accessToken') {
    if (e.newValue) {
      setAccessToken(e.newValue);
    } else {
      logout();
    }
  }
});
```

### Security Checklist

- [ ] ✅ Passwords meet complexity requirements
- [ ] ✅ Access tokens stored securely (not in localStorage for sensitive apps)
- [ ] ✅ Refresh tokens use HTTP-only cookies
- [ ] ✅ HTTPS used in production
- [ ] ✅ CSRF protection enabled
- [ ] ✅ Rate limiting implemented
- [ ] ✅ Session timeout configured
- [ ] ✅ Token refresh implemented
- [ ] ✅ Logout clears all tokens
- [ ] ✅ Authentication events logged
- [ ] ✅ No tokens in console logs or URLs

---

## 📚 Additional Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Guidelines](https://owasp.org/www-project-authentication/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

**Last Updated:** January 15, 2024 