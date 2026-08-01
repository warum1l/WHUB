// =============================================
// WHUB — Public User Profile
// =============================================
import { auth, db, initNavAuth, onAuthStateChanged } from './firebase.js';
import { doc, getDoc, collection, query, orderBy, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getUserByUsernameRest, escHtml } from './utils.js';
import { toastError, toastSuccess } from './toast.js';
import {
  sendFriendRequest, getFriendStatus,
  subscribeToUserPosts, toggleLike, addComment, escHtml, timeAgo
} from './social.js';

initNavAuth();

let currentUser = null;
let currentData = null;
let viewData    = null;

const params   = new URLSearchParams(window.location.search);
const username = params.get('u');

document.addEventListener('DOMContentLoaded', async () => {
  const loading  = document.getElementById('pageLoading');
  const notFound = document.getElementById('notFound');
  const page     = document.getElementById('profilePage');

  if (!username) { loading.style.display='none'; notFound.style.display='block'; return; }
  document.title = `@${username} — WHUB`;

  try {
    viewData = await getUserByUsernameRest(username);
    loading.style.display = 'none';
    if (!viewData) { notFound.style.display='block'; return; }

    renderProfile(viewData);
    page.style.display = 'block';
    loadPosts(viewData.uid);

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        currentData = snap.exists() ? snap.data() : null;
        if (user.uid === viewData.uid) {
          document.getElementById('pubActions').innerHTML =
            `<a href="profile.html" class="pf-btn pf-btn--ghost">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Edit Profile
            </a>`;
        } else {
          renderFriendBtn(user.uid, viewData.uid);
        }
      }
    });
  } catch(e) {
    console.error(e);
    loading.style.display = 'none';
    notFound.style.display = 'block';
  }
});

// getUserByUsernameRest from utils.js

function renderProfile(data) {
  const initial = data.username.charAt(0).toUpperCase();
  const role    = data.role || 'member';

  document.getElementById('pubAvatar').textContent = initial;
  document.getElementById('pubAvatar').className   = 'pf-avatar pf-avatar--' + role;
  document.getElementById('pubUsername').textContent = data.username;
  document.getElementById('pubBio').textContent      = data.bio || '';

  const cover = document.getElementById('pfCover');
  const coverColors = { admin:'linear-gradient(135deg,rgba(232,69,60,.3) 0%,rgba(232,69,60,.05) 60%,transparent)', mod:'linear-gradient(135deg,rgba(0,200,100,.2) 0%,rgba(0,200,100,.04) 60%,transparent)', member:'linear-gradient(135deg,rgba(60,100,232,.15) 0%,rgba(60,100,232,.03) 60%,transparent)' };
  cover.style.background = coverColors[role] || coverColors.member;

  const roleBadge = document.getElementById('pubRole');
  roleBadge.textContent = capitalize(role);
  roleBadge.className   = 'profile-role-badge role--' + role;

  if (data.robloxUser)  { document.getElementById('pfRobloxVal').textContent = data.robloxUser;  document.getElementById('pfRobloxWrap').style.display='flex'; }
  if (data.discordUser) { document.getElementById('pfDiscordVal').textContent = data.discordUser; document.getElementById('pfDiscordWrap').style.display='flex'; }

  document.title = `@${data.username} — WHUB`;
}

async function renderFriendBtn(myUid, otherUid) {
  const actions = document.getElementById('pubActions');
  const result   = await getFriendStatus(myUid, otherUid);

  let btn = '';
  if (result.status === 'friends') {
    btn = `<button class="add-friend-btn friends" disabled>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
      Friends
    </button>
    <button class="pf-btn pf-btn--ghost" onclick="window.location.href='messages.html?with=${otherUid}'">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
      Message
    </button>`;
  } else if (result.status === 'pending_sent') {
    btn = `<button class="add-friend-btn pending" disabled>Request Sent</button>`;
  } else if (result.status === 'pending_received') {
    btn = `<button class="add-friend-btn" onclick="window.location.href='profile.html'">Respond to Request</button>`;
  } else {
    btn = `<button class="add-friend-btn" id="addFriendBtn" onclick="handleAddFriend()">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
      Add Friend
    </button>`;
  }
  actions.innerHTML = btn;
}

