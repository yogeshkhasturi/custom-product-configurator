import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
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
    return axios.post(`${BASE}/upload`, form);
  },
  remove: (url) => axios.delete(`${BASE}/upload`, { data: { url } }),
};

export default api;
