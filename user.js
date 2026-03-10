// =============================================
// WHUB — Public User Profile
// URL: /user.html?u=username
// =============================================
import { auth, db, getUserByUsername, initNavAuth, onAuthStateChanged }
  from './firebase.js';

import { collection, query, where, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

initNavAuth();

document.addEventListener('DOMContentLoaded', async () => {
  const params   = new URLSearchParams(window.location.search);
  const username = params.get('u');

  const loading  = document.getElementById('pageLoading');
  const notFound = document.getElementById('notFound');
  const page     = document.getElementById('profilePage');

  if (!username) {
    loading.style.display = 'none';
    notFound.style.display = 'block';
    return;
  }

  document.title = `@${username} — WHUB`;

  try {
    const data = await getUserByUsername(username);

    loading.style.display = 'none';

    if (!data) {
      notFound.style.display = 'block';
      return;
    }

    renderProfile(data);
    page.style.display = 'block';

    // Load activity in parallel
    loadTrades(data.uid);
    loadFeedback(data.uid);

    // If viewing own profile — show Edit button
    onAuthStateChanged(auth, (user) => {
      if (user && user.uid === data.uid) {
        document.getElementById('pubActions').innerHTML =
          `<a href="profile.html" class="profile-edit-btn">✏ Edit Profile</a>`;
      }
    });

  } catch(e) {
    console.error(e);
    loading.style.display = 'none';
    notFound.style.display = 'block';
  }
});

// ─── RENDER PROFILE ───────────────────────────
function renderProfile(data) {
  const initial = data.username.charAt(0).toUpperCase();
  document.getElementById('pubAvatar').textContent  = initial;
  document.getElementById('pubUsername').textContent = data.username;
  document.getElementById('pubBio').textContent      = data.bio || '';

  const roleBadge = document.getElementById('pubRole');
  roleBadge.textContent = capitalize(data.role || 'member');
  roleBadge.className   = 'profile-role-badge role--' + (data.role || 'member');

  document.getElementById('statRole').textContent = capitalize(data.role || 'member');

  if (data.createdAt?.seconds) {
    const date = new Date(data.createdAt.seconds * 1000);
    document.getElementById('pubJoined').textContent =
      'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('statJoinedShort').textContent =
      date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Social chips
  const socialsEl = document.getElementById('pubSocials');
  let socialsHtml = '';
  if (data.robloxUser)  socialsHtml += `<span class="profile-social-chip profile-social-chip--roblox">
    <svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor"/><rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" opacity=".5"/><rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" opacity=".5"/><rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor"/></svg>
    ${escHtml(data.robloxUser)}</span>`;
  if (data.discordUser) socialsHtml += `<span class="profile-social-chip profile-social-chip--discord">
    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M16.9 4.2A16.1 16.1 0 0 0 13 3a.1.1 0 0 0-.1.1 11 11 0 0 0-.5 1 14.9 14.9 0 0 0-4.8 0 10.5 10.5 0 0 0-.5-1 .1.1 0 0 0-.1-.1A16.1 16.1 0 0 0 3.1 4.2a.1.1 0 0 0-.1.1C1.6 8.3 1.2 12.3 1.5 16.3a.1.1 0 0 0 .1.1 16.2 16.2 0 0 0 4.9 2.5.1.1 0 0 0 .1-.1 11.6 11.6 0 0 0 1-1.6.1.1 0 0 0-.1-.2 10.7 10.7 0 0 1-1.5-.7.1.1 0 0 1 0-.2l.3-.2a.1.1 0 0 1 .1 0c3.2 1.5 6.7 1.5 9.9 0a.1.1 0 0 1 .1 0l.3.2a.1.1 0 0 1 0 .2 10 10 0 0 1-1.5.7.1.1 0 0 0-.1.2 13 13 0 0 0 1 1.6.1.1 0 0 0 .1.1 16.2 16.2 0 0 0 4.9-2.5.1.1 0 0 0 .1-.1c.4-4.5-.6-8.5-2.5-12a.1.1 0 0 0-.1-.1ZM7.2 13.8c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2c1 0 1.9 1 1.9 2.2s-.9 2.2-1.9 2.2Zm5.6 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2c1 0 1.9 1 1.9 2.2s-.9 2.2-1.9 2.2Z"/></svg>
    ${escHtml(data.discordUser)}</span>`;
  socialsEl.innerHTML = socialsHtml;

  document.title = `@${data.username} — WHUB`;
}

// ─── TRADES ───────────────────────────────────
async function loadTrades(uid) {
  const el = document.getElementById('pubTradesList');
  try {
    const q    = query(collection(db, 'aotr_trades'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const trades = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById('statTrades').textContent = trades.length;

    if (trades.length === 0) {
      el.innerHTML = `<div class="profile-empty"><span>🔄</span><p>No trades posted yet.</p></div>`;
      return;
    }

    el.innerHTML = trades.map(t => {
      const date = t.createdAt?.seconds
        ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      const statusClass = t.status === 'completed' ? 'pact-status--done' : 'pact-status--open';
      const statusText  = t.status === 'completed' ? 'Completed' : 'Open';
      return `
        <a class="pact-item" href="aotr-trading.html">
          <div class="pact-main">
            <div class="pact-trade">
              <span class="pact-offer">${escHtml(t.offer || '—')}</span>
              <span class="pact-arrow">⇄</span>
              <span class="pact-want">${escHtml(t.want || '—')}</span>
            </div>
            <div class="pact-meta">
              ${t.robloxUser ? `<span>🎮 ${escHtml(t.robloxUser)}</span>` : ''}
              ${t.msgCount   ? `<span>💬 ${t.msgCount}</span>` : ''}
              ${date         ? `<span>📅 ${date}</span>` : ''}
            </div>
          </div>
          <span class="pact-status ${statusClass}">${statusText}</span>
        </a>`;
    }).join('');

  } catch(e) {
    el.innerHTML = `<div class="profile-empty"><p>Failed to load trades.</p></div>`;
  }
}

// ─── FEEDBACK ─────────────────────────────────
async function loadFeedback(uid) {
  const el = document.getElementById('pubFeedbackList');
  const TYPE_ICONS = { suggestion:'💡', question:'❓', bug:'🐛', other:'💬' };
  try {
    const q    = query(collection(db, 'feedback'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const posts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById('statFeedback').textContent = posts.length;

    if (posts.length === 0) {
      el.innerHTML = `<div class="profile-empty"><span>💬</span><p>No feedback posts yet.</p></div>`;
      return;
    }

    el.innerHTML = posts.map(p => {
      const date = p.createdAt?.seconds
        ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      const icon = TYPE_ICONS[p.type] || '💬';
      return `
        <a class="pact-item" href="feedback.html">
          <div class="pact-main">
            <div class="pact-fb-title">${icon} ${escHtml(p.title || '—')}</div>
            <div class="pact-meta">
              <span class="pact-type-badge pact-type--${p.type || 'other'}">${capitalize(p.type || 'other')}</span>
              ${p.upvotes    ? `<span>▲ ${p.upvotes}</span>` : ''}
              ${p.replyCount ? `<span>💬 ${p.replyCount}</span>` : ''}
              ${date         ? `<span>📅 ${date}</span>` : ''}
            </div>
          </div>
        </a>`;
    }).join('');

  } catch(e) {
    el.innerHTML = `<div class="profile-empty"><p>Failed to load posts.</p></div>`;
  }
}

// ─── UTILS ────────────────────────────────────
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function escHtml(str)  { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
