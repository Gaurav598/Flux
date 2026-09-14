import axios from 'axios';

const api = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
