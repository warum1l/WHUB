// =============================================
// WHUB — Anime Catalog (AniList GraphQL)
// =============================================
import { auth, db, initNavAuth, onAuthStateChanged, getUserDoc }
  from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

initNavAuth();

const ANILIST = 'https://graphql.anilist.co';
const IMG_BASE = 'https://image.tmdb.org/t/p/w300';

let currentUser  = null;
let animeList    = { watched: [], plan: [], favorites: [] };
let currentFilter = 'trending';
let currentGenre  = '';
let currentPage   = 1;
let isSearchMode  = false;
let searchQuery   = '';
let modalAnime    = null;
let searchTimeout = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    try {
      const snap = await getDoc(doc(db, 'anime_lists', user.uid));
      animeList = snap.exists()
        ? { watched: [], plan: [], favorites: [], ...snap.data() }
        : { watched: [], plan: [], favorites: [] };
    } catch(e) {}
  }
});

// ── Input search ───────────────────────────────
const searchInput = document.getElementById('catalogSearch');
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') triggerSearch(); });
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (q.length === 0) { isSearchMode = false; currentPage = 1; loadCatalog(); }
});

window.triggerSearch = function() {
  const q = searchInput.value.trim();
  if (!q) return;
  isSearchMode  = true;
  searchQuery   = q;
  currentPage   = 1;
  document.getElementById('catalogLabelText').textContent = `Results for "${q}"`;
  loadCatalog();
};

