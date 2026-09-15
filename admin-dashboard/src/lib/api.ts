import axios from 'axios';

// In dev, Vite proxy forwards /api → backend. In production, set VITE_API_URL env var.
const BASE_URL = (import.meta.env.VITE_API_URL as string) || '';

const api = axios.create({
  baseURL: `${BASE_URL}/api/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth axios instance — no /admin prefix, for /api/auth/admin/login
const authApi = axios.create({
  baseURL: `${BASE_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT to every admin request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401/403 → clear token and send to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUserId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const loginAdmin = async (username: string, password: string): Promise<string> => {
  const response = await authApi.post('/admin/login', { username, password });
  const token: string = response.data.accessToken;
  const userId: string = String(response.data.userId);
  localStorage.setItem('adminToken', token);
  localStorage.setItem('adminUserId', userId);
  return token;
};

export const logoutAdmin = (): void => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUserId');
  window.location.href = '/login';
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('adminToken');
};

export const adminApi = {
  // Analytics
  getAnalytics: () => api.get('/analytics'),

  // Riders
  getRiders: (params?: { status?: string; search?: string; location?: string }) =>
    api.get('/riders', { params }),
  getRider: (id: number) => api.get(`/riders/${id}`),
  approveRider: (id: number) => api.post(`/riders/${id}/approve`),
  rejectRider: (id: number, reason: string) =>
    api.post(`/riders/${id}/reject`, null, { params: { reason } }),
  suspendRider: (id: number, reason: string) =>
    api.post(`/riders/${id}/suspend`, null, { params: { reason } }),
  activateRider: (id: number) => api.post(`/riders/${id}/activate`),

  // Bookings
  getBookings: (params?: { status?: string; startDate?: string; endDate?: string; search?: string }) =>
    api.get('/bookings', { params }),
  getBooking: (id: number) => api.get(`/bookings/${id}`),

  // Users
  getUsers: (params?: { search?: string }) => api.get('/users', { params }),
  getUser: (id: number) => api.get(`/users/${id}`),
};

export default api;
