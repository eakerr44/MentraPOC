import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  avatar?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (user: User, token?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  initializeDemoUser: () => void;
}

// Demo user for testing
const demoUser: User = {
  id: 'demo-user-1',
  email: 'demo@mentra.com',
  firstName: 'Demo',
  lastName: 'User',
  role: 'student',
  createdAt: new Date().toISOString()
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,

      login: async (user: User, token?: string) => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        set({
          user,
          isAuthenticated: true,
          token: token || `demo-token-${user.id}`
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          token: null
        });
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates }
          });
        }
      },

      initializeDemoUser: () => {
        const state = get();
        if (!state.isAuthenticated) {
          set({
            user: demoUser,
            isAuthenticated: true,
            token: `demo-token-${demoUser.id}`
          });
        }
      }
    }),
    {
      name: 'mentra-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token
      })
    }
  )
); 