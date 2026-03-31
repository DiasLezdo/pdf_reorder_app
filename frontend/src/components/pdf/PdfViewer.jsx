import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';

// Setup pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_BASE = 'http://localhost:5000/api';

export default function PdfViewer({ pageInfo, files, documentId }) {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(null);

  if (!pageInfo) return <div className="h-full flex items-center justify-center text-gray-500">Select a page</div>;

  if (pageInfo.originalPageNumber === -1) {
    return (
      <div className="h-full flex items-center justify-center bg-white border shadow-md w-full max-w-3xl aspect-[1/1.414]">
        <span className="text-gray-400 text-2xl font-medium">Blank Page</span>
      </div>
    );
  }

  const fileInfo = files[pageInfo.fileIndex];
  if (!fileInfo) {
     return <div className="text-red-500">File information missing.</div>;
  }

  // Use backend proxy to avoid 401/CORS errors on raw Cloudinary URLs
  const pdfProxyUrl = `${API_BASE}/documents/${documentId}/pdf-proxy?fileIndex=${pageInfo.fileIndex}`;

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error) {
    console.error('Failed to load PDF', error);
    setError(error.message);
  }

  return (
    <div className="flex justify-center w-full h-full overflow-auto p-8 h-full bg-gray-200">
      <div className="shadow-lg border bg-white max-w-fit">
        {error && <div className="p-4 text-red-500">Error loading PDF: {error}</div>}
        <Document
          file={pdfProxyUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex h-[800px] w-[600px] items-center justify-center">
              <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
            </div>
          }
        >
          <Page 
            pageNumber={pageInfo.originalPageNumber} 
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={800}
          />
        </Document>
      </div>
    </div>
  );
}
