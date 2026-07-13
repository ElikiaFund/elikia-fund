import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export const apiService = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
  },
});

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | undefined,
    public readonly errors: Record<string, string[]> | undefined,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

apiService.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__ && !error.response) {
      // No response at all reached us — almost always a reachability issue (wrong
      // EXPO_PUBLIC_API_URL, e.g. "localhost" from a physical device, or the API isn't
      // running/reachable on the network), not something the API itself rejected.
      console.warn(`[apiService] Network request failed: ${error.message} (baseURL: ${API_URL})`);
    }

    const message = error.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
    return Promise.reject(new ApiError(message, error.response?.status, error.response?.data?.errors));
  },
);
