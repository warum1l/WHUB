// =============================================
// WHUB — Leaderboard
// =============================================
import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let allUsers   = [];
let tradeCount = {};  // uid -> count
let fbCount    = {};  // uid -> count
let currentTab = 'trades';

async function init() {
  // Load all data in parallel
  const [usersSnap, tradesSnap, fbSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'aotr_trades')),
    getDocs(collection(db, 'feedback'))
  ]);

  allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }))
    .filter(u => u.username); // skip incomplete accounts

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
  currentTab = tab;
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('listStatLabel').textContent = tab === 'trades' ? 'Trades' : tab === 'feedback' ? 'Posts' : 'Joined';
  renderTab(tab);
};

function renderTab(tab) {
  const podiumEl = document.getElementById('lbPodium');
  const listEl   = document.getElementById('lbList');

  let sorted;
  if (tab === 'trades') {
    sorted = [...allUsers].sort((a, b) => (tradeCount[b.uid] || 0) - (tradeCount[a.uid] || 0));
  } else if (tab === 'feedback') {
    sorted = [...allUsers].sort((a, b) => (fbCount[b.uid] || 0) - (fbCount[a.uid] || 0));
  } else {
    // oldest first
    sorted = [...allUsers].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }

  // PODIUM — top 3
  const top3 = sorted.slice(0, 3);
  // Reorder: 2nd, 1st, 3rd for visual podium
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumPos   = top3[1] ? [2, 1, 3] : [1];

  podiumEl.innerHTML = podiumOrder.map((user, i) => {
    const pos   = podiumPos[i];
    const stat  = tab === 'trades' ? tradeCount[user.uid] || 0
                : tab === 'feedback' ? fbCount[user.uid] || 0
                : fmtDate(user.createdAt?.seconds);
    const crown = pos === 1 ? '👑' : pos === 2 ? '🥈' : '🥉';
    const initial = user.username.charAt(0).toUpperCase();
    return `
      <a class="lb-podium-slot lb-podium-slot--${pos}" href="user.html?u=${encodeURIComponent(user.username)}">
        <div class="lb-podium-crown">${crown}</div>
        <div class="lb-podium-avatar lb-avatar--${user.role || 'member'}">${initial}</div>
        <div class="lb-podium-username">${escHtml(user.username)}</div>
        <div class="lb-podium-role profile-role-badge role--${user.role || 'member'}">${capitalize(user.role || 'member')}</div>
        <div class="lb-podium-stat">${typeof stat === 'number' ? stat : stat}</div>
        <div class="lb-podium-bar lb-podium-bar--${pos}"></div>
      </a>`;
  }).join('');

  // FULL LIST — from position 4+
  const rest = sorted.slice(3);
  if (rest.length === 0 && sorted.length <= 3) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = sorted.map((user, i) => {
    const rank = i + 1;
    const stat = tab === 'trades' ? tradeCount[user.uid] || 0
               : tab === 'feedback' ? fbCount[user.uid] || 0
               : '—';
    const joined = user.createdAt?.seconds
      ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '—';
    const initial = user.username.charAt(0).toUpperCase();
    const medalClass = rank <= 3 ? `lb-rank--${rank}` : '';
    return `
      <a class="lb-list-row ${rank <= 3 ? 'lb-list-row--top' : ''}" href="user.html?u=${encodeURIComponent(user.username)}">
        <span class="lb-list-col lb-list-col--rank">
          <span class="lb-rank ${medalClass}">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</span>
        </span>
        <span class="lb-list-col lb-list-col--user">
          <span class="lb-row-avatar lb-avatar--${user.role || 'member'}">${initial}</span>
          <span class="lb-row-info">
            <span class="lb-row-name">${escHtml(user.username)}</span>
            <span class="profile-role-badge role--${user.role || 'member'}" style="font-size:0.58rem;padding:1px 7px">${capitalize(user.role || 'member')}</span>
          </span>
        </span>
        <span class="lb-list-col lb-list-col--stat">${tab !== 'oldest' ? stat : ''}</span>
        <span class="lb-list-col lb-list-col--joined">${joined}</span>
      </a>`;
  }).join('');
}

function fmtDate(seconds) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function escHtml(str)  { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

init().catch(console.error);
