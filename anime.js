// =============================================
// WHUB — Anime List
// =============================================
import { auth, db, initNavAuth, onAuthStateChanged }
  from './firebase.js';
import { getUserByUsernameRest, escHtml } from './utils.js';
import { toastSuccess } from './toast.js';
import {
  doc, getDoc, setDoc, collection,
  query, where, getDocs, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

initNavAuth();

// ── State ──────────────────────────────────────
let currentUser   = null;
let isViewMode    = false;
let viewUsername  = null;
let viewUid       = null;
let animeList     = { watched: [], plan: [], favorites: [] };
let activeTab     = 'watched';
let searchTimeout = null;

// ── getUserByUsername — works without auth via REST ──
async function getUserByUsername(username) {
  // Firestore REST API with API key — works without Firebase auth
  const projectId = 'whub-7f24b';
  const apiKey    = 'AIzaSyC5X9rt_sGUBpEANBw9HIcNkELxRRxmEkQ';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'username' },
          op: 'EQUAL',
          value: { stringValue: username }
        }
      },
      limit: 1
    }
  };

  try {
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    // data is array; first item may have no document if no results
    if (!Array.isArray(data) || !data[0]?.document) return null;

    const fields = data[0].document.fields || {};
    // Convert Firestore REST field format → plain values
    const obj = {};
    for (const [k, v] of Object.entries(fields)) {
      if      ('stringValue'    in v) obj[k] = v.stringValue;
      else if ('integerValue'   in v) obj[k] = parseInt(v.integerValue);
      else if ('booleanValue'   in v) obj[k] = v.booleanValue;
      else if ('timestampValue' in v) obj[k] = v.timestampValue;
      else                            obj[k] = null;
    }
    // uid lives in the document path, not in fields
    const docName = data[0].document.name;
    obj.uid = docName.split('/').pop();
    return obj;
  } catch(e) {
    console.error('getUserByUsername REST error:', e);
    return null;
  }
}

async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ── Init ───────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const urlUser = params.get('u');   // username-based share link
const urlUid  = params.get('uid'); // uid-based share link (more reliable)

if (urlUid) {
  // Direct uid — no username lookup needed, works without auth
  initViewModeByUid(urlUid);
} else if (urlUser) {
  // Username-based — try REST first, fallback handled inside
  initViewModePublic(urlUser);
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

async function initViewModeByUid(uid) {
  // Load anime list directly by uid — no user lookup needed
  viewUid = uid;

  // Try to get display name from users collection (may fail if not auth)
  // but show list regardless
  let displayName = 'Someone';
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) displayName = snap.data().username || displayName;
  } catch(e) { /* rules may block — show list anyway */ }

  isViewMode = true;
  document.getElementById('heroUsername').textContent   = displayName + "'s";
  document.getElementById('heroSuffix').textContent     = 'Anime List';
  document.getElementById('heroSub').textContent        = `${displayName}'s anime tracker on WHUB.`;
  document.title = `${displayName}'s Anime List — WHUB`;

  const banner = document.getElementById('viewBanner');
  banner.style.display = 'flex';
  document.getElementById('viewBannerName').textContent = displayName;
  document.getElementById('statsCard').style.display   = 'block';

  await loadList(uid);

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user && user.uid === uid) {
      isViewMode = false;
      await initOwnList(user);
    }
  });
}

async function initViewModePublic(username) {
  const data = await getUserByUsername(username);
  if (!data) {
    renderError('User not found.');
    return;
  }
  viewUid      = data.uid;
  viewUsername = data.username;

  isViewMode = true;
  document.getElementById('heroUsername').textContent   = data.username + "'s";
  document.getElementById('heroSuffix').textContent     = 'Anime List';
  document.getElementById('heroSub').textContent        = `${data.username}'s anime tracker on WHUB.`;
  document.title = `${data.username}'s Anime List — WHUB`;

  const banner = document.getElementById('viewBanner');
  banner.style.display = 'flex';
  document.getElementById('viewBannerName').textContent = data.username;
  document.getElementById('statsCard').style.display   = 'block';

  await loadList(data.uid);

  // Check auth in background — if own profile, upgrade to edit mode
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user && user.uid === data.uid) {
      isViewMode = false;
      await initOwnList(user);
    }
  });
}