window.handleAddFriend = async function() {
  if (!currentUser || !viewData) return;
  const btn = document.getElementById('addFriendBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
  await sendFriendRequest(currentUser.uid, currentData?.username || 'Unknown', viewData.uid);
  renderFriendBtn(currentUser.uid, viewData.uid);
};

function loadPosts(uid) {
  subscribeToUserPosts(uid, (posts) => {
    document.getElementById('tabCountPosts').textContent = posts.length;
    document.getElementById('statPosts').textContent     = posts.length;
    const el = document.getElementById('postsFeed');
    if (posts.length === 0) {
      el.innerHTML = `<div class="feed-empty"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No posts yet.</p></div>`;
      return;
    }
    el.innerHTML = posts.map(p => postCard(p)).join('');
  });
}

function postCard(p) {
  const initial = p.username.charAt(0).toUpperCase();
  const role    = p.role || 'member';
  const liked   = currentUser && (p.likes || []).includes(currentUser.uid);
  const tags    = (p.tags || []).map(t => `<span class="post-tag">${escHtml(t)}</span>`).join('');
  const time    = p.createdAt?.seconds ? timeAgo(p.createdAt.seconds) : '';

  return `<div class="post-card fade-in-up" id="post-${p.id}">
    <div class="post-card-header">
      <div class="post-card-avatar pf-avatar--${role}">${initial}</div>
      <div class="post-card-meta">
        <div class="post-card-author">${escHtml(p.username)}</div>
        <div class="post-card-time">${time}</div>
      </div>
    </div>
    <div class="post-card-text">${escHtml(p.text)}</div>
    ${tags ? `<div class="post-card-tags">${tags}</div>` : ''}
    <div class="post-card-actions">
      <button class="post-action-btn ${liked ? 'liked' : ''}" onclick="handleLike('${p.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${(p.likes || []).length}
      </button>
      <button class="post-action-btn" onclick="handleReport('${p.id}','post')" title="Report" style="margin-left:auto" id="report-${p.id}">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
      </button>
      <button class="post-action-btn" onclick="toggleComments('${p.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${p.commentCount || 0}
      </button>
    </div>
    <div class="post-comments" id="comments-${p.id}">
      <div id="comments-list-${p.id}"></div>
      ${currentUser ? `<div class="post-comment-input-wrap">
        <input type="text" class="post-comment-input" id="comment-input-${p.id}" placeholder="Write a comment..." maxlength="200"
          onkeydown="if(event.key==='Enter')handleComment('${p.id}')" />
        <button class="post-comment-send" onclick="handleComment('${p.id}')">Reply</button>
      </div>` : ''}
    </div>
  </div>`;
}

window.handleLike = async function(postId) {
  if (!currentUser) return;
  await toggleLike(postId, currentUser.uid);
};

window.toggleComments = async function(postId) {
  const el = document.getElementById('comments-' + postId);
  if (!el.classList.contains('open')) {
    el.classList.add('open');
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    document.getElementById('comments-list-' + postId).innerHTML = snap.docs.map(d => {
      const c = d.data();
      return `<div class="post-comment">
        <div class="post-comment-avatar pf-avatar--${c.role||'member'}">${c.username.charAt(0).toUpperCase()}</div>
        <div class="post-comment-bubble">
          <div class="post-comment-author">${escHtml(c.username)}</div>
          <div class="post-comment-text">${escHtml(c.text)}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    el.classList.remove('open');
  }
};

window.handleComment = async function(postId) {
  if (!currentUser) return;
  const input = document.getElementById('comment-input-' + postId);
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  await addComment(postId, currentUser.uid, currentData?.username || 'Unknown', currentData?.role || 'member', text);
  // Reload comments without toggling open state
  const el = document.getElementById('comments-' + postId);
  if (el.classList.contains('open')) {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    document.getElementById('comments-list-' + postId).innerHTML = snap.docs.map(d => {
      const cm = d.data();
      return \`<div class="post-comment">
        <div class="post-comment-avatar pf-avatar--\${cm.role||'member'}">\${cm.username.charAt(0).toUpperCase()}</div>
        <div class="post-comment-bubble">
          <div class="post-comment-author">\${escHtml(cm.username)}</div>
          <div class="post-comment-text">\${escHtml(cm.text)}</div>
        </div>
      </div>\`;
    }).join('');
  }
};

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
