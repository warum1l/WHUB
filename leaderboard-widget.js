// =============================================
// WHUB — Leaderboard Widget (index.html)
// =============================================
import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

async function initWidget() {
  const el = document.getElementById('lbWidget');
  if (!el) return;

  try {
    const [usersSnap, tradesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'aotr_trades'))
    ]);

    const tradeCount = {};
    tradesSnap.docs.forEach(d => {
      const uid = d.data().uid;
      if (uid) tradeCount[uid] = (tradeCount[uid] || 0) + 1;
    });

    const users = usersSnap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.username)
      .sort((a, b) => (tradeCount[b.uid] || 0) - (tradeCount[a.uid] || 0))
      .slice(0, 5);

    if (users.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:0.85rem">No members yet.</div>`;
      return;
    }

    const medals = ['<span class="lb-medal lb-medal--1">1</span>', '<span class="lb-medal lb-medal--2">2</span>', '<span class="lb-medal lb-medal--3">3</span>'];
    el.innerHTML = users.map((u, i) => {
      const trades  = tradeCount[u.uid] || 0;
      const initial = u.username.charAt(0).toUpperCase();
      const medal   = medals[i] || `<span style="font-size:0.85rem;color:var(--text-dim)">${i + 1}</span>`;
      return `
        <a class="lb-widget-row" href="user.html?u=${encodeURIComponent(u.username)}">
          <span class="lb-widget-rank">${medal}</span>
          <span class="lb-widget-avatar lb-avatar--${u.role || 'member'}">${initial}</span>
          <span class="lb-widget-info">
            <span class="lb-widget-name">${escHtml(u.username)}</span>
            <span class="lb-widget-sub">${trades} trade${trades !== 1 ? 's' : ''}</span>
          </span>
          <span class="lb-widget-badge profile-role-badge role--${u.role || 'member'}">${capitalize(u.role || 'member')}</span>
        </a>`;
    }).join('');

  } catch(e) {
    console.error(e);
    el.innerHTML = '';
  }
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function escHtml(str)  { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

initWidget();
