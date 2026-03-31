const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { upload } = require('../services/cloudinaryService');

// Upload multiple PDFs
router.post('/upload', upload.array('pdfs', 10), documentController.uploadDocuments);

// List all documents
router.get('/', documentController.getDocuments);

// Get single document
router.get('/:id', documentController.getDocument);

// Proxy PDF file from Cloudinary (avoids 401/CORS on raw URLs)
router.get('/:id/pdf-proxy', documentController.proxyPdf);

// Merge/Reorder action
router.post('/:id/reorder', documentController.reorderDocument);

// Create or update index
router.post('/:id/index', documentController.updateIndex);

// Create or update bookmarks
router.post('/:id/bookmarks', documentController.updateBookmarks);

// Generate final PDF
router.post('/:id/generate', documentController.generateDocument);

module.exports = router;
