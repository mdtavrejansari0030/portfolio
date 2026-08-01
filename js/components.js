/**
 * Reusable Components and Layout Shell Controls
 */

// 1. REUSABLE GLOBAL NAVBAR COMPONENT
class GlobalNavbar extends HTMLElement {
  connectedCallback() {
    const currentPath = window.location.pathname;
    
    // Determine active tab based on clean path matching
    const isHome = currentPath === '/' || currentPath.endsWith('/index.html') || 
                   (currentPath.endsWith('/') && 
                    !currentPath.includes('/projects') && 
                    !currentPath.includes('/case-studies') && 
                    !currentPath.includes('/articles') && 
                    !currentPath.includes('/resources') && 
                    !currentPath.includes('/about') && 
                    !currentPath.includes('/contact'));
                    
    const isProjects = currentPath.includes('/projects') || currentPath.includes('/project');
    const isCaseStudies = currentPath.includes('/case-studies') || currentPath.includes('/case-study');
    const isArticles = currentPath.includes('/articles') || currentPath.includes('/article');
    const isResources = currentPath.includes('/resources');
    const isAbout = currentPath.includes('/about');
    const isContact = currentPath.includes('/contact');
    
    this.innerHTML = `
      <header class="header-navbar">
        <div class="container navbar-container">
          <a href="/" class="nav-logo" aria-label="Md Tavrej Ansari Portfolio Home" style="font-family: var(--font-heading); font-weight: 700; font-size: var(--font-size-md); text-decoration: none; color: var(--color-text-primary); border: 1px solid var(--color-border); padding: var(--space-xxs) var(--space-sm); border-radius: var(--radius-sm); letter-spacing: 0.05em; display: inline-block;">
            MTA.
          </a>

          <button class="mobile-nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle Navigation Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav class="nav-menu" id="nav-menu" aria-label="Main Navigation">
            <ul class="nav-list">
              <li><a href="/" class="nav-link ${isHome ? 'active' : ''}">Home</a></li>
              <li><a href="/projects" class="nav-link ${isProjects ? 'active' : ''}">Work</a></li>
              <li><a href="/case-studies" class="nav-link ${isCaseStudies ? 'active' : ''}">Case Studies</a></li>
              <li><a href="/articles" class="nav-link ${isArticles ? 'active' : ''}">Insights</a></li>
              <li><a href="/resources" class="nav-link ${isResources ? 'active' : ''}">Portfolio</a></li>
              <li><a href="/about" class="nav-link ${isAbout ? 'active' : ''}">About</a></li>
              <li><a href="/contact" class="nav-link ${isContact ? 'active' : ''}">Get in Touch</a></li>
            </ul>

            <div class="nav-actions">
              <button class="btn btn-secondary btn-icon theme-toggle" aria-label="Toggle Color Theme" title="Toggle Theme">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-sun" style="display: none;">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-moon">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </button>
              <a href="/contact" class="btn btn-primary" aria-label="Book Strategy Call">
                Book Strategy Call
              </a>
            </div>
          </nav>
        </div>
      </header>
    `;
    this.setupInteractions();
  }

  setupInteractions() {
    const toggleBtn = this.querySelector('.mobile-nav-toggle');
    const navMenu = this.querySelector('.nav-menu');
    const themeBtn = this.querySelector('.theme-toggle');
    const sunIcon = this.querySelector('.theme-icon-sun');
    const moonIcon = this.querySelector('.theme-icon-moon');
    const navLinks = this.querySelectorAll('.nav-link, .theme-toggle, .btn-primary');

    const isMobileLayout = () => window.innerWidth <= 992;

    const setLinksTabbable = (tabbable) => {
      const val = tabbable ? '0' : '-1';
      navLinks.forEach(link => {
        link.setAttribute('tabindex', val);
      });
    };

    // Initialize link accessibility on load
    if (isMobileLayout()) {
      setLinksTabbable(false);
    }

    // Toggle menu state
    const toggleMenu = (forceClose = false) => {
      const isOpen = forceClose ? false : !navMenu.classList.contains('open');
      navMenu.classList.toggle('open', isOpen);
      toggleBtn.classList.toggle('active', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen);
      
      if (isMobileLayout()) {
        setLinksTabbable(isOpen);
        if (isOpen) {
          // Focus the first link when open
          setTimeout(() => navLinks[0].focus(), 100);
        } else {
          toggleBtn.focus();
        }
      }
    };

    toggleBtn.addEventListener('click', () => toggleMenu());

    // Escape key handling
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        toggleMenu(true);
      }
    });

    // Handle viewport changes to reset link tabindexes
    window.addEventListener('resize', () => {
      if (!isMobileLayout()) {
        navLinks.forEach(link => link.removeAttribute('tabindex'));
        navMenu.classList.remove('open');
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      } else {
        const isOpen = navMenu.classList.contains('open');
        setLinksTabbable(isOpen);
      }
    });

    // Theme detection
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    this.updateThemeIcons(currentTheme, sunIcon, moonIcon);

    // Theme toggle trigger
    themeBtn.addEventListener('click', () => {
      const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      this.updateThemeIcons(theme, sunIcon, moonIcon);
    });
  }

  updateThemeIcons(theme, sun, moon) {
    if (theme === 'dark') {
      sun.style.display = 'block';
      moon.style.display = 'none';
    } else {
      sun.style.display = 'none';
      moon.style.display = 'block';
    }
  }
}

customElements.define('global-navbar', GlobalNavbar);

