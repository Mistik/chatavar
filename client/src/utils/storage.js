// All messages are stored ONLY in localStorage — never sent to server
// Key format: "cf_msgs_{userA}_{userB}" where userA < userB alphabetically

const MAX_MESSAGES_PER_CONVO = 500;

function getConvoKey(usernameA, usernameB) {
  const [a, b] = [usernameA.toLowerCase(), usernameB.toLowerCase()].sort();
  return `cf_msgs_${a}_${b}`;
}

function getRecentKey() {
  return 'cf_recent';
}

export function saveMessage(myUsername, theirUsername, message) {
  const key = getConvoKey(myUsername, theirUsername);
  const existing = getMessages(myUsername, theirUsername);
  const updated = [...existing, message];
  // Trim to max
  const trimmed = updated.slice(-MAX_MESSAGES_PER_CONVO);
  try {
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (e) {
    // Storage full — remove oldest convo
    console.warn('localStorage full, clearing old convos');
    clearOldestConvo();
    localStorage.setItem(key, JSON.stringify(trimmed));
  }
  updateRecent(myUsername, theirUsername, message);
}

export function getMessages(myUsername, theirUsername) {
  const key = getConvoKey(myUsername, theirUsername);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteConversation(myUsername, theirUsername) {
  const key = getConvoKey(myUsername, theirUsername);
  localStorage.removeItem(key);
  // Remove from recent
  const recent = getRecent();
  const updated = recent.filter(
    (r) => r.username.toLowerCase() !== theirUsername.toLowerCase()
  );
  localStorage.setItem(getRecentKey(), JSON.stringify(updated));
}

// ─── Recent conversations ─────────────────────────────────────────────────────

export function getRecent() {
  try {
    const raw = localStorage.getItem(getRecentKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateRecent(myUsername, theirUsername, lastMessage) {
  const recent = getRecent();
  const existing = recent.findIndex(
    (r) => r.username.toLowerCase() === theirUsername.toLowerCase()
  );
  const entry = {
    username: theirUsername,
    lastMessage: {
      text: lastMessage.text,
      fromMe: lastMessage.fromUsername === myUsername,
      timestamp: lastMessage.timestamp,
    },
    updatedAt: lastMessage.timestamp,
  };
  if (existing >= 0) {
    recent.splice(existing, 1);
  }
  recent.unshift(entry);
  // Keep max 50 recent
  const trimmed = recent.slice(0, 50);
  localStorage.setItem(getRecentKey(), JSON.stringify(trimmed));
}

export function clearOldestConvo() {
  const recent = getRecent();
  if (recent.length === 0) return;
  const oldest = recent[recent.length - 1];
  const myUsername = 'unknown'; // best-effort
  const key = getConvoKey(myUsername, oldest.username);
  localStorage.removeItem(key);
}

// ─── Stats ─────────────────────────────────────────────────────────────────
export function getTotalStorageUsed() {
  let total = 0;
  for (const key in localStorage) {
    if (key.startsWith('cf_')) {
      try {
        total += (localStorage.getItem(key) || '').length;
      } catch {}
    }
  }
  return total;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
