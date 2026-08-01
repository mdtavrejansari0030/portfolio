// CMS Admin JS Client Handler

const API_BASE = (window.location.protocol === 'file:' || window.location.port !== '8080') ? 'http://localhost:8080' : '';

let allContent = [];
let mediaList = [];
let editingItemId = null; // null if creating new
let faqCount = 0;

// On page load, verify session
window.addEventListener('DOMContentLoaded', () => {
  // Automatically authenticate for seamless entry
  sessionStorage.setItem('token', 'mock-token-12345');
  showDashboard();

  // Bind Auth events
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Bind Catalog actions
  document.getElementById('new-content-btn').addEventListener('click', () => openEditor(null));
  document.getElementById('catalog-type-filter').addEventListener('change', renderCatalogTable);

  // Bind Media events
  document.getElementById('media-file-input').addEventListener('change', handleMediaUpload);

  // Bind Editor events
  document.getElementById('editor-close-btn').addEventListener('click', closeEditor);
  document.getElementById('editor-save-draft-btn').addEventListener('click', () => savePost(true));
  document.getElementById('editor-publish-btn').addEventListener('click', () => savePost(false));
  
  // Real-time editor updates
  const contentArea = document.getElementById('post-content-textarea');
  contentArea.addEventListener('input', handleEditorInput);
  document.getElementById('post-title-input').addEventListener('input', autoGenerateFields);

  // Format Toolbar events
  setupFormatToolbar();

  // FAQ builder events
  document.getElementById('faq-add-item-btn').addEventListener('click', () => appendFAQInput('', ''));

  // Settings save
  document.getElementById('settings-save-btn').addEventListener('click', saveSettings);
});

// Auth Handlers
function showLogin() {
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('dashboard-wrapper').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('dashboard-wrapper').style.display = 'block';
  refreshDashboardData();
}

async function handleLogin(e) {
  e.preventDefault();
  try {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bypass: true })
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('token', data.token);
      showDashboard();
    }
  } catch (err) {
    console.error(err);
    alert('Server authentication error: ' + err.message);
  }
}

function handleLogout() {
  sessionStorage.removeItem('token');
  showLogin();
}

// Data Loaders
async function refreshDashboardData() {
  const token = sessionStorage.getItem('token');
  try {
    // 1. Fetch content
    const res = await fetch(API_BASE + '/api/content');
    const db = await res.json();
    allContent = db.content || [];
    
    // Set author settings input
    document.getElementById('settings-author').value = db.settings.author_name || 'Md Tavrej Ansari';

    // 2. Fetch media
    const mediaRes = await fetch(API_BASE + '/api/media');
    mediaList = await mediaRes.json();

    // 3. Render dashboard
    calculateMetrics();
    renderCatalogTable();
    renderMediaGallery();
  } catch (err) {
    console.error(err);
    alert('Error loading CMS dashboard data: ' + err.message);
  }
}

// Metrics Engine
function calculateMetrics() {
  const articles = allContent.filter(c => c.type === 'articles');
  const caseStudies = allContent.filter(c => c.type === 'case_studies');
  const projects = allContent.filter(c => c.type === 'projects');
  const resources = allContent.filter(c => c.type === 'resources');

  document.getElementById('metric-articles-count').innerText = articles.length;
  document.getElementById('metric-articles-sub').innerText = `${articles.filter(a => a.status === 'published').length} Published · ${articles.filter(a => a.status === 'draft').length} Drafts`;

  document.getElementById('metric-cases-count').innerText = caseStudies.length;
  document.getElementById('metric-cases-sub').innerText = `${caseStudies.filter(c => c.status === 'published').length} Published`;

  document.getElementById('metric-projects-count').innerText = projects.length;
  document.getElementById('metric-projects-sub').innerText = `${projects.filter(p => p.status === 'published').length} Published`;

  document.getElementById('metric-resources-count').innerText = resources.length;
  document.getElementById('metric-resources-sub').innerText = `${resources.filter(r => r.status === 'published').length} Published`;

  // Views & Clicks
  const totalViews = allContent.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalClicks = allContent.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const clickPercent = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;
  document.getElementById('metric-views-count').innerText = totalViews;
  document.getElementById('metric-views-clicks').innerText = `${totalClicks} Clicks (Avg ${clickPercent}%)`;

  // Average read time sum
  const totalTimeSum = allContent.reduce((sum, item) => {
    const mins = parseInt(item.readingTime) || 1;
    return sum + mins;
  }, 0);
  const avgTime = allContent.length > 0 ? Math.round(totalTimeSum / allContent.length) : 0;
  document.getElementById('metric-readtime-count').innerText = `${avgTime} min`;
}

