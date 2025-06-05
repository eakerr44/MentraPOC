import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Get token from Zustand persistence (same location as dashboardApi)
  let token = null;
  try {
    const persistedState = localStorage.getItem('mentra-auth-storage');
    if (persistedState) {
      const authState = JSON.parse(persistedState);
      token = authState.state?.token;
    }
  } catch (error) {
    console.warn('Failed to get auth token from persistence:', error);
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface ProblemTemplate {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  estimated_time_minutes: number;
  skills_addressed: string[];
  prerequisites: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProblemSession {
  id: string;
  template_id: string;
  student_id: string;
  status: 'active' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  time_spent?: number;
  current_step: number;
  total_steps: number;
  progress_percentage: number;
  performance_rating?: string;
  final_score?: number;
  hints_used: number;
  mistakes_made: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export class ProblemsApiService {
  // Get all problem templates
  static async getTemplates(): Promise<{ templates: ProblemTemplate[] }> {
    try {
      const response = await api.get('/problems/templates');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load problem templates');
    }
  }

  // Get a specific problem template
  static async getTemplate(templateId: string): Promise<{ template: ProblemTemplate }> {
    try {
      const response = await api.get(`/problems/templates/${templateId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load problem template');
    }
  }

  // Start a new problem session
  static async startSession(templateId: string): Promise<{ session: ProblemSession }> {
    try {
      const response = await api.post('/problems/sessions', { templateId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to start problem session');
    }
  }

  // Get current problem sessions
  static async getSessions(): Promise<{ sessions: ProblemSession[] }> {
    try {
      const response = await api.get('/problems/sessions');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load problem sessions');
    }
  }

  // Get a specific problem session
  static async getSession(sessionId: string): Promise<{ session: ProblemSession }> {
    try {
      const response = await api.get(`/problems/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load problem session');
    }
  }

  // Update a problem session
  static async updateSession(sessionId: string, updates: any): Promise<{ session: ProblemSession }> {
    try {
      const response = await api.put(`/problems/sessions/${sessionId}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update problem session');
    }
  }

  // Complete a problem session
  static async completeSession(sessionId: string, finalData: any): Promise<{ session: ProblemSession }> {
    try {
      const response = await api.post(`/problems/sessions/${sessionId}/complete`, finalData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to complete problem session');
    }
  }
}

export default ProblemsApiService; 