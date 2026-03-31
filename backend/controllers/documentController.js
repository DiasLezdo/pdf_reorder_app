const Document = require('../models/Document');
const pdfService = require('../services/pdfService');
const axios = require('axios');
const { cloudinary } = require('../services/cloudinaryService');

exports.uploadDocuments = async (req, res) => {
  try {
    console.log('--- Upload Started ---');
    console.log('Body:', req.body);
    console.log('Files received:', req.files?.length || 0);

    const { title } = req.body;
    
    if (!req.files || req.files.length === 0) {
      console.error('Upload Error: No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const filesData = req.files.map(file => ({
      originalName: file.originalname,
      cloudinaryUrl: file.path,
      cloudinaryPublicId: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    }));

    // For simplicity, store just one unified sequence of pages initially 
    // Usually, you'd extract total pages per file using pdf-lib here or on client side.
    const pages = [];
    for (let i = 0; i < filesData.length; i++) {
        const pageCount = await pdfService.getPageCount(filesData[i].cloudinaryPublicId);
        for(let j=1; j<=pageCount; j++) {
            pages.push({
                pageNumber: pages.length + 1,
                fileIndex: i,
                originalPageNumber: j
            });
        }
    }

    const doc = new Document({
      title: title || 'Untitled Document',
      files: filesData,
      pages: pages,
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    console.error('Upload Error', error);
    res.status(500).json({ error: error.message || 'Failed to upload documents' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

exports.getDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

exports.reorderDocument = async (req, res) => {
  try {
    const { pages } = req.body; // New order of pages
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    doc.pages = pages;
    doc.updatedAt = Date.now();
    await doc.save();

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder' });
  }
};

exports.updateIndex = async (req, res) => {
  try {
    const { indexData } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    doc.indexData = indexData;
    doc.updatedAt = Date.now();
    
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update index' });
  }
};

exports.updateBookmarks = async (req, res) => {
  try {
    const { bookmarks } = req.body;
    console.log('--- Update Bookmarks ---');
    console.log('ID:', req.params.id);
    console.log('Bookmarks Count:', bookmarks?.length);
    
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      console.error('Document not found for ID:', req.params.id);
      return res.status(404).json({ error: 'Not found' });
    }

    doc.bookmarks = bookmarks;
    doc.updatedAt = Date.now();
    
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bookmarks' });
  }
};

exports.generateDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Generate final PDF using pdf-lib
    const finalPdfBuffer = await pdfService.mergeAndStampPdf(doc);
    
    // Ideally upload to cloudinary and save finalPdfUrl
    // For now, return directly as a download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.pdf"`);
    res.send(Buffer.from(finalPdfBuffer));
    
  } catch (error) {
    console.error('Generation Error', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
};

exports.proxyPdf = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const fileIndex = parseInt(req.query.fileIndex || '0', 10);
    const fileInfo = doc.files[fileIndex];
    if (!fileInfo || !fileInfo.cloudinaryPublicId) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate a signed URL using Cloudinary SDK
    const signedUrl = cloudinary.url(fileInfo.cloudinaryPublicId, {
      resource_type: 'raw',
      sign_url: true,
      type: 'upload',
      secure: true
    });

    console.log('Fetching signed URL:', signedUrl);

    // Fetch the PDF using the signed URL and stream it to the client
    const response = await axios.get(signedUrl, { responseType: 'stream' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    response.data.pipe(res);
  } catch (error) {
    console.error('PDF Proxy Error', error.message);
    res.status(500).json({ error: error.message || 'Failed to proxy PDF' });
  }
};
