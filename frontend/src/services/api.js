import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const auth = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
};

export const products = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getTrending: () => api.get('/products/trending'),
};

export const search = {
  search: (prompt) => api.post('/search', { prompt }),
  getHistory: (params) => api.get('/search/history', { params }),
  deleteHistory: (id) => api.delete(`/search/history/${id}`),
};

export const wishlist = {
  getAll: () => api.get('/wishlist'),
  add: (productId) => api.post('/wishlist', { productId }),
  remove: (id) => api.delete(`/wishlist/${id}`),
};

export const compare = {
  getAll: () => api.get('/compare'),
  create: (data) => api.post('/compare', data),
  delete: (id) => api.delete(`/compare/${id}`),
};

export const buyAnalysis = {
  analyze: (productName) => api.post('/products/analyze', { productName }),
};

export const analyzeUrl = {
  analyze: (url, prompt) => api.post('/analyze', { url, prompt }),
  getJob: (jobId) => api.get(`/analyze/${jobId}`),
};

export const amazon = {
  search: (q, page = 1) => api.get('/amazon/search', { params: { q, page } }),
  get: (asin) => api.get(`/amazon/${asin}`),
  sync: (queries) => api.post('/amazon/sync', { queries }),
};

export const decision = {
  getFull: (productId, prompt) => api.post('/decision/full', { productId, prompt }),
  getSuitability: (productId, prompt) => api.post(`/decision/suitability/${productId}`, { prompt }),
  getPriceFairness: (productId) => api.get(`/decision/price-fairness/${productId}`),
  getBuyDecision: (productId) => api.get(`/decision/buy-decision/${productId}`),
  getMatchScore: (productId, prompt) => api.post(`/decision/match-score/${productId}`, { prompt }),
  getWhyNotBuy: (productId) => api.get(`/decision/why-not-buy/${productId}`),
  getFollowUp: (prompt) => api.post('/decision/follow-up', { prompt }),
  getBundle: (context) => api.post('/decision/bundle', { context }),
  getPredictions: () => api.get('/decision/predictions'),
  getPersona: () => api.get('/decision/persona'),
  getMemory: () => api.get('/decision/memory'),
  updateMemory: (data) => api.patch('/decision/memory', data),
  trackEvent: (eventType, data) => api.post('/decision/track-event', { eventType, data }),
  trackClick: () => api.post('/decision/track-click'),
};

export const reviews = {
  analyze: (productId, ai) => api.get(`/reviews/analyze/${productId}`, { params: { ai } }),
};

export const dashboard = {
  get: () => api.get('/dashboard'),
};

export const admin = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  updatePrices: (updates) => api.post('/admin/prices', { updates }),
  promoteUser: (userId) => api.post(`/admin/promote/${userId}`),
  demoteUser: (userId) => api.post(`/admin/demote/${userId}`),
};

export const chat = {
  create: (data) => api.post('/chat', data),
  getSession: (sessionId) => api.get(`/chat/${sessionId}`),
  sendMessage: (sessionId, data) => api.post(`/chat/${sessionId}/message`, data),
};

export const marketplace = {
  compare: (data) => api.post('/marketplace/compare', data),
};

export const research = {
  run: (data) => api.post('/research', data),
  analyze: (data) => api.post('/research/analyze', data),
  getProblems: (data) => api.post('/research/problems', data),
  getAlternatives: (data) => api.post('/research/alternatives', data),
};

export const visitors = {
  getStats: () => api.get('/visitors/stats'),
  getTimeline: (days) => api.get('/visitors/timeline', { params: { days } }),
  getPages: (days) => api.get('/visitors/pages', { params: { days } }),
  getReferrers: (days) => api.get('/visitors/referrers', { params: { days } }),
  getDevices: (days) => api.get('/visitors/devices', { params: { days } }),
  getRecent: (limit) => api.get('/visitors/recent', { params: { limit } }),
  getHourly: (days) => api.get('/visitors/hourly', { params: { days } }),
};

export default api;
