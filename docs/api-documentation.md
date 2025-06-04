# 🚀 Mentra API Documentation

## Overview

The Mentra API is a comprehensive RESTful API that powers the AI-native learning platform. It provides secure, role-based access to learning analytics, personalized AI scaffolding, journal management, problem-solving tools, and multi-persona dashboards.

### Base URL
- **Development:** `http://localhost:3001`
- **Production:** `https://api.mentra.com` (when deployed)

### API Version
- **Current Version:** v1.0.0
- **API Base Path:** `/api/v1` (authentication) and specific routes for specialized services

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Health & Status Endpoints](#health--status-endpoints)
3. [Dashboard API](#dashboard-api)
4. [Dashboard Customization API](#dashboard-customization-api)
5. [AI & Context Management](#ai--context-management)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [Interactive Examples](#interactive-examples)

---

## 🔐 Authentication

Mentra uses JWT (JSON Web Tokens) for authentication with a dual-token system for enhanced security.

### Authentication Flow

1. **Login** → Receive Access Token + Refresh Token
2. **Use Access Token** → Make authenticated requests
3. **Token Expires** → Use Refresh Token to get new Access Token
4. **Logout** → Revoke tokens

### Token Types

| Token Type | Purpose | Lifetime | Storage |
|------------|---------|----------|---------|
| Access Token | API authentication | 15 minutes | Memory/localStorage |
| Refresh Token | Token renewal | 30 days | HTTP-only cookie |

### 🎯 Quick Start Authentication

```bash
# 1. Register a new account
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "role": "student",
    "firstName": "Alex",
    "lastName": "Student",
    "gradeLevel": 10,
    "learningStyle": "visual"
  }'

# 2. Login to get tokens
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!"
  }'

# 3. Use access token for authenticated requests
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Authentication Endpoints

#### POST `/api/v1/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "student|teacher|parent",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "2005-01-15",
  
  // Student-specific fields
  "gradeLevel": 10,
  "learningStyle": "visual|auditory|kinesthetic|reading_writing",
  
  // Teacher-specific fields
  "schoolName": "Springfield High School",
  "subjectsTaught": ["Math", "Science"],
  
  // Parent-specific fields
  "relationshipType": "parent|guardian|caregiver"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "email": "user@example.com",
    "role": "student",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### POST `/api/v1/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### POST `/api/v1/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "new_access_token_here",
  "expiresIn": 900
}
```

#### GET `/api/v1/auth/me`
🔒 **Requires Authentication**

Get current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe",
    "permissions": ["read:own_data", "write:own_journal"]
  }
}
```

---

## 🏥 Health & Status Endpoints

Monitor system health and service availability.

### GET `/health`

Overall system health check.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "environment": "development",
  "services": {
    "web_server": "running",
    "database": "connected",
    "vector_database": "connected",
    "context_manager": "healthy"
  },
  "capabilities": {
    "authentication": true,
    "ai_context": true,
    "full_features": true
  },
  "version": "1.0.0"
}
```

### GET `/api/v1/database/status`

PostgreSQL database connection status.

### GET `/api/v1/vector-db/status`

ChromaDB vector database status with collection statistics.

### GET `/api/v1/context/status`

AI context manager health and performance metrics.

---

## 📊 Dashboard API

Role-based dashboard data and analytics.

### Student Dashboard

#### GET `/api/dashboard/student/overview`
🔒 **Requires: Student Role**

Get student dashboard overview with key metrics.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "learningStreak": {
      "current": 7,
      "best": 23,
      "weeklyGoal": 5
    },
    "recentAchievements": [
      {
        "id": 1,
        "title": "Math Master",
        "description": "Completed 10 algebra problems",
        "earnedAt": "2024-01-14T15:30:00Z",
        "category": "academic"
      }
    ],
    "weeklyProgress": {
      "journalEntries": 5,
      "problemsSolved": 12,
      "aiInteractions": 18
    }
  }
}
```

#### GET `/api/dashboard/student/goals`
🔒 **Requires: Student Role**

Get active learning goals.

**Query Parameters:**
- `status` (optional): `active|completed|archived`
- `limit` (optional): Number of goals to return

#### POST `/api/dashboard/student/goals`
🔒 **Requires: Student Role**

Create a new learning goal.

**Request Body:**
```json
{
  "title": "Master Quadratic Equations",
  "description": "Understand and solve quadratic equations",
  "category": "mathematics",
  "targetDate": "2024-02-15",
  "milestones": [
    {
      "title": "Learn the quadratic formula",
      "description": "Memorize and understand ax² + bx + c = 0"
    }
  ]
}
```

### Teacher Dashboard

#### GET `/api/dashboard/teacher/overview`
🔒 **Requires: Teacher Role**

Get class overview and student analytics.

#### GET `/api/dashboard/teacher/students/:studentId/progress`
🔒 **Requires: Teacher Role**

Get detailed progress for a specific student.

### Parent Dashboard

#### GET `/api/dashboard/parent/overview`
🔒 **Requires: Parent Role**

Get family learning overview and child progress summaries.

---

## 🎨 Dashboard Customization API

Comprehensive dashboard personalization system.

### Layout Management

#### GET `/api/dashboard-customization/layout`
🔒 **Requires Authentication**

Get user's current dashboard layout.

**Response (200 OK):**
```json
{
  "message": "Dashboard layout retrieved successfully",
  "layout": {
    "widgets": [
      {
        "widgetKey": "overview_1234",
        "templateId": "student_overview",
        "title": "Learning Overview",
        "positionX": 0,
        "positionY": 0,
        "width": 8,
        "height": 4,
        "visible": true,
        "locked": false,
        "customProps": {},
        "templateName": "Learning Overview",
        "templateCategory": "overview",
        "componentName": "StudentOverviewWidget"
      }
    ],
    "lastUpdated": "2024-01-15T10:30:00Z",
    "totalWidgets": 1
  },
  "userId": 123
}
```

#### POST `/api/dashboard-customization/layout`
🔒 **Requires Authentication**

Save dashboard layout configuration.

**Request Body:**
```json
{
  "layoutData": {
    "widgets": [
      {
        "templateId": "student_overview",
        "widgetKey": "overview_1234",
        "title": "My Learning Overview",
        "positionX": 0,
        "positionY": 0,
        "width": 8,
        "height": 4,
        "visible": true,
        "locked": false,
        "customProps": {
          "theme": "dark",
          "showDetails": true
        }
      }
    ]
  },
  "saveAsPreset": false,
  "presetName": "My Custom Layout",
  "presetDescription": "Personal learning dashboard"
}
```

### Theme Management

#### GET `/api/dashboard-customization/theme`
🔒 **Requires Authentication**

Get user's theme preferences.

#### PUT `/api/dashboard-customization/theme`
🔒 **Requires Authentication**

Update theme preferences.

**Request Body:**
```json
{
  "themeName": "dark",
  "primaryColor": "#4f46e5",
  "secondaryColor": "#1e1b4b",
  "accentColor": "#f59e0b",
  "backgroundType": "solid",
  "backgroundValue": "#1a1a1a",
  "fontFamily": "sans-serif",
  "fontSizeScale": 1.1,
  "borderRadius": 12,
  "shadowIntensity": "strong",
  "animationEnabled": true,
  "reducedMotion": false,
  "highContrast": false
}
```

### Widget Templates

#### GET `/api/dashboard-customization/widget-templates`
🔒 **Requires Authentication**

Get available widget templates for user's role.

**Query Parameters:**
- `category` (optional): Filter by widget category

**Response (200 OK):**
```json
{
  "message": "Widget templates retrieved successfully",
  "templates": [
    {
      "id": "student_overview",
      "name": "Learning Overview",
      "description": "Quick summary of learning progress and activity",
      "category": "overview",
      "componentName": "StudentOverviewWidget",
      "defaultSize": "large",
      "minWidth": 4,
      "minHeight": 3,
      "maxWidth": 12,
      "maxHeight": 8,
      "resizable": true,
      "movable": true,
      "defaultProps": {},
      "availableForRoles": ["student"],
      "requiresPermissions": []
    }
  ],
  "userRole": "student"
}
```

---

## 🧠 AI & Context Management

AI-powered learning assistance and context management.

### Development Endpoints

These endpoints are available in development mode for testing AI functionality.

#### POST `/api/v1/ai/test`
🔒 **Development Only**

Test AI response generation.

**Request Body:**
```json
{
  "prompt": "Help me understand quadratic equations",
  "options": {
    "temperature": 0.7,
    "maxTokens": 500,
    "context": "mathematics tutoring"
  }
}
```

#### GET `/api/v1/ai/health`
🔒 **Development Only**

Check AI service health and availability.

#### POST `/api/v1/context/test-store`
🔒 **Development Only**

Store test learning context for AI scaffolding.

**Request Body:**
```json
{
  "studentId": "student-123",
  "content": "Student solved quadratic equation correctly",
  "contextType": "SCAFFOLDING_INTERACTION",
  "subject": "mathematics",
  "difficulty": "medium"
}
```

---

## ⚡ Rate Limiting

To ensure fair usage and system stability, the API implements rate limiting on sensitive endpoints.

### Rate Limits by Endpoint Group

| Endpoint Group | Window | Limit | Scope |
|---------------|---------|-------|-------|
| Authentication | 15 minutes | 10 requests | Per IP |
| Registration | 1 hour | 5 requests | Per IP |
| Dashboard API | 1 minute | 60 requests | Per user |
| Customization | 1 minute | 30 requests | Per user |

### Rate Limit Headers

All responses include rate limiting information:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1642253400
```

### Rate Limit Exceeded Response

**Status:** 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 300
}
```

---

## ❌ Error Handling

The API uses standard HTTP status codes and provides detailed error information.

### Standard Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "details": "Additional error context (optional)",
  "code": "ERROR_CODE (optional)",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid JSON, missing required fields |
| 401 | Unauthorized | Missing/invalid access token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Validation Errors

```json
{
  "error": "Validation error",
  "message": "Password must be at least 8 characters long",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters long",
      "code": "string.min"
    }
  ]
}
```

---

## 🎯 Interactive Examples

### Complete Authentication Flow

```bash
#!/bin/bash
# Mentra API Authentication Example

BASE_URL="http://localhost:3001"

echo "🚀 Mentra API Example Flow"
echo "=========================="

# 1. Check API Health
echo "1. Checking API health..."
curl -s "$BASE_URL/health" | jq .

# 2. Register a new student
echo -e "\n2. Registering new student..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo-student@mentra.test",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "role": "student",
    "firstName": "Demo",
    "lastName": "Student",
    "gradeLevel": 10,
    "learningStyle": "visual"
  }')

echo $REGISTER_RESPONSE | jq .

# 3. Login to get tokens
echo -e "\n3. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo-student@mentra.test",
    "password": "SecurePass123!"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r .accessToken)
echo "Access Token: ${ACCESS_TOKEN:0:50}..."

# 4. Get user profile
echo -e "\n4. Getting user profile..."
curl -s -X GET "$BASE_URL/api/v1/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# 5. Get dashboard overview
echo -e "\n5. Getting dashboard overview..."
curl -s -X GET "$BASE_URL/api/dashboard/student/overview" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# 6. Get dashboard layout
echo -e "\n6. Getting dashboard customization layout..."
curl -s -X GET "$BASE_URL/api/dashboard-customization/layout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# 7. Get available widget templates
echo -e "\n7. Getting widget templates..."
curl -s -X GET "$BASE_URL/api/dashboard-customization/widget-templates" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\n✅ Example flow completed!"
```

### JavaScript SDK Example

```javascript
// Mentra API JavaScript SDK Example
class MentraAPI {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.accessToken = null;
  }

  async register(userData) {
    const response = await fetch(`${this.baseURL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include' // Include cookies for refresh token
    });
    
    const data = await response.json();
    if (data.accessToken) {
      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
    }
    return data;
  }

  async apiCall(endpoint, options = {}) {
    const token = this.accessToken || localStorage.getItem('accessToken');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      },
      credentials: 'include'
    });

    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the original request
        return this.apiCall(endpoint, options);
      }
      throw new Error('Authentication failed');
    }

    return response.json();
  }

  async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.accessToken) {
        this.accessToken = data.accessToken;
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }

  // Dashboard methods
  async getDashboardOverview() {
    return this.apiCall('/api/dashboard/student/overview');
  }

  async getCustomizationLayout() {
    return this.apiCall('/api/dashboard-customization/layout');
  }

  async updateTheme(themeData) {
    return this.apiCall('/api/dashboard-customization/theme', {
      method: 'PUT',
      body: JSON.stringify(themeData)
    });
  }
}

