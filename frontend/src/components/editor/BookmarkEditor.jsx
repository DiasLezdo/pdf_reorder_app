import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Bookmark } from 'lucide-react';

export default function BookmarkEditor({ bookmarks, setBookmarks, maxPages, activePageIndex }) {
  const [newSection, setNewSection] = useState('');
  const [newPageStart, setNewPageStart] = useState('');
  const [error, setError] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newSection || !newPageStart) return;
    
    const targetPageNumber = parseInt(newPageStart, 10);
    
    if (isNaN(targetPageNumber) || targetPageNumber < 1 || targetPageNumber > maxPages) {
      setError(`Page number must be between 1 and ${maxPages}`);
      return;
    }
    
    setError('');
    
    const newEntry = {
      id: Date.now(),
      sectionTitle: newSection,
      targetPageNumber: targetPageNumber
    };
    
    const updatedBookmarks = [...bookmarks, newEntry].sort((a, b) => a.targetPageNumber - b.targetPageNumber);
    setBookmarks(updatedBookmarks);
    
    setNewSection('');
    setNewPageStart('');
  };

  const handleRemove = (idToRemove) => {
    setBookmarks(bookmarks.filter(item => item.id !== idToRemove && item._id !== idToRemove));
  };

  const setPageShortcut = (page) => {
    setNewPageStart(page.toString());
  };

  return (
    <div className="p-4 flex flex-col h-full bg-indigo-50/30">
      <div className="flex items-center space-x-2 border-b border-indigo-100 pb-3 mb-4">
        <Bookmark className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-lg text-gray-800">PDF Bookmarks</h3>
      </div>
      
      <p className="text-xs text-gray-500 mb-4 bg-white p-2 rounded border border-indigo-100 italic">
        <strong>PDF Sidebar Outline:</strong> These entries will appear only in the PDF viewer's sidebar/bookmarks tree.
      </p>

      {/* Form */}
      <form onSubmit={handleAdd} className="space-y-3 p-3 bg-white rounded-lg border border-indigo-100 shadow-sm mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Bookmark Title</label>
          <input 
            type="text" 
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="e.g. Executive Summary"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Target Page</label>
          <div className="space-y-2">
            <input 
              type="number" 
              min="1"
              max={maxPages}
              value={newPageStart}
              onChange={(e) => setNewPageStart(e.target.value)}
              className="w-full text-sm p-2 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="e.g. 1"
              required
            />
            
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={() => setPageShortcut(activePageIndex + 1)}
                className="flex-1 text-[10px] py-1 bg-white border border-indigo-200 text-indigo-600 rounded hover:bg-indigo-50 transition-colors font-semibold"
              >
                Current (Pg {activePageIndex + 1})
              </button>
              <button 
                type="button"
                disabled={activePageIndex === 0}
                onClick={() => setPageShortcut(activePageIndex)}
                className="flex-1 text-[10px] py-1 bg-white border border-indigo-200 text-indigo-600 rounded hover:bg-indigo-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous (Pg {activePageIndex})
              </button>
            </div>
          </div>
        </div>
        
        {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
        
        <button 
          type="submit" 
          disabled={!newSection || !newPageStart || parseInt(newPageStart) < 1 || parseInt(newPageStart) > maxPages}
          className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white p-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bookmark</span>
        </button>
      </form>

      {/* List */}
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Current Outline</h4>
      <div className="flex-1 overflow-auto bg-white rounded-lg border border-indigo-50">
        {bookmarks.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400 italic">No bookmarks defined.</div>
        ) : (
          <ul className="divide-y divide-indigo-50">
            {bookmarks.map((item, idx) => (
              <li key={item.id || item._id || idx} className="p-3 hover:bg-indigo-50/30 transition-colors flex items-center justify-between group">
                 <div className="flex items-start flex-1 min-w-0 pr-3">
                   <ChevronRight className="w-4 h-4 text-indigo-300 mt-0.5 flex-shrink-0" />
                   <div className="ml-1 min-w-0">
                     <p className="text-sm font-medium text-gray-800 truncate" title={item.sectionTitle}>{item.sectionTitle}</p>
                     <p className="text-xs text-indigo-600 font-semibold mt-0.5">Goes to Page {item.targetPageNumber}</p>
                   </div>
                 </div>
                 <button 
                   onClick={() => handleRemove(item.id || item._id)}
                   className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                   title="Remove"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
