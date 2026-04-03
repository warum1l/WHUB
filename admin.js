// =============================================
// WHUB — Admin Panel
// =============================================
import { auth, db, getUserDoc, initNavAuth, onAuthStateChanged, updateDoc, doc }
  from './firebase.js';
import {
  collection, getDocs, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

initNavAuth();

let allUsers    = [];
let roleTarget  = null; // { uid, username }

// -----------------------------------------------
// GUARD — admin only
// -----------------------------------------------
onAuthStateChanged(auth, async (user) => {
  const loading = document.getElementById('pageLoading');
  const denied  = document.getElementById('accessDenied');
  const page    = document.getElementById('adminPage');

  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const data = await getUserDoc(user.uid);

  if (data?.role !== 'admin') {
    loading.style.display = 'none';
    denied.style.display  = 'flex';
    return;
  }

  loading.style.display = 'none';
  page.style.display    = 'block';

  loadUsers();
  loadTrades();
  loadFeedback();
});

// -----------------------------------------------
// TABS
// -----------------------------------------------
window.switchTab = function(btn, tab) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
};

// -----------------------------------------------
// USERS
// -----------------------------------------------
async function loadUsers() {
  try {
    // No orderBy to avoid needing a Firestore index
    const snap = await getDocs(collection(db, 'users'));
    allUsers = [];
    snap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
    // Sort client-side by createdAt desc
    allUsers.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderUsers(allUsers);
    updateStats();
  } catch(e) {
    console.error('loadUsers error:', e);
    document.getElementById('usersBody').innerHTML =
      `<tr><td colspan="5" class="admin-empty-cell" style="color:var(--accent-roblox)">
        Failed to load users: ${e.message}
      </td></tr>`;
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty-cell">No users found.</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => {
    const joined = u.createdAt?.seconds
      ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })
      : '—';
    return `
      <tr>
        <td>
          <div class="admin-user-cell">
            <div class="admin-avatar">${(u.username || '?').charAt(0).toUpperCase()}</div>
            <div>
              <div class="admin-username">
                <a href="user.html?u=${encodeURIComponent(u.username)}" target="_blank">${escHtml(u.username)}</a>
              </div>
            </div>
          </div>
        </td>
        <td class="admin-email">${escHtml(u.email || '—')}</td>
        <td><span class="profile-role-badge role--${u.role || 'member'}">${capitalize(u.role || 'member')}</span></td>
        <td class="admin-date">${joined}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-act-btn admin-act--role" onclick="openRoleModal('${u.uid}','${escHtml(u.username)}')">Change Role</button>
            <button class="admin-act-btn admin-act--del"  onclick="deleteUser('${u.uid}','${escHtml(u.username)}')">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

window.filterUsers = function() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const filtered = allUsers.filter(u =>
    u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  );
  renderUsers(filtered);
};

function updateStats() {
  const roles = { admin: 0, mod: 0, member: 0 };
  allUsers.forEach(u => { if (roles[u.role] !== undefined) roles[u.role]++; else roles.member++; });
  document.getElementById('adminStats').innerHTML = `
    <div class="admin-stat"><span>${allUsers.length}</span> Users</div>
    <div class="admin-stat"><span>${roles.admin}</span> Admins</div>
    <div class="admin-stat"><span>${roles.mod}</span> Mods</div>
  `;
}

// -----------------------------------------------
// ROLE MODAL
// -----------------------------------------------
window.openRoleModal = function(uid, username) {
  roleTarget = { uid, username };
  document.getElementById('roleModalUser').textContent = `@${username}`;
  document.getElementById('roleError').textContent = '';
  document.getElementById('roleOverlay').classList.add('open');
  document.getElementById('roleModal').classList.add('open');
};

window.closeRoleModal = function() {
  document.getElementById('roleOverlay').classList.remove('open');
  document.getElementById('roleModal').classList.remove('open');
  roleTarget = null;
};

window.applyRole = async function(role) {
  if (!roleTarget) return;
  const errEl = document.getElementById('roleError');
  try {
    await updateDoc(doc(db, 'users', roleTarget.uid), { role });
    closeRoleModal();
    await loadUsers();
  } catch(e) {
    errEl.textContent = 'Failed: ' + e.message;
  }
};

// -----------------------------------------------
// DELETE USER DOC
// -----------------------------------------------
window.deleteUser = async function(uid, username) {
  if (!confirm(`Delete user @${username}? This removes their Firestore data only.`)) return;
  try {
    await deleteDoc(doc(db, 'users', uid));
    await loadUsers();
  } catch(e) { alert('Failed: ' + e.message); }
};

// -----------------------------------------------
// TRADES
// -----------------------------------------------
async function loadTrades() {
  try {
    const snap = await getDocs(collection(db, 'aotr_trades'));
    const trades = [];
    snap.forEach(d => trades.push({ id: d.id, ...d.data() }));
    trades.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    const tbody = document.getElementById('tradesBody');
    if (trades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="admin-empty-cell">No trades.</td></tr>`;
      return;
    }
    tbody.innerHTML = trades.map(t => {
      const posted = t.createdAt?.seconds
        ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('en-US', { day:'numeric', month:'short' })
        : '—';
      const statusClass = t.status === 'open' ? 'status--open' : 'status--done';
      return `
        <tr>
          <td class="admin-username">${escHtml(t.username)}</td>
          <td class="admin-truncate">${escHtml(t.offer)}</td>
          <td class="admin-truncate">${escHtml(t.want)}</td>
          <td><span class="admin-status ${statusClass}">${t.status}</span></td>
          <td class="admin-date">${posted}</td>
          <td>
            <button class="admin-act-btn admin-act--del"
              onclick="deleteTrade('${t.id}')">Delete</button>
          </td>
        </tr>`;
    }).join('');
  } catch(e) {
    console.error('loadTrades error:', e);
    document.getElementById('tradesBody').innerHTML =
      `<tr><td colspan="6" class="admin-empty-cell" style="color:var(--accent-roblox)">Failed: ${e.message}</td></tr>`;
  }
}

