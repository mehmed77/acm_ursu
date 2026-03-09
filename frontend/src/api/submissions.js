import api from './axios';

export const createSubmission = (data) => api.post('/submissions/', data);
export const getSubmission = (id) => api.get(`/submissions/${id}/`);

export const submissionApi = {
    getDetail: getSubmission,
    create: createSubmission,
};
