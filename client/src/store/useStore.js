import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  currentUser: null,
  token: localStorage.getItem('cf_token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('cf_token', token);
    set({ currentUser: user, token });
  },
  logout: () => {
    localStorage.removeItem('cf_token');
    set({ currentUser: null, token: null, activeChat: null });
  },
  updateCurrentUser: (updates) =>
    set((s) => ({ currentUser: { ...s.currentUser, ...updates } })),

  // ── Socket ────────────────────────────────────────────────────────────────
  socket: null,
  setSocket: (socket) => set({ socket }),

  // ── Online users ──────────────────────────────────────────────────────────
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  // ── Friends ───────────────────────────────────────────────────────────────
  friends: [],
  setFriends: (friends) => set({ friends }),
  addFriend: (user) =>
    set((s) => ({
      friends: s.friends.find((f) => f.id === user.id)
        ? s.friends
        : [...s.friends, user],
    })),
  removeFriend: (userId) =>
    set((s) => ({ friends: s.friends.filter((f) => f.id !== userId) })),
  updateFriendStatus: (userId, online) =>
    set((s) => ({
      friends: s.friends.map((f) => (f.id === userId ? { ...f, online } : f)),
    })),

  // ── Friend requests ───────────────────────────────────────────────────────
  friendRequests: [],
  setFriendRequests: (reqs) => set({ friendRequests: reqs }),
  addFriendRequest: (user) =>
    set((s) => ({
      friendRequests: s.friendRequests.find((r) => r.id === user.id)
        ? s.friendRequests
        : [...s.friendRequests, user],
    })),
  removeFriendRequest: (userId) =>
    set((s) => ({
      friendRequests: s.friendRequests.filter((r) => r.id !== userId),
    })),

  // ── Blocked users ─────────────────────────────────────────────────────────
  blockedUsers: [],
  setBlockedUsers: (users) => set({ blockedUsers: users }),
  addBlocked: (user) =>
    set((s) => ({
      blockedUsers: s.blockedUsers.find((b) => b.id === user.id)
        ? s.blockedUsers
        : [...s.blockedUsers, user],
      // Remove from friends too
      friends: s.friends.filter((f) => f.id !== user.id),
    })),
  removeBlocked: (userId) =>
    set((s) => ({ blockedUsers: s.blockedUsers.filter((b) => b.id !== userId) })),

  // ── Active chat ───────────────────────────────────────────────────────────
  activeChat: null,
  setActiveChat: (chat) => set({ activeChat: chat }),

  // ── Typing ────────────────────────────────────────────────────────────────
  typingUsers: {},
  setTyping: (username, isTyping) =>
    set((s) => ({ typingUsers: { ...s.typingUsers, [username]: isTyping } })),

  // ── Toasts ────────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (toast) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Unread ────────────────────────────────────────────────────────────────
  unreadCounts: {},
  incrementUnread: (username) =>
    set((s) => ({
      unreadCounts: { ...s.unreadCounts, [username]: (s.unreadCounts[username] || 0) + 1 },
    })),
  clearUnread: (username) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [username]: 0 } })),

  // ── My status ─────────────────────────────────────────────────────────────
  myStatus: 'online',
  setMyStatus: (status) => set({ myStatus: status }),

  // ── Mobile sidebar ────────────────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  // ── Profile panel ─────────────────────────────────────────────────────────
  profilePanelUser: null,
  setProfilePanelUser: (user) => set({ profilePanelUser: user }),

  // ── Settings panel ────────────────────────────────────────────────────────
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),
}));