// Usage example
(async () => {
  const api = new MentraAPI();
  
  try {
    // Login
    const loginResult = await api.login('demo-student@mentra.test', 'SecurePass123!');
    console.log('Login successful:', loginResult);
    
    // Get dashboard data
    const overview = await api.getDashboardOverview();
    console.log('Dashboard overview:', overview);
    
    // Update theme
    const themeUpdate = await api.updateTheme({
      themeName: 'dark',
      primaryColor: '#4f46e5'
    });
    console.log('Theme updated:', themeUpdate);
    
  } catch (error) {
    console.error('API Error:', error);
  }
})();
```

### Python SDK Example

```python
import requests
import json
from typing import Optional, Dict, Any

class MentraAPI:
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token: Optional[str] = None
    
    def register(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new user."""
        response = self.session.post(
            f"{self.base_url}/api/v1/auth/register",
            json=user_data
        )
        return response.json()
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login and store access token."""
        response = self.session.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"email": email, "password": password}
        )
        data = response.json()
        
        if "accessToken" in data:
            self.access_token = data["accessToken"]
            self.session.headers.update({
                "Authorization": f"Bearer {self.access_token}"
            })
        
        return data
    
    def api_call(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make authenticated API call with automatic token refresh."""
        response = self.session.request(
            method=method,
            url=f"{self.base_url}{endpoint}",
            json=data
        )
        
        if response.status_code == 401:
            # Try to refresh token
            if self.refresh_token():
                # Retry the request
                response = self.session.request(
                    method=method,
                    url=f"{self.base_url}{endpoint}",
                    json=data
                )
            else:
                raise Exception("Authentication failed")
        
        return response.json()
    
    def refresh_token(self) -> bool:
        """Refresh access token using refresh token from cookies."""
        try:
            response = self.session.post(f"{self.base_url}/api/v1/auth/refresh")
            data = response.json()
            
            if "accessToken" in data:
                self.access_token = data["accessToken"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                return True
        except Exception as e:
            print(f"Token refresh failed: {e}")
        
        return False
    
    def get_dashboard_overview(self) -> Dict[str, Any]:
        """Get student dashboard overview."""
        return self.api_call("/api/dashboard/student/overview")
    
    def get_customization_layout(self) -> Dict[str, Any]:
        """Get dashboard customization layout."""
        return self.api_call("/api/dashboard-customization/layout")
    
    def update_theme(self, theme_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update dashboard theme."""
        return self.api_call("/api/dashboard-customization/theme", "PUT", theme_data)

# Usage example
if __name__ == "__main__":
    api = MentraAPI()
    
    try:
        # Login
        login_result = api.login("demo-student@mentra.test", "SecurePass123!")
        print("Login successful:", login_result)
        
        # Get dashboard overview
        overview = api.get_dashboard_overview()
        print("Dashboard overview:", overview)
        
        # Update theme
        theme_update = api.update_theme({
            "themeName": "dark",
            "primaryColor": "#4f46e5"
        })
        print("Theme updated:", theme_update)
        
    except Exception as e:
        print(f"API Error: {e}")
```

---

## 📚 Additional Resources

- **Postman Collection:** [Download Mentra API Collection](postman/mentra-api-collection.json)
- **OpenAPI Specification:** [View API Spec](openapi/mentra-api-v1.yaml)
- **SDK Downloads:** 
  - [JavaScript SDK](sdk/mentra-js-sdk.js)
  - [Python SDK](sdk/mentra-python-sdk.py)
  - [TypeScript Definitions](sdk/mentra-types.d.ts)

### Testing with Postman

1. Import the provided Postman collection
2. Set environment variables:
   - `baseUrl`: `http://localhost:3001`
   - `accessToken`: Will be set automatically after login
3. Run the "Authentication Flow" folder to get started
4. Use individual requests or run the full test suite

### Environment Variables for Testing

```bash
# Set these in your testing environment
export MENTRA_API_BASE_URL="http://localhost:3001"
export MENTRA_TEST_EMAIL="test-student@mentra.test"
export MENTRA_TEST_PASSWORD="SecurePass123!"
```

---

**📞 Support**

For API support, please contact the development team or file an issue in the project repository.

**🔄 API Versioning**

This documentation covers API version 1.0.0. Breaking changes will result in new major versions.

**Last Updated:** January 15, 2024 