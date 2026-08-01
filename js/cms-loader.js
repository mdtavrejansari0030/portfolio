// Client-Side CMS Content Loader Engine

// Helper to determine relative path prefix to the root directory
const getPrefix = () => {
  const pathLower = window.location.pathname.toLowerCase();
  const subdirs = ['/article', '/project', '/case-study', '/resource', '/articles', '/projects', '/case-studies', '/resources', '/about', '/contact', '/admin'];
  const isSubdir = subdirs.some(dir => pathLower.includes(dir + '/') || pathLower.endsWith(dir) || pathLower.endsWith(dir + '/index.html'));
  return isSubdir ? '../' : './';
};
const prefix = getPrefix();

// Relative path to JSON DB (fallback if local API is unreachable)
const API_BASE = (window.location.protocol === 'file:' || window.location.port !== '8080') ? 'http://localhost:8080' : '';
const DB_URL = API_BASE + '/api/content';
const FALLBACK_DB_URL = `${prefix}data/db.json`;

let cmsDatabase = { content: [], settings: {} };

// Time ago helper for "Recently Updated" section
function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) {
    return mins <= 1 ? 'Updated Just Now' : `Updated ${mins} minutes ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return hours === 1 ? 'Updated 1 hour ago' : `Updated ${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Updated Yesterday';
  return `Updated ${days} days ago`;
}

// Injects SEO meta and JSON-LD schemas into head
function injectSEOMetadata(item) {
  if (!item) return;

  // 1. Update Title and description
  document.title = item.seoTitle || `${item.title} | Md Tavrej Ansari`;
  
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', item.metaDescription || item.excerpt || '');

  // 2. OpenGraph
  const ogTags = {
    'og:title': item.ogTitle || item.title,
    'og:description': item.ogDescription || item.metaDescription || item.excerpt || '',
    'og:type': 'article',
    'og:url': window.location.href,
    'twitter:card': item.twitterCard || 'summary_large_image',
    'twitter:title': item.ogTitle || item.title,
    'twitter:description': item.ogDescription || item.metaDescription || item.excerpt || ''
  };

  for (const [prop, val] of Object.entries(ogTags)) {
    let el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
    if (!el) {
      el = document.createElement('meta');
      if (prop.startsWith('og:')) el.setAttribute('property', prop);
      else el.setAttribute('name', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', val);
  }

  // 3. Canonical link
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', item.canonicalUrl || window.location.origin + window.location.pathname + `?slug=${item.slug}`);

  // 4. Injects schemas
  // Remove existing JSON-LD scripts first
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => s.remove());

  // A. Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": window.location.origin + "/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        "item": window.location.origin + `/${item.type.replace(/_/g, '-')}/`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": item.title,
        "item": window.location.href
      }
    ]
  };
  injectScriptLDJSON(breadcrumbSchema);

  // B. Article Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": item.title,
    "description": item.metaDescription || item.excerpt || '',
    "author": {
      "@type": "Person",
      "name": item.author || "Md Tavrej Ansari",
      "url": window.location.origin + "/about"
    },
    "datePublished": convertToIsoDate(item.publishedDate),
    "dateModified": convertToIsoDate(item.updatedDate || item.publishedDate),
    "mainEntityOfPage": window.location.href
  };
  injectScriptLDJSON(articleSchema);

  // C. FAQ Schema (if FAQs exist)
  if (item.schemaFaqs && item.schemaFaqs.length > 0) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": item.schemaFaqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    injectScriptLDJSON(faqSchema);
  }
}

function injectScriptLDJSON(obj) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(obj);
  document.head.appendChild(script);
}

