// =============================================
// WHUB — AOT:R Online Trading
// =============================================
import { auth, db, getUserDoc, initNavAuth, onAuthStateChanged }
  from './firebase.js';
import {
  collection, addDoc, onSnapshot, doc, getDoc,
  updateDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

initNavAuth();

let currentUser = null;
let currentData = null;
let activeTrade = null;
let chatUnsub   = null;

// -----------------------------------------------
// AUTH STATE
// -----------------------------------------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    currentData = await getUserDoc(user.uid);
    document.getElementById('postTradeBtn').style.display = 'flex';
  } else {
    document.getElementById('postTradeBtn').style.display = 'none';
  }
});

// -----------------------------------------------
// LOAD TRADES (realtime)
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const q = query(
    collection(db, 'aotr_trades'),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q,
    (snap) => {
      const trades = [];
      snap.forEach(d => {
        const data = d.data();
        // filter open trades client-side (avoids needing composite index)
        if (data.status === 'open') {
          trades.push({ id: d.id, ...data });
        }
      });
      renderTrades(trades);
      document.getElementById('activeCount').textContent = trades.length;
      document.getElementById('tradesLoading').style.display = 'none';
    },
    (err) => {
      console.error('Firestore error:', err);
      document.getElementById('tradesLoading').innerHTML =
        `<p style="color:var(--accent-roblox);text-align:center;padding:40px">
          Failed to load trades.<br><small>${err.message}</small>
        </p>`;
    }
  );
});

