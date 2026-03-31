const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  files: [{
    originalName: String,
    cloudinaryUrl: String,
    cloudinaryPublicId: String,
    mimeType: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now,
    }
  }],
  pages: [{
    pageNumber: Number,
    fileIndex: Number, // Reference to which file in the `files` array it came from
    originalPageNumber: Number,
    cloudinaryUrl: String // Url to thumbnail or full page image (optional, for UI rendering if not using pdf.js frontend rendering entirely)
  }],
  indexData: [{
    sectionTitle: String,
    targetPageNumber: Number,
  }],
  bookmarks: [{
    sectionTitle: String,
    targetPageNumber: Number,
  }],
  finalPdfUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Document', documentSchema);
