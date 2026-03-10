// ─── Socket Event Handlers ────────────────────────────────────────────────────
// Each handler receives (socket, io, db, presence) and registers its events.
// Keeping them separate makes testing and extending straightforward.

const db       = require('../db');
const presence = require('../presence');

// ─── Helper: emit to every socket a userId owns ───────────────────────────────
function emitToUser(io, userId, event, data) {
  for (const sid of presence.getSocketIds(userId)) {
    io.to(sid).emit(event, data);
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────
// Message CONTENT never touches the server.
// We only relay a tiny signal so the recipient re-reads their localStorage.
function registerMessageHandlers(socket, io) {
  const { userId, username } = socket;

  socket.on('private_message', ({ toUsername, message }) => {
    const toUser = db.getUserByUsername(toUsername);
    if (!toUser) return;
    // Relay full message to recipient — server never stores content, just passes it through
    emitToUser(io, toUser.id, 'message_signal', {
      fromUsername: username,
      fromUserId:   userId,
      message,
    });
  });

  socket.on('typing', ({ toUsername, isTyping }) => {
    const toUser = db.getUserByUsername(toUsername);
    if (!toUser) return;
    emitToUser(io, toUser.id, 'typing', { fromUsername: username, isTyping });
  });
}

// ─── Friends ──────────────────────────────────────────────────────────────────
function registerFriendHandlers(socket, io) {
  const { userId, username } = socket;

  // Send a friend request
  socket.on('friend_request', ({ toUsername }) => {
    const toUser = db.getUserByUsername(toUsername);
    if (!toUser)                              return; // unknown user
    if (toUser.id === userId)                 return; // can't add yourself
    if (db.areFriends(userId, toUser.id))     return; // already friends
    if (db.hasFriendRequest(userId, toUser.id)) return; // already pending

    db.createFriendRequest(userId, toUser.id);

    const fromUser = db.getUserById(userId);
    emitToUser(io, toUser.id, 'friend_request', { from: db.publicProfile(fromUser) });
  });

  // Accept an incoming friend request
  socket.on('accept_friend', ({ fromUserId }) => {
    if (!db.hasFriendRequest(fromUserId, userId)) return;

    db.deleteFriendRequest(fromUserId, userId);
    db.addFriendship(userId, fromUserId);

    const meUser   = db.getUserById(userId);
    const fromUser = db.getUserById(fromUserId);
    if (!fromUser) return;

    // Tell the acceptor about their new friend
    socket.emit('friend_accepted', {
      user: { ...db.publicProfile(fromUser), online: presence.isOnline(fromUserId) },
    });
    // Tell the original requester they were accepted
    emitToUser(io, fromUserId, 'friend_accepted', {
      user: { ...db.publicProfile(meUser), online: presence.isOnline(userId) },
    });
  });

  // Decline an incoming friend request
  socket.on('decline_friend', ({ fromUserId }) => {
    db.deleteFriendRequest(fromUserId, userId);
  });

  // Remove an existing friend (mutual)
  socket.on('remove_friend', ({ targetUserId }) => {
    db.removeFriendship(userId, targetUserId);
    socket.emit('friend_removed', { userId: targetUserId });
    emitToUser(io, targetUserId, 'friend_removed', { userId });
  });
}

// ─── Presence & Status ────────────────────────────────────────────────────────
function registerPresenceHandlers(socket, io) {
  const { userId, username } = socket;
  const VALID_STATUSES = new Set(['online', 'away', 'busy']);

  socket.on('status_update', ({ status }) => {
    if (!VALID_STATUSES.has(status)) return;
    io.emit('user_status', { userId, username, status });
  });

  socket.on('disconnect', () => {
    presence.disconnect(socket.id);
    io.emit('online_users', presence.getOnlineUsers());
  });
}

// ─── Register all handlers for a socket ──────────────────────────────────────
function registerAll(socket, io) {
  registerMessageHandlers(socket, io);
  registerFriendHandlers(socket, io);
  registerPresenceHandlers(socket, io);
}

module.exports = { registerAll };

// ─── Block handlers (appended) ─────────────────────────────────────────────────
function registerBlockHandlers(socket, io) {
  const { userId } = socket;

  socket.on('block_user', ({ targetUsername }) => {
    const target = db.getUserByUsername(targetUsername);
    if (!target || target.id === userId) return;
    db.blockUser(userId, target.id);
    // Remove from each other's friend lists live
    socket.emit('friend_removed', { userId: target.id });
    emitToUser(io, target.id, 'friend_removed', { userId });
    socket.emit('blocked_confirmed', { userId: target.id, username: target.username });
  });

  socket.on('unblock_user', ({ targetUsername }) => {
    const target = db.getUserByUsername(targetUsername);
    if (!target) return;
    db.unblockUser(userId, target.id);
    socket.emit('unblocked_confirmed', { userId: target.id, username: target.username });
  });
}

const _origRegisterAll = module.exports.registerAll;
module.exports.registerAll = (socket, io) => {
  _origRegisterAll(socket, io);
  registerBlockHandlers(socket, io);
};

// ─── Group Chat Socket Handlers ───────────────────────────────────────────────
const { v4: uuid } = require('uuid');

function registerGroupHandlers(socket, io) {
  const { userId, username } = socket;

  // Join a group's socket room (called when user opens a group chat)
  socket.on('join_group', ({ groupName }) => {
    const group = db.getGroupByName(groupName);
    if (!group) return;
    // Auto-join as member if registered
    if (userId) db.joinGroup(group.id, userId);
    socket.join(`group:${group.id}`);
    // Send current online count to room
    const roomSize = io.sockets.adapter.rooms.get(`group:${group.id}`)?.size || 1;
    io.to(`group:${group.id}`).emit('group_presence', { groupId: group.id, count: roomSize });
  });

  socket.on('leave_group_room', ({ groupName }) => {
    const group = db.getGroupByName(groupName);
    if (!group) return;
    socket.leave(`group:${group.id}`);
    const roomSize = io.sockets.adapter.rooms.get(`group:${group.id}`)?.size || 0;
    io.to(`group:${group.id}`).emit('group_presence', { groupId: group.id, count: roomSize });
  });

  // Send a message to a group
  socket.on('group_message', ({ groupName, body, guestName }) => {
    const group = db.getGroupByName(groupName);
    if (!group) return;
    if (!body?.trim() || body.length > 2000) return;

    const msgId = uuid();
    const authorName = userId ? username : (guestName?.trim() || 'Anonymous');

    db.addGroupMessage({
      id:        msgId,
      groupId:   group.id,
      authorId:  userId || null,
      guestName: userId ? null : authorName,
      body:      body.trim(),
    });

    if (userId) db.updateLastRead(group.id, userId);

    const message = {
      id:        msgId,
      body:      body.trim(),
      createdAt: Date.now(),
      groupId:   group.id,
      author: userId
        ? { id: userId, username, avatar: null, isRegistered: true }
        : { id: null, username: authorName, avatar: null, isRegistered: false },
    };

    // Broadcast to everyone in the room (including sender)
    io.to(`group:${group.id}`).emit('group_message', message);
  });

  // Typing in group
  socket.on('group_typing', ({ groupName, isTyping }) => {
    const group = db.getGroupByName(groupName);
    if (!group) return;
    socket.to(`group:${group.id}`).emit('group_typing', {
      groupId: group.id,
      username: userId ? username : 'Anonymous',
      isTyping,
    });
  });
}

const _prev = module.exports.registerAll;
module.exports.registerAll = (socket, io) => {
  _prev(socket, io);
  registerGroupHandlers(socket, io);
};
