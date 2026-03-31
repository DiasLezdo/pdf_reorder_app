import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const uploadDocuments = async (files, title) => {
  const formData = new FormData();
  formData.append('title', title);
  files.forEach(file => {
    formData.append('pdfs', file);
  });

  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getDocuments = async () => {
  const response = await api.get('/documents');
  return response.data;
};

export const getDocumentById = async (id) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

export const reorderDocument = async (id, pages) => {
  const response = await api.post(`/documents/${id}/reorder`, { pages });
  return response.data;
};

export const updateIndex = async (id, indexData) => {
  const response = await api.post(`/documents/${id}/index`, { indexData });
  return response.data;
};

export const updateBookmarks = async (id, bookmarks) => {
  const response = await api.post(`/documents/${id}/bookmarks`, { bookmarks });
  return response.data;
};

export const generateDocument = async (id) => {
  // Arraybuffer is required to download files correctly
  const response = await api.post(`/documents/${id}/generate`, {}, {
    responseType: 'blob'
  });
  return response.data;
};

export default api;
