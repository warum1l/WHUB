// =============================================
// WHUB — Profile Page
// =============================================
import { auth, db, getUserDoc, updateUserDoc, initNavAuth,
         signOut, onAuthStateChanged } from './firebase.js';
import { doc, getDoc, collection, query, orderBy, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  createPost, deletePost, toggleLike, addComment,
  subscribeToUserPosts, acceptFriendRequest,
  declineFriendRequest, getIncomingRequests, escHtml, timeAgo
} from './social.js';
import { toastError, toastSuccess } from './toast.js';
import { validateUsername, moderateContent } from './utils.js';

let currentUser = null;
let currentData = null;
let postsUnsub  = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  currentUser = user;
  currentData = await getUserDoc(user.uid);
  renderProfile(currentData, user);
  document.getElementById('authLoading').style.display = 'none';
  document.getElementById('profilePage').style.display = 'block';
  loadFriends();
  loadIncomingRequests();
  startPostsFeed();
});

initNavAuth();

function renderProfile(data, user) {
  if (!data) return;
  const initial = (data.username || 'W').charAt(0).toUpperCase();
  const role    = data.role || 'member';

  document.getElementById('profileAvatar').textContent = initial;
  document.getElementById('profileAvatar').className   = 'pf-avatar pf-avatar--' + role;
  document.getElementById('composerAvatar').textContent = initial;
  document.getElementById('composerAvatar').className   = 'post-composer-avatar pf-avatar--' + role;
  document.getElementById('profileUsername').textContent = data.username || '—';
  document.getElementById('profileEmail').textContent    = user.email;
  document.getElementById('profileBio').textContent      = data.bio || '';

  const roleBadge = document.getElementById('profileRole');
  roleBadge.textContent = capitalize(role);
  roleBadge.className   = 'profile-role-badge role--' + role;

  const cover = document.getElementById('pfCover');
  const coverColors = { admin: 'linear-gradient(135deg,rgba(232,69,60,.3) 0%,rgba(232,69,60,.05) 60%,transparent)', mod: 'linear-gradient(135deg,rgba(0,200,100,.2) 0%,rgba(0,200,100,.04) 60%,transparent)', member: 'linear-gradient(135deg,rgba(60,100,232,.15) 0%,rgba(60,100,232,.03) 60%,transparent)' };
  cover.style.background = coverColors[role] || coverColors.member;

  if (data.createdAt?.seconds) {
    const date = new Date(data.createdAt.seconds * 1000);
    document.getElementById('profileJoined').textContent = 'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('pfJoinedWrap').style.display = 'flex';
    document.getElementById('statJoinedShort').textContent = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (data.robloxUser)  { document.getElementById('pfRobloxVal').textContent = data.robloxUser;  document.getElementById('pfRobloxWrap').style.display = 'flex'; }
  if (data.discordUser) { document.getElementById('pfDiscordVal').textContent = data.discordUser; document.getElementById('pfDiscordWrap').style.display = 'flex'; }

  const pubLink = document.getElementById('profilePublicLink');
  if (pubLink) pubLink.href = `user.html?u=${encodeURIComponent(data.username)}`;

  document.getElementById('statFriendCount').textContent = (data.friends || []).length;
}

function startPostsFeed() {
  if (postsUnsub) postsUnsub();
  postsUnsub = subscribeToUserPosts(currentUser.uid, (posts) => {
    document.getElementById('tabCountPosts').textContent = posts.length;
    document.getElementById('statPostCount').textContent = posts.length;
    renderFeed(posts);
  });
}

function renderFeed(posts) {
  const el = document.getElementById('postsFeed');
  if (posts.length === 0) {
    el.innerHTML = `<div class="feed-empty"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-dim)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No posts yet.</p><span>Share what's on your mind!</span></div>`;
    return;
  }
  el.innerHTML = posts.map(p => postCard(p, true)).join('');
}

function postCard(p, isOwn) {
  const initial = p.username.charAt(0).toUpperCase();
  const role    = p.role || 'member';
  const liked   = (p.likes || []).includes(currentUser?.uid);
  const tags    = (p.tags || []).map(t => `<span class="post-tag">${escHtml(t)}</span>`).join('');
  const time    = p.createdAt?.seconds ? timeAgo(p.createdAt.seconds) : '';

  return `<div class="post-card fade-in-up" id="post-${p.id}">
    <div class="post-card-header">
      <div class="post-card-avatar pf-avatar--${role}">${initial}</div>
      <div class="post-card-meta">
        <div class="post-card-author"><a href="user.html?u=${encodeURIComponent(p.username)}">${escHtml(p.username)}</a></div>
        <div class="post-card-time">${time}</div>
      </div>
      ${isOwn ? `<button class="post-card-delete" onclick="handleDeletePost('${p.id}')" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
      </button>` : ''}
    </div>
    <div class="post-card-text">${escHtml(p.text)}</div>
    ${tags ? `<div class="post-card-tags">${tags}</div>` : ''}
    <div class="post-card-actions">
      <button class="post-action-btn ${liked ? 'liked' : ''}" onclick="handleLike('${p.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${(p.likes || []).length}
      </button>
      <button class="post-action-btn" onclick="toggleComments('${p.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${p.commentCount || 0}
      </button>
      ${!isOwn ? `<button class="post-report-btn" onclick="handleReport('${p.id}','post')" title="Report">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
        Report
      </button>` : ''}
    </div>
    <div class="post-comments" id="comments-${p.id}">
      <div id="comments-list-${p.id}"></div>
      <div class="post-comment-input-wrap">
        <input type="text" class="post-comment-input" id="comment-input-${p.id}" placeholder="Write a comment..." maxlength="200"
          onkeydown="if(event.key==='Enter')handleComment('${p.id}')" />
        <button class="post-comment-send" onclick="handleComment('${p.id}')">Reply</button>
      </div>
    </div>
  </div>`;
}

window.submitPost = async function() {
  const text    = document.getElementById('postText').value.trim();
  const tagsRaw = document.getElementById('postTags').value.trim();
  const errEl   = document.getElementById('postError');
  const btn     = document.getElementById('postSubmitBtn');
  if (!text) { errEl.textContent = 'Write something first.'; return; }
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Posting...';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5) : [];
  try {
    await createPost(currentUser.uid, currentData.username, currentData.role || 'member', text, tags);
    document.getElementById('postText').value = '';
    document.getElementById('postTags').value = '';
    document.getElementById('postCharCount').textContent = '0';
  } catch(e) { toastError(e.message || 'Failed to post.'); }
  btn.disabled = false; btn.textContent = 'Post';
};

window.handleDeletePost = async function(postId) {
  if (!confirm('Delete this post?')) return;
  await deletePost(postId);
};

window.handleLike = async function(postId) {
  if (!currentUser) return;
  await toggleLike(postId, currentUser.uid);
};

window.toggleComments = async function(postId) {
  const el = document.getElementById('comments-' + postId);
  if (!el.classList.contains('open')) { el.classList.add('open'); loadComments(postId); }
  else { el.classList.remove('open'); }
};

async function loadComments(postId) {
  const el = document.getElementById('comments-list-' + postId);
  const q  = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  el.innerHTML = snap.docs.map(d => {
    const c = d.data();
    return `<div class="post-comment">
      <div class="post-comment-avatar pf-avatar--${c.role||'member'}">${c.username.charAt(0).toUpperCase()}</div>
      <div class="post-comment-bubble">
        <div class="post-comment-author">${escHtml(c.username)}</div>
        <div class="post-comment-text">${escHtml(c.text)}</div>
      </div>
    </div>`;
  }).join('');
}

window.handleComment = async function(postId) {
  const input = document.getElementById('comment-input-' + postId);
  const text  = input.value.trim();
  if (!text || !currentUser) return;
  input.value = '';
  try {
    await addComment(postId, currentUser.uid, currentData.username, currentData.role || 'member', text);
    loadComments(postId);
  } catch(e) {
    document.getElementById('comment-input-' + postId).value = text;
    toastError(e.message || 'Failed to post comment.');
  }
};

async function loadFriends() {
  const data = await getUserDoc(currentUser.uid);
  const friends = data?.friends || [];
  document.getElementById('statFriendCount').textContent = friends.length;
  const el = document.getElementById('friendsList');
  if (friends.length === 0) {
    el.innerHTML = `<div style="font-size:0.78rem;color:var(--text-dim)">No friends yet. Find users and add them!</div>`;
    return;
  }
  const items = await Promise.all(friends.map(async uid => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return '';
      const u = snap.data();
      const initial = u.username.charAt(0).toUpperCase();
      return `<div class="friend-item">
        <div class="friend-avatar pf-avatar--${u.role||'member'}">${initial}</div>
        <a class="friend-name" href="user.html?u=${encodeURIComponent(u.username)}">${escHtml(u.username)}</a>
        <button class="friend-msg-btn" onclick="window.location.href='messages.html?with=${uid}'">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        </button>
      </div>`;
    } catch(e) { return ''; }
  }));
  el.innerHTML = items.filter(Boolean).join('');
}

