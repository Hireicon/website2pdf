import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 90000, // 90s — PDF rendering can take a while
  headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — try refresh, retry once
let isRefreshing = false
let queue = []

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    if (err.response?.status === 401 &&
        err.response?.data?.code === 'TOKEN_EXPIRED' &&
        !original._retry) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      isRefreshing = true
      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState()
        if (!refreshToken) { logout(); return Promise.reject(err) }

        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken })
        setTokens(data.accessToken, data.refreshToken)

        queue.forEach(({ resolve }) => resolve(data.accessToken))
        queue = []
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        queue.forEach(({ reject }) => reject(err))
        queue = []
        useAuthStore.getState().logout()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default api
