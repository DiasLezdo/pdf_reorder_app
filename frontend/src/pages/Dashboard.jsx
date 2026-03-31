import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDocuments, uploadDocuments } from '../api/client';
import { FileUp, FileText, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: () => uploadDocuments(files, title),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['documents']);
      setFiles([]);
      setTitle('');
      navigate(`/editor/${data._id}`);
    },
  });

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (droppedFiles.length) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload PDFs</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Q3 Financial Reports"
          />
        </div>
        
        <div 
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors"
        >
          <FileUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">Drag and drop PDF files here, or click to select</p>
          <input 
            type="file" 
            multiple 
            accept="application/pdf"
            className="hidden" 
            id="file-upload"
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />
          <label htmlFor="file-upload" className="cursor-pointer inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200">
            Browse Files
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-medium text-gray-700">Selected Files:</h3>
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center text-sm bg-gray-50 p-2 rounded-lg border">
                <FileText className="h-4 w-4 mr-2 text-red-500" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-gray-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
            
            <button 
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !title}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              {uploadMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
              {uploadMutation.isPending ? 'Uploading...' : 'Upload & Start Editing'}
            </button>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Documents</h2>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500 h-8 w-8" /></div>
        ) : (
          <div className="space-y-4">
            {documents?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No documents found. Upload one to get started.</p>
            ) : (
              documents?.map(doc => (
                <div 
                  key={doc._id} 
                  onClick={() => navigate(`/editor/${doc._id}`)}
                  className="p-4 border rounded-xl hover:shadow-md cursor-pointer transition-shadow flex items-center justify-between group"
                >
                  <div>
                    <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{doc.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{new Date(doc.createdAt).toLocaleDateString()} • {doc.pages.length} Pages</p>
                  </div>
                  <div className="bg-gray-100 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
                    <FileText className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
