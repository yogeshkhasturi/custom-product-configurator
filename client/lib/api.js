import axios from 'axios';

const getApiBase = () => {
  if (typeof window !== 'undefined') return '/api';
  return process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://127.0.0.1:5000/api';
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBase();
  return config;
});

export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  calculatePrice: (id, data) => api.post(`/products/${id}/calculate-price`, data),
  resolveConfiguration: (id, data) => api.post(`/products/${id}/configuration`, data),
};

export const uploadApi = {
  upload: (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return api.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (url) => api.delete('/upload', { data: { url } }),
};

export default api;
