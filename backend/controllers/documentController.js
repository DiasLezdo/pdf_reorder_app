const Document = require('../models/Document');
const pdfService = require('../services/pdfService');
const axios = require('axios');
const { cloudinary } = require('../services/cloudinaryService');

exports.uploadDocuments = async (req, res) => {
  try {
    console.log('--- Upload Started ---');
    console.log('Body:', req.body);
    
    const { title, filesMetadata } = req.body;
    
    let parsedFilesMetadata = [];
    if (filesMetadata) {
      parsedFilesMetadata = typeof filesMetadata === 'string' ? JSON.parse(filesMetadata) : filesMetadata;
    }

    let filesData = [];
    if (parsedFilesMetadata && parsedFilesMetadata.length > 0) {
      console.log('Using pre-uploaded files metadata:', parsedFilesMetadata.length);
      filesData = parsedFilesMetadata;
    } else if (req.files && req.files.length > 0) {
      console.log('Using files from multer:', req.files.length);
      filesData = req.files.map(file => ({
        originalName: file.originalname,
        cloudinaryUrl: file.path,
        cloudinaryPublicId: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      }));
    } else {
      console.error('Upload Error: No files provided');
      return res.status(400).json({ error: 'No files provided' });
    }

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

exports.getUploadSignature = async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: 'pdf_editor',
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      folder: 'pdf_editor'
    });
  } catch (error) {
    console.error('Signature Error:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
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