// ── Filters ────────────────────────────────────
window.setFilter = function(filter, btn) {
  currentFilter = filter;
  currentPage   = 1;
  isSearchMode  = false;
  searchInput.value = '';
  document.querySelectorAll('.catalog-filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const labels = { trending: 'Trending Now', popular: 'All Time Popular', top: 'Top Rated', seasonal: 'This Season', movies: 'Anime Movies' };
  document.getElementById('catalogLabelText').textContent = labels[filter];
  loadCatalog();
};

window.setGenre = function(genre, btn) {
  currentGenre = genre;
  currentPage  = 1;
  document.querySelectorAll('.catalog-genre-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadCatalog();
};

window.loadMore = function() {
  currentPage++;
  loadCatalog(true);
};

// ── Build AniList query ────────────────────────
function buildQuery() {
  if (isSearchMode) {
    return {
      query: `query ($search: String, $page: Int, $genre: String) {
        Page(page: $page, perPage: 24) {
          pageInfo { hasNextPage total }
          media(search: $search, type: ANIME, sort: SEARCH_MATCH, genre: $genre) {
            id title { english romaji } coverImage { large medium }
            averageScore episodes format status
            genres startDate { year }
          }
        }
      }`,
      variables: { search: searchQuery, page: currentPage, genre: currentGenre || null }
    };
  }

  const sortMap = {
    trending: 'TRENDING_DESC',
    popular:  'POPULARITY_DESC',
    top:      'SCORE_DESC',
    seasonal: 'POPULARITY_DESC',
    movies:   'POPULARITY_DESC',
  };

  let extra = '';
  if (currentFilter === 'seasonal') extra = ', season: SPRING, seasonYear: 2025';
  if (currentFilter === 'movies')   extra = ', format: MOVIE';

  return {
    query: `query ($page: Int, $genre: String) {
      Page(page: $page, perPage: 24) {
        pageInfo { hasNextPage total }
        media(type: ANIME, sort: ${sortMap[currentFilter]}, genre: $genre${extra}, isAdult: false) {
          id title { english romaji } coverImage { large medium }
          averageScore episodes format status
          genres startDate { year }
        }
      }
    }`,
    variables: { page: currentPage, genre: currentGenre || null }
  };
}

// ── Load catalog ───────────────────────────────
async function loadCatalog(append = false) {
  const grid = document.getElementById('catalogGrid');
  const loadMoreWrap = document.getElementById('loadMoreWrap');

  if (!append) {
    grid.innerHTML = `<div class="catalog-loading"><div class="auth-loading-spinner"></div><span>Loading...</span></div>`;
    loadMoreWrap.style.display = 'none';
  } else {
    document.getElementById('loadMoreBtn').textContent = 'Loading...';
    document.getElementById('loadMoreBtn').disabled = true;
  }

  try {
    const body = buildQuery();
    const res  = await fetch(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    const page  = json?.data?.Page;
    const media = page?.media || [];
    const total = page?.pageInfo?.total;
    const hasNext = page?.pageInfo?.hasNextPage;

    if (media.length === 0 && !append) {
      grid.innerHTML = `<div class="catalog-loading"><span>No results found.</span></div>`;
      return;
    }

    if (total) document.getElementById('catalogCount').textContent = total.toLocaleString() + ' titles';

    const cards = media.map(a => catalogCard(a)).join('');
    if (append) {
      grid.innerHTML += cards;
    } else {
      grid.innerHTML = cards;
    }

    loadMoreWrap.style.display = hasNext ? 'block' : 'none';
    if (hasNext) {
      document.getElementById('loadMoreBtn').textContent = 'Load More';
      document.getElementById('loadMoreBtn').disabled = false;
    }
  } catch(e) {
    grid.innerHTML = `<div class="catalog-loading"><span>Failed to load. Please try again.</span></div>`;
    console.error(e);
  }
}

function catalogCard(a) {
  const title  = a.title.english || a.title.romaji;
  const poster = a.coverImage?.large || a.coverImage?.medium || '';
  const score  = a.averageScore ? (a.averageScore / 10).toFixed(1) : '';
  const format = formatLabel(a.format);
  const year   = a.startDate?.year || '';

  const inList = isInList(a.id);
  const statusDot = inList ? `<div class="catalog-card-in-list-dot" title="In your list"></div>` : '';

  return `<div class="catalog-card" onclick="openModal(${JSON.stringify({
    id: a.id,
    title,
    poster,
    score,
    episodes: a.episodes,
    format: a.format,
    year,
    genres: (a.genres || []).slice(0, 3).join(', ')
  }).replace(/"/g, '&quot;')})">
    ${poster
      ? `<img src="${escHtml(poster)}" class="catalog-card-poster" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="catalog-card-poster-ph">${title.charAt(0)}</div>`}
    <div class="catalog-card-overlay">
      <button class="catalog-card-add-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        ${inList ? 'In List' : 'Add to List'}
      </button>
    </div>
    <div class="catalog-card-body">
      <div class="catalog-card-title">${escHtml(title)}</div>
      <div class="catalog-card-meta">
        ${score ? `<span class="catalog-card-score">★ ${score}</span>` : ''}
        ${format ? `<span class="catalog-card-format">${format}</span>` : ''}
        ${year ? `<span>${year}</span>` : ''}
      </div>
    </div>
  </div>`;
}

// ── Modal ──────────────────────────────────────
window.openModal = function(animeStr) {
  const anime = typeof animeStr === 'string' ? JSON.parse(animeStr.replace(/&quot;/g, '"')) : animeStr;
  modalAnime = anime;

  document.getElementById('modalAnimeTitle').textContent = anime.title;
  document.getElementById('modalPoster').src = anime.poster || '';
  document.getElementById('modalMeta').innerHTML = [
    anime.score   ? `★ ${anime.score}` : '',
    anime.episodes ? `${anime.episodes} episodes` : '',
    formatLabel(anime.format),
    anime.year,
    anime.genres,
  ].filter(Boolean).join(' · ');

  const authPrompt = document.getElementById('modalAuthPrompt');
  const modalBtns  = document.getElementById('modalBtns');
  const statusEl   = document.getElementById('modalStatus');
  statusEl.textContent = '';

  if (!currentUser) {
    authPrompt.style.display = 'block';
    modalBtns.style.display  = 'none';
  } else {
    authPrompt.style.display = 'none';
    modalBtns.style.display  = 'block';
    const inList = isInList(anime.id);
    if (inList) statusEl.textContent = `Already in your ${inList} list`;
  }

  document.getElementById('modalOverlay').style.display = 'block';
  document.getElementById('addModal').style.display     = 'block';
};

window.closeModal = function() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('addModal').style.display     = 'none';
  modalAnime = null;
};

window.addFromModal = async function(tab) {
  if (!currentUser || !modalAnime) return;
  const statusEl = document.getElementById('modalStatus');
  statusEl.textContent = 'Adding...';

  const item = {
    id:       modalAnime.id,
    title:    modalAnime.title,
    image:    modalAnime.poster,
    score:    modalAnime.score ? parseFloat(modalAnime.score) : null,
    episodes: modalAnime.episodes || null,
  };

  // Remove from all tabs first
  ['watched','plan','favorites'].forEach(t => {
    animeList[t] = animeList[t].filter(a => a.id !== item.id);
  });
  animeList[tab].unshift(item);

  try {
    await setDoc(doc(db, 'anime_lists', currentUser.uid), {
      ...animeList, updatedAt: serverTimestamp()
    });
    const tabLabels = { watched: 'Watched', plan: 'Plan to Watch', favorites: 'Favorites' };
    statusEl.textContent = `Added to ${tabLabels[tab]}!`;
    statusEl.style.color = '#00c864';
    setTimeout(closeModal, 1200);
  } catch(e) {
    statusEl.textContent = 'Failed. Try again.';
    statusEl.style.color = '#e8453c';
  }
};

// ── Helpers ────────────────────────────────────
function isInList(id) {
  if (animeList.watched.find(a => a.id === id))   return 'watched';
  if (animeList.plan.find(a => a.id === id))       return 'plan';
  if (animeList.favorites.find(a => a.id === id)) return 'favorites';
  return null;
}

function formatLabel(fmt) {
  const map = { TV: 'TV', TV_SHORT: 'Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };
  return map[fmt] || fmt || '';
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Init ───────────────────────────────────────
loadCatalog();
