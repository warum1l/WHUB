// =============================================
// kittens.ez — Toast Notification System
// =============================================

let toastContainer = null;

function ensureContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

const ICONS = {
  success: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  info:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  warning: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
};

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration - ms, 0 = persistent
 */
export function toast(message, type = 'info', duration = 3500) {
  const container = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `
    <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;

  const remove = () => {
    el.classList.add('toast--leaving');
    setTimeout(() => el.remove(), 200);
  };

  el.querySelector('.toast-close').addEventListener('click', remove);
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add('toast--visible'));

  if (duration > 0) setTimeout(remove, duration);
  return remove;
}

export const toastSuccess = (msg, dur) => toast(msg, 'success', dur);
export const toastError   = (msg, dur) => toast(msg, 'error', dur);
export const toastInfo    = (msg, dur) => toast(msg, 'info', dur);
export const toastWarning = (msg, dur) => toast(msg, 'warning', dur);