// Catalog List Table Rendering
function renderCatalogTable() {
  const tbody = document.getElementById('catalog-list-tbody');
  tbody.innerHTML = '';
  const filterType = document.getElementById('catalog-type-filter').value;

  const filtered = allContent.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  // Sort by latest timestamp
  filtered.sort((a, b) => b.lastUpdatedTimestamp - a.lastUpdatedTimestamp);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: var(--space-md);">No catalog items match criteria. Click Create New to add.</td></tr>';
    return;
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    
    // Title with excerpt
    const tdTitle = document.createElement('td');
    tdTitle.style.padding = '10px 0';
    tdTitle.innerHTML = `
      <div style="font-weight: var(--fw-semibold); color: var(--color-text-primary);">${item.title}</div>
      <div style="font-size: 10px; color: var(--color-text-muted); max-width: 400px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.excerpt || ''}</div>
    `;
    
    // Type Badge
    const tdType = document.createElement('td');
    tdType.style.padding = '10px var(--space-sm)';
    tdType.innerHTML = `<span class="badge" style="background: var(--color-bg-tertiary);">${item.type.replace(/_/g, ' ')}</span>`;
    
    // Status Badge
    const tdStatus = document.createElement('td');
    tdStatus.style.padding = '10px var(--space-sm)';
    const statusColor = item.status === 'published' ? 'var(--color-success)' : 'var(--color-text-muted)';
    const statusBg = item.status === 'published' ? 'var(--color-success-bg)' : 'transparent';
    tdStatus.innerHTML = `<span class="badge" style="color: ${statusColor}; background: ${statusBg}; border: 1px solid ${item.status === 'published' ? 'var(--color-success-border)' : 'var(--color-border)'};">${item.status}</span>`;

    // Last Updated Display
    const tdUpdated = document.createElement('td');
    tdUpdated.style.padding = '10px var(--space-sm)';
    tdUpdated.innerText = item.updatedDate || item.publishedDate;

    // Actions Button triggers
    const tdActions = document.createElement('td');
    tdActions.style.padding = '10px 0';
    tdActions.style.textAlign = 'right';
    
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-action';
    btnEdit.innerText = 'Edit';
    btnEdit.addEventListener('click', () => openEditor(item.id));
    
    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-action btn-delete';
    btnDelete.innerText = 'Delete';
    btnDelete.addEventListener('click', () => deleteContentItem(item.id));

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdTitle);
    tr.appendChild(tdType);
    tr.appendChild(tdStatus);
    tr.appendChild(tdUpdated);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

// Media gallery rendering
function renderMediaGallery() {
  const gallery = document.getElementById('media-gallery');
  gallery.innerHTML = '';

  if (mediaList.length === 0) {
    gallery.innerHTML = '<div style="grid-column: span 4; font-size: 9px; color: var(--color-text-muted); text-align: center; padding: var(--space-md) 0;">Gallery empty</div>';
    return;
  }

  mediaList.forEach(file => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    
    const img = document.createElement('img');
    img.src = file.url;
    img.alt = file.name;
    img.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'gallery-item-overlay';
    overlay.innerText = 'Copy HTML';

    item.appendChild(img);
    item.appendChild(overlay);

    item.addEventListener('click', () => {
      const htmlTag = `<img src="${file.url}" alt="${file.name.split('.')[0]}" style="max-width: 100%; border-radius: var(--radius-xs);">`;
      navigator.clipboard.writeText(htmlTag).then(() => {
        alert('Copied HTML tag: ' + htmlTag);
      });
    });

    gallery.appendChild(item);
  });
}

