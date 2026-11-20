import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.elikiafund.com/api';

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
    /** Stable machine-readable code some API errors carry (e.g. `identity_verification_required`). */
    public readonly code?: string,
    /** Raw response body, for errors that carry extra fields alongside `code`. */
    public readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

let activeCompanyId: number | null = null;

/** No fallback on purpose — an unset header on a company-scoped call should surface the API's
 * loud 400 (see ResolveActiveCompany), not get silently masked by guessing a company. */
export function setApiActiveCompanyId(id: number | null) {
  activeCompanyId = id;
}

apiService.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  if (activeCompanyId !== null) {
    config.headers['X-Company-Id'] = String(activeCompanyId);
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
    const data = error.response?.data;
    return Promise.reject(
      new ApiError(message, error.response?.status, data?.errors, typeof data?.code === 'string' ? data.code : undefined, data),
    );
  },
);

/**
 * A Yabeto Connect company tried to move money before its identity was verified. Returns the
 * company that needs verifying, or null for any other error.
 */
export function identityVerificationCompanyId(e: unknown): number | null {
  if (!(e instanceof ApiError) || e.code !== 'identity_verification_required') {
    return null;
  }

  const companyId = Number(e.data?.company_id);
  return Number.isFinite(companyId) ? companyId : null;
}
