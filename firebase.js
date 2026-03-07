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

// --- CREATE USER DOC IN FIRESTORE ---
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

// --- UPDATE USER DOC ---
async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

// --- UPDATE NAVBAR based on auth state ---
function initNavAuth() {
  onAuthStateChanged(auth, async (user) => {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    // Remove old auth elements
    navRight.querySelectorAll('.nav-auth').forEach(el => el.remove());

    if (user) {
      const userData = await getUserDoc(user.uid);
      const username = userData?.username || user.email.split('@')[0];
      const initial  = username.charAt(0).toUpperCase();

      const avatarBtn = document.createElement('a');
      avatarBtn.href = 'profile.html';
      avatarBtn.className = 'nav-auth nav-avatar-btn';
      avatarBtn.innerHTML = `
        <div class="nav-avatar">${initial}</div>
        <span class="nav-username">${username}</span>
      `;
      navRight.insertBefore(avatarBtn, navRight.firstChild);
    } else {
      const loginBtn = document.createElement('a');
      loginBtn.href = 'login.html';
      loginBtn.className = 'nav-auth nav-login-btn';
      loginBtn.textContent = 'Sign In';
      navRight.insertBefore(loginBtn, navRight.firstChild);
    }
  });
}

export { auth, db, createUserDoc, getUserDoc, updateUserDoc, initNavAuth,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, updateProfile };
