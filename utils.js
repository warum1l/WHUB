// =============================================
// WHUB — Shared Utilities
// =============================================

export function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

export function timeAgo(seconds) {
  const diff = Date.now() - seconds * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function startLiveTimeAgo() {
  function update() {
    document.querySelectorAll('[data-timestamp]').forEach(el => {
      const sec = parseInt(el.dataset.timestamp);
      if (sec) el.textContent = timeAgo(sec);
    });
  }
  update();
  return setInterval(update, 60000);
}

export function validateUsername(u) {
  if (!u || u.length < 3)          return 'At least 3 characters.';
  if (u.length > 24)               return 'Max 24 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Letters, numbers and _ only.';
  return null;
}


const BLOCKED_PATTERNS = [
  /\b(jihad|isis|isil|daesh|al.?qaeda|taliban|boko.?haram|hezbollah)\b/i,
  /\b(terror(ist|ism|attack)|suicide.?bomb|car.?bomb|pipe.?bomb|ied\b)/i,
  /\b(kill\s+all|genocide|ethnic.?cleansing|mass.?murder|school.?shooting)/i,
  /\b(how\s+to\s+(make|build|create).{0,20}(bomb|explosive|weapon|poison))/i,
  /\b(planning\s+(attack|shooting|bombing|massacre))/i,
  /\b(i\s+will\s+kill|gonna\s+kill)\s+\w+/i,
  /\b(shoot\s+up|blown?\s+up)\s+(school|church|mosque|mall|concert)/i,
  /\b(child.{0,10}(porn|sex|nude)|loli.{0,5}(sex|nude|porn)|cp\s+link)\b/i,
];

export function moderateContent(text) {
  if (!text) return { ok: true };
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(text)) return { ok: false, reason: 'This message violates community guidelines and cannot be sent.' };
  }
  return { ok: true };
}

export async function getUserByUsernameRest(username) {
  const projectId = 'whub-7f24b';
  const apiKey    = 'AIzaSyC5X9rt_sGUBpEANBw9HIcNkELxRRxmEkQ';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: { fieldFilter: { field: { fieldPath: 'username' }, op: 'EQUAL', value: { stringValue: username } } },
        limit: 1
      }})
    });
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]?.document) return null;
    const fields = data[0].document.fields || {};
    const obj = {};
    for (const [k, v] of Object.entries(fields)) {
      if      ('stringValue'  in v) obj[k] = v.stringValue;
      else if ('integerValue' in v) obj[k] = parseInt(v.integerValue);
      else if ('booleanValue' in v) obj[k] = v.booleanValue;
      else                          obj[k] = null;
    }
    obj.uid = data[0].document.name.split('/').pop();
    return obj;
  } catch(e) { return null; }
}

export function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
