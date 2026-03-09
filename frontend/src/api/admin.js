import api from './axios';

export const adminApi = {
    // Problem endpoints
    getProblems: () => api.get('/admin/problems/'),
    getProblem: (slug) => api.get(`/admin/problems/${slug}/`),
    createProblem: (data) => api.post('/admin/problems/', data),
    updateProblem: (slug, data) => api.patch(`/admin/problems/${slug}/`, data),
    deleteProblem: (slug) => api.delete(`/admin/problems/${slug}/`),
    getDashboardStats: () => api.get('/admin/dashboard/'),

    // Tag endpoints
    getTags: () => api.get('/admin/tags/'),
    createTag: (data) => api.post('/admin/tags/', data),

    // Testcase endpoints
    getTestCases: (slug) => api.get(`/admin/problems/${slug}/testcases/`),
    addTestCase: (slug, data) => api.post(`/admin/problems/${slug}/testcases/`, data),
    updateTestCase: (id, data) => api.patch(`/admin/testcases/${id}/`, data),
    deleteTestCase: (id) => api.delete(`/admin/testcases/${id}/`),
    bulkImport: (slug, data) => api.post(`/admin/problems/${slug}/testcases/bulk/`, data),
    zipImport: (slug, formData) => api.post(`/admin/problems/${slug}/testcases/zip/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    // User endpoints
    getUsers: () => api.get('/admin/users/'),
    updateUser: (id, data) => api.patch(`/admin/users/${id}/`, data),

    // Contest endpoints
    getContests: () => api.get('/admin/contests/'),
    getContest: (slug) => api.get(`/admin/contests/${slug}/`),
    createContest: (data) => api.post('/admin/contests/', data),
    updateContest: (slug, data) => api.patch(`/admin/contests/${slug}/`, data),
    deleteContest: (slug) => api.delete(`/admin/contests/${slug}/`),
};
