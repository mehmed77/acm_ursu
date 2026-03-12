import api from './axios';

export const getNews = () => api.get('/news/');
export const getNewsDetail = (id) => api.get(`/news/${id}/`);
export const getNewsComments = (id) => api.get(`/news/${id}/comments/`);
export const postComment = (newsId, data) => api.post(`/news/${newsId}/comments/`, data);
