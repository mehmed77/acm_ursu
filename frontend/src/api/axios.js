import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    // httpOnly cookie'lar avtomatik yuborilishi uchun
    withCredentials: true,
});

// Response interceptor — 401 da cookie refresh yoki logout
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Cookie'dagi refresh_token bilan yangi access_token olish
                // withCredentials: true bo'lgani uchun cookie avtomatik yuboriladi
                await axios.post('/api/auth/token/refresh/', {}, { withCredentials: true });
                // Yangi access_token cookie o'rnatildi — so'rovni qayta yuborish
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
