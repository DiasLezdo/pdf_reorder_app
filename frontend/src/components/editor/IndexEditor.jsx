import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Bookmark } from 'lucide-react';

export default function IndexEditor({ indexData, setIndexData, maxPages }) {
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
      id: Date.now(), // purely client-side id for list keys
      sectionTitle: newSection,
      targetPageNumber: targetPageNumber
    };
    
    // Auto sort by page number
    const updatedIndex = [...indexData, newEntry].sort((a, b) => a.targetPageNumber - b.targetPageNumber);
    setIndexData(updatedIndex);
    
    setNewSection('');
    setNewPageStart('');
  };

  const handleRemove = (idToRemove) => {
    setIndexData(indexData.filter(item => item.id !== idToRemove && item._id !== idToRemove)); // handle existing mongodb _id or local id
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50 border-l border-gray-200 shadow-sm relative">
      <div className="flex items-center space-x-2 border-b pb-3 mb-4">
        <Bookmark className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-lg text-gray-800">Index & Bookmarks</h3>
      </div>
      
      <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100 italic">
        <strong>Note:</strong> Bookmarks are generated from these entries. If you reorder pages in the left sidebar, remember to update the target page numbers here.
      </p>

      {/* Form */}
      <form onSubmit={handleAdd} className="space-y-3 p-3 bg-white rounded-lg border shadow-sm mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Section Title</label>
          <input 
            type="text" 
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Introduction"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Target Page</label>
          <input 
            type="number" 
            min="1"
            max={maxPages}
            value={newPageStart}
            onChange={(e) => setNewPageStart(e.target.value)}
            className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. 5"
            required
          />
        </div>
        
        {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
        
        <button 
          type="submit" 
          disabled={!newSection || !newPageStart || parseInt(newPageStart) < 1 || parseInt(newPageStart) > maxPages}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white p-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Index</span>
        </button>
      </form>

      {/* List */}
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Index</h4>
      <div className="flex-1 overflow-auto bg-white rounded-lg border">
        {indexData.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400 italic">No index entries yet.</div>
        ) : (
          <ul className="divide-y">
            {indexData.map((item, idx) => (
              <li key={item.id || item._id || idx} className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                 <div className="flex items-start flex-1 min-w-0 pr-3">
                   <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                   <div className="ml-1 min-w-0">
                     <p className="text-sm font-medium text-gray-800 truncate" title={item.sectionTitle}>{item.sectionTitle}</p>
                     <p className="text-xs text-blue-600 font-semibold mt-0.5">Page {item.targetPageNumber}</p>
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
