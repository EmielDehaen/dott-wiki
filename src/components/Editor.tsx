import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

export default function Editor({ content, onUpdate, sourceMode, onNavigate }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Initialize CodeMirror for Source Mode
  useEffect(() => {
    if (sourceMode && editorRef.current && !viewRef.current) {
      const view = new EditorView({
        doc: content,
        extensions: [
          basicSetup,
          markdown(),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onUpdate(update.state.doc.toString());
            }
          }),
        ],
        parent: editorRef.current,
      });
      viewRef.current = view;
    } else if (!sourceMode && viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [sourceMode]);

  // Sync content to CodeMirror if changed from outside
  useEffect(() => {
    if (viewRef.current && content !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: content }
      });
    }
  }, [content]);

  if (sourceMode) {
    return (
      <div className="flex-1 bg-[#282c34] overflow-hidden">
        <div ref={editorRef} className="h-full text-sm font-mono" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-20 select-text">
      <article className="prose prose-slate prose-lg max-w-none">
        <ReactMarkdown 
          rehypePlugins={[rehypeHighlight]}
          components={{
            a: ({ node, ...props }) => {
              const handleClick = (e: React.MouseEvent) => {
                const href = props.href;
                if (href && !href.startsWith('http')) {
                  e.preventDefault();
                  // Always treat as root-relative path
                  const cleanPath = href.startsWith('/') ? href.slice(1) : href;
                  onNavigate(cleanPath);
                }
              };
              return <a {...props} onClick={handleClick} className="text-blue-600 font-bold underline cursor-pointer" />;
            },
            pre: ({ node, ...props }) => (
              <pre {...props} className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800" />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
