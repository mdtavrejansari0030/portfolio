const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8080;
const PUBLIC_DIR = __dirname;
const DB_PATH = path.join(PUBLIC_DIR, 'data', 'db.json');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Ensure database folders and uploads folder exist
if (!fs.existsSync(path.join(PUBLIC_DIR, 'data'))) {
  fs.mkdirSync(path.join(PUBLIC_DIR, 'data'), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

// Helper to read DB
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { content: [], settings: {} };
  }
}

// Helper to write DB
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    const jsContent = `window.cmsDatabase = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync(path.join(PUBLIC_DIR, 'data', 'db.js'), jsContent, 'utf8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Helper to calculate reading time & word count
function analyzeContentText(htmlContent) {
  // Strip HTML tags to count words
  const cleanText = htmlContent.replace(/<[^>]*>/g, ' ');
  const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  // Estimate 200 words per minute
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  return {
    wordCount,
    readingTime: `${readingTimeMinutes} min`
  };
}

// Helper to generate Sitemap, Robots and RSS Feed
function generateSEOMetadata() {
  const db = readDB();
  const domain = 'https://mdtavrej.com'; // Change to user's domain when ready
  const publishedItems = db.content.filter(item => item.status === 'published');

  // 1. Generate sitemap.xml
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Static pages
  const staticPages = ['', '/about', '/contact', '/articles', '/projects', '/case-studies', '/resources'];
  staticPages.forEach(p => {
    sitemap += `  <url>\n    <loc>${domain}${p}</loc>\n    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
  });

  // Dynamic pages based on type
  publishedItems.forEach(item => {
    let route = '';
    if (item.type === 'articles') route = '/article';
    else if (item.type === 'projects') route = '/project';
    else if (item.type === 'case_studies') route = '/case-study';
    else if (item.type === 'resources') route = '/resource';
    
    if (route) {
      sitemap += `  <url>\n    <loc>${domain}${route}/?slug=${item.slug}</loc>\n    <priority>0.6</priority>\n  </url>\n`;
    }
  });
  sitemap += '</urlset>';
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf8');

  // 2. Generate robots.txt
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /dashboard/\nSitemap: ${domain}/sitemap.xml\n`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robots, 'utf8');

  // 3. Generate RSS Feed (feed.xml)
  let rss = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  rss += '<channel>\n';
  rss += `  <title>Md Tavrej Ansari | Portfolio Feed</title>\n`;
  rss += `  <link>${domain}</link>\n`;
  rss += `  <description>Acquisition, tracking and performance marketing insights</description>\n`;
  rss += `  <atom:link href="${domain}/feed.xml" rel="self" type="application/rss+xml" />\n`;

  publishedItems.forEach(item => {
    let route = '';
    if (item.type === 'articles') route = '/article';
    else if (item.type === 'projects') route = '/project';
    else if (item.type === 'case_studies') route = '/case-study';
    else if (item.type === 'resources') route = '/resource';
    
    if (route) {
      rss += '  <item>\n';
      rss += `    <title>${item.title.replace(/&/g, '&amp;')}</title>\n`;
      rss += `    <link>${domain}${route}/?slug=${item.slug}</link>\n`;
      rss += `    <guid>${domain}${route}/?slug=${item.slug}</guid>\n`;
      rss += `    <pubDate>${item.publishedDate}</pubDate>\n`;
      rss += `    <description>${item.excerpt.replace(/&/g, '&amp;')}</description>\n`;
      rss += '  </item>\n';
    }
  });

  rss += '</channel>\n';
  rss += '</rss>';
  fs.writeFileSync(path.join(PUBLIC_DIR, 'feed.xml'), rss, 'utf8');
  console.log('SEO xml feeds generated.');
}

// Generate once on startup
generateSEOMetadata();
try {
  const db = readDB();
  const jsContent = `window.cmsDatabase = ${JSON.stringify(db, null, 2)};`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'data', 'db.js'), jsContent, 'utf8');
} catch(e) {}

// Authentication middleware check
function isAuthenticated(req) {
  return true;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname}`);
  try {
    fs.appendFileSync(path.join(PUBLIC_DIR, 'data', 'debug.log'), `[${new Date().toISOString()}] ${req.method} ${pathname}\nHeaders: ${JSON.stringify(req.headers)}\n`, 'utf8');
  } catch(e) {}

  // CORS Headers for API requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': 2592000 // 30 days
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // --- API Endpoint: Login ---
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify({ success: true, token: 'mock-token-12345' }));
    return;
  }

  // --- API Endpoint: GET Content list ---
  if (pathname.startsWith('/api/content') && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(db));
    return;
  }

  // --- API Endpoint: POST Create Content ---
  if (pathname === '/api/content' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify({ success: false, message: 'Unauthorized session' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        const db = readDB();
        
        // Add parsed analytics, metadata
        const analysis = analyzeContentText(item.content || '');
        const dateStr = new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }); // e.g. "31 July 2026"
        
        const newItem = {
          id: 'item-' + Date.now(),
          type: item.type || 'articles',
          title: item.title,
          slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          status: item.status || 'draft',
          publishedDate: dateStr,
          updatedDate: dateStr,
          lastUpdatedTimestamp: Date.now(),
          readingTime: analysis.readingTime,
          wordCount: analysis.wordCount,
          category: item.category || 'General',
          tags: item.tags || [],
          author: db.settings.author_name || 'Md Tavrej Ansari',
          excerpt: item.excerpt || (item.content ? item.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : ''),
          content: item.content || '',
          seoTitle: item.seoTitle || item.title,
          metaDescription: item.metaDescription || '',
          canonicalUrl: item.canonicalUrl || `/${item.type.replace(/s$/, '')}/?slug=${item.slug}`,
          focusKeyword: item.focusKeyword || '',
          ogTitle: item.ogTitle || item.title,
          ogDescription: item.ogDescription || item.metaDescription || '',
          twitterCard: item.twitterCard || 'summary_large_image',
          schemaFaqs: item.schemaFaqs || [],
          views: 0,
          clicks: 0,
          avgReadTime: 0
        };

        db.content.push(newItem);
        writeDB(db);
        generateSEOMetadata();

        res.writeHead(201, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ success: true, item: newItem }));
      } catch (err) {
        console.error(err);
        res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ success: false, message: 'Invalid payload' }));
      }
    });
    return;
  }

  // --- API Endpoint: PUT Edit Content ---
  if (pathname.startsWith('/api/content/') && req.method === 'PUT') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify({ success: false, message: 'Unauthorized session' }));
      return;
    }

    const id = req.url.substring(13);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updatedFields = JSON.parse(body);
        const db = readDB();
        const index = db.content.findIndex(item => item.id === id);

        if (index === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...headers });
          res.end(JSON.stringify({ success: false, message: 'Item not found' }));
          return;
        }

        const currentItem = db.content[index];
        const analysis = analyzeContentText(updatedFields.content || currentItem.content);
        const dateStr = new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        // Merge updated fields
        const mergedItem = {
          ...currentItem,
          ...updatedFields,
          id: currentItem.id, // preserve id
          updatedDate: dateStr,
          lastUpdatedTimestamp: Date.now(),
          readingTime: analysis.readingTime,
          wordCount: analysis.wordCount
        };

        db.content[index] = mergedItem;
        writeDB(db);
        generateSEOMetadata();

        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ success: true, item: mergedItem }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ success: false, message: 'Invalid payload' }));
      }
    });
    return;
  }

  // --- API Endpoint: DELETE Content ---
  if (pathname.startsWith('/api/content/') && req.method === 'DELETE') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify({ success: false, message: 'Unauthorized session' }));
      return;
    }

    const id = req.url.substring(13);
    const db = readDB();
    const index = db.content.findIndex(item => item.id === id);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify({ success: false, message: 'Item not found' }));
      return;
    }

    db.content.splice(index, 1);
    writeDB(db);
    generateSEOMetadata();

    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // --- API Endpoint: File Upload ---
  if (pathname === '/api/media/upload' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify({ success: false, message: 'Unauthorized session' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { filename, base64 } = JSON.parse(body);
        if (!filename || !base64) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
          res.end(JSON.stringify({ success: false, message: 'Filename and base64 string are required' }));
          return;
        }

        // Clean name
        const cleanName = filename.toLowerCase().replace(/[^a-z0-9.-]+/g, '_');
        const ext = path.extname(cleanName);
        const baseName = path.basename(cleanName, ext);

        // Convert base64 data to buffer
        const buffer = Buffer.from(base64, 'base64');
        const uploadPath = path.join(UPLOADS_DIR, cleanName);

        // Write upload to disk
        fs.writeFileSync(uploadPath, buffer);
        console.log(`Uploaded file: ${cleanName}`);

        res.writeHead(201, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ success: true, url: `/uploads/${cleanName}`, name: cleanName }));
      } catch (err) {
        console.error(err);
        res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ success: false, message: 'Failed to write file' }));
      }
    });
    return;
  }

  // --- API Endpoint: Get Media Library list ---
  if (pathname === '/api/media' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      const list = files.map(file => ({
        name: file,
        url: `/uploads/${file}`,
        sizeBytes: fs.statSync(path.join(UPLOADS_DIR, file)).size
      }));
      res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify(list));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify({ success: false, message: 'Could not read media files' }));
    }
    return;
  }

  // --- Static Files Request Handler ---
  let filePath = path.join(PUBLIC_DIR, pathname);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`CMS Development server running at http://localhost:${PORT}/`);
  console.log(`Access Admin Panel at http://localhost:${PORT}/admin/`);
});
