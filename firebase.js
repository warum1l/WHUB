// =============================================
// WHUB — Firebase Config & Auth Helpers
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, updateProfile }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5X9rt_sGUBpEANBw9HIcNkELxRRxmEkQ",
  authDomain: "whub-7f24b.firebaseapp.com",
  projectId: "whub-7f24b",
  storageBucket: "whub-7f24b.firebasestorage.app",
  messagingSenderId: "962570900664",
  appId: "1:962570900664:web:72060034468a950f56504d"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// --- CREATE USER DOC ---
async function createUserDoc(user, username) {
  await setDoc(doc(db, 'users', user.uid), {
    uid:       user.uid,
    username:  username,
    email:     user.email,
    createdAt: serverTimestamp(),
    role:      'member',
    bio:       '',
  });
}

// --- GET USER DOC ---
async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// --- GET USER BY USERNAME ---
async function getUserByUsername(username) {
  // We fetch by querying — but since no query export here, use getDocs inline
  const { collection, query, where, getDocs } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const q    = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// --- UPDATE USER DOC ---
async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

// --- SETTINGS PANEL ---
function initSettingsPanel() {
  // Inject panel HTML once
  if (document.getElementById('settings-panel')) return;

  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.className = 'settings-overlay';

  const panel = document.createElement('div');
  panel.id = 'settings-panel';
  panel.className = 'settings-panel';
  panel.innerHTML = `
    <div class="settings-header">
      <span class="settings-title">Settings</span>
      <button class="settings-close" id="settingsClose">✕</button>
    </div>
    <div class="settings-body" id="settingsBody">
      <div class="settings-section-label">APPEARANCE</div>
      <div class="settings-row">
        <span class="settings-row-label">Theme</span>
        <button class="settings-theme-toggle" id="settingsThemeBtn">
          <span class="sth-icon">◑</span>
          <span id="settingsThemeLabel">Dark</span>
        </button>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-section-label">GENERAL</div>
      <a href="support.html" class="settings-row settings-row--link settings-row--support">
        <span class="settings-row-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> Support WHUB</span>
        <span class="settings-row-arrow">→</span>
      </a>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  // Theme toggle inside panel
  const html = document.documentElement;
  const saved = localStorage.getItem('nexushub-theme') || 'dark';
  html.setAttribute('data-theme', saved);

  const themeBtn   = document.getElementById('settingsThemeBtn');
  const themeLabel = document.getElementById('settingsThemeLabel');

  function updateThemeLabel() {
    const t = html.getAttribute('data-theme');
    themeLabel.textContent = t === 'dark' ? 'Dark' : 'Light';
    themeBtn.querySelector('.sth-icon').textContent = t === 'dark' ? '◑' : '☀';
  }
  updateThemeLabel();

  themeBtn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('nexushub-theme', next);
    updateThemeLabel();
  });

  // Open / close
  function openPanel()  { panel.classList.add('open'); overlay.classList.add('open'); }
  function closePanel() { panel.classList.remove('open'); overlay.classList.remove('open'); }

  document.getElementById('settingsClose').addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  document.addEventListener('click', (e) => {
    if (e.target.closest('#settingsBtn')) openPanel();
  });
}

// --- NAVBAR AUTH ---
function initNavAuth() {
  // Init theme immediately (before auth resolves)
  const html  = document.documentElement;
  const saved = localStorage.getItem('nexushub-theme') || 'dark';
  html.setAttribute('data-theme', saved);

  initSettingsPanel();

  onAuthStateChanged(auth, async (user) => {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;
    navRight.querySelectorAll('.nav-auth').forEach(el => el.remove());

    // Settings gear button (always present)
    const settingsBtn = document.createElement('button');
    settingsBtn.id        = 'settingsBtn';
    settingsBtn.className = 'nav-auth nav-settings-btn';
    settingsBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd"/></svg>`;
    navRight.appendChild(settingsBtn);

    // Inject auth-specific rows into panel body
    const body = document.getElementById('settingsBody');
    body.querySelectorAll('.settings-auth-row').forEach(el => el.remove());

    if (user) {
      const userData = await getUserDoc(user.uid);
      const username  = userData?.username || user.email.split('@')[0];
      const initial   = username.charAt(0).toUpperCase();
      const isAdmin   = userData?.role === 'admin';

      // Avatar + username in navbar
      const avatarBtn = document.createElement('a');
      avatarBtn.href      = 'profile.html';
      avatarBtn.className = 'nav-auth nav-avatar-btn';
      avatarBtn.innerHTML = `<div class="nav-avatar">${initial}</div><span class="nav-username">${username}</span>`;
      navRight.insertBefore(avatarBtn, settingsBtn);

      // Divider
      const div1 = document.createElement('div');
      div1.className = 'settings-auth-row settings-divider';
      body.appendChild(div1);

      // Section label
      const label = document.createElement('div');
      label.className = 'settings-auth-row settings-section-label';
      label.textContent = 'ACCOUNT';
      body.appendChild(label);

      // Profile link
      const profileRow = document.createElement('a');
      profileRow.href       = 'profile.html';
      profileRow.className  = 'settings-auth-row settings-row settings-row--link';
      profileRow.innerHTML  = `<span class="settings-row-label">Profile</span><span class="settings-row-arrow">→</span>`;
      body.appendChild(profileRow);

      // Admin link
      if (isAdmin) {
        const adminRow = document.createElement('a');
        adminRow.href      = 'admin.html';
        adminRow.className = 'settings-auth-row settings-row settings-row--link settings-row--admin';
        adminRow.innerHTML = `<span class="settings-row-label">Admin Panel</span><span class="settings-row-arrow">→</span>`;
        body.appendChild(adminRow);
      }

      // Sign out
      const signOutRow = document.createElement('button');
      signOutRow.className = 'settings-auth-row settings-row settings-row--signout';
      signOutRow.innerHTML = `<span class="settings-row-label">Sign Out</span>`;
      signOutRow.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
      });
      body.appendChild(signOutRow);

    } else {
      // Sign in link
      const loginBtn = document.createElement('a');
      loginBtn.href       = 'login.html';
      loginBtn.className  = 'nav-auth nav-login-btn';
      loginBtn.textContent = 'Sign In';
      navRight.insertBefore(loginBtn, settingsBtn);

      const div1 = document.createElement('div');
      div1.className = 'settings-auth-row settings-divider';
      body.appendChild(div1);

      const label = document.createElement('div');
      label.className = 'settings-auth-row settings-section-label';
      label.textContent = 'ACCOUNT';
      body.appendChild(label);

      const signInRow = document.createElement('a');
      signInRow.href      = 'login.html';
      signInRow.className = 'settings-auth-row settings-row settings-row--link';
      signInRow.innerHTML = `<span class="settings-row-label">Sign In</span><span class="settings-row-arrow">→</span>`;
      body.appendChild(signInRow);
    }
  });
}

export {
  auth, db,
  createUserDoc, getUserDoc, getUserByUsername, updateUserDoc, initNavAuth,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  doc, getDoc, updateDoc, serverTimestamp
};
