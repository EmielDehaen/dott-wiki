import React, { useEffect, useState, useRef } from 'react';
import { Folder, FileText, Search, Plus, FolderPlus, Edit2, GripVertical, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// --- Sortable Item Component ---
function SortableItem({ node, currentPath, onSelectPage, onSelectCollection, onRename, onAddPage, onAddCollection, creating, renaming, newName, setNewName, handleCreate, handleRename, inputRef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.path });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isActive = currentPath === node.path;

  return (
    <div ref={setNodeRef} style={style} className="group/item list-none">
      <div 
        className={cn(
          "flex items-center justify-between px-2 py-1.5 text-sm rounded-xl cursor-pointer transition-all duration-200",
          isActive ? "bg-blue-50 text-blue-700 font-semibold shadow-sm border-l-4 border-blue-600 -ml-[4px]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        onClick={() => node.type === 'page' ? onSelectPage(node.path) : onSelectCollection(node.path)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div {...attributes} {...listeners} className="p-1 hover:bg-white rounded cursor-grab active:cursor-grabbing opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
            <GripVertical size={12} className="text-slate-300" />
          </div>
          {node.type === 'collection' ? <Folder size={14} className="text-blue-400 shrink-0" /> : <FileText size={14} className={cn("shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />}
          
          {renaming?.path === node.path ? (
            <input 
              ref={inputRef}
              className="flex-1 bg-white border border-blue-300 rounded px-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              value={newName}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => handleRename()}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') handleRename(true); }}
            />
          ) : (
            <span className="truncate pr-2">{node.name.replace('.md', '')}</span>
          )}
        </div>
        
        {!renaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 bg-white/80 backdrop-blur px-1 rounded-lg shadow-sm border border-slate-100">
            <button onClick={(e) => { e.stopPropagation(); onRename(node); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
            {node.type === 'collection' && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onAddPage(node.path); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><Plus size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); onAddCollection(node.path); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><FolderPlus size={12} /></button>
              </>
            )}
          </div>
        )}
      </div>

      {node.children && node.children.length > 0 && (
        <div className="pl-4 ml-3 border-l border-slate-100 mt-0.5 space-y-0.5">
          <SortableContext items={node.children.map(c => c.path)} strategy={verticalListSortingStrategy}>
            {node.children.map(child => (
              <SortableItem key={child.path} node={child} currentPath={currentPath} onSelectPage={onSelectPage} onSelectCollection={onSelectCollection} onRename={onRename} onAddPage={onAddPage} onAddCollection={onAddCollection} creating={creating} renaming={renaming} newName={newName} setNewName={setNewName} handleCreate={handleCreate} handleRename={handleRename} inputRef={inputRef} />
            ))}
          </SortableContext>
        </div>
      )}

      {creating?.parent === node.path && (
        <div className="pl-10 py-1 pr-2 mt-1 border-l border-slate-100 ml-3">
          <div className="flex items-center gap-2 bg-white shadow-md border border-blue-200 rounded-xl p-2 animate-in fade-in slide-in-from-left-2 duration-200">
            {creating.type === 'page' ? <FileText size={12} className="text-blue-500" /> : <Folder size={12} className="text-blue-500" />}
            <input 
              ref={inputRef}
              className="flex-1 bg-transparent border-none text-xs focus:outline-none text-slate-700"
              value={newName}
              onBlur={() => { if (!newName) handleCreate(true); }}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') handleCreate(true); }}
              placeholder={creating.type === 'page' ? 'Page Title' : 'Collection Name'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ currentPath, onSelectPage, onSelectCollection }) {
  const [toc, setToc] = useState([]);
  const [creating, setCreating] = useState<{ type: 'page' | 'collection', parent: string } | null>(null);
  const [renaming, setRenaming] = useState<{ path: string, type: 'page' | 'collection', currentName: string } | null>(null);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchToc = async () => {
    try {
      const res = await fetch('/api/toc');
      const data = await res.json();
      setToc(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchToc(); }, []);

  useEffect(() => {
    if ((creating || renaming) && inputRef.current) inputRef.current.focus();
  }, [creating, renaming]);

  const handleCreate = async (cancel = false) => {
    if (cancel || !newName || !creating) { setCreating(null); setNewName(''); return; }
    const path = creating.parent ? `${creating.parent}/${newName}` : newName;
    await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, title: newName, type: creating.type }) });
    setCreating(null); setNewName(''); fetchToc();
    if (creating.type === 'page') onSelectPage(path.endsWith('.md') ? path : `${path}.md`);
  };

  const handleRename = async (cancel = false) => {
    if (cancel || !newName || !renaming || newName === renaming.currentName) { setRenaming(null); setNewName(''); return; }
    const res = await fetch('/api/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPath: renaming.path, newName, type: renaming.type }) });
    const data = await res.json();
    setRenaming(null); setNewName(''); fetchToc();
    if (data.success && currentPath === renaming.path) {
      if (renaming.type === 'page') onSelectPage(data.newPath);
      else onSelectCollection(data.newPath);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find siblings to reorder
    const findSiblings = (nodes, id) => {
      for (const node of nodes) {
        if (node.path === id) return nodes;
        if (node.children) {
          const siblings = findSiblings(node.children, id);
          if (siblings) return siblings;
        }
      }
      return null;
    };

    const siblings = findSiblings(toc, active.id);
    if (!siblings) return;

    const oldIndex = siblings.findIndex(n => n.path === active.id);
    const newIndex = siblings.findIndex(n => n.path === over.id);
    
    const newSiblings = arrayMove(siblings, oldIndex, newIndex);
    const updates = newSiblings.map((node, index) => ({ path: node.path, order: index + 1 }));

    // Optimistic update
    // Actual implementation of tree update would be more complex, 
    // for MVP we trigger server update and refresh
    await fetch('/api/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
    fetchToc();
  };

  return (
    <aside className="w-80 border-r border-slate-200 h-screen overflow-y-auto p-6 bg-[#FBFBFC] flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all" onClick={() => onSelectPage('index.md')}>
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">D</div>
          <h1 className="text-lg font-black tracking-widest text-slate-900 uppercase">Dott</h1>
        </div>
        <div className="flex gap-1 text-slate-400">
          <button onClick={() => setCreating({ type: 'page', parent: '' })} className="p-2 hover:bg-white hover:shadow-sm rounded-xl hover:text-blue-600 transition-all" title="New Page"><Plus size={18} /></button>
          <button onClick={() => setCreating({ type: 'collection', parent: '' })} className="p-2 hover:bg-white hover:shadow-sm rounded-xl hover:text-blue-600 transition-all" title="New Collection"><FolderPlus size={18} /></button>
        </div>
      </div>
      
      <div className="relative mb-8 px-1">
        <Search className="absolute left-4 top-3 text-slate-400" size={16} />
        <input type="text" placeholder="Search..." className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/40 transition-all" />
      </div>

      <nav className="flex-1 custom-scrollbar overflow-x-hidden">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-3">Knowledge Base</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={toc.map(n => n.path)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {toc.map(node => (
                <SortableItem key={node.path} node={node} currentPath={currentPath} onSelectPage={onSelectPage} onSelectCollection={onSelectCollection} onRename={(n) => { setNewName(n.name); setRenaming({ path: n.path, type: n.type, currentName: n.name }); }} onAddPage={(p) => setCreating({ type: 'page', parent: p })} onAddCollection={(p) => setCreating({ type: 'collection', parent: p })} creating={creating} renaming={renaming} newName={newName} setNewName={setNewName} handleCreate={handleCreate} handleRename={handleRename} inputRef={inputRef} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {creating?.parent === '' && (
          <div className="px-2 py-2 mt-2">
            <div className="flex items-center gap-2 bg-white shadow-xl border border-blue-200 rounded-2xl p-3 animate-in zoom-in-95 duration-200">
              {creating.type === 'page' ? <FileText size={14} className="text-blue-500" /> : <Folder size={14} className="text-blue-500" />}
              <input ref={inputRef} className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none text-slate-700" value={newName} onBlur={() => { if (!newName) handleCreate(true); }} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') handleCreate(true); }} placeholder={creating.type === 'page' ? 'New Page...' : 'New Collection...'} />
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
