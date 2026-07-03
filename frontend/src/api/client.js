import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const getUploadSignature = async () => {
  const response = await api.get('/documents/upload-signature');
  return response.data;
};

export const uploadToCloudinaryDirectly = async (file, signatureData, onProgress) => {
  const { signature, timestamp, cloud_name, api_key, folder } = signatureData;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', timestamp);
  formData.append('api_key', api_key);
  formData.append('folder', folder);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloud_name}/raw/upload`,
    formData,
    {
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
      // Cloudinary's raw upload endpoint can handle large files, 
      // but for 2GB+ it usually requires chunked upload.
      // For now, we use the signed direct upload which is much more robust than through Node.
    }
  );

  return {
    originalName: file.name,
    cloudinaryUrl: response.data.secure_url,
    cloudinaryPublicId: response.data.public_id,
    mimeType: file.type || 'application/pdf',
    size: file.size,
  };
};

export const uploadDocuments = async (files, title, onProgress) => {
  try {
    // 1. Get Signature
    const signatureData = await getUploadSignature();
    
    // 2. Upload each file directly to Cloudinary
    const filesMetadata = [];
    for (let i = 0; i < files.length; i++) {
        const metadata = await uploadToCloudinaryDirectly(files[i], signatureData, (progress) => {
            if (onProgress) onProgress(i, progress);
        });
        filesMetadata.push(metadata);
    }

    // 3. Send metadata to backend to create Document record
    const response = await api.post('/documents/upload', {
        title,
        filesMetadata
    });
    return response.data;
  } catch (error) {
    console.error('Unified Upload Error:', error);
    throw error;
  }
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
