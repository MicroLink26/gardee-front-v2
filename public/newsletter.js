console.log('=== NEWSLETTER.JS LOADED ===');

const API_URL = 'https://site--gardee-backend--fg6zdpvl2w9z.code.run/api';
console.log('API_URL:', API_URL);

function showNotification(message, type) {
  console.log('showNotification:', message, type);
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 1000;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.3s ease;
    max-width: 400px;
    word-wrap: break-word;
    background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
  }, 4000);

  setTimeout(() => notification.remove(), 4300);
}

async function handleNewsletterSubmit(e) {
  console.log('=== handleNewsletterSubmit CALLED ===');
  e.preventDefault();
  const form = e.target;
  const emailInput = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button');
  const email = emailInput.value;
  const originalText = btn.textContent;

  console.log('Newsletter submitted:', email);

  btn.textContent = 'Inscription...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (res.ok) {
      btn.textContent = '✓ Abonné!';
      form.reset();
      showNotification(`Merci! Un email a été envoyé à ${email}`, 'success');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 3000);
    } else {
      btn.textContent = '✗ Erreur';
      showNotification(data.error || 'Erreur lors de l\'inscription', 'error');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    }
  } catch (err) {
    console.error('Newsletter error:', err);
    btn.textContent = '✗ Erreur';
    showNotification('Erreur de connexion', 'error');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
  return false;
}

// Attach handler when DOM is ready
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  console.log('Newsletter init:', form ? 'form found' : 'form NOT found');
  if (form) {
    form.addEventListener('submit', handleNewsletterSubmit);
    console.log('Newsletter listener attached');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNewsletter);
} else {
  initNewsletter();
}