async function loadIncomingRequests() {
  const requests = await getIncomingRequests(currentUser.uid);
  const el = document.getElementById('incomingRequests');
  const badge = document.getElementById('friendRequestsBadge');
  if (requests.length === 0) { el.innerHTML = ''; badge.style.display = 'none'; return; }
  badge.style.display = 'inline';
  badge.textContent   = `(${requests.length})`;
  el.innerHTML = requests.map(r => `
    <div class="friend-request-item" style="margin-bottom:8px">
      <span class="friend-request-name">${escHtml(r.fromUsername)}</span>
      <button class="friend-accept-btn"  onclick="handleAccept('${r.id}','${r.from}')">Accept</button>
      <button class="friend-decline-btn" onclick="handleDecline('${r.id}')">✕</button>
    </div>`).join('');
}

window.handleAccept = async function(requestId, fromUid) {
  await acceptFriendRequest(requestId, fromUid, currentUser.uid);
  loadFriends(); loadIncomingRequests();
};

window.handleDecline = async function(requestId) {
  await declineFriendRequest(requestId);
  loadIncomingRequests();
};

window.searchUser = async function() {
  const input  = document.getElementById('userSearchInput');
  const result = document.getElementById('userSearchResult');
  const btn    = document.getElementById('userSearchBtn');
  const username = input.value.trim();
  if (!username) return;
  btn.disabled = true; btn.textContent = '...';
  result.innerHTML = '';
  try {
    const { getUserByUsername } = await import('./firebase.js');
    const data = await getUserByUsername(username);
    if (!data) {
      result.innerHTML = `<div class="pf-search-empty">No user: <strong>${escHtml(username)}</strong></div>`;
    } else {
      const initial = data.username.charAt(0).toUpperCase();
      result.innerHTML = `
        <a class="pf-search-result" href="user.html?u=${encodeURIComponent(data.username)}">
          <div class="pf-search-result-avatar pf-avatar--${data.role||'member'}">${initial}</div>
          <div class="pf-search-result-info">
            <div class="pf-search-result-name">${escHtml(data.username)}
              <span class="profile-role-badge role--${data.role||'member'}" style="font-size:0.6rem;padding:2px 8px">${capitalize(data.role||'member')}</span>
            </div>
            ${data.bio ? `<div class="pf-search-result-bio">${escHtml(data.bio)}</div>` : ''}
          </div>
          <span style="color:var(--text-dim)">→</span>
        </a>`;
    }
  } catch(e) { result.innerHTML = `<div class="pf-search-empty">Error. Try again.</div>`; }
  btn.disabled = false; btn.textContent = 'Search';
};

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('userSearchInput');
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') window.searchUser(); });
});

