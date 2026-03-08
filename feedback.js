// =============================================
// WHUB — Feedback Page
// =============================================
import { auth, db, getUserDoc, initNavAuth, onAuthStateChanged }
  from './firebase.js';
import {
  collection, addDoc, onSnapshot, doc, getDoc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

initNavAuth();

let currentUser = null;
let currentData = null;
let activePost  = null;
let replyUnsub  = null;
let allPosts    = [];
let currentType   = 'suggestion';
let currentFilter = 'all';

const TYPE_ICONS = {
  suggestion: '💡',
  question:   '❓',
  bug:        '🐛',
  other:      '💬',
};

// -----------------------------------------------
// AUTH
// -----------------------------------------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    currentData = await getUserDoc(user.uid);
    document.getElementById('fbLoginNotice').classList.add('hidden');
    document.getElementById('fbInputArea').classList.remove('hidden');
    const initial = (currentData?.username || 'U').charAt(0).toUpperCase();
    document.getElementById('replyAvatar').textContent = initial;
  } else {
    document.getElementById('fbLoginNotice').classList.remove('hidden');
    document.getElementById('fbInputArea').classList.add('hidden');
  }
});

// -----------------------------------------------
// CHAR COUNT
// -----------------------------------------------
document.getElementById('fbBody').addEventListener('input', function() {
  document.getElementById('fbBodyCount').textContent = this.value.length;
});

// -----------------------------------------------
// LOAD POSTS
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));

  onSnapshot(q,
    (snap) => {
      allPosts = [];
      snap.forEach(d => allPosts.push({ id: d.id, ...d.data() }));
      renderPosts();
      document.getElementById('fbCount').textContent = allPosts.length;
    },
    (err) => {
      document.getElementById('fbPosts').innerHTML =
        `<p class="fb-error">Failed to load: ${err.message}</p>`;
    }
  );
});

