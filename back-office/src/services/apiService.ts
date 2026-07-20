import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'https://elikia.mova-mobility.com/api'

export const apiService = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
  },
})

export class ApiError extends Error {
  readonly status: number | undefined
  readonly errors: Record<string, string[]> | undefined

  constructor(message: string, status: number | undefined, errors: Record<string, string[]> | undefined) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

let authToken: string | null = null

export function setApiAuthToken(token: string | null) {
  authToken = token
}

apiService.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.'
    return Promise.reject(new ApiError(message, error.response?.status, error.response?.data?.errors))
  },
)
