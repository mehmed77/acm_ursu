import api from './axios';

export const getProblems = (params) => api.get('/problems/', { params });
export const getProblem = (slug) => api.get(`/problems/${slug}/`);
export const getProblemSubmissions = (slug) => api.get(`/problems/${slug}/submissions/`);

// ── Discussion API ──────────────────────────────────
export const getComments = (slug) =>
    api.get(`/problems/${slug}/comments/`);

export const postComment = (slug, data) =>
    api.post(`/problems/${slug}/comments/`, data);

export const deleteComment = (id) =>
    api.delete(`/problems/comments/${id}/`);

export const likeComment = (id) =>
    api.post(`/problems/comments/${id}/like/`);

// ── Rating API ──────────────────────────────────────
export const getRating = (slug) =>
    api.get(`/problems/${slug}/rating/`);

export const postRating = (slug, rating) =>
    api.post(`/problems/${slug}/rating/`, { rating });
