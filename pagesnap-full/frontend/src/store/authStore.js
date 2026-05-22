import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

      isLoggedIn: () => !!get().accessToken,
    }),
    {
      name: 'pagesnap-auth',
      partialize: (s) => ({
        user:         s.user,
        accessToken:  s.accessToken,
        refreshToken: s.refreshToken,
      }),
    }
  )
)