function convertToIsoDate(dateStr) {
  // Parses "31 July 2026" to ISO string "2026-07-31"
  try {
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const monthIdx = monthNames.indexOf(parts[1].toLowerCase());
      if (monthIdx !== -1) {
        const month = String(monthIdx + 1).padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
  } catch(e) {}
  return new Date().toISOString().split('T')[0];
}

// Fetch database on load
async function initCMS() {
  if (window.cmsDatabase && window.cmsDatabase.content && window.cmsDatabase.content.length > 0) {
    cmsDatabase = window.cmsDatabase;
    hydratePages();
    return;
  }

  try {
    const res = await fetch(DB_URL);
    if (!res.ok) throw new Error('API request failed');
    cmsDatabase = await res.json();
  } catch (err) {
    console.warn('API unreachable, falling back to static database file');
    try {
      const fallbackRes = await fetch(FALLBACK_DB_URL);
      cmsDatabase = await fallbackRes.json();
    } catch (fallbackErr) {
      console.error('Failed to load database:', fallbackErr);
      return;
    }
  }

  // Route/Hydrate based on active DOM container tags
  hydratePages();
}

function hydratePages() {
  const publishedItems = cmsDatabase.content.filter(item => item.status === 'published');

  // 1. Homepage hydrator
  const homeArticles = document.getElementById('home-latest-articles');
  const homeProjects = document.getElementById('home-latest-projects');
  const homeCaseStudies = document.getElementById('home-latest-cases');
  const homeResources = document.getElementById('home-latest-resources');
  const homeRecentlyUpdated = document.getElementById('home-recently-updated');

  if (homeArticles || homeProjects || homeCaseStudies || homeResources || homeRecentlyUpdated) {
    hydrateHomepage(publishedItems);
  }

  // 2. Listing Pages (Articles, Case Studies, Projects, Resources)
  if (document.getElementById('articles-list-grid')) hydrateListContainer('articles', publishedItems);
  if (document.getElementById('case_studies-list-grid')) hydrateListContainer('case_studies', publishedItems);
  if (document.getElementById('projects-list-grid')) hydrateListContainer('projects', publishedItems);
  if (document.getElementById('resources-list-grid')) hydrateListContainer('resources', publishedItems);

  // 3. Detail Pages
  const articleDetail = document.getElementById('article-detail-container');
  const caseDetail = document.getElementById('case-detail-container');
  const projectDetail = document.getElementById('project-detail-container');
  const resourceDetail = document.getElementById('resource-detail-container');

  if (articleDetail) hydrateDetailContainer('articles', articleDetail, publishedItems);
  if (caseDetail) hydrateDetailContainer('case_studies', caseDetail, publishedItems);
  if (projectDetail) hydrateDetailContainer('projects', projectDetail, publishedItems);
  if (resourceDetail) hydrateDetailContainer('resources', resourceDetail, publishedItems);
}

// Hydrate Homepage Elements
function hydrateHomepage(items) {
  // Sort for "Recently Updated"
  const recentlyUpdated = [...items].sort((a, b) => b.lastUpdatedTimestamp - a.lastUpdatedTimestamp);
  const homeRecentlyUpdated = document.getElementById('home-recently-updated');
  if (homeRecentlyUpdated) {
    homeRecentlyUpdated.innerHTML = '';
    recentlyUpdated.slice(0, 4).forEach(item => {
      let route = '';
      if (item.type === 'articles') route = `${prefix}article`;
      else if (item.type === 'projects') route = `${prefix}project`;
      else if (item.type === 'case_studies') route = `${prefix}case-study`;
      else if (item.type === 'resources') route = `${prefix}resource`;
      
      const div = document.createElement('div');
      div.className = 'col-span-12 col-span-6'
      div.style.padding = 'var(--space-sm)';
      div.style.border = '1px solid var(--color-border)';
      div.style.borderRadius = 'var(--radius-xs)';
      div.style.background = 'var(--color-bg-secondary)';
      div.innerHTML = `
        <a href="${route}/?slug=${item.slug}" style="text-decoration: none; color: inherit;">
          <h4 style="font-size: var(--font-size-sm); font-weight: var(--fw-bold); margin: 0; color: var(--color-text-primary);">${item.title}</h4>
          <p style="font-size: 10px; color: var(--color-text-muted); margin-top: 4px;">${formatTimeAgo(item.lastUpdatedTimestamp)}</p>
        </a>
      `;
      homeRecentlyUpdated.appendChild(div);
    });
  }

  // Articles (latest 3)
  const homeArticles = document.getElementById('home-latest-articles');
  if (homeArticles) {
    const list = items.filter(i => i.type === 'articles').slice(0, 3);
    homeArticles.innerHTML = '';
    if (list.length === 0) homeArticles.innerHTML = '<div class="col-span-12" style="text-align: center; color: var(--color-text-muted);">No articles found</div>';
    list.forEach(item => {
      homeArticles.appendChild(createItemCard(item, `${prefix}article`));
    });
  }

  // Projects (latest 3)
  const homeProjects = document.getElementById('home-latest-projects');
  if (homeProjects) {
    const list = items.filter(i => i.type === 'projects').slice(0, 3);
    homeProjects.innerHTML = '';
    if (list.length === 0) homeProjects.innerHTML = '<div class="col-span-12" style="text-align: center; color: var(--color-text-muted);">No projects found</div>';
    list.forEach(item => {
      homeProjects.appendChild(createItemCard(item, `${prefix}project`));
    });
  }

  // Case Studies (latest 3)
  const homeCaseStudies = document.getElementById('home-latest-cases');
  if (homeCaseStudies) {
    const list = items.filter(i => i.type === 'case_studies').slice(0, 3);
    homeCaseStudies.innerHTML = '';
    if (list.length === 0) homeCaseStudies.innerHTML = '<div class="col-span-12" style="text-align: center; color: var(--color-text-muted);">No case studies found</div>';
    list.forEach(item => {
      homeCaseStudies.appendChild(createItemCard(item, `${prefix}case-study`));
    });
  }

  // Resources (latest 3)
  const homeResources = document.getElementById('home-latest-resources');
  if (homeResources) {
    const list = items.filter(i => i.type === 'resources').slice(0, 3);
    homeResources.innerHTML = '';
    if (list.length === 0) homeResources.innerHTML = '<div class="col-span-12" style="text-align: center; color: var(--color-text-muted);">No resources found</div>';
    list.forEach(item => {
      homeResources.appendChild(createItemCard(item, `${prefix}resource`));
    });
  }
}

// Hydrate Lists (Articles, Case Studies, Projects, Resources catalog grids)
function hydrateListContainer(type, items) {
  const container = document.getElementById(`${type}-list-grid`);
  const searchInput = document.getElementById(`${type}-search-input`);
  const filterPills = document.querySelectorAll(`[data-${type}-filter]`);
  
  let currentCategory = 'all';
  let searchQuery = '';

  const listItems = items.filter(i => i.type === type);

  // Render trigger function
  function render() {
    container.innerHTML = '';

    const filtered = listItems.filter(item => {
      const matchesCategory = currentCategory === 'all' || item.category.toLowerCase() === currentCategory.toLowerCase();
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery) ||
        (item.excerpt && item.excerpt.toLowerCase().includes(searchQuery)) ||
        (item.tags || []).some(t => t.toLowerCase().includes(searchQuery));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="col-span-12" style="text-align: center; padding: var(--space-xl) 0; color: var(--color-text-muted);">No publications found matching filters.</div>';
      return;
    }

    let route = '';
    if (type === 'articles') route = `${prefix}article`;
    else if (type === 'projects') route = `${prefix}project`;
    else if (type === 'case_studies') route = `${prefix}case-study`;
    else if (type === 'resources') route = `${prefix}resource`;

    filtered.forEach(item => {
      container.appendChild(createItemCard(item, route));
    });
  }

  // Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      render();
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute(`data-${type}-filter`);
      render();
    });
  });

  // Initial render
  render();
}