async function initOwnList(user) {
  document.getElementById('searchCard').style.display  = 'block';
  document.getElementById('shareCard').style.display   = 'block';
  document.getElementById('statsCard').style.display   = 'block';
  document.getElementById('loginPrompt').style.display = 'none';

  // Use uid-based share URL — works without auth for viewers
  const shareUrl = `${window.location.origin}${window.location.pathname}?uid=${user.uid}`;
  document.getElementById('shareUrl').value = shareUrl;

  const input = document.getElementById('animeSearchInput');
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    const panel = document.getElementById('searchPanel');
    if (q.length < 2) {
      panel.style.display = 'none';
      document.getElementById('searchResults').innerHTML = '';
      return;
    }
    panel.style.display = 'block';
    searchTimeout = setTimeout(() => searchAnime(q), 400);
  });

  await loadList(user.uid);
}

// ── Load list from Firestore ───────────────────
async function loadList(uid) {
  try {
    const snap = await getDoc(doc(db, 'anime_lists', uid));
    animeList = snap.exists()
      ? { watched: [], plan: [], favorites: [], ...snap.data() }
      : { watched: [], plan: [], favorites: [] };
  } catch(e) {
    console.error('loadList error:', e);
    animeList = { watched: [], plan: [], favorites: [] };
  }
  updateCounts();
  renderAll();
}

// ── Save list to Firestore ─────────────────────
async function saveList() {
  if (!currentUser) return;
  await setDoc(doc(db, 'anime_lists', currentUser.uid), {
    ...animeList,
    updatedAt: serverTimestamp()
  });
}

// ── Counts ────────────────────────────────────
function updateCounts() {
  const w = animeList.watched.length;
  const p = animeList.plan.length;
  const f = animeList.favorites.length;
  document.getElementById('countWatched').textContent = w;
  document.getElementById('countPlan').textContent    = p;
  document.getElementById('countFav').textContent     = f;
  document.getElementById('tc-watched').textContent   = w;
  document.getElementById('tc-plan').textContent      = p;
  document.getElementById('tc-favorites').textContent = f;
}

// ── Render all tabs ────────────────────────────
function renderAll() {
  renderTab('watched');
  renderTab('plan');
  renderTab('favorites');
}

function renderEmptyAll() {
  ['watched','plan','favorites'].forEach(t => {
    document.getElementById('tab-' + t).innerHTML = emptyState(t);
  });
  updateCounts();
}

function renderTab(tab) {
  const el   = document.getElementById('tab-' + tab);
  const list = animeList[tab] || [];
  if (list.length === 0) {
    el.innerHTML = emptyState(tab);
    return;
  }
  el.innerHTML = `<div class="anime-grid">${list.map(a => animeCard(a, tab)).join('')}</div>`;
}

function emptyState(tab) {
  const msgs = {
    watched:   ['No anime watched yet.',  isViewMode ? '' : 'Search for anime and add them here.'],
    plan:      ['Nothing planned yet.',   isViewMode ? '' : 'Add anime you want to watch.'],
    favorites: ['No favorites yet.',      isViewMode ? '' : 'Star your favorite anime.'],
  };
  const [title, sub] = msgs[tab] || ['Empty.', ''];
  return `<div class="anime-empty">
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim)"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
    <p>${title}</p>
    ${sub ? `<span>${sub}</span>` : ''}
  </div>`;
}