window.openEdit = function() {
  document.getElementById('editUsername').value = currentData?.username || '';
  document.getElementById('editBio').value      = currentData?.bio || '';
  document.getElementById('editRoblox').value   = currentData?.robloxUser || '';
  document.getElementById('editDiscord').value  = currentData?.discordUser || '';
  document.getElementById('editPanel').style.display = 'block';
  document.getElementById('editError').textContent   = '';
};
window.closeEdit = function() { document.getElementById('editPanel').style.display = 'none'; };

window.handleSave = async function() {
  const username    = document.getElementById('editUsername').value.trim();
  const bio         = document.getElementById('editBio').value.trim();
  const robloxUser  = document.getElementById('editRoblox').value.trim();
  const discordUser = document.getElementById('editDiscord').value.trim();
  const errEl = document.getElementById('editError');
  const btn   = document.getElementById('saveBtn');
  const unErr = validateUsername(username);
  if (unErr) return errEl.textContent = unErr;
  btn.disabled = true;
  btn.querySelector('.auth-btn-text').textContent = 'Saving...';
  try {
    await updateUserDoc(currentUser.uid, { username, bio, robloxUser, discordUser });
    currentData = { ...currentData, username, bio, robloxUser, discordUser };
    renderProfile(currentData, currentUser);
    closeEdit();
    toastSuccess('Profile updated');
  } catch(e) { toastError('Failed to save changes.'); }
  btn.disabled = false;
  btn.querySelector('.auth-btn-text').textContent = 'Save Changes';
};

window.handleSignOut = async function() {
  await signOut(auth);
  window.location.href = 'index.html';
};

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

window.handleReport = async function(contentId, type) {
  if (!currentUser) return;
  const btn = document.querySelector(`[onclick="handleReport('${contentId}','${type}')"]`);
  if (btn) { btn.classList.add('reported'); btn.textContent = 'Reported'; }
  try {
    await addDoc(collection(db, 'reports'), {
      contentId, type,
      reportedBy: currentUser.uid,
      reporterUsername: currentData?.username || 'Unknown',
      createdAt: serverTimestamp(),
    });
  } catch(e) { console.error('Report failed:', e); }
};