// Media upload client buffer collector
function handleMediaUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    // extract base64 data
    const base64 = reader.result.split(',')[1];
    const token = sessionStorage.getItem('token');

    try {
      const res = await fetch(API_BASE + '/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename: file.name, base64 })
      });
      const data = await res.json();
      if (data.success) {
        alert('Media file uploaded successfully!');
        refreshDashboardData();
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading media asset');
    }
  };
}

// Quick settings save
async function saveSettings() {
  const author_name = document.getElementById('settings-author').value;
  alert('Author configured as: ' + author_name);
  // Settings API can be optionally enhanced or saved in db local structures
}

// Delete Content
async function deleteContentItem(id) {
  const conf = confirm('Are you sure you want to delete this publication?');
  if (!conf) return;

  const token = sessionStorage.getItem('token');
  try {
    const res = await fetch(API_BASE + `/api/content/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      refreshDashboardData();
    } else {
      alert('Delete failed: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('Delete call failed');
  }
}

// Editor drawer drawer controllers
function openEditor(itemId) {
  editingItemId = itemId;
  faqCount = 0;
  document.getElementById('faq-schema-items').innerHTML = '';

  const drawer = document.getElementById('editor-drawer');
  drawer.style.display = 'flex';

  if (itemId) {
    // Edit existing mode
    document.getElementById('editor-title').innerText = 'Edit Catalog Item';
    const item = allContent.find(c => c.id === itemId);
    if (item) {
      document.getElementById('post-title-input').value = item.title;
      document.getElementById('post-type-select').value = item.type;
      document.getElementById('post-category-input').value = item.category || '';
      document.getElementById('post-tags-input').value = (item.tags || []).join(', ');
      document.getElementById('post-excerpt-input').value = item.excerpt || '';
      document.getElementById('post-content-textarea').value = item.content || '';
      
      // SEO
      document.getElementById('post-seo-title').value = item.seoTitle || '';
      document.getElementById('post-seo-desc').value = item.metaDescription || '';
      document.getElementById('post-seo-keyword').value = item.focusKeyword || '';
      document.getElementById('post-seo-slug').value = item.slug || '';
      document.getElementById('post-seo-canonical').value = item.canonicalUrl || '';
      
      // Socials
      document.getElementById('post-og-title').value = item.ogTitle || '';
      document.getElementById('post-og-desc').value = item.ogDescription || '';
      document.getElementById('post-twitter-card').value = item.twitterCard || 'summary_large_image';
      
      // FAQ schemas load
      if (item.schemaFaqs && item.schemaFaqs.length > 0) {
        item.schemaFaqs.forEach(faq => appendFAQInput(faq.question, faq.answer));
      }
    }
  } else {
    // Create new mode
    document.getElementById('editor-title').innerText = 'Create New Publication';
    document.getElementById('post-title-input').value = '';
    document.getElementById('post-type-select').value = 'articles';
    document.getElementById('post-category-input').value = '';
    document.getElementById('post-tags-input').value = '';
    document.getElementById('post-excerpt-input').value = '';
    document.getElementById('post-content-textarea').value = '';
    
    // Clear SEO
    document.getElementById('post-seo-title').value = '';
    document.getElementById('post-seo-desc').value = '';
    document.getElementById('post-seo-keyword').value = '';
    document.getElementById('post-seo-slug').value = '';
    document.getElementById('post-seo-canonical').value = '';
    document.getElementById('post-og-title').value = '';
    document.getElementById('post-og-desc').value = '';
    document.getElementById('post-twitter-card').value = 'summary_large_image';
  }

  handleEditorInput();
}

function closeEditor() {
  document.getElementById('editor-drawer').style.display = 'none';
}

// Auto generates Slug, SEO Title etc. based on Title input
function autoGenerateFields() {
  const title = document.getElementById('post-title-input').value;
  const slugField = document.getElementById('post-seo-slug');
  const seoTitleField = document.getElementById('post-seo-title');
  const ogTitleField = document.getElementById('post-og-title');

  if (!itemIdActive()) { // only auto-generate for new posts
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    slugField.value = slug;
    seoTitleField.value = `${title} | Md Tavrej Ansari`;
    ogTitleField.value = title;
    
    // Trigger recalculations
    handleEditorInput();
  }
}

function itemIdActive() {
  return editingItemId !== null;
}

// FAQ Inputs builder
function appendFAQInput(question, answer) {
  const container = document.getElementById('faq-schema-items');
  const div = document.createElement('div');
  div.className = 'faq-admin-row';
  div.id = `faq-row-${faqCount}`;

  div.innerHTML = `
    <button type="button" class="faq-remove-btn" onclick="document.getElementById('faq-row-${faqCount}').remove();">&times;</button>
    <input type="text" class="form-input faq-q" placeholder="Question" value="${question}" style="width: 100%; font-size: 10px; padding: 4px;">
    <textarea class="form-input faq-a" placeholder="Answer" style="width: 100%; height: 40px; font-size: 10px; padding: 4px; margin-top: 2px;">${answer}</textarea>
  `;

  container.appendChild(div);
  faqCount++;
}

// Handle real-time metrics and previews
function handleEditorInput() {
  const content = document.getElementById('post-content-textarea').value;
  const previewPane = document.getElementById('content-preview-pane');
  
  // Render HTML preview
  previewPane.innerHTML = content || '<span style="color: var(--color-text-muted);">No content typed yet.</span>';

  // Word count & read time
  const cleanText = content.replace(/<[^>]*>/g, ' ');
  const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  document.getElementById('editor-word-count').innerText = `Words: ${wordCount}`;
  document.getElementById('editor-read-time').innerText = `Est. Read Time: ${readTime} min`;

  // SEO Score calculation
  calculateSEOScore(content, wordCount);
}

// SEO Score calculation rules
function calculateSEOScore(content, wordCount) {
  const title = document.getElementById('post-title-input').value.toLowerCase();
  const keyword = document.getElementById('post-seo-keyword').value.toLowerCase();
  const metaDesc = document.getElementById('post-seo-desc').value;
  const slug = document.getElementById('post-seo-slug').value.toLowerCase();

  let score = 0;
  let recommendations = [];

  if (!title) {
    updateSEOBadge(0, 'Enter title to calculate SEO score');
    return;
  }

  // 1. Keyword setting (20 pts)
  if (keyword) {
    score += 20;
    
    // 2. Keyword in title (20 pts)
    if (title.includes(keyword)) {
      score += 20;
    } else {
      recommendations.push('Add focus keyword to the title');
    }

    // 3. Keyword in content (20 pts)
    if (content.toLowerCase().includes(keyword)) {
      score += 20;
    } else {
      recommendations.push('Include focus keyword in content body');
    }

    // 4. Keyword in slug (10 pts)
    if (slug.includes(keyword.replace(/[^a-z0-9]+/g, '-'))) {
      score += 10;
    } else {
      recommendations.push('Incorporate focus keyword into slug');
    }
  } else {
    recommendations.push('Set focus keyword to analyze parameters');
  }

  // 5. Meta Description Length (15 pts)
  if (metaDesc.length >= 120 && metaDesc.length <= 160) {
    score += 15;
  } else {
    recommendations.push('Keep Meta Description between 120 and 160 characters (current: ' + metaDesc.length + ')');
  }

  // 6. Content word count check (15 pts)
  if (wordCount >= 300) {
    score += 15;
  } else {
    recommendations.push('Write at least 300 words of content (current: ' + wordCount + ')');
  }

  const recText = recommendations.length > 0 ? recommendations[0] : 'SEO Score optimized successfully!';
  updateSEOBadge(score, recText);
}

function updateSEOBadge(score, text) {
  const badge = document.getElementById('seo-score-badge');
  const info = document.getElementById('seo-score-text');
  
  badge.innerText = `${score} / 100`;
  info.innerText = text;

  if (score >= 80) {
    badge.style.color = 'var(--color-success)';
    badge.style.borderColor = 'var(--color-success)';
  } else if (score >= 50) {
    badge.style.color = 'var(--color-warning)';
    badge.style.borderColor = 'var(--color-warning)';
  } else {
    badge.style.color = 'var(--color-error)';
    badge.style.borderColor = 'var(--color-error)';
  }
}

// Setup rich text format button inserting
function setupFormatToolbar() {
  const contentArea = document.getElementById('post-content-textarea');
  const toolbar = document.querySelector('.rich-format-bar');

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const cmd = btn.getAttribute('data-cmd');
    const startPos = contentArea.selectionStart;
    const endPos = contentArea.selectionEnd;
    const text = contentArea.value;
    const selectedText = text.substring(startPos, endPos);

    let replacement = '';

    switch (cmd) {
      case 'h2':
        replacement = `<h2>${selectedText || 'Heading 2'}</h2>`;
        break;
      case 'h3':
        replacement = `<h3>${selectedText || 'Heading 3'}</h3>`;
        break;
      case 'p':
        replacement = `<p>${selectedText || 'Write paragraph text here.'}</p>`;
        break;
      case 'blockquote':
        replacement = `<blockquote>${selectedText || 'Quote text'}</blockquote>`;
        break;
      case 'ul':
        replacement = `<ul>\n  <li>${selectedText || 'Item 1'}</li>\n  <li>Item 2</li>\n</ul>`;
        break;
      case 'table':
        replacement = `<table>\n  <thead>\n    <tr><th>Header 1</th><th>Header 2</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Cell A</td><td>Cell B</td></tr>\n  </tbody>\n</table>`;
        break;
      case 'link':
        const url = prompt('Enter link URL:', 'https://');
        if (url) replacement = `<a href="${url}">${selectedText || 'Link Text'}</a>`;
        else return;
        break;
      case 'btn':
        const btnUrl = prompt('Enter button URL:', '/');
        if (btnUrl) replacement = `<a href="${btnUrl}" class="btn btn-primary">${selectedText || 'Call To Action'}</a>`;
        else return;
        break;
      case 'callout':
        replacement = `<div style="padding: var(--space-md); border: 1px solid var(--color-border); border-radius: var(--radius-xs); background: var(--color-bg-tertiary); margin-bottom: var(--space-md);">\n  <strong>Note:</strong> ${selectedText || 'Highlight message contents'}\n</div>`;
        break;
    }

    contentArea.value = text.substring(0, startPos) + replacement + text.substring(endPos);
    contentArea.focus();
    contentArea.selectionStart = startPos + replacement.length;
    contentArea.selectionEnd = startPos + replacement.length;

    handleEditorInput();
  });
}

// Collect form fields and save to backend
async function savePost(isDraft) {
  const token = sessionStorage.getItem('token');
  const title = document.getElementById('post-title-input').value;
  if (!title) {
    alert('Headline Title is required');
    return;
  }

  // Parse FAQs
  const faqs = [];
  const faqRows = document.querySelectorAll('#faq-schema-items .faq-admin-row');
  faqRows.forEach(row => {
    const question = row.querySelector('.faq-q').value;
    const answer = row.querySelector('.faq-a').value;
    if (question && answer) {
      faqs.push({ question, answer });
    }
  });

  const payload = {
    title,
    type: document.getElementById('post-type-select').value,
    status: isDraft ? 'draft' : 'published',
    category: document.getElementById('post-category-input').value || 'General',
    tags: document.getElementById('post-tags-input').value.split(',').map(t => t.trim()).filter(t => t.length > 0),
    excerpt: document.getElementById('post-excerpt-input').value,
    content: document.getElementById('post-content-textarea').value,
    
    // SEO
    seoTitle: document.getElementById('post-seo-title').value,
    metaDescription: document.getElementById('post-seo-desc').value,
    focusKeyword: document.getElementById('post-seo-keyword').value,
    slug: document.getElementById('post-seo-slug').value,
    canonicalUrl: document.getElementById('post-seo-canonical').value,
    
    // Socials
    ogTitle: document.getElementById('post-og-title').value,
    ogDescription: document.getElementById('post-og-desc').value,
    twitterCard: document.getElementById('post-twitter-card').value,
    
    // AEO
    schemaFaqs: faqs
  };

  const url = editingItemId ? `/api/content/${editingItemId}` : '/api/content';
  const method = editingItemId ? 'PUT' : 'POST';

  try {
    const res = await fetch(API_BASE + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('Content saved successfully!');
      closeEditor();
      refreshDashboardData();
    } else {
      alert('Save failed: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('Save server error');
  }
}
