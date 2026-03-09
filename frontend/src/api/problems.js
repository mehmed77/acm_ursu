import api from './axios';

export const getProblems = (params) => api.get('/problems/', { params });
export const getProblem = (slug) => api.get(`/problems/${slug}/`);
export const getProblemSubmissions = (slug) => api.get(`/problems/${slug}/submissions/`);
