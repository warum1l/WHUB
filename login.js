// =============================================
// WHUB — Login / Register Logic
// =============================================
import { auth, db, createUserDoc, initNavAuth,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         onAuthStateChanged }
  from './firebase.js';

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = 'profile.html';
});

initNavAuth();

// --- TAB SWITCH ---
window.switchTab = function(tab) {
  document.getElementById('formLogin').classList.toggle('hidden', tab !== 'login');
  document.getElementById('formRegister').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  clearErrors();
};

function clearErrors() {
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

function setError(id, msg) {
  document.getElementById(id).textContent = msg;
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.querySelector('.auth-btn-text').textContent = loading
    ? (btnId === 'loginBtn' ? 'Signing in...' : 'Creating account...')
    : (btnId === 'loginBtn' ? 'Sign In' : 'Create Account');
  btn.classList.toggle('btn--loading', loading);
}

// --- LOGIN ---
window.handleLogin = async function() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) return setError('loginError', 'Please fill in all fields.');

  setLoading('loginBtn', true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'profile.html';
  } catch (e) {
    setLoading('loginBtn', false);
    setError('loginError', friendlyError(e.code));
  }
};

// --- REGISTER ---
window.handleRegister = async function() {
  const username = document.getElementById('regUsername').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!username || !email || !password) return setError('registerError', 'Please fill in all fields.');
  if (username.length < 3)  return setError('registerError', 'Username must be at least 3 characters.');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('registerError', 'Username: letters, numbers and _ only.');
  if (password.length < 6)  return setError('registerError', 'Password must be at least 6 characters.');

  setLoading('registerBtn', true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDoc(cred.user, username);
    window.location.href = 'profile.html';
  } catch (e) {
    setLoading('registerBtn', false);
    setError('registerError', friendlyError(e.code));
  }
};

// Enter key support
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const isLogin = !document.getElementById('formLogin').classList.contains('hidden');
  if (isLogin) handleLogin(); else handleRegister();
});

function friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email':        'Invalid email address.',
    'auth/weak-password':        'Password is too weak.',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
