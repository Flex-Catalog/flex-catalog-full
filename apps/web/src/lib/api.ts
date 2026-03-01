import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token and locale to requests
    this.client.interceptors.request.use((config) => {
      const token = Cookies.get('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Send current locale so backend selects the correct currency/price
      if (typeof window !== 'undefined') {
        const locale = window.location.pathname.split('/')[1];
        if (locale && ['pt', 'en', 'es'].includes(locale)) {
          config.headers['X-Locale'] = locale;
        }
      }
      return config;
    });

    // Unwrap API response wrapper { success: true, data: ... }
    this.client.interceptors.response.use(
      (response) => {
        if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
          response.data = response.data.data;
        }
        return response;
      },
    );

    // Handle token refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = Cookies.get('refreshToken');
            if (refreshToken) {
              const response = await axios.post(
                `${API_URL}/auth/refresh`,
                {},
                { withCredentials: true },
              );
              // Raw axios call (not through our client), so unwrap manually
              const refreshData = response.data.data || response.data;
              const { accessToken } = refreshData;
              Cookies.set('accessToken', accessToken);
              if (refreshData.refreshToken) {
                Cookies.set('refreshToken', refreshData.refreshToken);
              }
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  get instance() {
    return this.client;
  }
}

export const api = new ApiClient().instance;
