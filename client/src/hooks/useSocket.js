import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { saveMessage } from '../utils/storage';
import { playNotificationSound } from '../utils/sounds';
import api from '../utils/api';

// In dev, use the webpack proxy (same origin). In prod, use env var or direct WS port.
const SOCKET_URL = process.env.SOCKET_URL || (process.env.NODE_ENV === 'production' ? window.location.origin : '');

export function useSocket() {
  const {
    token, currentUser, setSocket,
    setOnlineUsers, setFriends, setFriendRequests,
    addFriend, removeFriend, updateFriendStatus,
    addFriendRequest, removeFriendRequest,
    setTyping, activeChat, incrementUnread,
    addToast, myStatus,
    setBlockedUsers, addBlocked, removeBlocked,
    setUserSettings,
  } = useStore();

  useEffect(() => {
    if (!token || !currentUser) return;

    // Load blocked users list and user settings on mount
    api.get('/users/me/blocked').then(({ data }) => setBlockedUsers(data.blocked)).catch(() => {});
    api.get('/users/me/settings').then(({ data }) => setUserSettings(data.settings)).catch(() => {});

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setSocket(socket);
      socket.emit('status_update', { status: myStatus });
    });

    socket.on('disconnect', () => setSocket(null));

    socket.on('init', ({ onlineUsers, friends, friendRequests }) => {
      setOnlineUsers(onlineUsers);
      setFriends(friends.map(f => ({ ...f, online: onlineUsers.some(u => u.id === f.id) })));
      setFriendRequests(friendRequests);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
      const { friends } = useStore.getState();
      friends.forEach(f => {
        const isOnline = users.some(u => u.id === f.id);
        if (f.online !== isOnline) updateFriendStatus(f.id, isOnline);
      });
    });

    socket.on('message_signal', ({ fromUsername, message }) => {
      const { currentUser, activeChat, blockedUsers, userSettings } = useStore.getState();
      // Ignore messages from blocked users
      if (blockedUsers.some(b => b.username?.toLowerCase() === fromUsername.toLowerCase())) return;
      if (currentUser && message) saveMessage(currentUser.username, fromUsername, message);
      if (!activeChat || activeChat.username.toLowerCase() !== fromUsername.toLowerCase()) {
        incrementUnread(fromUsername);
        // Play notification sound
        playNotificationSound(userSettings?.msg_sound || 'ping', userSettings?.msg_volume ?? 80);
        addToast({
          icon: '💬',
          title: fromUsername,
          message: message?.text ? message.text.slice(0, 60) : 'sent you a message',
          username: fromUsername,
        });
      }
    });

    socket.on('typing', ({ fromUsername, isTyping }) => setTyping(fromUsername, isTyping));

    socket.on('pm_error', ({ error }) => {
      addToast({ icon: '⚠️', title: 'Message', message: error });
    });

    socket.on('friend_request', ({ from }) => {
      addFriendRequest(from);
      addToast({ icon: '👋', title: from.username, message: 'sent you a friend request' });
    });

    socket.on('friend_accepted', ({ user }) => {
      addFriend(user);
      addToast({ icon: '🤝', title: user.username, message: 'accepted your friend request' });
    });

    socket.on('friend_removed', ({ userId }) => removeFriend(userId));

    socket.on('blocked_confirmed', ({ userId, username }) => {
      addBlocked({ id: userId, username });
      addToast({ icon: '🚫', title: `Blocked ${username}` });
    });

    socket.on('unblocked_confirmed', ({ userId }) => {
      removeBlocked(userId);
    });

    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    // ── Moderation events ──
    socket.on('group_error', ({ error }) => {
      addToast({ icon: '⚠️', title: 'Group', message: error });
    });
    socket.on('message_deleted', ({ messageId, groupId }) => {
      // Dispatch custom event so GroupChatWindow can pick it up
      window.dispatchEvent(new CustomEvent('cv:msg_deleted', { detail: { messageId, groupId } }));
    });
    socket.on('user_banned', ({ userId: bannedId, username: bannedName, groupId, deleteMessages }) => {
      window.dispatchEvent(new CustomEvent('cv:user_banned', { detail: { userId: bannedId, username: bannedName, groupId, deleteMessages } }));
      addToast({ icon: '🔨', title: 'Moderation', message: `${bannedName} was banned` });
    });
    socket.on('user_muted', ({ userId: mutedId, username: mutedName, groupId }) => {
      addToast({ icon: '🔇', title: 'Moderation', message: `${mutedName} was muted` });
    });

    return () => { socket.disconnect(); setSocket(null); };
  }, [token, currentUser?.id]);
}
