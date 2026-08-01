/**
 * Main Application Logic & Interactive State Controls
 */

document.addEventListener('DOMContentLoaded', () => {
  initializeSearchFilters();
  initializeForms();
  initializePagination();
  initializeAccordions();
});

/**
 * Filter and Search Interactions (Mock dynamic rendering)
 */
function initializeSearchFilters() {
  const filterPills = document.querySelectorAll('.filter-pill');
  const searchInput = document.querySelector('.search-input');
  const cardsGrid = document.querySelector('[data-card-grid]');

  if (filterPills.length > 0) {
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        // Toggle Active
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        // Trigger Loading Shimmer on Cards Grid to simulate CMS data fetching
        if (cardsGrid) {
          triggerShimmerLoading(cardsGrid);
        }
      });
    });
  }

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (cardsGrid) {
          triggerShimmerLoading(cardsGrid);
        }
      }, 500); // Debounce typing inputs
    });
  }
}

/**
 * Simulate Shimmer loading state when filters/search changes
 */
function triggerShimmerLoading(gridElement) {
  const originalHTML = gridElement.innerHTML;
  const cards = gridElement.querySelectorAll('.card, .skeleton-container');
  
  cards.forEach(card => {
    card.style.opacity = '0.4';
    card.classList.add('animate-shimmer');
  });

  setTimeout(() => {
    cards.forEach(card => {
      card.style.opacity = '1';
      card.classList.remove('animate-shimmer');
    });
  }, 800);
}

/**
 * Forms (Submission Success/Loading simulation)
 */
function initializeForms() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span style="display:inline-flex; align-items:center; gap:var(--space-xs);">
            <span class="loading-spinner" style="width:16px; height:16px; border-width:1px;"></span>
            [Submitting...]
          </span>
        `;
      }

      // Simulate network request delays
      setTimeout(() => {
        // Reset form
        form.reset();

        // Swap to Success State inside form or relative container
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success mt-md';
        successMessage.innerHTML = `
          <div class="alert-icon">&check;</div>
          <div class="alert-content">
            <h4 class="alert-title">[Message Sent Successfully]</h4>
            <p class="alert-message">[Your request has been received and processed. We will connect with you shortly.]</p>
          </div>
          <button class="btn btn-text" style="font-size: 1.25rem; line-height: 1; padding: 0 var(--space-xs);" aria-label="Dismiss Alert" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        form.appendChild(successMessage);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }, 1500);
    });
  });
}

/**
 * Pagination (Simulation)
 */
function initializePagination() {
  const pageNums = document.querySelectorAll('.page-num');
  const cardsGrid = document.querySelector('[data-card-grid]');

  pageNums.forEach(num => {
    num.addEventListener('click', () => {
      if (num.textContent.trim() !== '...' && !num.classList.contains('active')) {
        pageNums.forEach(n => n.classList.remove('active'));
        num.classList.add('active');
        
        if (cardsGrid) {
          triggerShimmerLoading(cardsGrid);
          window.scrollTo({
            top: cardsGrid.getBoundingClientRect().top + window.scrollY - 100,
            behavior: 'smooth'
          });
        }
      }
    });
  });
}

/**
 * Accordion (FAQ) Toggle Logic
 */
function initializeAccordions() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      e.preventDefault();
      const item = header.parentElement;
      const isActive = item.classList.contains('active');
      
      // Close all accordion items
      document.querySelectorAll('.accordion-item').forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherHeader = otherItem.querySelector('.accordion-header');
        if (otherHeader) {
          otherHeader.setAttribute('aria-expanded', 'false');
        }
      });
      
      // If it was not active before, open it now
      if (!isActive) {
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });
}
