const { PDFDocument, StandardFonts, rgb, PDFName, PDFNumber, PDFString } = require('pdf-lib');
const axios = require('axios');
const https = require('https');
const { cloudinary } = require('./cloudinaryService');

// Create an agent that ignores SSL certificate errors if needed for local dev environment issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function fetchPdfBuffer(publicId) {
  // Generate a signed URL for internal fetch
  const signedUrl = cloudinary.url(publicId, {
    resource_type: 'raw',
    sign_url: true,
    type: 'upload',
    secure: true
  });

  console.log('Backend fetching Cloudinary buffer:', signedUrl);
  const response = await axios.get(signedUrl, { 
    responseType: 'arraybuffer',
    httpsAgent: httpsAgent // Fallback for SSL alert 80 issues
  });
  return response.data;
}

exports.getPageCount = async (publicId) => {
  try {
    const buffer = await fetchPdfBuffer(publicId);
    const pdfDoc = await PDFDocument.load(buffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error getting page count:', error.message);
    return 0;
  }
};

exports.mergeAndStampPdf = async (docData) => {
  const finalPdf = await PDFDocument.create();
  const loadedPdfs = {};

  // 1. Load all PDF files used in this doc
  for (const file of docData.files) {
    const buffer = await fetchPdfBuffer(file.cloudinaryPublicId);
    loadedPdfs[file.cloudinaryPublicId] = await PDFDocument.load(buffer);
  }

  // 2. Generate Index Page if required (as the first page)
  let indexPageOffset = 0;
  if (docData.indexData && docData.indexData.length > 0) {
    const indexPage = finalPdf.addPage();
    indexPageOffset = 1;

    const font = await finalPdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await finalPdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = indexPage.getSize();

    indexPage.drawText(docData.title || 'Document Index', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    let yPos = height - 100;
    docData.indexData.forEach((item, idx) => {
      // Draw Text
      indexPage.drawText(`${item.sectionTitle} ........................ Page ${item.targetPageNumber + indexPageOffset}`, {
        x: 50,
        y: yPos,
        size: 14,
        font,
        color: rgb(0, 0, 0.8),
      });

      // Create a link annotation for the text
      const linkAnnotation = finalPdf.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [50, yPos - 2, 400, yPos + 14], // Approximate bounding box
        Border: [0, 0, 0], // Invisible border
        C: [0, 0, 1], // Blue color
        A: {
          Type: 'Action',
          S: 'GoTo',
          D: [item.targetPageNumber + indexPageOffset - 1, { name: 'Fit' }], // 0-indexed page dest
        },
      });

      const annots = indexPage.node.Annots();
      if (annots) {
        annots.push(linkAnnotation);
      } else {
        indexPage.node.set(finalPdf.context.obj('Annots'), finalPdf.context.obj([linkAnnotation]));
      }

      yPos -= 30;
      // Handle pagination of index if many items
      if (yPos < 50) {
        // Pagination logic would add a new page
      }
    });
  }

  // 3. Copy specified pages from sources
  // docData.pages holds the layout/order
  for (let pageInfo of docData.pages) {
    if (pageInfo.originalPageNumber === -1) {
      // It's a blank page
      finalPdf.addPage();
    } else {
      // It's a real page from uploaded files
      const sourceFile = docData.files[pageInfo.fileIndex];
      const sourcePdf = loadedPdfs[sourceFile.cloudinaryPublicId];
      const [copiedPage] = await finalPdf.copyPages(sourcePdf, [pageInfo.originalPageNumber - 1]);
      finalPdf.addPage(copiedPage);
    }
  }

  // 4. (Optional) Outline/Bookmarks tree manual generation
  const activeBookmarks = docData.bookmarks && docData.bookmarks.length > 0 ? docData.bookmarks : (docData.indexData || []);
  
  if (activeBookmarks.length > 0) {
    try {
      const context = finalPdf.context;
      const pageRefs = [];
      const pageCount = finalPdf.getPageCount();
      for (let i = 0; i < pageCount; i++) {
        pageRefs.push(finalPdf.getPage(i).ref);
      }

      const outlineRootRef = context.nextRef();
      const outlineItems = [];

      // 1. "Go Back" (History) - Works best in Adobe Acrobat/Desktop viewers
      const goBackRef = context.nextRef();
      outlineItems.push({
        ref: goBackRef,
        title: 'Go Back (History)',
        action: {
          S: PDFName.of('Named'),
          N: PDFName.of('GoBack'),
        }
      });

      // 2. "Main Index" - Reliable fallback that always works in all viewers
      const mainIndexRef = context.nextRef();
      outlineItems.push({
        ref: mainIndexRef,
        title: 'Main Index',
        dest: [pageRefs[0], PDFName.of('Fit')]
      });

      for (let i = 0; i < activeBookmarks.length; i++) {
        const item = activeBookmarks[i];
        const targetIdx = item.targetPageNumber + indexPageOffset - 1;
        if (targetIdx < 0 || targetIdx >= pageCount) continue;

        const itemRef = context.nextRef();
        outlineItems.push({
          ref: itemRef,
          title: item.sectionTitle,
          dest: [pageRefs[targetIdx], PDFName.of('Fit')]
        });
      }

      if (outlineItems.length > 0) {
        for (let i = 0; i < outlineItems.length; i++) {
          const item = outlineItems[i];
          const dict = context.obj({
            Title: PDFString.of(item.title),
            Parent: outlineRootRef,
          });

          console.log(`Processing bookmark: ${item.title}`);
          if (item.action) {
            const actionDict = context.obj(item.action);
            dict.set(PDFName.of('A'), actionDict);
          } else if (item.dest) {
            dict.set(PDFName.of('Dest'), context.obj(item.dest));
          }

          if (i > 0) dict.set(PDFName.of('Prev'), outlineItems[i - 1].ref);
          if (i < outlineItems.length - 1) dict.set(PDFName.of('Next'), outlineItems[i + 1].ref);

          context.assign(item.ref, dict);
        }

        const outlineRoot = context.obj({
          Type: PDFName.of('Outlines'),
          First: outlineItems[0].ref,
          Last: outlineItems[outlineItems.length - 1].ref,
          Count: PDFNumber.of(outlineItems.length),
        });
        context.assign(outlineRootRef, outlineRoot);

        finalPdf.catalog.set(PDFName.of('Outlines'), outlineRootRef);
        console.log(`Successfully added ${outlineItems.length} bookmarks to PDF.`);
      }
    } catch (bookmarkError) {
      console.error('Error adding bookmarks:', bookmarkError.message);
      // Don't fail the whole process if bookmarks fail
    }
  }

  return await finalPdf.save();
};
