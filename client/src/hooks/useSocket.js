import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { saveMessage } from '../utils/storage';
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
  } = useStore();

  useEffect(() => {
    if (!token || !currentUser) return;

    // Load blocked users list on mount
    api.get('/users/me/blocked').then(({ data }) => setBlockedUsers(data.blocked)).catch(() => {});

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
      const { currentUser, activeChat, blockedUsers } = useStore.getState();
      // Ignore messages from blocked users
      if (blockedUsers.some(b => b.username?.toLowerCase() === fromUsername.toLowerCase())) return;
      if (currentUser && message) saveMessage(currentUser.username, fromUsername, message);
      if (!activeChat || activeChat.username.toLowerCase() !== fromUsername.toLowerCase()) {
        incrementUnread(fromUsername);
        addToast({
          icon: '💬',
          title: fromUsername,
          message: message?.text ? message.text.slice(0, 60) : 'sent you a message',
          username: fromUsername,
        });
      }
    });

    socket.on('typing', ({ fromUsername, isTyping }) => setTyping(fromUsername, isTyping));

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

    return () => { socket.disconnect(); setSocket(null); };
  }, [token, currentUser?.id]);
}
