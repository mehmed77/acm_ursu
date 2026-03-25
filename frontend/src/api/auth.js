import api from './axios';

export const login = (data) => api.post('/auth/login/', data);
export const register = (data) => api.post('/auth/register/', data);
export const logout = () => api.post('/auth/logout/', {});
export const refreshToken = () => api.post('/auth/token/refresh/', {});
export const getProfile = () => api.get('/auth/profile/');
export const updateProfile = (data) => api.put('/auth/profile/', data);

// HEMIS sync (login bo'lgandan keyin)
export const hemisSync = () => api.post('/auth/hemis/sync/');

// Telegram bog'lash — kirgan foydalanuvchi uchun link token olish
export const telegramLinkInit = () => api.post('/auth/telegram/link/');

// Parolni tiklash
export const passwordResetRequest = (data) => api.post('/auth/password-reset/request/', data);
export const passwordResetConfirm = (data) => api.post('/auth/password-reset/confirm/', data);
