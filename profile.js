// =============================================
// WHUB — Profile Page Logic
// =============================================
import { auth, db, getUserDoc, updateUserDoc, initNavAuth,
         signOut, onAuthStateChanged }
  from './firebase.js';

import { collection, query, where, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let currentUser = null;
let currentData = null;

onAuthStateChanged(auth, async (user) => {
  const loading = document.getElementById('authLoading');
  const page    = document.getElementById('profilePage');

  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;
  currentData = await getUserDoc(user.uid);

  renderProfile(currentData, user);
  loading.style.display = 'none';
  page.style.display    = 'block';

  loadMyTrades(user.uid);
  loadMyFeedback(user.uid);
});

initNavAuth();

// ─── RENDER PROFILE ───────────────────────────
function renderProfile(data, user) {
  if (!data) return;

  const initial = (data.username || 'W').charAt(0).toUpperCase();
  const role    = data.role || 'member';

  document.getElementById('profileAvatar').textContent   = initial;
  document.getElementById('profileUsername').textContent = data.username || '—';
  document.getElementById('profileEmail').textContent    = user.email;
  document.getElementById('profileBio').textContent      = data.bio || '';

  // Avatar color by role
  const avatar = document.getElementById('profileAvatar');
  avatar.className = 'pf-avatar pf-avatar--' + role;

  const roleBadge = document.getElementById('profileRole');
  roleBadge.textContent = capitalize(role);
  roleBadge.className   = 'profile-role-badge role--' + role;

  // Public profile link
  const pubLink = document.getElementById('profilePublicLink');
  if (pubLink) pubLink.href = `user.html?u=${encodeURIComponent(data.username)}`;

  // Cover gradient by role
  const cover = document.getElementById('pfCover');
  const coverColors = {
    admin:  'linear-gradient(135deg, rgba(232,69,60,0.3) 0%, rgba(232,69,60,0.05) 60%, transparent)',
    mod:    'linear-gradient(135deg, rgba(0,200,100,0.2) 0%, rgba(0,200,100,0.04) 60%, transparent)',
    member: 'linear-gradient(135deg, rgba(60,100,232,0.15) 0%, rgba(60,100,232,0.03) 60%, transparent)',
  };
  cover.style.background = coverColors[role] || coverColors.member;

  // Joined date
  if (data.createdAt?.seconds) {
    const date = new Date(data.createdAt.seconds * 1000);
    const el = document.getElementById('profileJoined');
    const elShort = document.getElementById('statJoinedShort');
    if (el) {
      el.textContent = 'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      document.getElementById('pfJoinedWrap').style.display = 'flex';
    }
    if (elShort) elShort.textContent = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Socials
  if (data.robloxUser) {
    document.getElementById('pfRobloxVal').textContent = data.robloxUser;
    document.getElementById('pfRobloxWrap').style.display = 'flex';
  }
  if (data.discordUser) {
    document.getElementById('pfDiscordVal').textContent = data.discordUser;
    document.getElementById('pfDiscordWrap').style.display = 'flex';
  }
}

// ─── MY TRADES ────────────────────────────────
async function loadMyTrades(uid) {
  const el = document.getElementById('myTradesList');
  try {
    const q    = query(collection(db, 'aotr_trades'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const trades = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById('statTrades').textContent    = trades.length;
    document.getElementById('tabCountTrades').textContent = trades.length;

    if (trades.length === 0) {
      el.innerHTML = `<div class="profile-empty">
        <span style="color:var(--text-dim)"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg></span>
        <p>No trades posted yet. <a href="aotr-trading.html">Post one →</a></p>
      </div>`;
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
              ${t.robloxUser ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg> ${escHtml(t.robloxUser)}</span>` : ''}
              ${t.msgCount   ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg> ${t.msgCount}</span>` : ''}
              ${date         ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> ${date}</span>` : ''}
            </div>
          </div>
          <span class="pact-status ${statusClass}">${statusText}</span>
        </a>`;
    }).join('');

  } catch (e) {
    el.innerHTML = `<div class="profile-empty"><p>Failed to load trades.</p></div>`;
  }
}

// ─── MY FEEDBACK ──────────────────────────────
async function loadMyFeedback(uid) {
  const el = document.getElementById('myFeedbackList');
  const TYPE_ICONS = { suggestion:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>', question:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>', bug:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>', other:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>' };
  try {
    const q    = query(collection(db, 'feedback'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const posts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById('statFeedback').textContent     = posts.length;
    document.getElementById('tabCountFeedback').textContent = posts.length;

    if (posts.length === 0) {
      el.innerHTML = `<div class="profile-empty">
        <span style="color:var(--text-dim)"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
        <p>No feedback posts yet. <a href="feedback.html">Post something →</a></p>
      </div>`;
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
              <span class="pact-type-badge pact-type--${p.type || 'other'}">${capitalize(p.type || 'other')}</span>
              ${p.upvotes    ? `<span>▲ ${p.upvotes}</span>` : ''}
              ${p.replyCount ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg> ${p.replyCount}</span>` : ''}
              ${date ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> ${date}</span>` : ''}
            </div>
          </div>
        </a>`;
    }).join('');

  } catch (e) {
    el.innerHTML = `<div class="profile-empty"><p>Failed to load posts.</p></div>`;
  }
}

// ─── SIGN OUT ─────────────────────────────────
window.handleSignOut = async function() {
  await signOut(auth);
  window.location.href = 'index.html';
};

// ─── EDIT PANEL ───────────────────────────────
window.openEdit = function() {
  document.getElementById('editUsername').value = currentData?.username || '';
  document.getElementById('editBio').value      = currentData?.bio || '';
  document.getElementById('editRoblox').value   = currentData?.robloxUser || '';
  document.getElementById('editDiscord').value  = currentData?.discordUser || '';
  document.getElementById('editPanel').style.display = 'block';
  document.getElementById('editError').textContent   = '';
};

window.closeEdit = function() {
  document.getElementById('editPanel').style.display = 'none';
};

window.handleSave = async function() {
  const username    = document.getElementById('editUsername').value.trim();
  const bio         = document.getElementById('editBio').value.trim();
  const robloxUser  = document.getElementById('editRoblox').value.trim();
  const discordUser = document.getElementById('editDiscord').value.trim();
  const errEl       = document.getElementById('editError');
  const btn         = document.getElementById('saveBtn');

  if (!username)           return errEl.textContent = 'Username cannot be empty.';
  if (username.length < 3) return errEl.textContent = 'Username must be at least 3 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return errEl.textContent = 'Letters, numbers and _ only.';

  btn.disabled = true;
  btn.querySelector('.auth-btn-text').textContent = 'Saving...';

  try {
    await updateUserDoc(currentUser.uid, { username, bio, robloxUser, discordUser });
    currentData = { ...currentData, username, bio, robloxUser, discordUser };
    renderProfile(currentData, currentUser);
    closeEdit();
  } catch (e) {
    errEl.textContent = 'Failed to save. Try again.';
  } finally {
    btn.disabled = false;
    btn.querySelector('.auth-btn-text').textContent = 'Save Changes';
  }
};

// ─── SEARCH USERS ─────────────────────────────
window.searchUser = async function() {
  const input    = document.getElementById('userSearchInput');
  const result   = document.getElementById('userSearchResult');
  const btn      = document.getElementById('userSearchBtn');
  const username = input.value.trim();
  if (!username) return;

  btn.disabled    = true;
  btn.textContent = '...';
  result.innerHTML = '';

  try {
    const { getUserByUsername } = await import('./firebase.js');
    const data = await getUserByUsername(username);

    if (!data) {
      result.innerHTML = `<div class="pf-search-empty">No user found: <strong>${escHtml(username)}</strong></div>`;
    } else {
      const initial   = data.username.charAt(0).toUpperCase();
      const roleClass = 'role--' + (data.role || 'member');
      const roleText  = capitalize(data.role || 'member');
      result.innerHTML = `
        <a class="pf-search-result" href="user.html?u=${encodeURIComponent(data.username)}">
          <div class="pf-search-result-avatar pf-avatar--${data.role||'member'}">${initial}</div>
          <div class="pf-search-result-info">
            <div class="pf-search-result-name">
              ${escHtml(data.username)}
              <span class="profile-role-badge ${roleClass}" style="font-size:0.6rem;padding:2px 8px">${roleText}</span>
            </div>
            ${data.bio ? `<div class="pf-search-result-bio">${escHtml(data.bio)}</div>` : ''}
          </div>
          <span style="color:var(--text-dim)">→</span>
        </a>`;
    }
  } catch(e) {
    result.innerHTML = `<div class="pf-search-empty">Error. Try again.</div>`;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Search';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('userSearchInput');
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') window.searchUser(); });
});

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function escHtml(str)    { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
