import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Portal from './components/Portal';
import { Hash, ChevronRight, BookOpen, Code, Save, Check, FileText, Search } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState('index.md');
  const [viewMode, setViewMode] = useState<'page' | 'collection'>('page');
  const [sourceMode, setSourceMode] = useState(false);
  const [pageData, setPageData] = useState({ title: '', body: '', attributes: {} });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [allPages, setAllPages] = useState([]);
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setShowCommandQuery] = useState('');

  const fetchAllPages = async () => {
    try {
      const res = await fetch('/api/pages');
      const data = await res.json();
      setAllPages(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAllPages(); }, [currentPath]);

  const loadPage = async (path: string) => {
    setLoading(true);
    // Path normalization: ensure it's relative but correct
    const cleanPath = path.replace(/^\//, '');
    setCurrentPath(cleanPath);
    setViewMode('page');
    try {
      const res = await fetch(`/api/page/${cleanPath}`);
      const data = await res.json();
      setPageData(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async (updatedBody?: string) => {
    setSaveStatus('saving');
    const body = updatedBody ?? pageData.body;
    try {
      await fetch(`/api/page/${currentPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pageData.title, body, order: (pageData.attributes as any)?.order })
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      fetchAllPages();
    } catch (e) { console.error(e); setSaveStatus('idle'); }
  };

  useEffect(() => {
    if (currentPath.endsWith('.md')) loadPage(currentPath);
  }, []);

  // Simple Global Command Palette handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') setShowCommands(true);
      if (e.key === 'Escape') setShowCommands(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 font-sans overflow-hidden h-screen">
      <Sidebar currentPath={currentPath} onSelectPage={loadPage} onSelectCollection={(p) => { setCurrentPath(p); setViewMode('collection'); }} />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="px-12 py-8 flex justify-between items-center shrink-0 border-b border-slate-100 bg-white/50 backdrop-blur-md z-10">
          <div className="flex flex-col gap-1 flex-1 mr-8 min-w-0">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
              <Hash size={12} /><ChevronRight size={10} />
              <span className="text-blue-600 font-black">{currentPath.replace('.md', '').replace(/\//g, ' / ')}</span>
            </div>
            {viewMode === 'page' ? (
              <input 
                value={pageData.title}
                onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
                className="text-3xl font-black text-slate-900 tracking-tight bg-transparent border-none focus:outline-none placeholder-slate-200 w-full truncate"
                placeholder="Page Title"
              />
            ) : (
              <h2 className="text-3xl font-black text-slate-900 tracking-tight capitalize truncate leading-tight">
                {currentPath.split('/').pop()?.replace(/-/g, ' ')}
              </h2>
            )}
          </div>

          {viewMode === 'page' && (
            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200/20 shadow-inner">
                <button onClick={() => setSourceMode(false)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${!sourceMode ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><BookOpen size={14} /> Visual</button>
                <button onClick={() => setSourceMode(true)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${sourceMode ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><Code size={14} /> Source</button>
              </div>
              <button onClick={() => handleSave()} className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${saveStatus === 'saved' ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95'}`}>
                {saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />} {saveStatus === 'saved' ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {loading ? (
            <div className="p-20 animate-pulse space-y-8 flex-1">
              <div className="h-12 bg-slate-50 rounded-3xl w-3/4"></div>
              <div className="space-y-4">
                <div className="h-4 bg-slate-50 rounded-xl w-full"></div>
                <div className="h-4 bg-slate-50 rounded-xl w-11/12"></div>
              </div>
            </div>
          ) : viewMode === 'collection' ? (
            <Portal path={currentPath} onSelectPage={loadPage} onSelectCollection={(p) => setCurrentPath(p)} />
          ) : (
            <Editor 
              content={pageData.body} 
              sourceMode={sourceMode}
              onUpdate={(body) => setPageData({ ...pageData, body })}
              onNavigate={loadPage}
            />
          )}
        </div>
      </main>

      {/* COMMAND PALETTE OVERLAY */}
      {showCommands && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh]">
          <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
              <Search className="text-slate-400" size={24} />
              <input 
                autoFocus 
                placeholder="Link to page..." 
                className="flex-1 text-xl font-medium outline-none"
                value={commandQuery}
                onChange={(e) => setShowCommandQuery(e.target.value)}
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {allPages.filter(p => p.title.toLowerCase().includes(commandQuery.toLowerCase())).map(page => (
                <button 
                  key={page.path}
                  onClick={() => {
                    const link = `[${page.title}](/${page.path})`;
                    setPageData({ ...pageData, body: pageData.body + "\n" + link });
                    setShowCommands(false);
                    setShowCommandQuery('');
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-blue-50 text-left transition-colors group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-lg">{page.title}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">{page.path}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
