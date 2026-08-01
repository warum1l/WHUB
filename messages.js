// =============================================
// WHUB — Messages
// =============================================
import { auth, db, initNavAuth, onAuthStateChanged, getUserDoc }
  from './firebase.js';
import { moderateContent, escHtml } from './utils.js';
import { toastWarning } from './toast.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

initNavAuth();

let currentUser = null;
let currentData = null;
let activeConvoId = null;
let msgUnsub = null;

onAuthStateChanged(auth, async (user) => {
  document.getElementById('pageLoading').style.display = 'none';
  if (!user) { document.getElementById('noAuthPage').style.display = 'block'; return; }
  currentUser = user;
  currentData = await getUserDoc(user.uid);
  document.getElementById('messagesPage').style.display = 'block';

  const params  = new URLSearchParams(window.location.search);
  const withUid = params.get('with');
  if (withUid) await openOrCreateConvo(withUid);

  loadConversations();
});

function loadConversations() {
  const q = query(collection(db, 'conversations'), where('members', 'array-contains', currentUser.uid));
  onSnapshot(q, async (snap) => {
    const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    convos.sort((a, b) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0));
    renderConvoList(convos);
  });
}

async function renderConvoList(convos) {
  const el = document.getElementById('convoList');
  if (convos.length === 0) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:0.82rem">No conversations yet.<br>Add friends and message them.</div>`;
    return;
  }
  const items = await Promise.all(convos.map(async c => {
    const otherUid = c.members.find(m => m !== currentUser.uid);
    let otherName = 'User', otherRole = 'member';
    try {
      const snap = await getDoc(doc(db, 'users', otherUid));
      if (snap.exists()) { otherName = snap.data().username; otherRole = snap.data().role || 'member'; }
    } catch(e) {}
    const initial = otherName.charAt(0).toUpperCase();
    const isActive = c.id === activeConvoId;
    return `<div class="msg-convo-item ${isActive ? 'active' : ''}"
      data-convoid="${c.id}" data-uid="${otherUid}"
      data-name="${escHtml(otherName)}" data-role="${otherRole}"
      onclick="selectConvoFromEl(this)">
      <div class="msg-convo-avatar pf-avatar--${otherRole}">${initial}</div>
      <div class="msg-convo-info">
        <div class="msg-convo-name">${escHtml(otherName)}</div>
        <div class="msg-convo-preview">${escHtml(c.lastMsg || 'Say hi!')}</div>
      </div>
    </div>`;
  }));
  el.innerHTML = items.join('');
}

async function openOrCreateConvo(otherUid) {
  const q = query(collection(db, 'conversations'), where('members', 'array-contains', currentUser.uid));
  const snap = await getDocs(q);
  let convoId = null;
  snap.forEach(d => { if (d.data().members.includes(otherUid)) convoId = d.id; });

  if (!convoId) {
    const ref = await addDoc(collection(db, 'conversations'), {
      members: [currentUser.uid, otherUid], lastMsg: '', lastAt: serverTimestamp(),
    });
    convoId = ref.id;
  }

  const otherSnap = await getDoc(doc(db, 'users', otherUid));
  const otherName = otherSnap.exists() ? otherSnap.data().username : 'User';
  const otherRole = otherSnap.exists() ? (otherSnap.data().role || 'member') : 'member';
  selectConvo(convoId, otherUid, otherName, otherRole);
}

window.selectConvoFromEl = function(el) {
  selectConvo(el.dataset.convoid, el.dataset.uid, el.dataset.name, el.dataset.role);
};

window.selectConvo = function(convoId, otherUid, otherName, otherRole) {
  activeConvoId = convoId;
  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('chatActive').style.display = 'flex';
  document.getElementById('chatAvatar').textContent = otherName.charAt(0).toUpperCase();
  document.getElementById('chatAvatar').className   = `msg-convo-avatar pf-avatar--${otherRole}`;
  document.getElementById('chatName').textContent   = otherName;
  document.getElementById('chatProfileLink').href   = `user.html?u=${encodeURIComponent(otherName)}`;

  if (msgUnsub) msgUnsub();
  const q = query(collection(db, 'conversations', convoId, 'messages'), orderBy('createdAt', 'asc'));
  msgUnsub = onSnapshot(q, (snap) => {
    renderMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })), otherName, otherRole);
  });
};

function renderMessages(msgs, otherName, otherRole) {
  const el = document.getElementById('msgMessages');
  if (msgs.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-dim);font-size:0.82rem;margin:auto">Start the conversation!</div>`;
    return;
  }
  el.innerHTML = msgs.map(m => {
    const isMe = m.uid === currentUser.uid;
    const name = isMe ? (currentData?.username || 'Me') : otherName;
    const role = isMe ? (currentData?.role || 'member') : otherRole;
    const initial = name.charAt(0).toUpperCase();
    const time = m.createdAt?.seconds
      ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return `<div class="msg-bubble-wrap ${isMe ? 'me' : ''}">
      <div class="msg-convo-avatar pf-avatar--${role}" style="width:26px;height:26px;border-radius:7px;font-size:0.65rem">${initial}</div>
      <div>
        <div class="msg-bubble">${escHtml(m.text)}</div>
        <div class="msg-bubble-time">${time}</div>
      </div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

window.sendMessage = async function() {
  if (!currentUser || !activeConvoId) return;
  const input = document.getElementById('msgInput');
  const errEl = document.getElementById('msgError');
  const text  = input.value.trim();
  if (!text) return;

  // Content moderation
  const mod = moderateContent(text);
  if (!mod.ok) { toastWarning(mod.reason); return; }

  input.value = '';
  await addDoc(collection(db, 'conversations', activeConvoId, 'messages'), {
    text, uid: currentUser.uid, username: currentData?.username || 'Unknown',
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'conversations', activeConvoId), { lastMsg: text, lastAt: serverTimestamp() });
};

