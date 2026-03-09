import api from './axios';

export const getLeaderboard = (params) => api.get('/leaderboard/', { params });
export const getUserProfile = (username) => api.get(`/users/${username}/`);