function animeCard(anime, tab) {
  // wrapped with fade-in-up below
  const img = anime.image
    ? `<img src="${escHtml(anime.image)}" alt="${escHtml(anime.title)}" class="anime-card-img" loading="lazy" onerror="this.style.display='none'" />`
    : `<div class="anime-card-img anime-card-img--placeholder">${escHtml(anime.title.charAt(0))}</div>`;

  const score = anime.score    ? `<span class="anime-card-score">★ ${anime.score}</span>` : '';
  const eps   = anime.episodes ? `<span class="anime-card-eps">${anime.episodes} ep</span>` : '';

  const buttons = isViewMode ? '' : `
    <div class="anime-card-actions">
      ${tab !== 'watched'   ? `<button class="anime-act-btn anime-act--watch"  onclick="moveAnime(${anime.id},'${tab}','watched')"   title="Watched"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>` : ''}
      ${tab !== 'plan'      ? `<button class="anime-act-btn anime-act--plan"   onclick="moveAnime(${anime.id},'${tab}','plan')"      title="Plan"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg></button>` : ''}
      ${tab !== 'favorites' ? `<button class="anime-act-btn anime-act--fav"    onclick="moveAnime(${anime.id},'${tab}','favorites')" title="Favorite"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></button>` : ''}
      <button class="anime-act-btn anime-act--del" onclick="removeAnime(${anime.id},'${tab}')" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
    </div>`;

  return `<div class="anime-card fade-in-up" data-id="${anime.id}" data-tab="${tab}">
    <a href="https://myanimelist.net/anime/${anime.id}" target="_blank" rel="noopener" class="anime-card-link">
      ${img}
      <div class="anime-card-body">
        <div class="anime-card-title">${escHtml(anime.title)}</div>
        <div class="anime-card-meta">${score}${eps}</div>
      </div>
    </a>
    ${buttons}
  </div>`;
}

// ── Search via Jikan API ───────────────────────
async function searchAnime(q) {
  const el = document.getElementById('searchResults');
  el.innerHTML = `<div class="anime-searching"><div class="auth-loading-spinner" style="width:20px;height:20px;border-width:2px"></div></div>`;
  document.getElementById('searchPanel').style.display = 'block';

  try {
    // Primary: AniList GraphQL (more reliable, no rate limit issues)
    const anilistQuery = `
      query ($search: String) {
        Page(page: 1, perPage: 8) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            title { english romaji }
            coverImage { medium large }
            averageScore
            episodes
            status
            format
          }
        }
      }
    `;
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: anilistQuery, variables: { search: q } })
    });
    const json = await res.json();
    const rawResults = json?.data?.Page?.media || [];
    
    // Normalize AniList format to our format
    const results = rawResults.map(a => ({
      mal_id: a.id,
      title_english: a.title.english,
      title: a.title.romaji || a.title.english,
      images: { jpg: { image_url: a.coverImage?.large || a.coverImage?.medium || '' } },
      score: a.averageScore ? (a.averageScore / 10).toFixed(1) : null,
      episodes: a.episodes,
    }));

    if (results.length === 0) {
      el.innerHTML = `<div class="anime-search-empty">No results for "${escHtml(q)}"</div>`;
      return;
    }

    if (results.length === 0) {
      el.innerHTML = `<div class="anime-search-empty">No results for "${escHtml(q)}"</div>`;
      return;
    }

    const inList = new Set([
      ...animeList.watched.map(a => a.id),
      ...animeList.plan.map(a => a.id),
      ...animeList.favorites.map(a => a.id),
    ]);

    el.innerHTML = results.map(a => {
      const id        = a.mal_id;
      const title     = a.title_english || a.title;
      const img       = a.images?.jpg?.image_url || '';
      const score     = a.score    ? `★ ${a.score}` : '';
      const eps       = a.episodes ? `${a.episodes} ep` : '';
      const already   = inList.has(id);
      const safeTitle = escHtml(title);
      const safeImg   = escHtml(img);

      const addBtns = already
        ? `<span class="anime-search-card-added">Already in list</span>`
        : `<div class="anime-search-card-btns">
            <button class="anime-add-btn anime-add--watch"
              data-id="${id}" data-title="${safeTitle}" data-img="${safeImg}"
              data-score="${a.score||''}" data-eps="${a.episodes||''}"
              data-list="watched" onclick="handleAdd(this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              Watched
            </button>
            <button class="anime-add-btn anime-add--plan"
              data-id="${id}" data-title="${safeTitle}" data-img="${safeImg}"
              data-score="${a.score||''}" data-eps="${a.episodes||''}"
              data-list="plan" onclick="handleAdd(this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
              Plan
            </button>
            <button class="anime-add-btn anime-add--fav"
              data-id="${id}" data-title="${safeTitle}" data-img="${safeImg}"
              data-score="${a.score||''}" data-eps="${a.episodes||''}"
              data-list="favorites" onclick="handleAdd(this)">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Fav
            </button>
          </div>`;

      return `<div class="anime-search-card ${already ? 'anime-search-card--added' : ''}">
        ${img
          ? `<img src="${safeImg}" class="anime-search-card-img" loading="lazy" onerror="this.style.display='none'" />`
          : `<div class="anime-search-card-img anime-search-card-img--ph">${title.charAt(0)}</div>`}
        <div class="anime-search-card-body">
          <div class="anime-search-card-title">${safeTitle}</div>
          <div class="anime-search-card-meta">${score}${score && eps ? ' · ' : ''}${eps}</div>
          ${addBtns}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div class="anime-search-empty">Search failed. Try again.</div>`;
  }
}

