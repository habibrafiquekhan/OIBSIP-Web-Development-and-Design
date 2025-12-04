// Keep track of whether we're currently in dark mode
let isDarkMode = false;

// Grab all the DOM elements we might need. Script should not explode if some are missing.
const themeToggle = document.getElementById('theme-toggle');
const shareBtn = document.getElementById('share-btn');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const modalClose = document.getElementById('modal-close');
const readMoreBtn = document.querySelector('.read-more-btn');
const bioDetails = document.getElementById('bio-details');
const signatureOverlay = document.getElementById('signature-overlay');

// Small helper so we only add event listeners if the element actually exists
function safeAddListener(el, event, fn) {
  if (!el) return;
  el.addEventListener(event, fn);
}

// Switch the theme and sync it with localStorage so the choice sticks
function applyTheme(dark) {
  isDarkMode = !!dark;
  if (isDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.textContent = '☀️';
    localStorage.setItem('site_theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeToggle) themeToggle.textContent = '🌙';
    localStorage.setItem('site_theme', 'light');
  }
}

// Flip light/dark mode when the user hits the toggle button
function toggleTheme() {
  applyTheme(!isDarkMode);
}

// Modern clipboard usage with a fallback for older browsers that still rely on execCommand
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback for browsers stuck in the past
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

// Open the modal and display whatever image the user clicked
function openModal(imgSrc, altText = '') {
  if (!modal) return;
  if (modalImage) {
    modalImage.src = imgSrc || '';
    modalImage.alt = altText || '';
  }
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('open');

  // Give keyboard users a predictable starting point inside the modal
  if (modalClose) modalClose.focus();

  // Listen for Escape to close the modal
  document.addEventListener('keydown', onDocumentKeyDown);
}

// Close the modal and clean up listeners tied to it
function closeModal() {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('open');
  document.removeEventListener('keydown', onDocumentKeyDown);
}

// Let users close the modal by pressing Esc
function onDocumentKeyDown(e) {
  if (e.key === 'Escape') closeModal();
}

// Clicking anywhere outside the modal content should close it
function onModalClick(e) {
  if (!modal) return;
  if (e.target === modal) closeModal();
}

// Share the page using the Web Share API when available, otherwise fall back to clipboard
async function shareProfile() {
  const shareData = {
    title: document.title || 'Profile',
    text: 'Check out this Khan tribute page',
    url: location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      console.info('Shared successfully');
      return;
    }
  } catch (err) {
    console.warn('Web Share failed, using clipboard fallback', err);
  }

  // Clipboard fallback
  try {
    await copyToClipboard(location.href);
    alert('Link copied to clipboard');
  } catch (err) {
    console.error('Unable to copy link', err);
    alert('Could not share or copy link on this browser.');
  }
}

// Expand or collapse extra bio text when the user clicks the read-more button
function toggleReadMore() {
  if (!bioDetails || !readMoreBtn) return;

  const expanded = bioDetails.getAttribute('data-expanded') === 'true';

  if (expanded) {
    // collapse
    bioDetails.setAttribute('data-expanded', 'false');
    bioDetails.classList.remove('expanded');
    bioDetails.hidden = true;                      // actually hide the element
    readMoreBtn.textContent = 'Read more';
    readMoreBtn.setAttribute('aria-expanded', 'false');
  } else {
    // expand
    bioDetails.setAttribute('data-expanded', 'true');
    bioDetails.classList.add('expanded');
    bioDetails.hidden = false;                     // show the element
    readMoreBtn.textContent = 'Read less';
    readMoreBtn.setAttribute('aria-expanded', 'true');
  }
}

// Run all initial setup logic when the page is ready
document.addEventListener('DOMContentLoaded', () => {
  // Fade-in for the signature overlay — just a tiny visual flourish
  if (signatureOverlay) {
    signatureOverlay.style.transition = 'opacity 500ms ease';
    signatureOverlay.style.opacity = '0';
    setTimeout(() => {
      signatureOverlay.style.opacity = '1';
    }, 800);
  }

  // Restore the user’s saved theme if it exists
  const saved = localStorage.getItem('site_theme');
  applyTheme(saved === 'dark');

  // Ensure the read-more button has the correct ARIA state on load
  if (bioDetails && readMoreBtn) {
    // if the element is initially hidden in HTML, reflect that on the button
    const initiallyExpanded = bioDetails.getAttribute('data-expanded') === 'true' || !bioDetails.hidden;
    readMoreBtn.setAttribute('aria-expanded', initiallyExpanded ? 'true' : 'false');
    // make sure data-expanded matches the hidden property
    bioDetails.setAttribute('data-expanded', initiallyExpanded ? 'true' : 'false');
    if (initiallyExpanded) bioDetails.classList.add('expanded');
  }

  // Bind main UI interactions
  safeAddListener(themeToggle, 'click', toggleTheme);
  safeAddListener(shareBtn, 'click', (e) => {
    e.preventDefault();
    shareProfile();
  });

  // Modal controls
  safeAddListener(modalClose, 'click', closeModal);
  safeAddListener(modal, 'click', onModalClick);

  // Any element with data-modal-src becomes a modal trigger
  document.querySelectorAll('[data-modal-src]').forEach(el => {
    el.addEventListener('click', (ev) => {
      const src = el.getAttribute('data-modal-src');
      const alt = el.getAttribute('data-modal-alt') || '';
      openModal(src, alt);
    });
  });

  // Read-more toggling
  safeAddListener(readMoreBtn, 'click', (e) => {
    e.preventDefault();
    toggleReadMore();
  });
});