// Hydrate Details View (Article, Project, Case Study page details)
function hydrateDetailContainer(type, container, items) {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    container.innerHTML = '<div style="text-align: center; padding: var(--space-xl) 0;"><h2 style="font-family: var(--font-heading);">No slug provided</h2><p style="color: var(--color-text-secondary); margin-top: var(--space-sm);">Please choose a publication from the listings page.</p></div>';
    return;
  }

  const item = items.find(i => i.type === type && i.slug === slug);
  if (!item) {
    container.innerHTML = '<div style="text-align: center; padding: var(--space-xl) 0;"><h2 style="font-family: var(--font-heading);">Publication not found</h2><p style="color: var(--color-text-secondary); margin-top: var(--space-sm);">The requested article may have been drafted or deleted.</p></div>';
    return;
  }

  // Inject Meta details dynamically
  injectSEOMetadata(item);

  // Injects main contents
  container.innerHTML = `
    <!-- Details Header Banner -->
    <div style="margin-bottom: var(--space-lg);" class="flow flow-xs">
      <div class="breadcrumbs">
        <a href="${prefix}">Home</a>
        <span class="breadcrumbs-separator"></span>
        <a href="${prefix}${type.replace(/_/g, '-')}/">${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</a>
        <span class="breadcrumbs-separator"></span>
        <span>Detail</span>
      </div>
      <h1 style="font-size: var(--font-size-xxl); font-family: var(--font-heading); font-weight: var(--fw-bold); color: var(--color-text-primary); margin-top: var(--space-xs); line-height: var(--lh-heading); max-width: 25ch;">
        ${item.title}
      </h1>
      
      <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap; margin-top: var(--space-sm);">
        <span class="badge" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); font-size: 10px; color: var(--color-text-secondary); padding: 2px 8px; border-radius: var(--radius-xs);">${item.publishedDate}</span>
        <span class="badge" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); font-size: 10px; color: var(--color-text-secondary); padding: 2px 8px; border-radius: var(--radius-xs);">${item.readingTime} read</span>
        <span class="badge" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); font-size: 10px; color: var(--color-text-secondary); padding: 2px 8px; border-radius: var(--radius-xs);">${item.category}</span>
      </div>
    </div>

    <!-- Main Rich Body HTML -->
    <div class="cms-rich-content flow" style="margin-top: var(--space-lg); line-height: var(--lh-body); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
      ${item.content}
    </div>

    <!-- Metadata Banner Footer -->
    <div style="margin-top: var(--space-xl); padding: var(--space-md); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); font-size: 11px; color: var(--color-text-muted); display: flex; flex-wrap: wrap; gap: var(--space-md); background: var(--color-bg-secondary); border-radius: var(--radius-xs);">
      <div><strong>Published:</strong> ${item.publishedDate}</div>
      <div><strong>Last Updated:</strong> ${item.updatedDate || item.publishedDate}</div>
      <div><strong>Category:</strong> ${item.category}</div>
      <div><strong>Reading Time:</strong> ${item.readingTime}</div>
      <div><strong>Tags:</strong> ${(item.tags || []).join(', ') || 'None'}</div>
    </div>
  `;

  // Hydrate Related Content Section if container exists
  const relatedGrid = document.getElementById('related-content-grid');
  if (relatedGrid) {
    hydrateRelatedContent(item, items, relatedGrid);
  }
}