// ── Add / Move / Remove ────────────────────────
window.addAnime = async function(anime, tab) {
  if (!currentUser) return;
  ['watched','plan','favorites'].forEach(t => {
    animeList[t] = animeList[t].filter(a => a.id !== anime.id);
  });
  animeList[tab].unshift(anime);
  updateCounts();
  renderAll();
  await saveList();
  const q = document.getElementById('animeSearchInput').value.trim();
  if (q.length >= 2) searchAnime(q);
};

window.moveAnime = async function(id, fromTab, toTab) {
  const anime = animeList[fromTab].find(a => a.id === id);
  if (!anime) return;
  animeList[fromTab] = animeList[fromTab].filter(a => a.id !== id);
  animeList[toTab]   = animeList[toTab].filter(a => a.id !== id);
  animeList[toTab].unshift(anime);
  updateCounts();
  renderAll();
  await saveList();
};

window.removeAnime = async function(id, tab) {
  animeList[tab] = animeList[tab].filter(a => a.id !== id);
  updateCounts();
  renderTab(tab);
  await saveList();
  const q = document.getElementById('animeSearchInput')?.value.trim();
  if (q && q.length >= 2) searchAnime(q);
};

window.handleAdd = function(btn) {
  const anime = {
    id:       parseInt(btn.dataset.id),
    title:    btn.dataset.title,
    image:    btn.dataset.img,
    score:    btn.dataset.score ? parseFloat(btn.dataset.score) : null,
    episodes: btn.dataset.eps   ? parseInt(btn.dataset.eps)     : null,
  };
  addAnime(anime, btn.dataset.list);
};

window.switchAnimeTab = function(tab, btn) {
  activeTab = tab;
  document.querySelectorAll('.anime-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.anime-tab-content').forEach(c => c.style.display = 'none');
  btn.classList.add('active');
  document.getElementById('tab-' + tab).style.display = 'block';
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

window.closeSearchPanel = function() {
  document.getElementById('searchPanel').style.display = 'none';
  document.getElementById('animeSearchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
};

function renderError(msg) {
  ['watched','plan','favorites'].forEach(t => {
    document.getElementById('tab-' + t).innerHTML = `<div class="anime-empty"><p>${msg}</p></div>`;
  });
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