// -----------------------------------------------
// RENDER TRADES
// -----------------------------------------------
function renderTrades(trades) {
  const list = document.getElementById('tradesList');

  if (trades.length === 0) {
    list.innerHTML = `
      <div class="trades-empty">
        <span style="color:var(--text-dim)"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg></span>
        <p>No active trades yet. Be the first to post one!</p>
      </div>`;
    return;
  }

  list.innerHTML = trades.map(t => {
    const time = t.createdAt?.seconds
      ? timeAgo(t.createdAt.seconds * 1000) : 'just now';
    return `
      <div class="trade-card" onclick="openDetail('${t.id}')">
        <div class="trade-card-inner">
          <div class="trade-card-sides">
            <div class="trade-offer-col">
              <span class="trade-col-label">Offering</span>
              <span class="trade-col-text">${escHtml(t.offer)}</span>
            </div>
            <div class="trade-arrow-center">⇄</div>
            <div class="trade-want-col">
              <span class="trade-col-label">Wants</span>
              <span class="trade-col-text">${escHtml(t.want)}</span>
            </div>
          </div>
          <div class="trade-card-footer">
            <div class="trade-card-meta">
              <span class="trade-author"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${escHtml(t.username)}</span>
              ${t.robloxUser ? `<span class="trade-roblox"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg> ${escHtml(t.robloxUser)}</span>` : ''}
            </div>
            <div class="trade-card-right">
              <span class="trade-time">${time}</span>
              <span class="trade-chat-count"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg> ${t.msgCount || 0}</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// -----------------------------------------------
// POST TRADE MODAL
// -----------------------------------------------
window.openPostModal = function() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  document.getElementById('postOverlay').classList.add('open');
  document.getElementById('postModal').classList.add('open');
  document.getElementById('postError').textContent = '';
};

window.closePostModal = function() {
  document.getElementById('postOverlay').classList.remove('open');
  document.getElementById('postModal').classList.remove('open');
};

window.submitTrade = async function() {
  if (!currentUser) return;

  const offer       = document.getElementById('offerText').value.trim();
  const want        = document.getElementById('wantText').value.trim();
  const robloxUser  = document.getElementById('robloxUser').value.trim();
  const discordUser = document.getElementById('discordUser').value.trim();
  const errEl       = document.getElementById('postError');
  const btn         = document.getElementById('postSubmitBtn');

  if (!offer)      return errEl.textContent = 'Please describe what you are offering.';
  if (!want)       return errEl.textContent = 'Please describe what you want.';
  if (!robloxUser) return errEl.textContent = 'Please enter your Roblox username.';

  btn.disabled = true;
  btn.querySelector('.auth-btn-text').textContent = 'Posting...';
  errEl.textContent = '';

  try {
    await addDoc(collection(db, 'aotr_trades'), {
      offer,
      want,
      robloxUser,
      discordUser: discordUser || '',
      uid:         currentUser.uid,
      username:    currentData?.username || 'Unknown',
      status:      'open',
      msgCount:    0,
      createdAt:   serverTimestamp(),
    });

    ['offerText','wantText','robloxUser','discordUser'].forEach(id => {
      document.getElementById(id).value = '';
    });
    closePostModal();
  } catch(e) {
    console.error('Post error:', e);
    errEl.textContent = 'Failed to post: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.querySelector('.auth-btn-text').textContent = 'Post Trade';
  }
};

// -----------------------------------------------
// DETAIL MODAL
// -----------------------------------------------
window.openDetail = async function(tradeId) {
  try {
    const snap = await getDoc(doc(db, 'aotr_trades', tradeId));
    if (!snap.exists()) return;

    activeTrade = { id: snap.id, ...snap.data() };

    document.getElementById('detailTitle').textContent =
      `${escHtml(activeTrade.offer)} ⇄ ${escHtml(activeTrade.want)}`;
    document.getElementById('detailBy').textContent =
      `Posted by ${escHtml(activeTrade.username)}`;
    document.getElementById('detailOffer').textContent = activeTrade.offer;
    document.getElementById('detailWant').textContent  = activeTrade.want;

    let contacts = '';
    if (activeTrade.robloxUser)
      contacts += `<span class="contact-chip"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg> ${escHtml(activeTrade.robloxUser)}</span>`;
    if (activeTrade.discordUser)
      contacts += `<span class="contact-chip discord-chip"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg> ${escHtml(activeTrade.discordUser)}</span>`;
    document.getElementById('detailContacts').innerHTML = contacts;

    const completeBtn = document.getElementById('completeTradBtn');
    completeBtn.style.display =
      (currentUser && currentUser.uid === activeTrade.uid) ? 'flex' : 'none';

    const chatWrap    = document.getElementById('chatInputWrap');
    const loginNotice = document.getElementById('chatLoginNotice');
    if (currentUser) {
      chatWrap.classList.remove('hidden');
      loginNotice.classList.add('hidden');
      document.getElementById('chatInput').value = '';
    } else {
      chatWrap.classList.add('hidden');
      loginNotice.classList.remove('hidden');
    }

    document.getElementById('detailOverlay').classList.add('open');
    document.getElementById('detailModal').classList.add('open');
    subscribeChat(tradeId);
  } catch(e) {
    console.error('Open detail error:', e);
  }
};

window.closeDetailModal = function() {
  document.getElementById('detailOverlay').classList.remove('open');
  document.getElementById('detailModal').classList.remove('open');
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  activeTrade = null;
};

// -----------------------------------------------
// CHAT
// -----------------------------------------------
function subscribeChat(tradeId) {
  if (chatUnsub) chatUnsub();

  const q = query(
    collection(db, 'aotr_trades', tradeId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  chatUnsub = onSnapshot(q,
    (snap) => {
      const msgs = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
      renderChat(msgs);
    },
    (err) => console.error('Chat error:', err)
  );
}

function renderChat(msgs) {
  const box = document.getElementById('chatMessages');

  if (msgs.length === 0) {
    box.innerHTML = `<div class="chat-empty">No messages yet. Say hi!</div>`;
    return;
  }

  box.innerHTML = msgs.map(m => {
    const isMe = currentUser && m.uid === currentUser.uid;
    const time = m.createdAt?.seconds
      ? new Date(m.createdAt.seconds * 1000)
          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return `
      <div class="chat-msg ${isMe ? 'chat-msg--me' : ''}">
        <div class="chat-msg-header">
          <span class="chat-msg-author">${escHtml(m.username)}</span>
          <span class="chat-msg-time">${time}</span>
        </div>
        <div class="chat-msg-text">${escHtml(m.text)}</div>
      </div>`;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

window.sendMessage = async function() {
  if (!currentUser || !activeTrade) return;

  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  try {
    await addDoc(
      collection(db, 'aotr_trades', activeTrade.id, 'messages'),
      {
        text,
        uid:       currentUser.uid,
        username:  currentData?.username || 'Unknown',
        createdAt: serverTimestamp(),
      }
    );
    await updateDoc(doc(db, 'aotr_trades', activeTrade.id), {
      msgCount: (activeTrade.msgCount || 0) + 1
    });
    activeTrade.msgCount = (activeTrade.msgCount || 0) + 1;
  } catch(e) {
    console.error('Send error:', e);
  }
};

// -----------------------------------------------
// COMPLETE TRADE
// -----------------------------------------------
window.completeTrade = async function() {
  if (!currentUser || !activeTrade) return;
  if (currentUser.uid !== activeTrade.uid) return;

  if (!confirm('Mark this trade as completed? It will be removed from the list.')) return;

  try {
    await updateDoc(doc(db, 'aotr_trades', activeTrade.id), { status: 'completed' });
    closeDetailModal();
  } catch(e) {
    console.error('Complete error:', e);
  }
};

// -----------------------------------------------
// UTILS
// -----------------------------------------------
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
