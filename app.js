// kittens.ez — misc interactions

(function () {

  // Animate cards on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = `${i * 0.08}s`;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card, .tool-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s';
    observer.observe(el);
  });

  // Add visible class styles inline
  const style = document.createElement('style');
  style.textContent = `.visible { opacity: 1 !important; transform: translateY(0) !important; }`;
  document.head.appendChild(style);
})();

// ── Escape key — close all modals/panels ────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const checks = [
    ['settings-panel', 'open', () => {
      document.getElementById('settings-panel')?.classList.remove('open');
      document.getElementById('settings-overlay')?.classList.remove('open');
    }],
    ['addModal', 'block', () => {
      document.getElementById('addModal').style.display = 'none';
      const o = document.getElementById('modalOverlay');
      if (o) o.style.display = 'none';
    }],
    ['editPanel', 'block', () => { document.getElementById('editPanel').style.display = 'none'; }],
    ['searchPanel', 'block', () => {
      document.getElementById('searchPanel').style.display = 'none';
      const si = document.getElementById('animeSearchInput') || document.getElementById('mediaSearchInput');
      if (si) si.value = '';
    }],
  ];
  for (const [id, state, fn] of checks) {
    const el = document.getElementById(id);
    if (!el) continue;
    const active = state === 'open' ? el.classList.contains('open') : el.style.display === state;
    if (active) { fn(); break; }
  }
});

// ── OS theme auto-detect ────────────────────────────
(function() {
  if (!localStorage.getItem('nexushub-theme')) {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
})();

// ── Navbar shadow on scroll ──────────────────────────
(function() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── Loading watchdog — if a page's loading spinner never resolves, show a hint ──
(function() {
  const loadingIds = ['authLoading', 'pageLoading'];
  loadingIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    setTimeout(() => {
      if (el.style.display !== 'none' && getComputedStyle(el).display !== 'none') {
        const hint = document.createElement('div');
        hint.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px 20px;font-size:0.8rem;color:var(--text-muted);z-index:400;box-shadow:var(--shadow-lg)';
        hint.innerHTML = 'This is taking longer than usual. <a href="javascript:location.reload()" style="color:var(--accent-roblox)">Reload page</a>';
        document.body.appendChild(hint);
      }
    }, 8000);
  });
})();