// -----------------------------------------------
// RENDER
// -----------------------------------------------
function renderPosts() {
  const container = document.getElementById('fbPosts');
  const filtered  = currentFilter === 'all'
    ? allPosts
    : allPosts.filter(p => p.type === currentFilter);

  document.getElementById('fbCount').textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="fb-empty">
        <span>📭</span>
        <p>No posts yet${currentFilter !== 'all' ? ' in this category' : ''}. Be the first!</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const icon = TYPE_ICONS[p.type] || '💬';
    const time = p.createdAt?.seconds ? timeAgo(p.createdAt.seconds * 1000) : 'just now';
    return `
      <div class="fb-post-card" onclick="openPost('${p.id}')">
        <div class="fb-post-left">
          <div class="fb-post-upvote" onclick="event.stopPropagation(); upvote('${p.id}')">
            <span class="fb-upvote-icon">▲</span>
            <span class="fb-upvote-count">${p.upvotes || 0}</span>
          </div>
        </div>
        <div class="fb-post-main">
          <div class="fb-post-header">
            <span class="fb-post-type-badge fb-type--${p.type}">${icon} ${capitalize(p.type)}</span>
            <span class="fb-post-title">${escHtml(p.title)}</span>
          </div>
          <p class="fb-post-preview">${escHtml(p.body)}</p>
          <div class="fb-post-meta">
            <span>👤 ${escHtml(p.username)}</span>
            <span>${time}</span>
            <span>💬 ${p.replyCount || 0} replies</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// -----------------------------------------------
// TYPE & FILTER
// -----------------------------------------------
window.setType = function(btn, type) {
  document.querySelectorAll('.fb-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentType = type;
};

window.setFilter = function(btn, filter) {
  document.querySelectorAll('.fb-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = filter;
  renderPosts();
};

// -----------------------------------------------
// SUBMIT
// -----------------------------------------------
window.submitFeedback = async function() {
  if (!currentUser) return;

  const title = document.getElementById('fbTitle').value.trim();
  const body  = document.getElementById('fbBody').value.trim();
  const errEl = document.getElementById('fbError');
  const btn   = document.getElementById('fbSubmitBtn');

  if (!title) return errEl.textContent = 'Please add a title.';
  if (!body)  return errEl.textContent = 'Please describe your post.';

  btn.disabled = true;
  btn.querySelector('.fb-submit-text').textContent = 'Posting...';
  errEl.textContent = '';

  try {
    await addDoc(collection(db, 'feedback'), {
      title,
      body,
      type:       currentType,
      uid:        currentUser.uid,
      username:   currentData?.username || 'Unknown',
      upvotes:    0,
      replyCount: 0,
      createdAt:  serverTimestamp(),
    });
    document.getElementById('fbTitle').value = '';
    document.getElementById('fbBody').value  = '';
    document.getElementById('fbBodyCount').textContent = '0';
  } catch(e) {
    errEl.textContent = 'Failed to post: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.querySelector('.fb-submit-text').textContent = 'Post';
  }
};

// -----------------------------------------------
// UPVOTE
// -----------------------------------------------
window.upvote = async function(postId) {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  try {
    await updateDoc(doc(db, 'feedback', postId), {
      upvotes: (post.upvotes || 0) + 1
    });
  } catch(e) { console.error(e); }
};

// -----------------------------------------------
// OPEN POST / REPLIES
// -----------------------------------------------
window.openPost = async function(postId) {
  const snap = await getDoc(doc(db, 'feedback', postId));
  if (!snap.exists()) return;

  activePost = { id: snap.id, ...snap.data() };
  const icon = TYPE_ICONS[activePost.type] || '💬';

  document.getElementById('replyType').innerHTML =
    `<span class="fb-post-type-badge fb-type--${activePost.type}">${icon} ${capitalize(activePost.type)}</span>`;
  document.getElementById('replyTitle').textContent = activePost.title;
  document.getElementById('replyBy').textContent    = `by ${activePost.username}`;
  document.getElementById('replyBody').textContent  = activePost.body;

  // delete btn — owner or admin
  const delBtn = document.getElementById('replyDeleteBtn');
  delBtn.style.display =
    (currentUser && (currentUser.uid === activePost.uid || currentData?.role === 'admin'))
      ? 'flex' : 'none';

  // reply input
  const inputWrap   = document.getElementById('replyInputWrap');
  const loginNotice = document.getElementById('replyLoginNotice');
  if (currentUser) {
    inputWrap.classList.remove('hidden');
    loginNotice.classList.add('hidden');
    document.getElementById('replyInput').value = '';
  } else {
    inputWrap.classList.add('hidden');
    loginNotice.classList.remove('hidden');
  }

  document.getElementById('replyOverlay').classList.add('open');
  document.getElementById('replyModal').classList.add('open');
  subscribeReplies(postId);
};

window.closeReply = function() {
  document.getElementById('replyOverlay').classList.remove('open');
  document.getElementById('replyModal').classList.remove('open');
  if (replyUnsub) { replyUnsub(); replyUnsub = null; }
  activePost = null;
};

// -----------------------------------------------
// REPLIES
// -----------------------------------------------
function subscribeReplies(postId) {
  if (replyUnsub) replyUnsub();

  const q = query(
    collection(db, 'feedback', postId, 'replies'),
    orderBy('createdAt', 'asc')
  );

  replyUnsub = onSnapshot(q, (snap) => {
    const replies = [];
    snap.forEach(d => replies.push({ id: d.id, ...d.data() }));
    renderReplies(replies);
  }, err => console.error(err));
}

function renderReplies(replies) {
  const box = document.getElementById('replyList');

  if (replies.length === 0) {
    box.innerHTML = `<div class="chat-empty">No replies yet. Start the discussion!</div>`;
    return;
  }

  box.innerHTML = replies.map(r => {
    const isMe = currentUser && r.uid === currentUser.uid;
    const time = r.createdAt?.seconds
      ? new Date(r.createdAt.seconds * 1000)
          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const initial = (r.username || 'U').charAt(0).toUpperCase();
    return `
      <div class="fb-reply ${isMe ? 'fb-reply--me' : ''}">
        <div class="fb-reply-avatar-sm">${initial}</div>
        <div class="fb-reply-bubble">
          <div class="chat-msg-header">
            <span class="chat-msg-author">${escHtml(r.username)}</span>
            <span class="chat-msg-time">${time}</span>
          </div>
          <div class="chat-msg-text">${escHtml(r.text)}</div>
        </div>
      </div>`;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

window.sendReply = async function() {
  if (!currentUser || !activePost) return;

  const input = document.getElementById('replyInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  try {
    await addDoc(
      collection(db, 'feedback', activePost.id, 'replies'),
      {
        text,
        uid:       currentUser.uid,
        username:  currentData?.username || 'Unknown',
        createdAt: serverTimestamp(),
      }
    );
    await updateDoc(doc(db, 'feedback', activePost.id), {
      replyCount: (activePost.replyCount || 0) + 1
    });
    activePost.replyCount = (activePost.replyCount || 0) + 1;
  } catch(e) { console.error(e); }
};

// -----------------------------------------------
// DELETE
// -----------------------------------------------
window.deletePost = async function() {
  if (!currentUser || !activePost) return;
  if (!confirm('Delete this post?')) return;

  try {
    await deleteDoc(doc(db, 'feedback', activePost.id));
    closeReply();
  } catch(e) { console.error(e); }
};

// -----------------------------------------------
// UTILS
// -----------------------------------------------
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}
