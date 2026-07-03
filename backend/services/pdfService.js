const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const { cloudinary } = require('./cloudinaryService');
const muhammaraService = require('./muhammaraService');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function downloadToTemp(publicId) {
  const signedUrl = cloudinary.url(publicId, {
    resource_type: 'raw',
    sign_url: true,
    type: 'upload',
    secure: true
  });

  const tempPath = path.join(os.tmpdir(), `pdf_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
  const response = await axios.get(signedUrl, { 
    responseType: 'stream',
    httpsAgent
  });

  await pipeline(response.data, fs.createWriteStream(tempPath));
  return tempPath;
}

exports.getPageCount = async (publicId) => {
  let tempPath = null;
  try {
    tempPath = await downloadToTemp(publicId);
    const count = muhammaraService.getPageCount(tempPath);
    return count;
  } catch (error) {
    console.error('Error getting page count:', error.message);
    return 0;
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch(e) {}
    }
  }
};

exports.mergeAndStampPdf = async (docData) => {
  const sourceFilesMap = {};
  const tempFiles = [];
  const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.pdf`);

  try {
    // 1. Download all source PDFs to temp storage
    for (let i = 0; i < docData.files.length; i++) {
      const file = docData.files[i];
      const tempPath = await downloadToTemp(file.cloudinaryPublicId);
      sourceFilesMap[i] = tempPath;
      tempFiles.push(tempPath);
    }

    let indexPageOffset = 0;
    const pageInstructions = [];

    // 2. Generate Index Page if required
    if (docData.indexData && docData.indexData.length > 0) {
      const indexPath = path.join(os.tmpdir(), `index_${Date.now()}.pdf`);
      indexPageOffset = 1;
      
      const adjustedIndexData = docData.indexData.map(item => ({
        ...item,
        targetPageNumber: item.targetPageNumber + indexPageOffset
      }));

      await muhammaraService.generateIndexPage(docData.title, adjustedIndexData, indexPath);
      sourceFilesMap['index'] = indexPath;
      tempFiles.push(indexPath);
      pageInstructions.push({ sourceKey: 'index', originalPageNumber: 1 });
    }

    // 3. Prepare instructions for merging
    for (let pageInfo of docData.pages) {
      pageInstructions.push({ 
        sourceKey: pageInfo.fileIndex, 
        originalPageNumber: pageInfo.originalPageNumber 
      });
    }

    // 4. Perform high-performance merge
    console.log(`Starting merge for ${pageInstructions.length} pages...`);
    await muhammaraService.mergePdfs(pageInstructions, sourceFilesMap, outputPath);

    // 5. Read back the merged file as a buffer for the controller to send
    const result = fs.readFileSync(outputPath);
    return result;

  } finally {
    // Cleanup
    for (const f of tempFiles) {
      if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch(e) {}
    }
    if (fs.existsSync(outputPath)) try { fs.unlinkSync(outputPath); } catch(e) {}
  }
};
