import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

import HomePage    from './pages/HomePage'
import SharePage   from './pages/SharePage'
import DashboardPage from './pages/DashboardPage'
import LoginPage   from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
})

function PrivateRoute({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn())
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Outfit, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#2d6a4f', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/share/:shareId" element={<SharePage />} />
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/register"  element={<RegisterPage />} />
          <Route path="/dashboard" element={
            <PrivateRoute><DashboardPage /></PrivateRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
