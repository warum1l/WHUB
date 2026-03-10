// =============================================
// WHUB — Profile Page Logic
// =============================================
import { auth, db, getUserDoc, updateUserDoc, initNavAuth,
         signOut, onAuthStateChanged }
  from './firebase.js';

import { collection, query, where, getDocs, orderBy }
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

  // Load activity in parallel
  loadMyTrades(user.uid);
  loadMyFeedback(user.uid);
});

initNavAuth();

// ─── RENDER PROFILE ───────────────────────────
function renderProfile(data, user) {
  if (!data) return;

  const initial = (data.username || 'W').charAt(0).toUpperCase();
  document.getElementById('profileAvatar').textContent   = initial;
  document.getElementById('profileUsername').textContent = data.username || '—';
  document.getElementById('profileEmail').textContent    = user.email;
  document.getElementById('profileBio').textContent      = data.bio || '';

  const roleBadge = document.getElementById('profileRole');
  roleBadge.textContent = capitalize(data.role || 'member');
  roleBadge.className   = 'profile-role-badge role--' + (data.role || 'member');

  document.getElementById('statRole').textContent = capitalize(data.role || 'member');

  // Public profile link
  const pubLink = document.getElementById('profilePublicLink');
  if (pubLink) pubLink.href = `user.html?u=${encodeURIComponent(data.username)}`;

  // Joined date
  if (data.createdAt?.seconds) {
    const date = new Date(data.createdAt.seconds * 1000);
    document.getElementById('profileJoined').textContent =
      'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('statJoinedShort').textContent =
      date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Social links
  renderSocials(data);
}

function renderSocials(data) {
  const wrap = document.getElementById('profileSocials');
  wrap.innerHTML = '';
  if (data.robloxUser) {
    wrap.innerHTML += `<span class="profile-social-chip profile-social-chip--roblox">
      <svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor"/><rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" opacity=".5"/><rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" opacity=".5"/><rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor"/></svg>
      ${escHtml(data.robloxUser)}
    </span>`;
  }
  if (data.discordUser) {
    wrap.innerHTML += `<span class="profile-social-chip profile-social-chip--discord">
      <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M16.9 4.2A16.1 16.1 0 0 0 13 3a.1.1 0 0 0-.1.1 11 11 0 0 0-.5 1 14.9 14.9 0 0 0-4.8 0 10.5 10.5 0 0 0-.5-1 .1.1 0 0 0-.1-.1A16.1 16.1 0 0 0 3.1 4.2a.1.1 0 0 0-.1.1C1.6 8.3 1.2 12.3 1.5 16.3a.1.1 0 0 0 .1.1 16.2 16.2 0 0 0 4.9 2.5.1.1 0 0 0 .1-.1 11.6 11.6 0 0 0 1-1.6.1.1 0 0 0-.1-.2 10.7 10.7 0 0 1-1.5-.7.1.1 0 0 1 0-.2l.3-.2a.1.1 0 0 1 .1 0c3.2 1.5 6.7 1.5 9.9 0a.1.1 0 0 1 .1 0l.3.2a.1.1 0 0 1 0 .2 10 10 0 0 1-1.5.7.1.1 0 0 0-.1.2 13 13 0 0 0 1 1.6.1.1 0 0 0 .1.1 16.2 16.2 0 0 0 4.9-2.5.1.1 0 0 0 .1-.1c.4-4.5-.6-8.5-2.5-12a.1.1 0 0 0-.1-.1ZM7.2 13.8c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2c1 0 1.9 1 1.9 2.2s-.9 2.2-1.9 2.2Zm5.6 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2c1 0 1.9 1 1.9 2.2s-.9 2.2-1.9 2.2Z"/></svg>
      ${escHtml(data.discordUser)}
    </span>`;
  }
}

// ─── MY TRADES ────────────────────────────────
async function loadMyTrades(uid) {
  const el = document.getElementById('myTradesList');
  try {
    const q = query(collection(db, 'aotr_trades'), where('uid', '==', uid));
    const snap = await getDocs(q);

    // Sort client-side newest first
    const trades = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    // Update stat
    document.getElementById('statTrades').textContent = trades.length;

    if (trades.length === 0) {
      el.innerHTML = `<div class="profile-empty">
        <span>🔄</span><p>No trades posted yet. <a href="aotr-trading.html">Post one →</a></p>
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
              ${t.robloxUser ? `<span>🎮 ${escHtml(t.robloxUser)}</span>` : ''}
              ${t.msgCount   ? `<span>💬 ${t.msgCount}</span>` : ''}
              ${date         ? `<span>📅 ${date}</span>` : ''}
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
  const TYPE_ICONS = { suggestion:'💡', question:'❓', bug:'🐛', other:'💬' };
  try {
    const q = query(collection(db, 'feedback'), where('uid', '==', uid));
    const snap = await getDocs(q);

    const posts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById('statFeedback').textContent = posts.length;

    if (posts.length === 0) {
      el.innerHTML = `<div class="profile-empty">
        <span>💬</span><p>No feedback posts yet. <a href="feedback.html">Post something →</a></p>
      </div>`;
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
              ${p.upvotes  ? `<span>▲ ${p.upvotes}</span>` : ''}
              ${p.replyCount ? `<span>💬 ${p.replyCount}</span>` : ''}
              ${date ? `<span>📅 ${date}</span>` : ''}
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
  document.getElementById('editPanel').classList.add('open');
  document.getElementById('editError').textContent = '';
};

window.closeEdit = function() {
  document.getElementById('editPanel').classList.remove('open');
};

window.handleSave = async function() {
  const username    = document.getElementById('editUsername').value.trim();
  const bio         = document.getElementById('editBio').value.trim();
  const robloxUser  = document.getElementById('editRoblox').value.trim();
  const discordUser = document.getElementById('editDiscord').value.trim();
  const errEl       = document.getElementById('editError');
  const btn         = document.getElementById('saveBtn');

  if (!username)          return errEl.textContent = 'Username cannot be empty.';
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

// ─── UTILS ────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
