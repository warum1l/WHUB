// =============================================
// WHUB — Profile Page Logic
// =============================================
import { auth, db, getUserDoc, updateUserDoc, initNavAuth,
         signOut, onAuthStateChanged }
  from './firebase.js';

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
});

initNavAuth();

// --- RENDER ---
function renderProfile(data, user) {
  if (!data) return;

  const initial = (data.username || 'W').charAt(0).toUpperCase();
  document.getElementById('profileAvatar').textContent   = initial;
  document.getElementById('profileUsername').textContent = data.username || '—';
  document.getElementById('profileEmail').textContent    = user.email;
  document.getElementById('profileBio').textContent      = data.bio || '';
  document.getElementById('profileRole').textContent     = capitalize(data.role || 'member');

  // Public profile link
  const pubLink = document.getElementById('profilePublicLink');
  if (pubLink) pubLink.href = `user.html?u=${encodeURIComponent(data.username)}`;

  if (data.createdAt?.seconds) {
    const date = new Date(data.createdAt.seconds * 1000);
    document.getElementById('profileJoined').textContent =
      'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Role badge colour
  const roleBadge = document.getElementById('profileRole');
  roleBadge.className = 'profile-role-badge role--' + (data.role || 'member');
}

// --- SIGN OUT ---
window.handleSignOut = async function() {
  await signOut(auth);
  window.location.href = 'index.html';
};

// --- EDIT PANEL ---
window.openEdit = function() {
  document.getElementById('editUsername').value = currentData?.username || '';
  document.getElementById('editBio').value      = currentData?.bio || '';
  document.getElementById('editPanel').classList.add('open');
  document.getElementById('editError').textContent = '';
};

window.closeEdit = function() {
  document.getElementById('editPanel').classList.remove('open');
};

// --- SAVE ---
window.handleSave = async function() {
  const username = document.getElementById('editUsername').value.trim();
  const bio      = document.getElementById('editBio').value.trim();
  const errEl    = document.getElementById('editError');
  const btn      = document.getElementById('saveBtn');

  if (!username) return errEl.textContent = 'Username cannot be empty.';
  if (username.length < 3) return errEl.textContent = 'Username must be at least 3 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return errEl.textContent = 'Letters, numbers and _ only.';

  btn.disabled = true;
  btn.querySelector('.auth-btn-text').textContent = 'Saving...';

  try {
    await updateUserDoc(currentUser.uid, { username, bio });
    currentData = { ...currentData, username, bio };
    renderProfile(currentData, currentUser);
    closeEdit();
  } catch (e) {
    errEl.textContent = 'Failed to save. Try again.';
  } finally {
    btn.disabled = false;
    btn.querySelector('.auth-btn-text').textContent = 'Save Changes';
  }
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
