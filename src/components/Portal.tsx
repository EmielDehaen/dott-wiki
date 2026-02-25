import React, { useState, useEffect } from 'react';
import { Folder, FileText, ChevronRight, Book } from 'lucide-react';

export default function Portal({ path, onSelectPage, onSelectCollection }) {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/toc');
        const data = await res.json();
        
        // Helper to find specific folder
        const find = (nodes, target) => {
          for (const node of nodes) {
            if (node.path === target) return node;
            if (node.children) {
              const result = find(node.children, target);
              if (result) return result;
            }
          }
          return null;
        };

        const current = find(data, path);
        setContents(current?.children || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };

    fetchContents();
  }, [path]);

  if (loading) return (
    <div className="p-20 flex-1 flex flex-col gap-8 animate-pulse">
      <div className="h-12 bg-slate-50 rounded-2xl w-1/2"></div>
      <div className="space-y-4">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-50 rounded-3xl w-full"></div>)}
      </div>
    </div>
  );

  return (
    <div className="p-20 flex-1 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-6 mb-12 pb-10 border-b border-slate-100">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30 ring-8 ring-blue-50">
          <Folder size={40} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight capitalize leading-none mb-2">
            {path.split('/').pop()?.replace(/-/g, ' ')}
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[11px]">
            Collection Portal / {contents.length} Items
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {contents.map(item => (
          <button 
            key={item.path} 
            onClick={() => item.type === 'page' ? onSelectPage(item.path) : onSelectCollection(item.path)}
            className="group flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 ${item.type === 'collection' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                {item.type === 'collection' ? <Folder size={28} /> : <FileText size={28} />}
              </div>
              <div className="flex flex-col">
                <span className="font-black text-slate-900 capitalize text-xl tracking-tight mb-1">
                  {item.name.replace('.md', '')}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black flex items-center gap-2">
                  {item.type === 'page' ? <Book size={12} /> : <Folder size={12} />}
                  {item.type === 'page' ? 'Knowledge Document' : 'Sub-Collection'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-200 transition-all">
              <ChevronRight size={24} strokeWidth={3} />
            </div>
          </button>
        ))}

        {contents.length === 0 && (
          <div className="p-20 text-center border-4 border-dashed border-slate-50 rounded-[3rem] flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
              <Folder size={40} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-300 tracking-tight">Empty Collection</p>
              <p className="text-slate-400 text-sm font-medium mt-1">Use the sidebar to add pages or sub-collections.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
