import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDocumentById, reorderDocument, updateIndex, updateBookmarks, generateDocument } from '../api/client';
import { Loader2, Save, Download, FileText, Bookmark as BookmarkIcon } from 'lucide-react';
import PageThumbnails from '../components/pdf/PageThumbnails';
import PdfViewer from '../components/pdf/PdfViewer';
import IndexEditor from '../components/editor/IndexEditor';
import BookmarkEditor from '../components/editor/BookmarkEditor';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [indexData, setIndexData] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeSidePanel, setActiveSidePanel] = useState('index'); // 'index' or 'bookmark'

  const { data: docData, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocumentById(id),
  });

  useEffect(() => {
    if (docData) {
      setPages(docData.pages);
      setIndexData(docData.indexData || []);
      setBookmarks(docData.bookmarks || []);
    }
  }, [docData]);

  const saveReorderMutation = useMutation({
    mutationFn: (newPages) => reorderDocument(id, newPages),
    onError: (err) => alert(`Failed to save order: ${err.message}`),
  });

  const saveIndexMutation = useMutation({
    mutationFn: (newIndex) => updateIndex(id, newIndex),
    onError: (err) => alert(`Failed to save index: ${err.message}`),
  });

  const saveBookmarksMutation = useMutation({
    mutationFn: (newBookmarks) => updateBookmarks(id, newBookmarks),
    onError: (err) => alert(`Failed to save bookmarks: ${err.message}`),
  });

  const downloadMutation = useMutation({
    mutationFn: () => generateDocument(id),
    onSuccess: (data) => {
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${docData?.title || 'generated'}.pdf`);
      window.document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    },
    onError: (err) => {
      console.error('Download Error:', err);
      alert(`Failed to generate PDF: ${err.response?.data?.error || err.message}`);
    }
  });

  const handleDragEnd = (event) => {
    // dnd-kit logic passed to PageThumbnails
    const { active, over } = event;
    if (active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.pageNumber === active.id);
        const newIndex = items.findIndex((i) => i.pageNumber === over.id);
        
        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);

        // Update indexData targets to match new page positions
        setIndexData((prevIndex) => {
          const updated = prevIndex.map(item => {
            let target = item.targetPageNumber;
            const absoluteOld = oldIndex + 1;
            const absoluteNew = newIndex + 1;

            if (target === absoluteOld) {
              return { ...item, targetPageNumber: absoluteNew };
            }
            
            if (absoluteNew > absoluteOld) {
              if (target > absoluteOld && target <= absoluteNew) {
                return { ...item, targetPageNumber: target - 1 };
              }
            } else {
              if (target < absoluteOld && target >= absoluteNew) {
                return { ...item, targetPageNumber: target + 1 };
              }
            }
            return item;
          });
          return [...updated].sort((a, b) => a.targetPageNumber - b.targetPageNumber);
        });

        // Update bookmarks targets to match new page positions
        setBookmarks((prevBookmarks) => {
          const updated = prevBookmarks.map(item => {
            let target = item.targetPageNumber;
            const absoluteOld = oldIndex + 1;
            const absoluteNew = newIndex + 1;

            if (target === absoluteOld) {
              return { ...item, targetPageNumber: absoluteNew };
            }
            
            if (absoluteNew > absoluteOld) {
              if (target > absoluteOld && target <= absoluteNew) {
                return { ...item, targetPageNumber: target - 1 };
              }
            } else {
              if (target < absoluteOld && target >= absoluteNew) {
                return { ...item, targetPageNumber: target + 1 };
              }
            }
            return item;
          });
          return [...updated].sort((a, b) => a.targetPageNumber - b.targetPageNumber);
        });

        return newItems;
      });
    }
  };

  const handleSaveAll = async () => {
    try {
      await saveReorderMutation.mutateAsync(pages);
      await saveIndexMutation.mutateAsync(indexData);
      await saveBookmarksMutation.mutateAsync(bookmarks);
      alert('All changes saved successfully!');
    } catch (e) {
      // Handled by onError
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-12 h-12 text-blue-500" /></div>;
  if (!docData) return <div>Document not found</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-100">
      {/* Editor Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-6">
          <div className="text-sm">
            <span className="font-semibold">{docData.title}</span> 
            <span className="text-gray-500 ml-2">({pages.length} Pages)</span>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveSidePanel('index')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${activeSidePanel === 'index' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Indexing
            </button>
            <button 
              onClick={() => setActiveSidePanel('bookmark')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${activeSidePanel === 'bookmark' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BookmarkIcon className="w-3.5 h-3.5 mr-1.5" />
              Bookmark
            </button>
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={handleSaveAll}
            disabled={saveReorderMutation.isPending || saveIndexMutation.isPending || saveBookmarksMutation.isPending}
            className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center disabled:opacity-50"
          >
            {(saveReorderMutation.isPending || saveIndexMutation.isPending || saveBookmarksMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </button>
          
          <button 
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center disabled:opacity-50"
          >
            {downloadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {downloadMutation.isPending ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Thumbnails */}
        <div className="w-64 bg-gray-50 border-r flex flex-col">
           <PageThumbnails 
             pages={pages} 
             activePageIndex={activePageIndex}
             setActivePageIndex={setActivePageIndex}
             handleDragEnd={handleDragEnd}
             setPages={setPages}
             files={docData.files}
             documentId={id}
           />
        </div>

        {/* Center: Main PDF Viewer */}
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-200">
          {pages.length > 0 && (
             <PdfViewer 
               pageInfo={pages[activePageIndex]} 
               files={docData.files}
               documentId={id}
             />
          )}
        </div>

        {/* Right Sidebar: Conditional Editor */}
        <div className="w-80 bg-white border-l shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 flex flex-col">
           {activeSidePanel === 'index' ? (
              <IndexEditor 
                indexData={indexData} 
                setIndexData={setIndexData} 
                maxPages={pages.length}
              />
           ) : (
              <BookmarkEditor 
                bookmarks={bookmarks}
                setBookmarks={setBookmarks}
                maxPages={pages.length}
                activePageIndex={activePageIndex}
              />
           )}
        </div>
      </div>
    </div>
  );
}
