import axios, { AxiosError, AxiosHeaders, type AxiosInstance } from 'axios';

type TokenProvider = () => string | undefined;

let tokenProvider: TokenProvider = () => undefined;

export const setAuthTokenProvider = (provider: TokenProvider) => {
  tokenProvider = provider;
};

export const clearAuthTokenProvider = () => {
  tokenProvider = () => undefined;
};

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'https://curionnextpms-backend.onrender.com/api';

const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = tokenProvider();

  if (token) {
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

type EnvelopeSuccess<T> = {
  success: true;
  data?: T;
  meta?: Record<string, unknown>;
};

type EnvelopeError = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
    details?: unknown;
  };
};

type Envelope<T> = EnvelopeSuccess<T> | EnvelopeError;

api.interceptors.response.use(
  (response) => {
    const payload = response.data as Envelope<unknown> | undefined;

    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (payload.success) {
        response.data = payload.data ?? {};
        if (payload.meta) {
          (response as unknown as { meta?: Record<string, unknown> }).meta = payload.meta;
        }
        return response;
      }

      const error = new AxiosError(payload.error?.message ?? 'Request failed', undefined, response.config, response.request, response);
      (error as unknown as { details?: unknown }).details = payload.error?.details;
      return Promise.reject(error);
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      clearAuthTokenProvider();
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.data && typeof error.response.data === 'object' && 'error' in error.response.data) {
      const apiError = error.response.data as EnvelopeError;
      if (apiError.error?.message) {
        error.message = apiError.error.message;
      }
      (error as unknown as { details?: unknown }).details = apiError.error?.details;
    }
    return Promise.reject(error);
  }
);

export default api;
export { api as apiClient };
