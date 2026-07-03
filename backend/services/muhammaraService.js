const muhammara = require('muhammara');
const path = require('path');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

/**
 * Get page count of a PDF file on disk
 */
exports.getPageCount = (filePath) => {
    const pdfReader = muhammara.createReader(filePath);
    return pdfReader.getPagesCount();
};

/**
 * Generate a simple index page as a separate PDF file
 */
exports.generateIndexPage = async (title, indexData, outputPath) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText(title || 'Document Index', {
        x: 50,
        y: height - 50,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
    });

    let yPos = height - 100;
    indexData.forEach((item) => {
        page.drawText(`${item.sectionTitle} ........................ Page ${item.targetPageNumber}`, {
            x: 50,
            y: yPos,
            size: 14,
            font,
            color: rgb(0, 0, 0.8),
        });
        yPos -= 30;
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
};

/**
 * Merge multiple PDFs and specific pages into a single output file
 * This uses muhammara for O(1) memory usage during the merge.
 */
exports.mergePdfs = async (pageInstructions, sourceFilesMap, outputPath) => {
    // pageInstructions: Array of { sourceKey, originalPageNumber } 
    // sourceKey could be a file path or a key in sourceFilesMap
    // originalPageNumber is 1-indexed

    const pdfWriter = muhammara.createWriter(outputPath);
    const copyingContexts = {};

    try {
        for (const instr of pageInstructions) {
            const sourcePath = sourceFilesMap[instr.sourceKey];
            
            if (instr.originalPageNumber === -1) {
                // Blank page
                pdfWriter.writePage(pdfWriter.createPage(0, 0, 595, 842)); // Standard A4
                continue;
            }

            if (!copyingContexts[instr.sourceKey]) {
                copyingContexts[instr.sourceKey] = pdfWriter.createPDFCopyingContext(sourcePath);
            }

            // muhammara appendPDFPageFromPDF uses 0-indexed page numbers
            copyingContexts[instr.sourceKey].appendPDFPageFromPDF(instr.originalPageNumber - 1);
        }
        pdfWriter.end();
    } catch (err) {
        if (pdfWriter) {
            try { pdfWriter.end(); } catch(e) {}
        }
        throw err;
    }
};