// Render Related Content
function hydrateRelatedContent(currentItem, allItems, relatedGrid) {
  // Find up to 3 related items of same type or containing shared tags
  const related = allItems.filter(item => {
    if (item.id === currentItem.id) return false;
    const sameType = item.type === currentItem.type;
    const sharedTag = (item.tags || []).some(t => (currentItem.tags || []).includes(t));
    return sameType || sharedTag;
  });

  relatedGrid.innerHTML = '';
  
  if (related.length === 0) {
    relatedGrid.innerHTML = '<div class="col-span-12" style="font-size: var(--font-size-xs); color: var(--color-text-muted);">No related publications found</div>';
    return;
  }

  let route = '';
  if (currentItem.type === 'articles') route = `${prefix}article`;
  else if (currentItem.type === 'projects') route = `${prefix}project`;
  else if (currentItem.type === 'case_studies') route = `${prefix}case-study`;
  else if (currentItem.type === 'resources') route = `${prefix}resource`;

  related.slice(0, 3).forEach(item => {
    relatedGrid.appendChild(createItemCard(item, route));
  });
}

// Helper to extract first image URL or return dynamic HSL gradient placeholder
const getCardImage = (item) => {
  const imgRegex = /<img[^>]+src="([^">]+)"/;
  const match = item.content ? item.content.match(imgRegex) : null;
  if (match && match[1]) return match[1];
  
  const gradients = [
    'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    'linear-gradient(135deg, #180c2e 0%, #311042 100%)',
    'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
    'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)'
  ];
  const index = Math.abs(item.title.length + (item.category || '').length) % gradients.length;
  return gradients[index];
};

