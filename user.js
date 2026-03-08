// =============================================
// WHUB — Public User Profile
// URL: /user.html?u=username
// =============================================
import { auth, db, getUserByUsername, initNavAuth, onAuthStateChanged }
  from './firebase.js';

initNavAuth();

let currentUser = null;
onAuthStateChanged(auth, u => { currentUser = u; });

document.addEventListener('DOMContentLoaded', async () => {
  const params   = new URLSearchParams(window.location.search);
  const username = params.get('u');

  const loading  = document.getElementById('pageLoading');
  const notFound = document.getElementById('notFound');
  const page     = document.getElementById('profilePage');

  if (!username) {
    loading.style.display = 'none';
    notFound.style.display = 'block';
    return;
  }

  // Update page title while loading
  document.title = `@${username} — WHUB`;

  try {
    const data = await getUserByUsername(username);

    loading.style.display = 'none';

    if (!data) {
      notFound.style.display = 'block';
      return;
    }

    // Render
    const initial = data.username.charAt(0).toUpperCase();
    document.getElementById('pubAvatar').textContent   = initial;
    document.getElementById('pubUsername').textContent = data.username;
    document.getElementById('pubBio').textContent      = data.bio || '';

    const roleBadge = document.getElementById('pubRole');
    roleBadge.textContent = capitalize(data.role || 'member');
    roleBadge.className   = 'profile-role-badge role--' + (data.role || 'member');

    if (data.createdAt?.seconds) {
      const date = new Date(data.createdAt.seconds * 1000);
      document.getElementById('pubJoined').textContent =
        'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // If viewing own profile — show "Edit Profile" link
    document.title = `@${data.username} — WHUB`;
    onAuthStateChanged(auth, (user) => {
      if (user && user.uid === data.uid) {
        document.getElementById('pubActions').innerHTML =
          `<a href="profile.html" class="profile-edit-btn">✏ Edit Profile</a>`;
      }
    });

    page.style.display = 'block';
  } catch(e) {
    console.error(e);
    loading.style.display = 'none';
    notFound.style.display = 'block';
  }
});

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
