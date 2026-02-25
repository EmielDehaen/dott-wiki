import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun'; // Using Bun's static server
import { readdir, readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import fm from 'front-matter';

const app = new Hono();
app.use('/*', cors());

const DOCS_DIR = join(process.cwd(), 'docs');

// Ensure docs directory exists
try { await mkdir(DOCS_DIR, { recursive: true }); } catch (e) {}

interface DocNode {
  id: string;
  name: string;
  path: string;
  type: 'page' | 'collection';
  children?: DocNode[];
  order: number;
}

async function scanDocs(dir: string): Promise<DocNode[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const nodes: DocNode[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(DOCS_DIR, fullPath);

      if (entry.isDirectory()) {
        nodes.push({
          id: relPath,
          name: entry.name,
          path: relPath,
          type: 'collection',
          order: 999, // Default order
          children: await scanDocs(fullPath)
        });
      } else if (entry.name.endsWith('.md')) {
        const content = await readFile(fullPath, 'utf-8');
        const parsed: any = fm(content);
        nodes.push({
          id: relPath,
          name: parsed.attributes?.title || entry.name.replace('.md', ''),
          path: relPath,
          type: 'page',
          order: parsed.attributes?.order !== undefined ? Number(parsed.attributes.order) : 999
        });
      }
    }
    return nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  } catch (e) {
    return [];
  }
}

// API: Get Table of Contents
app.get('/api/toc', async (c) => {
  const toc = await scanDocs(DOCS_DIR);
  return c.json(toc);
});

// API: Get Flat list of pages for search/links
app.get('/api/pages', async (c) => {
  const toc = await scanDocs(DOCS_DIR);
  const flat: any[] = [];
  const flatten = (nodes: DocNode[]) => {
    nodes.forEach(n => {
      if (n.type === 'page') flat.push({ title: n.name, path: n.path });
      if (n.children) flatten(n.children);
    });
  };
  flatten(toc);
  return c.json(flat);
});

// API: Get specific page content
app.get('/api/page/*', async (c) => {
  const relPath = c.req.path.replace('/api/page/', '');
  const fullPath = join(DOCS_DIR, relPath);
  try {
    const content = await readFile(fullPath, 'utf-8');
    const parsed = fm(content);
    return c.json({ 
      title: (parsed.attributes as any).title || relPath.replace('.md', ''), 
      body: parsed.body, 
      attributes: parsed.attributes 
    });
  } catch (e) {
    return c.json({ error: 'Page not found' }, 404);
  }
});

// API: Save page
app.post('/api/page/*', async (c) => {
  const relPath = c.req.path.replace('/api/page/', '');
  const fullPath = join(DOCS_DIR, relPath);
  const { title, body, order } = await c.req.json();
  
  let currentOrder = order !== undefined ? order : 999;
  try {
    const existing = await readFile(fullPath, 'utf-8');
    const parsed = fm(existing);
    if (order === undefined && (parsed.attributes as any).order !== undefined) {
      currentOrder = (parsed.attributes as any).order;
    }
  } catch (e) {}

  const content = `---
title: ${title}
order: ${currentOrder}
---
${body}`;
  try {
    await writeFile(fullPath, content);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to save' }, 500);
  }
});

// API: Create Page or Collection
app.post('/api/create', async (c) => {
  const { path, title, type } = await c.req.json();
  const fullPath = join(DOCS_DIR, path);
  try {
    if (type === 'collection') {
      await mkdir(fullPath, { recursive: true });
    } else {
      const fileName = path.endsWith('.md') ? path : `${path}.md`;
      const fullFilePath = join(DOCS_DIR, fileName);
      const content = `---
title: ${title}
order: 999
---
# ${title}

Start writing...`;
      await writeFile(fullFilePath, content);
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to create' }, 500);
  }
});

// API: Rename
app.post('/api/rename', async (c) => {
  const { oldPath, newName, type } = await c.req.json();
  const fullOldPath = join(DOCS_DIR, oldPath);
  const parentDir = dirname(fullOldPath);
  const safeNewName = type === 'page' && !newName.endsWith('.md') ? `${newName}.md` : newName;
  const fullNewPath = join(parentDir, safeNewName);

  try {
    await rename(fullOldPath, fullNewPath);
    if (type === 'page') {
      const content = await readFile(fullNewPath, 'utf-8');
      const parsed = fm(content);
      const newContent = `---
title: ${newName.replace('.md', '')}
order: ${(parsed.attributes as any).order || 999}
---
${parsed.body}`;
      await writeFile(fullNewPath, newContent);
    }
    return c.json({ success: true, newPath: relative(DOCS_DIR, fullNewPath) });
  } catch (e) {
    return c.json({ error: 'Rename failed' }, 500);
  }
});

// API: Reorder
app.post('/api/reorder', async (c) => {
  const { updates } = await c.req.json(); // [{ path, order }]
  try {
    for (const update of updates) {
      const fullPath = join(DOCS_DIR, update.path);
      const content = await readFile(fullPath, 'utf-8');
      const parsed = fm(content);
      const newContent = `---
title: ${(parsed.attributes as any).title}
order: ${update.order}
---
${parsed.body}`;
      await writeFile(fullPath, newContent);
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Reorder failed' }, 500);
  }
});

// Serve frontend assets
app.use('/assets/*', serveStatic({ root: './dist' }));
app.get('/*', serveStatic({ path: './dist/index.html' }));

console.log('🚀 Dott Server running on http://localhost:3000');
export default {
  port: 3000,
  hostname: '0.0.0.0',
  fetch: app.fetch,
};
