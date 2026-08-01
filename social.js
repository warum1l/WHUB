// =============================================
// WHUB — Social: Posts + Friends (shared logic)
// =============================================
import { auth, db } from './firebase.js';
import {
  collection, doc, getDoc, addDoc, deleteDoc,
  updateDoc, query, where, orderBy, getDocs,
  onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export { auth, db };
import { moderateContent, escHtml, timeAgo, capitalize } from './utils.js';
export { collection, doc, getDoc, addDoc, deleteDoc, updateDoc,
         query, where, orderBy, getDocs, onSnapshot,
         serverTimestamp, arrayUnion, arrayRemove };

// ── POSTS ─────────────────────────────────────
export async function createPost(authorUid, username, role, text, tags) {
  const mod = moderateContent(text);
  if (!mod.ok) throw new Error(mod.reason);
  return await addDoc(collection(db, 'posts'), {
    authorUid, username, role,
    text, tags,
    likes: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId));
}

export async function toggleLike(postId, uid) {
  const ref  = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const likes = snap.data().likes || [];
  if (likes.includes(uid)) {
    await updateDoc(ref, { likes: arrayRemove(uid) });
  } else {
    await updateDoc(ref, { likes: arrayUnion(uid) });
  }
}

export async function addComment(postId, uid, username, role, text) {
  const mod = moderateContent(text);
  if (!mod.ok) throw new Error(mod.reason);
  const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
    uid, username, role, text, createdAt: serverTimestamp(),
  });
  // Use increment to avoid race condition
  try {
    const { increment } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
  } catch(e) {
    const snap = await getDoc(doc(db, 'posts', postId));
    await updateDoc(doc(db, 'posts', postId), { commentCount: (snap.data()?.commentCount || 0) + 1 });
  }
  return ref;
}

export function subscribeToUserPosts(uid, callback) {
  const q = query(
    collection(db, 'posts'),
    where('authorUid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── FRIENDS ───────────────────────────────────
export async function sendFriendRequest(fromUid, fromUsername, toUid) {
  const existing = await getDocs(query(
    collection(db, 'friend_requests'),
    where('from', '==', fromUid), where('to', '==', toUid)
  ));
  if (!existing.empty) return 'pending';

  const alsoExists = await getDocs(query(
    collection(db, 'friend_requests'),
    where('from', '==', toUid), where('to', '==', fromUid)
  ));
  if (!alsoExists.empty) return 'pending';

  await addDoc(collection(db, 'friend_requests'), {
    from: fromUid, fromUsername,
    to: toUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return 'sent';
}

export async function acceptFriendRequest(requestId, fromUid, toUid) {
  await updateDoc(doc(db, 'friend_requests', requestId), { status: 'accepted' });
  await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(toUid) });
  await updateDoc(doc(db, 'users', toUid),   { friends: arrayUnion(fromUid) });
  await deleteDoc(doc(db, 'friend_requests', requestId));
}

export async function declineFriendRequest(requestId) {
  await deleteDoc(doc(db, 'friend_requests', requestId));
}

export async function removeFriend(uid, friendUid) {
  await updateDoc(doc(db, 'users', uid),       { friends: arrayRemove(friendUid) });
  await updateDoc(doc(db, 'users', friendUid), { friends: arrayRemove(uid) });
}

export async function getFriendStatus(myUid, otherUid) {
  const mySnap = await getDoc(doc(db, 'users', myUid));
  if (mySnap.exists()) {
    const friends = mySnap.data().friends || [];
    if (friends.includes(otherUid)) return { status: 'friends' };
  }
  const sent = await getDocs(query(
    collection(db, 'friend_requests'),
    where('from', '==', myUid), where('to', '==', otherUid)
  ));
  if (!sent.empty) return { status: 'pending_sent' };

  const received = await getDocs(query(
    collection(db, 'friend_requests'),
    where('from', '==', otherUid), where('to', '==', myUid)
  ));
  if (!received.empty) return { status: 'pending_received', id: received.docs[0].id, fromUid: otherUid };

  return { status: 'none' };
}

export async function getIncomingRequests(uid) {
  const snap = await getDocs(query(
    collection(db, 'friend_requests'),
    where('to', '==', uid), where('status', '==', 'pending')
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export { escHtml, timeAgo, capitalize };