window.deleteTrade = async function(id) {
  if (!confirm('Delete this trade?')) return;
  try {
    await deleteDoc(doc(db, 'aotr_trades', id));
    await loadTrades();
  } catch(e) { alert('Failed: ' + e.message); }
};

// -----------------------------------------------
// FEEDBACK
// -----------------------------------------------
async function loadFeedback() {
  try {
    const snap = await getDocs(collection(db, 'feedback'));
    const posts = [];
    snap.forEach(d => posts.push({ id: d.id, ...d.data() }));
    posts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const tbody = document.getElementById('feedbackBody');
  if (posts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty-cell">No feedback posts.</td></tr>`;
    return;
  }

  const TYPE_ICONS = { suggestion:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>', question:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>', bug:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>', other:'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>' };
  tbody.innerHTML = posts.map(p => {
    const posted = p.createdAt?.seconds
      ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-US', { day:'numeric', month:'short' })
      : '—';
    return `
      <tr>
        <td><span class="fb-post-type-badge fb-type--${p.type}">${TYPE_ICONS[p.type]||'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>'} ${capitalize(p.type)}</span></td>
        <td class="admin-truncate admin-username">${escHtml(p.title)}</td>
        <td>${escHtml(p.username)}</td>
        <td>${p.upvotes || 0}</td>
        <td class="admin-date">${posted}</td>
        <td>
          <button class="admin-act-btn admin-act--del"
            onclick="deleteFeedback('${p.id}')">Delete</button>
        </td>
      </tr>`;
  }).join('');
  } catch(e) {
    console.error('loadFeedback error:', e);
    document.getElementById('feedbackBody').innerHTML =
      `<tr><td colspan="6" class="admin-empty-cell" style="color:var(--accent-roblox)">Failed: ${e.message}</td></tr>`;
  }
}

window.deleteFeedback = async function(id) {
  if (!confirm('Delete this feedback post?')) return;
  try {
    await deleteDoc(doc(db, 'feedback', id));
    await loadFeedback();
  } catch(e) { alert('Failed: ' + e.message); }
};

// -----------------------------------------------
// UTILS
// -----------------------------------------------
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
