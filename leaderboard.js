// =============================================
// WHUB — Leaderboard
// =============================================
import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let allUsers   = [];
let tradeCount = {};
let fbCount    = {};

async function init() {
  const [usersSnap, tradesSnap, fbSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'aotr_trades')),
    getDocs(collection(db, 'feedback'))
  ]);

  allUsers = usersSnap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(u => u.username);

  tradesSnap.docs.forEach(d => {
    const uid = d.data().uid;
    if (uid) tradeCount[uid] = (tradeCount[uid] || 0) + 1;
  });
  fbSnap.docs.forEach(d => {
    const uid = d.data().uid;
    if (uid) fbCount[uid] = (fbCount[uid] || 0) + 1;
  });

  renderTab('trades');
}

window.switchTab = function(tab) {
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const labels = { trades: 'Trades', feedback: 'Posts', oldest: 'Joined' };
  document.getElementById('listStatLabel').textContent = labels[tab];
  renderTab(tab);
};

function renderTab(tab) {
  const listEl = document.getElementById('lbList');

  let sorted;
  if (tab === 'trades') {
    sorted = [...allUsers].sort((a, b) => (tradeCount[b.uid] || 0) - (tradeCount[a.uid] || 0));
  } else if (tab === 'feedback') {
    sorted = [...allUsers].sort((a, b) => (fbCount[b.uid] || 0) - (fbCount[a.uid] || 0));
  } else {
    sorted = [...allUsers].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }

  if (sorted.length === 0) {
    listEl.innerHTML = `<div class="lb-empty">No members yet.</div>`;
    return;
  }

  const medals = ['<span class="lb-medal lb-medal--1">1</span>', '<span class="lb-medal lb-medal--2">2</span>', '<span class="lb-medal lb-medal--3">3</span>'];
  const rowClass = ['lb-row--gold', 'lb-row--silver', 'lb-row--bronze'];

  listEl.innerHTML = sorted.map((u, i) => {
    const rank    = i + 1;
    const initial = u.username.charAt(0).toUpperCase();
    const joined  = u.createdAt?.seconds
      ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '—';

    let stat;
    if (tab === 'trades')   stat = tradeCount[u.uid] || 0;
    else if (tab === 'feedback') stat = fbCount[u.uid] || 0;
    else stat = joined;

    const rankEl = rank <= 3
      ? `<span class="lb-rank-medal">${medals[rank-1]}</span>`
      : `<span class="lb-rank-num">${rank}</span>`;

    return `
      <a class="lb-row ${rowClass[rank-1] || ''}" href="user.html?u=${encodeURIComponent(u.username)}">
        <span class="lb-col lb-col--rank">${rankEl}</span>
        <span class="lb-col lb-col--user">
          <span class="lb-avatar lb-avatar--${u.role || 'member'}">${initial}</span>
          <span class="lb-user-info">
            <span class="lb-username">${esc(u.username)}</span>
            <span class="profile-role-badge role--${u.role || 'member'}" style="font-size:0.58rem;padding:1px 7px">${cap(u.role || 'member')}</span>
          </span>
        </span>
        <span class="lb-col lb-col--stat">${tab !== 'oldest' ? stat : ''}</span>
        <span class="lb-col lb-col--joined">${joined}</span>
      </a>`;
  }).join('');
}

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

init().catch(console.error);
