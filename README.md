# PDF Editor & Combiner

A production-ready full-stack web application for uploading, previewing, editing, reordering, and combining PDF files. It features high-performance virtualization for large PDFs, an indexing mechanism with internal hyperlinking, and Cloudinary storage.

## 1. Project Structure

```text
c:\Users\mariaantonydias.m\Documents\Self\project
├── backend/
│   ├── controllers/
│   │   └── documentController.js  # Request handlers for API endpoints
│   ├── models/
│   │   └── Document.js            # Mongoose Schema
│   ├── routes/
│   │   └── documents.js           # API Routing definitions
│   ├── services/
│   │   ├── cloudinaryService.js   # Cloudinary and Multer configuration
│   │   └── pdfService.js          # pdf-lib operations, hyperlinking, page merge
│   ├── .env                       # Environment variables
│   ├── package.json
│   └── server.js                  # Express entry point
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # Axios API wrappers
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   └── IndexEditor.jsx  # Form for adding/removing Index Entries
│   │   │   └── pdf/
│   │   │       ├── PageThumbnails.jsx # Virtualized drag & drop sidebar
│   │   │       └── PdfViewer.jsx      # pdf.js viewer container
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Upload & document listing
│   │   │   └── Editor.jsx         # Main layout integrating all components
│   │   ├── App.jsx                # React Router & QueryClient setup
│   │   ├── index.css              # TailwindCSS base configuration
│   │   └── main.jsx
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── vite.config.js
```

## 2. Backend Implementation (Express + MongoDB + Cloudinary)

The backend exposes a highly specialized REST API via Express. It manages unstructured PDF data efficiently layout configurations in MongoDB.

### Cloudinary Uploads:
We utilize `multer-storage-cloudinary` attached to `multer` which directly uploads files to Cloudinary seamlessly, circumventing heavy local I/O bounds for up to 2GB files. (See `backend/services/cloudinaryService.js`).

### Mongoose Schema:
Documents are represented logically—rather than storing a gigantic PDF Blob, the backend stores the layout semantics in arrays. `files` maintains metadata about uploaded PDFs, while `pages` strictly maps a final page sequence representing internal `fileIndex` pointers or "blank pages." (See `backend/models/Document.js`).

### PDF-Lib Processing:
In `backend/services/pdfService.js`, the `/generate` endpoint constructs the actual final PDF. It:
1. Re/instantiates independent PDF arrays into buffers via Axios.
2. Injects the Index page first.
3. Maps link annotations using `Annot: { Subtype: 'Link', S: 'GoTo', D: [PageNum] }`.
4. Copies sequence from loaded buffers.

## 3. Frontend Implementation (React + Vite)

The frontend is bootstrapped with Vite, heavily prioritizing performance using React Query (TanStack) for async state and optimistic UI manipulation, built entirely with TailwindCSS v4 configurations.

### 4. Key Components

- **Virtualization (`PageThumbnails.jsx`)**: Renders over 1000 page thumbnails smoothly using `@tanstack/react-virtual`. This prevents massive DOM inflation (a common pitfall when parsing large PDFs into individual HTML Canvas elements natively).
- **Drag-and-Drop (`dnd-kit`)**: Enables elegant page reordering using the `SortableContext` matrix.
- **PDF Viewer (`PdfViewer.jsx`)**: Interfaces securely with Mozilla's `pdfjs-dist` to deliver crisp PDF preview pages offloadable into web workers.
- **Index Editor (`IndexEditor.jsx`)**: Employs rigorous client-side validation to ensure users cannot specify links to non-existent pages or input flawed datasets.

## 5. Example API Calls

### Upload PDF Sequence
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Content-Type: multipart/form-data" \
  -F "title=Monthly Report" \
  -F "pdfs=@/path/to/report1.pdf" \
  -F "pdfs=@/path/to/report2.pdf"
```

### Reorder PDF Pages
```bash
curl -X POST http://localhost:5000/api/documents/{id}/reorder \
  -H "Content-Type: application/json" \
  -d '{"pages": [{"pageNumber": 1, "fileIndex": 1, "originalPageNumber": 1}, {"pageNumber": 2, "originalPageNumber": -1}]}'
```

### Generate Final Bookmarked Output
```bash
curl -X POST http://localhost:5000/api/documents/{id}/generate \
  --output "final_bookmarked.pdf"
```

## 6. Instructions to run project

### Prerequisites
- Node.js v18+
- MongoDB instance running locally or MongoDB Atlas URI
- Cloudinary Account (Dashboard -> API Keys)

### Backend Setup
1. Navigate to backend: `cd backend`
2. Install dependencies: `npm install`
3. Edit the `.env` file credentials. Replace dummy Cloudinary keys.
4. Run server: `npm run dev` (or `node server.js`). Starts on `port 5000`.

### Frontend Setup
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`. Connects to `localhost:5173`.
