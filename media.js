// =============================================
// WHUB — Media List (Movies, TV, Dramas)
// Uses TMDB API (free, no key needed for basic search)
// =============================================
import { auth, db, initNavAuth, onAuthStateChanged }
  from './firebase.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

initNavAuth();

// TMDB API key (public read-only v3 key — safe to expose)
const TMDB_KEY  = '4d739b83e30a18c69f5d6d1de6c51b05';
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w300';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// ── State ──────────────────────────────────────
let currentUser  = null;
let isViewMode   = false;
let viewUid      = null;
let mediaList    = { watched: [], plan: [], favorites: [] };
let activeTab    = 'watched';
let searchTimeout = null;
let currentType  = 'movie'; // 'movie' | 'tv' | 'drama'

// ── Init ───────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const urlUid  = params.get('uid');
const urlUser = params.get('u');

if (urlUid) {
  initViewModeByUid(urlUid);
} else if (urlUser) {
  initViewModeByUsername(urlUser);
} else {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      await initOwnList(user);
    } else {
      document.getElementById('loginPrompt').style.display = 'block';
      renderEmptyAll();
    }
  });
}

// ── View mode by UID ───────────────────────────
async function initViewModeByUid(uid) {
  viewUid = uid;
  let displayName = 'Someone';
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) displayName = snap.data().username || displayName;
  } catch(e) {}
  setViewUI(displayName);
  await loadList(uid);
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user && user.uid === uid) { isViewMode = false; await initOwnList(user); }
  });
}

// ── View mode by username (REST) ───────────────
async function initViewModeByUsername(username) {
  const data = await getUserByUsernameRest(username);
  if (!data) { renderError('User not found.'); return; }
  viewUid = data.uid;
  setViewUI(data.username);
  await loadList(data.uid);
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user && user.uid === data.uid) { isViewMode = false; await initOwnList(user); }
  });
}

function setViewUI(name) {
  isViewMode = true;
  document.getElementById('heroUsername').textContent = name + "'s";
  document.getElementById('heroSuffix').textContent   = 'Media List';
  document.getElementById('heroSub').textContent      = `${name}'s watchlist on WHUB.`;
  document.title = `${name}'s Media List — WHUB`;
  const banner = document.getElementById('viewBanner');
  banner.style.display = 'flex';
  document.getElementById('viewBannerName').textContent = name;
  document.getElementById('statsCard').style.display   = 'block';
}

// ── Own list ───────────────────────────────────
async function initOwnList(user) {
  document.getElementById('searchCard').style.display  = 'block';
  document.getElementById('shareCard').style.display   = 'block';
  document.getElementById('statsCard').style.display   = 'block';
  document.getElementById('loginPrompt').style.display = 'none';

  // Share URL uses uid
  document.getElementById('shareUrl').value =
    `${window.location.origin}${window.location.pathname}?uid=${user.uid}`;

  // Search input
  const input = document.getElementById('mediaSearchInput');
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    const panel = document.getElementById('searchPanel');
    if (q.length < 2) { panel.style.display = 'none'; document.getElementById('searchResults').innerHTML = ''; return; }
    panel.style.display = 'block';
    searchTimeout = setTimeout(() => searchMedia(q), 400);
  });

  await loadList(user.uid);
}