// Shared dynamic Card builder utility
function createItemCard(item, route) {
  const article = document.createElement('article');
  article.className = 'col-span-12 col-span-4 card dynamic-card';
  article.style.display = 'flex';
  article.style.flexDirection = 'column';
  article.style.justifyContent = 'space-between';
  article.style.background = 'var(--color-bg-secondary)';
  article.style.border = '1px solid var(--color-border)';
  article.style.borderRadius = 'var(--radius-md)';
  article.style.overflow = 'hidden';
  article.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
  article.style.cursor = 'pointer';

  const cardVisual = getCardImage(item);
  const hasImage = cardVisual.startsWith('linear-gradient') === false;

  article.innerHTML = `
    <div class="card-header-visual" style="height: 120px; width: 100%; position: relative; ${hasImage ? `background-image: url('${cardVisual}'); background-size: cover; background-position: center;` : `background: ${cardVisual};`}; display: flex; align-items: flex-end; padding: var(--space-sm);">
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%);"></div>
      <span class="badge" style="position: relative; z-index: 2; font-size: 8px; text-transform: uppercase; background: var(--color-accent); color: var(--color-bg-primary); padding: 3px 8px; border-radius: var(--radius-full); font-weight: var(--fw-bold); letter-spacing: 0.5px;">${item.category || 'MARKETING'}</span>
    </div>
    <div class="card-body" style="padding: var(--space-md); flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; gap: var(--space-xs); font-size: 9px; color: var(--color-text-secondary); margin-bottom: var(--space-xs);">
          <span>${item.publishedDate}</span>
          <span>•</span>
          <span>${item.readingTime} read</span>
        </div>
        <h3 style="font-size: var(--font-size-sm); font-weight: var(--fw-bold); color: var(--color-text-primary); margin: 0 0 var(--space-xs) 0; line-height: 1.4; transition: color 0.2s ease;">
          ${item.title}
        </h3>
        <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: var(--lh-body); margin: 0 0 var(--space-md) 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
          ${item.excerpt || ''}
        </p>
      </div>
      <div class="card-footer" style="margin-top: auto; border-top: 1px solid var(--color-border); padding-top: var(--space-sm); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 9px; color: var(--color-text-muted); font-weight: var(--fw-semibold);">Md Tavrej Ansari</span>
        <a href="${route}/?slug=${item.slug}" class="btn-text" style="display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); font-weight: var(--fw-bold); text-decoration: none; color: var(--color-text-accent); transition: transform 0.2s ease;">
          <span>Read Insight</span>
          <span style="font-size: 12px; transition: transform 0.2s ease;" class="arrow">&rarr;</span>
        </a>
      </div>
    </div>
  `;

  article.addEventListener('click', (e) => {
    if (!e.target.closest('a')) {
      window.location.href = `${route}/?slug=${item.slug}`;
    }
  });

  return article;
}

// Fire init on load
initCMS();
