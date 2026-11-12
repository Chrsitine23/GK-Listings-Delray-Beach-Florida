// Rest N Play Welcome Guide — simple navigation + helpers

function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Show requested page
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Re-initialize icons (in case of dynamic content)
  if (window.lucide) {
    lucide.createIcons();
  }
}


function openCustomGuestPage(item) {
  const pageId = item.page_id || item.id;

  if (!pageId) {
    console.error('Custom page ID is missing.');
    return;
  }

  const elementId = 'custom-guide-page-' + pageId;
  const content = item.page_content || {};

  let page = document.getElementById(elementId);

  if (!page) {
    page = document.createElement('section');
    page.id = elementId;
    page.className = 'page';
    document.body.appendChild(page);
  }

  page.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'max-width:900px;margin:0 auto;padding:0 20px 40px;';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.textContent = '← Back to Dashboard';
  backButton.style.cssText = 'padding:10px 16px;margin-bottom:24px;border:1px solid #deded8;border-radius:8px;background:#fff;cursor:pointer;';

  backButton.addEventListener('click', function () {
    showPage('menu');
  });

  const title = document.createElement('h2');
  title.textContent = content.title || item.name || 'Information';

  const description = document.createElement('p');
  description.textContent = content.description || '';
  description.style.cssText = 'white-space:pre-wrap;line-height:1.7;';

  wrapper.appendChild(backButton);
  wrapper.appendChild(title);
  wrapper.appendChild(description);

  const photos = Array.isArray(content.photos) ? content.photos : [];

  if (photos.length) {
    const gallery = document.createElement('div');
    gallery.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:24px;';

    photos.forEach(function (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = title.textContent;
      img.style.cssText = 'width:100%;height:180px;object-fit:cover;border-radius:10px;';
      gallery.appendChild(img);
    });

    wrapper.appendChild(gallery);
  }

  page.appendChild(wrapper);

  showPage(elementId);
}


/* =========================================================
   ACKNOWLEDGMENT MODAL
========================================================= */

function openRiskModal() {
  const settings = window.currentGuideAcknowledgment || {};
  const modal = document.getElementById('risk-modal');

  // If acknowledgment is disabled, go directly to the dashboard.
  if (settings.enabled === false) {
    showPage('menu');
    return;
  }

  if (!modal) {
    showPage('menu');
    return;
  }

  const checkbox = document.getElementById('risk-agreement-checkbox');

  if (checkbox) {
    checkbox.checked = false;
  }

  modal.style.display = 'flex';
}

function acceptRisks() {
  const modal = document.getElementById('risk-modal');
  const checkbox = document.getElementById('risk-agreement-checkbox');

  if (!checkbox || !checkbox.checked) {
    alert('Please check the box to confirm that you have read and agree to the statements.');
    return;
  }

  if (modal) {
    modal.style.display = 'none';
  }

  showPage('menu');
}


// Copy text helper (for WiFi)
function copyText(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const text = el.textContent.trim();

  navigator.clipboard.writeText(text).then(() => {
    // Visual feedback
    const btn = el.parentElement.querySelector('.copy-btn');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.style.background = '#2d6a4f';
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
      }, 1600);
    }
  }).catch(() => {
    // Fallback for older browsers
    const range = document.createRange();
    range.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    try {
      document.execCommand('copy');
      alert('Copied: ' + text);
    } catch (e) {
      alert('Please copy manually: ' + text);
    }
    window.getSelection().removeAllRanges();
  });
}

// Initialize icons on load
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
});
