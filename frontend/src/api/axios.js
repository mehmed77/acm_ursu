import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// Auth endpoint'lari uchun 401 interceptor ishlamasligi kerak
const AUTH_ENDPOINTS = ['/auth/login/', '/auth/register/', '/auth/token/refresh/', '/auth/logout/'];
const isAuthEndpoint = (url = '') => AUTH_ENDPOINTS.some(e => url.includes(e));

// Response interceptor — 401 da cookie refresh yoki logout
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Login/register/refresh endpoint'larida 401 bo'lsa — interceptor aralashmaydi
        // (noto'g'ri parol xatolari login sahifasida ko'rsatiladi)
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isAuthEndpoint(originalRequest.url)
        ) {
            originalRequest._retry = true;

            try {
                await axios.post('/api/auth/token/refresh/', {}, { withCredentials: true });
                return api(originalRequest);
            } catch {
                useAuthStore.getState().logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