// 2. REUSABLE GLOBAL FOOTER COMPONENT
class GlobalFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="global-footer" aria-label="Site Footer">
        <div class="container">
          <div class="footer-top footer-grid">
            <div class="footer-brand">
              <div class="footer-logo" style="font-family: var(--font-heading); font-weight: 700; font-size: var(--font-size-md); color: var(--color-text-primary); letter-spacing: var(--ls-tight);">
                Md Tavrej Ansari
              </div>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-xs); line-height: 1.4; max-width: 32ch;">
                Performance marketer building optimized digital marketing systems that turn web traffic into revenue.
              </p>
              
              <!-- Social Icons (No Text labels) -->
              <div class="flex-group" style="gap: var(--space-md); margin-top: var(--space-md);">
                <a href="https://linkedin.com/in/md-tavrej-ansari" class="footer-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style="color: var(--color-text-secondary); transition: color var(--transition-fast); display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                </a>
                <a href="https://instagram.com/md_tavrej_ansari" class="footer-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style="color: var(--color-text-secondary); transition: color var(--transition-fast); display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="https://behance.net/md-tavrej-ansari" class="footer-link" target="_blank" rel="noopener noreferrer" aria-label="Behance" style="color: var(--color-text-secondary); transition: color var(--transition-fast); display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.228 15.011c.523 0 .961-.137 1.309-.408.351-.274.524-.69.524-1.246 0-.528-.182-.931-.541-1.21-.36-.282-.82-.422-1.381-.422H5.666v3.286h2.562zm-.397-5.597c.435 0 .8-.114 1.096-.341.296-.229.444-.559.444-.988 0-.422-.143-.733-.427-.932-.284-.2-.676-.299-1.173-.299H5.666v2.56h2.165zM0 0v24h24V0H0zm12.392 13.914c0 1.256-.375 2.227-1.127 2.914-.751.687-1.818 1.03-3.201 1.03H3.616V7.079h5.183c1.238 0 2.203.284 2.894.851.691.567 1.037 1.365 1.037 2.392 0 .762-.191 1.391-.571 1.884.59.352 1.033.919 1.233 1.708zm10.371.18c0 .874-.199 1.637-.597 2.29-.398.653-.969 1.159-1.714 1.517-.745.358-1.635.538-2.67.538-1.282 0-2.348-.309-3.2-.926-.852-.617-1.428-1.503-1.73-2.656-.301-1.153-.452-2.483-.452-3.992 0-1.514.153-2.836.46-3.967.307-1.131.89-1.996 1.748-2.597.859-.601 1.942-.902 3.249-.902 1.222 0 2.229.271 3.023.815.793.543 1.332 1.318 1.616 2.325.284 1.007.426 2.201.426 3.582h-8.083c.012.926.191 1.636.536 2.13.345.495.845.742 1.501.742.84 0 1.401-.39 1.682-1.168h2.955zm-1.077-4.48c-.023-.772-.21-1.361-.561-1.764-.352-.403-.847-.605-1.488-.605-.629 0-1.118.204-1.468.614-.349.41-.532 1.002-.547 1.755h4.064zM19.98 9.04h-4.32V7.96h4.32v1.08z"/></svg>
                </a>
                <a href="https://youtube.com/@mdtavrejansari" class="footer-link" target="_blank" rel="noopener noreferrer" aria-label="YouTube" style="color: var(--color-text-secondary); transition: color var(--transition-fast); display: inline-flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                </a>
              </div>
            </div>
            
            <nav class="footer-nav-col" aria-label="Footer Navigation Links">
              <h3 class="footer-nav-title">Navigation</h3>
              <ul class="footer-links-list">
                <li><a href="/" class="footer-link">Home</a></li>
                <li><a href="/projects" class="footer-link">Work</a></li>
                <li><a href="/case-studies" class="footer-link">Case Studies</a></li>
                <li><a href="/articles" class="footer-link">Insights</a></li>
              </ul>
            </nav>

            <nav class="footer-nav-col" aria-label="Footer Secondary Links">
              <h3 class="footer-nav-title">Explore</h3>
              <ul class="footer-links-list">
                <li><a href="/resources" class="footer-link">Portfolio</a></li>
                <li><a href="/about" class="footer-link">About</a></li>
                <li><a href="/contact" class="footer-link">Get in Touch</a></li>
              </ul>
            </nav>

            <div class="footer-contact">
              <h3 class="footer-nav-title">Contact</h3>
              <address class="footer-links-list" style="font-style: normal;">
                <span class="footer-link">Delhi, India (Open to Global Work)</span>
                <a href="mailto:contact@mdtavrejansari.com" class="footer-link" style="text-decoration: none;">
                  contact@mdtavrejansari.com
                </a>
              </address>
            </div>
          </div>

          <div class="footer-bottom">
            <span class="copyright">&copy; ${new Date().getFullYear()} Md Tavrej Ansari. All rights reserved.</span>
            <button class="btn btn-text back-to-top-btn" style="display: inline-flex; align-items: center; gap: var(--space-xs); font-size: var(--font-size-xs); font-weight: var(--fw-semibold); color: var(--color-text-secondary); cursor: pointer; border: none; background: transparent; padding: 0; transition: color var(--transition-fast);" aria-label="Scroll to top">
              <span>Back to Top</span>
              <span aria-hidden="true" style="transition: transform var(--transition-fast);">&uarr;</span>
            </button>
          </div>
        </div>
      </footer>
    `;
    this.setupBackToTop();
  }

  setupBackToTop() {
    const btn = this.querySelector('.back-to-top-btn');
    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

customElements.define('global-footer', GlobalFooter);
