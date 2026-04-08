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

    if (!data) { notFound.style.display = 'block'; return; }

    renderProfile(data);
    page.style.display = 'block';

    loadTrades(data.uid);
    loadFeedback(data.uid);

    // Own profile — show edit button
    onAuthStateChanged(auth, (user) => {
      if (user && user.uid === data.uid) {
        document.getElementById('pubActions').innerHTML =
          `<a href="profile.html" class="pf-btn pf-btn--ghost">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Edit Profile
          </a>`;
      }
    });

  } catch(e) {
    console.error(e);
    loading.style.display  = 'none';
    notFound.style.display = 'block';
  }
});

function renderProfile(data) {
  const initial = data.username.charAt(0).toUpperCase();
  const role    = data.role || 'member';

  document.getElementById('pubAvatar').textContent = initial;
  document.getElementById('pubAvatar').className   = 'pf-avatar pf-avatar--' + role;
  document.getElementById('pubUsername').textContent = data.username;
  document.getElementById('pubBio').textContent      = data.bio || '';

  const roleBadge = document.getElementById('pubRole');
  roleBadge.textContent = capitalize(role);
  roleBadge.className   = 'profile-role-badge role--' + role;

  // Cover gradient
  const cover = document.getElementById('pfCover');
  const coverColors = {
    admin:  'linear-gradient(135deg, rgba(232,69,60,0.3) 0%, rgba(232,69,60,0.05) 60%, transparent)',
    mod:    'linear-gradient(135deg, rgba(0,200,100,0.2) 0%, rgba(0,200,100,0.04) 60%, transparent)',
    member: 'linear-gradient(135deg, rgba(60,100,232,0.15) 0%, rgba(60,100,232,0.03) 60%, transparent)',
  };
  cover.style.background = coverColors[role] || coverColors.member;

  if (data.createdAt?.seconds) {
    const date = new Date(data.createdAt.seconds * 1000);
    document.getElementById('pubJoined').textContent =
      'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('pfJoinedWrap').style.display = 'flex';
    document.getElementById('statJoinedShort').textContent =
      date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  if (data.robloxUser) {
    document.getElementById('pfRobloxVal').textContent = data.robloxUser;
    document.getElementById('pfRobloxWrap').style.display = 'flex';
  }
  if (data.discordUser) {
    document.getElementById('pfDiscordVal').textContent = data.discordUser;
    document.getElementById('pfDiscordWrap').style.display = 'flex';
  }

  document.title = `@${data.username} — WHUB`;
}

async function loadTrades(uid) {
  const el = document.getElementById('pubTradesList');
  try {
    const q    = query(collection(db, 'aotr_trades'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const trades = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById('statTrades').textContent     = trades.length;
    document.getElementById('tabCountTrades').textContent = trades.length;

    if (trades.length === 0) {
      el.innerHTML = `<div class="profile-empty"><span style="color:var(--text-dim)"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg></span><p>No trades posted yet.</p></div>`;
      return;
    }

    el.innerHTML = trades.map(t => {
      const date = t.createdAt?.seconds
        ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      const statusClass = t.status === 'completed' ? 'pact-status--done' : 'pact-status--open';
      return `
        <a class="pact-item" href="aotr-trading.html">
          <div class="pact-main">
            <div class="pact-trade">
              <span class="pact-offer">${escHtml(t.offer || '—')}</span>
              <span class="pact-arrow">⇄</span>
              <span class="pact-want">${escHtml(t.want || '—')}</span>
            </div>
            <div class="pact-meta">
              ${t.robloxUser ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg> ${escHtml(t.robloxUser)}</span>` : ''}
              ${date ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> ${date}</span>` : ''}
            </div>
          </div>
          <span class="pact-status ${statusClass}">${t.status === 'completed' ? 'Completed' : 'Open'}</span>
        </a>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div class="profile-empty"><p>Failed to load trades.</p></div>`;
  }
}

async function loadFeedback(uid) {
  const el = document.getElementById('pubFeedbackList');
  const TYPE_ICONS = { suggestion:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>', question:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>', bug:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>', other:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>' };
  try {
    const q    = query(collection(db, 'feedback'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const posts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById('statFeedback').textContent      = posts.length;
    document.getElementById('tabCountFeedback').textContent  = posts.length;

    if (posts.length === 0) {
      el.innerHTML = `<div class="profile-empty"><span style="color:var(--text-dim)"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span><p>No feedback posts yet.</p></div>`;
      return;
    }

    el.innerHTML = posts.map(p => {
      const date = p.createdAt?.seconds
        ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      const icon = TYPE_ICONS[p.type] || TYPE_ICONS.other;
      return `
        <a class="pact-item" href="feedback.html">
          <div class="pact-main">
            <div class="pact-fb-title">${icon} ${escHtml(p.title || '—')}</div>
            <div class="pact-meta">
              <span class="pact-type-badge pact-type--${p.type||'other'}">${capitalize(p.type||'other')}</span>
              ${p.upvotes ? `<span>▲ ${p.upvotes}</span>` : ''}
              ${date ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> ${date}</span>` : ''}
            </div>
          </div>
        </a>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div class="profile-empty"><p>Failed to load posts.</p></div>`;
  }
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function escHtml(str)  { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
