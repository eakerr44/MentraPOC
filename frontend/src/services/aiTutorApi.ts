import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // Longer timeout for AI responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Get token from Zustand persistence
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    subject?: string;
    difficulty?: string;
    scaffoldingType?: string;
    emotionalState?: string;
  };
}

export interface TutorSession {
  id: string;
  student_id: string;
  subject?: string;
  topic?: string;
  started_at: string;
  last_activity: string;
  status: 'active' | 'completed' | 'paused';
  messages: ChatMessage[];
  context: {
    learningGoals?: string[];
    currentConcepts?: string[];
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    emotionalState?: string;
  };
}

export interface TutorResponse {
  message: ChatMessage;
  scaffoldingInfo?: {
    technique: 'socratic' | 'guided' | 'supportive' | 'challenging';
    reasoning: string;
    nextSteps: string[];
  };
  conceptsDetected?: string[];
  suggestedResources?: Array<{
    type: 'video' | 'practice' | 'reading';
    title: string;
    description: string;
    url?: string;
  }>;
}

export interface StartSessionRequest {
  subject?: string;
  topic?: string;
  initialQuestion?: string;
  context?: {
    emotionalState?: string;
    difficultyPreference?: string;
    learningGoals?: string[];
  };
}

export class AITutorApiService {
  // Start a new tutoring session
  static async startSession(request: StartSessionRequest = {}): Promise<{ session: TutorSession }> {
    try {
      const response = await api.post('/ai-tutor/sessions', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to start tutoring session');
    }
  }

  // Get current tutoring sessions
  static async getSessions(): Promise<{ sessions: TutorSession[] }> {
    try {
      const response = await api.get('/ai-tutor/sessions');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load tutoring sessions');
    }
  }

  // Get a specific tutoring session
  static async getSession(sessionId: string): Promise<{ session: TutorSession }> {
    try {
      const response = await api.get(`/ai-tutor/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load tutoring session');
    }
  }

  // Send a message in a tutoring session
  static async sendMessage(
    sessionId: string, 
    message: string,
    context?: {
      emotionalState?: string;
      subject?: string;
      isFollowUp?: boolean;
    }
  ): Promise<TutorResponse> {
    try {
      const response = await api.post(`/ai-tutor/sessions/${sessionId}/message`, {
        message,
        context
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  }

  // Get AI tutoring help for a general question (without session)
  static async getQuickHelp(
    question: string,
    context?: {
      subject?: string;
      gradeLevel?: string;
      emotionalState?: string;
    }
  ): Promise<TutorResponse> {
    try {
      const response = await api.post('/ai-tutor/quick-help', {
        question,
        context
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get tutoring help');
    }
  }

  // End a tutoring session
  static async endSession(
    sessionId: string,
    feedback?: {
      helpfulness: number; // 1-5 scale
      concepts_understood: string[];
      needs_more_help: string[];
      emotional_outcome: string;
    }
  ): Promise<{ session: TutorSession }> {
    try {
      const response = await api.post(`/ai-tutor/sessions/${sessionId}/end`, { feedback });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to end tutoring session');
    }
  }

  // Get suggested questions/prompts for a subject
  static async getSuggestedQuestions(subject?: string): Promise<{ questions: string[] }> {
    try {
      const response = await api.get('/ai-tutor/suggested-questions', {
        params: { subject }
      });
      return response.data;
    } catch (error: any) {
      console.warn('Failed to load suggested questions:', error.message);
      return { questions: [] }; // Non-critical failure
    }
  }

  // Report an issue with AI response (safety/inappropriateness)
  static async reportIssue(
    sessionId: string,
    messageId: string,
    issueType: 'inappropriate' | 'unhelpful' | 'incorrect' | 'other',
    description: string
  ): Promise<void> {
    try {
      await api.post('/ai-tutor/report-issue', {
        sessionId,
        messageId,
        issueType,
        description
      });
    } catch (error: any) {
      console.error('Failed to report issue:', error.message);
      // Don't throw - this should be a silent operation
    }
  }
}

export default AITutorApiService; 