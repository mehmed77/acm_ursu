import api from './axios';

export const contestsApi = {
    getList: (params) => api.get('/contests/', { params }),
    getDetail: (slug) => api.get(`/contests/${slug}/`),
    register: (slug, data) => api.post(`/contests/${slug}/register/`, data),
    getScoreboard: (slug) => api.get(`/contests/${slug}/scoreboard/`),
    getRating: (slug) => api.get(`/contests/${slug}/rating/`),
    getMySubmissions: (slug) => api.get(`/contests/${slug}/my-submissions/`),
    submit: (slug, label, data) => api.post(`/contests/${slug}/submit/${label}/`, data),
    createTeam: (slug, data) => api.post(`/contests/${slug}/teams/`, data),
    joinTeam: (slug, data) => api.post(`/contests/${slug}/teams/join/`, data),
};