// ── Type filter ────────────────────────────────
window.setType = function(type, btn) {
  currentType = type;
  document.querySelectorAll('.media-type-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Re-search if there's a query
  const q = document.getElementById('mediaSearchInput')?.value.trim();
  if (q && q.length >= 2) searchMedia(q);
};

// ── Load list ──────────────────────────────────
async function loadList(uid) {
  try {
    const snap = await getDoc(doc(db, 'media_lists', uid));
    mediaList = snap.exists()
      ? { watched: [], plan: [], favorites: [], ...snap.data() }
      : { watched: [], plan: [], favorites: [] };
  } catch(e) {
    mediaList = { watched: [], plan: [], favorites: [] };
  }
  updateCounts();
  renderAll();
}

async function saveList() {
  if (!currentUser) return;
  await setDoc(doc(db, 'media_lists', currentUser.uid), {
    ...mediaList, updatedAt: serverTimestamp()
  });
}

// ── Counts ─────────────────────────────────────
function updateCounts() {
  const w = mediaList.watched.length;
  const p = mediaList.plan.length;
  const f = mediaList.favorites.length;
  document.getElementById('countWatched').textContent = w;
  document.getElementById('countPlan').textContent    = p;
  document.getElementById('countFav').textContent     = f;
  document.getElementById('tc-watched').textContent   = w;
  document.getElementById('tc-plan').textContent      = p;
  document.getElementById('tc-favorites').textContent = f;
}

// ── Render ─────────────────────────────────────
function renderAll() { ['watched','plan','favorites'].forEach(renderTab); }
function renderEmptyAll() { ['watched','plan','favorites'].forEach(t => { document.getElementById('tab-'+t).innerHTML = emptyState(t); }); updateCounts(); }

function renderTab(tab) {
  const el   = document.getElementById('tab-' + tab);
  const list = mediaList[tab] || [];
  if (list.length === 0) { el.innerHTML = emptyState(tab); return; }
  el.innerHTML = `<div class="anime-grid">${list.map(m => mediaCard(m, tab)).join('')}</div>`;
}

function emptyState(tab) {
  const msgs = {
    watched:   ['Nothing watched yet.',   isViewMode ? '' : 'Search and add movies, shows or dramas.'],
    plan:      ['Nothing planned yet.',   isViewMode ? '' : 'Add stuff you want to watch.'],
    favorites: ['No favorites yet.',      isViewMode ? '' : 'Star your favorites.'],
  };
  const [title, sub] = msgs[tab];
  return `<div class="anime-empty">
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim)"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/></svg>
    <p>${title}</p>${sub ? `<span>${sub}</span>` : ''}
  </div>`;
}

function mediaCard(item, tab) {
  const img = item.poster
    ? `<img src="${escHtml(item.poster)}" class="anime-card-img" loading="lazy" onerror="this.style.display='none'" />`
    : `<div class="anime-card-img anime-card-img--placeholder">${escHtml((item.title||'?').charAt(0))}</div>`;

  const typeBadge = `<span class="media-type-badge media-type-badge--${item.type}">${typeLabel(item.type)}</span>`;
  const rating    = item.rating ? `<span class="media-search-rating">★ ${item.rating}</span>` : '';
  const year      = item.year   ? `<span>${item.year}</span>` : '';

  const btns = isViewMode ? '' : `
    <div class="anime-card-actions">
      ${tab !== 'watched'   ? `<button class="anime-act-btn anime-act--watch"  onclick="moveMedia(${item.id},'${item.type}','${tab}','watched')"   title="Watched"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>` : ''}
      ${tab !== 'plan'      ? `<button class="anime-act-btn anime-act--plan"   onclick="moveMedia(${item.id},'${item.type}','${tab}','plan')"      title="Plan"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg></button>` : ''}
      ${tab !== 'favorites' ? `<button class="anime-act-btn anime-act--fav"    onclick="moveMedia(${item.id},'${item.type}','${tab}','favorites')" title="Fav"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></button>` : ''}
      <button class="anime-act-btn anime-act--del" onclick="removeMedia(${item.id},'${item.type}','${tab}')" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
    </div>`;

  return `<div class="anime-card">
    <div class="anime-card-link" style="display:block;text-decoration:none;color:inherit">
      ${img}
      <div class="anime-card-body">
        <div class="anime-card-title">${escHtml(item.title)}</div>
        <div class="anime-card-meta">${typeBadge} ${rating} ${year}</div>
      </div>
    </div>
    ${btns}
  </div>`;
}

// ── Search via TMDB ────────────────────────────
async function searchMedia(q) {
  const el    = document.getElementById('searchResults');
  const label = document.getElementById('searchPanelLabel');
  document.getElementById('searchPanel').style.display = 'block';
  el.innerHTML = `<div class="anime-searching"><div class="auth-loading-spinner" style="width:20px;height:20px;border-width:2px"></div></div>`;
  label.textContent = `Results for "${q}"`;

  try {
    let url;
    if (currentType === 'drama') {
      // Dramas = Korean/Japanese/Chinese TV via TMDB with language filter
      url = `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`;
    } else {
      url = `${TMDB_BASE}/search/${currentType}?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`;
    }

    const res  = await fetch(url);
    const data = await res.json();
    let results = data.results || [];

    // For dramas filter by origin country
    if (currentType === 'drama') {
      const dramaCodes = ['KR', 'JP', 'CN', 'TW', 'TH'];
      results = results.filter(r =>
        r.origin_country && r.origin_country.some(c => dramaCodes.includes(c))
      );
    }

    results = results.slice(0, 8);

    if (!res.ok) {
      el.innerHTML = `<div class="anime-search-empty">Search unavailable — TMDB API key not configured.<br><a href="https://www.themoviedb.org/settings/api" target="_blank" style="color:var(--accent-roblox)">Get free key →</a></div>`;
      return;
    }

    if (results.length === 0) {
      el.innerHTML = `<div class="anime-search-empty">No results for "${escHtml(q)}"</div>`;
      return;
    }

    const inList = new Set([
      ...mediaList.watched.map(m  => m.id + '_' + m.type),
      ...mediaList.plan.map(m     => m.id + '_' + m.type),
      ...mediaList.favorites.map(m => m.id + '_' + m.type),
    ]);

    el.innerHTML = results.map(r => {
      const id      = r.id;
      const title   = r.title || r.name;
      const poster  = r.poster_path ? TMDB_IMG + r.poster_path : '';
      const rating  = r.vote_average ? r.vote_average.toFixed(1) : '';
      const year    = (r.release_date || r.first_air_date || '').substring(0, 4);
      const type    = currentType;
      const key     = id + '_' + type;
      const already = inList.has(key);
      const safeTitle = escHtml(title);
      const safePoster = escHtml(poster);

      const addBtns = already
        ? `<span class="anime-search-card-added">Already in list</span>`
        : `<div class="anime-search-card-btns">
            <button class="anime-add-btn anime-add--watch"
              data-id="${id}" data-title="${safeTitle}" data-poster="${safePoster}"
              data-rating="${rating}" data-year="${year}" data-type="${type}"
              data-list="watched" onclick="handleAdd(this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              Watched
            </button>
            <button class="anime-add-btn anime-add--plan"
              data-id="${id}" data-title="${safeTitle}" data-poster="${safePoster}"
              data-rating="${rating}" data-year="${year}" data-type="${type}"
              data-list="plan" onclick="handleAdd(this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
              Plan
            </button>
            <button class="anime-add-btn anime-add--fav"
              data-id="${id}" data-title="${safeTitle}" data-poster="${safePoster}"
              data-rating="${rating}" data-year="${year}" data-type="${type}"
              data-list="favorites" onclick="handleAdd(this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Fav
            </button>
          </div>`;

      return `<div class="anime-search-card ${already ? 'anime-search-card--added' : ''}">
        ${poster
          ? `<img src="${safePoster}" class="anime-search-card-img" loading="lazy" onerror="this.style.display='none'" />`
          : `<div class="anime-search-card-img anime-search-card-img--ph">${title.charAt(0)}</div>`}
        <div class="anime-search-card-body">
          <div class="anime-search-card-title">${safeTitle}</div>
          <div class="anime-search-card-meta">
            <span class="media-type-badge media-type-badge--${type}">${typeLabel(type)}</span>
            ${rating ? `<span class="media-search-rating">★ ${rating}</span>` : ''}
            ${year ? `<span style="color:var(--text-dim)">${year}</span>` : ''}
          </div>
          ${addBtns}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    console.error('Media search error:', e);
    el.innerHTML = `<div class="anime-search-empty">Search failed — check your TMDB API key in media.js</div>`;
  }
}

// ── Add / Move / Remove ────────────────────────
window.handleAdd = function(btn) {
  const item = {
    id:     parseInt(btn.dataset.id),
    title:  btn.dataset.title,
    poster: btn.dataset.poster,
    rating: btn.dataset.rating,
    year:   btn.dataset.year,
    type:   btn.dataset.type,
  };
  addMedia(item, btn.dataset.list);
};

window.addMedia = async function(item, tab) {
  if (!currentUser) return;
  const key = item.id + '_' + item.type;
  ['watched','plan','favorites'].forEach(t => {
    mediaList[t] = mediaList[t].filter(m => m.id + '_' + m.type !== key);
  });
  mediaList[tab].unshift(item);
  updateCounts(); renderAll();
  await saveList();
  const q = document.getElementById('mediaSearchInput')?.value.trim();
  if (q && q.length >= 2) searchMedia(q);
};

window.moveMedia = async function(id, type, fromTab, toTab) {
  const key  = id + '_' + type;
  const item = mediaList[fromTab].find(m => m.id + '_' + m.type === key);
  if (!item) return;
  mediaList[fromTab] = mediaList[fromTab].filter(m => m.id + '_' + m.type !== key);
  mediaList[toTab]   = mediaList[toTab].filter(m => m.id + '_' + m.type !== key);
  mediaList[toTab].unshift(item);
  updateCounts(); renderAll();
  await saveList();
};

window.removeMedia = async function(id, type, tab) {
  const key = id + '_' + type;
  mediaList[tab] = mediaList[tab].filter(m => m.id + '_' + m.type !== key);
  updateCounts(); renderTab(tab);
  await saveList();
  const q = document.getElementById('mediaSearchInput')?.value.trim();
  if (q && q.length >= 2) searchMedia(q);
};

// ── Tab switch ─────────────────────────────────
window.switchMediaTab = function(tab, btn) {
  activeTab = tab;
  document.querySelectorAll('.anime-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.anime-tab-content').forEach(c => c.style.display = 'none');
  btn.classList.add('active');
  document.getElementById('tab-' + tab).style.display = 'block';
};

window.closeSearchPanel = function() {
  document.getElementById('searchPanel').style.display = 'none';
  document.getElementById('mediaSearchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
};

window.copyShareUrl = function() {
  const input = document.getElementById('shareUrl');
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.getElementById('shareCopyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy`;
    }, 2000);
  });
};

// ── Helpers ────────────────────────────────────
function typeLabel(type) {
  return type === 'movie' ? 'Movie' : type === 'tv' ? 'TV Show' : 'Drama';
}

async function getUserByUsernameRest(username) {
  const projectId = 'whub-7f24b';
  const apiKey    = 'AIzaSyC5X9rt_sGUBpEANBw9HIcNkELxRRxmEkQ';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const res  = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: { fieldFilter: { field: { fieldPath: 'username' }, op: 'EQUAL', value: { stringValue: username } } },
      limit: 1
    }})
  });
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]?.document) return null;
  const fields = data[0].document.fields || {};
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if      ('stringValue'  in v) obj[k] = v.stringValue;
    else if ('integerValue' in v) obj[k] = parseInt(v.integerValue);
    else if ('booleanValue' in v) obj[k] = v.booleanValue;
    else                          obj[k] = null;
  }
  obj.uid = data[0].document.name.split('/').pop();
  return obj;
}

function renderError(msg) {
  ['watched','plan','favorites'].forEach(t => {
    document.getElementById('tab-'+t).innerHTML = `<div class="anime-empty"><p>${msg}</p></div>`;
  });
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
