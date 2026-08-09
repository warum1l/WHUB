// =============================================
// kittens.ez — Profile Page (simplified)
// =============================================
import { auth, db, getUserDoc, initNavAuth, signOut, onAuthStateChanged }
  from './firebase.js';

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  currentUser = user;
  const data = await getUserDoc(user.uid);

  const initial = (data?.username || 'U').charAt(0).toUpperCase();
  document.getElementById('profileAvatar').textContent = initial;
  document.getElementById('profileUsername').textContent = data?.username || '—';
  document.getElementById('profileEmail').textContent = user.email;

  document.getElementById('authLoading').style.display = 'none';
  document.getElementById('profilePage').style.display = 'block';
});

initNavAuth();

window.handleSignOut = async function() {
  await signOut(auth);
  window.location.href = 'index.html';
};
