import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Trash2, PlusCircle } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ page, index, isActive, onClick, onRemove, onAddBlank }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: page.pageNumber });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative p-3 border-b cursor-grab active:cursor-grabbing hover:bg-gray-100 ${isActive ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
         <div {...attributes} {...listeners} className="flex-1">
           <span className="text-xs font-bold text-gray-500">Page {index + 1}</span>
         </div>
         <div className="flex space-x-1">
            <button onClick={(e) => {e.stopPropagation(); onAddBlank(index);}} title="Add Blank Page after" className="p-1 hover:bg-gray-200 rounded text-green-600">
               <PlusCircle className="w-3 h-3" />
            </button>
            <button onClick={(e) => {e.stopPropagation(); onRemove(index);}} title="Remove Page" className="p-1 hover:bg-gray-200 rounded text-red-500">
               <Trash2 className="w-3 h-3" />
            </button>
         </div>
      </div>
      <div 
        onClick={onClick}
        className={`w-full aspect-[1/1.414] bg-white border shadow-sm flex items-center justify-center overflow-hidden cursor-pointer ${isActive ? 'ring-2 ring-blue-500' : ''}`}
      >
        {page.originalPageNumber === -1 ? (
           <span className="text-xs text-gray-400">Blank Page</span>
        ) : (
           <div className="text-xs text-center text-gray-400 flex flex-col">
             <span>Src File: {page.fileIndex + 1}</span>
             <span>Src Page: {page.originalPageNumber}</span>
             {/* Note: Generating thumbnails of PDF requires rendering. We mock it for performance/simplicity here unless a specific thumbnail URL is available */}
           </div>
        )}
      </div>
    </div>
  );
}

export default function PageThumbnails({ pages, activePageIndex, setActivePageIndex, handleDragEnd, setPages }) {
  const parentRef = useRef();

  const rowVirtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated height of each thumbnail + padding
    overscan: 5,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const removePage = (idx) => {
    const newPages = [...pages];
    newPages.splice(idx, 1);
    setPages(newPages);
  };

  const addBlankPage = (idx) => {
    const newPages = [...pages];
    // Create dummy ID using Date.now
    newPages.splice(idx + 1, 0, {
      pageNumber: Date.now(), // unique id
      fileIndex: -1,
      originalPageNumber: -1
    });
    setPages(newPages);
  }

  return (
    <div className="flex flex-col h-full border-r bg-gray-50">
      <div className="p-3 font-semibold text-sm border-b text-gray-700 bg-white sticky top-0 z-10">Pages</div>
      <div ref={parentRef} className="flex-1 overflow-auto relative">
         <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
         >
            <SortableContext items={pages.map(p => p.pageNumber)} strategy={verticalListSortingStrategy}>
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                   const page = pages[virtualRow.index];
                   return (
                     <div
                        key={page.pageNumber}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                         <SortableItem 
                           page={page} 
                           index={virtualRow.index} 
                           isActive={activePageIndex === virtualRow.index}
                           onClick={() => setActivePageIndex(virtualRow.index)}
                           onRemove={removePage}
                           onAddBlank={addBlankPage}
                         />
                     </div>
                   );
                })}
              </div>
            </SortableContext>
         </DndContext>
      </div>
    </div>
  );
}
