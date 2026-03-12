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
function registerMessageHandlers(socket, io) {
  const { userId, username } = socket;

  socket.on('private_message', ({ toUsername, message }) => {
    const toUser = db.getUserByUsername(toUsername);
    if (!toUser) return;

    // Check if sender is restricted
    if (userId && db.isRestricted(userId))
      return socket.emit('pm_error', { error: 'Your account is restricted from messaging' });

    // Check if sender is blocked by recipient
    if (userId && db.isBlocked(toUser.id, userId))
      return; // silently drop

    // Check recipient's privacy settings
    const recipientSettings = db.getUserSettings(toUser.id);
    if (recipientSettings.pm_from === 'nobody')
      return socket.emit('pm_error', { error: 'This user has disabled private messages' });
    if (recipientSettings.pm_from === 'friends') {
      if (!userId || !db.areFriends(userId, toUser.id))
        return socket.emit('pm_error', { error: 'This user only accepts messages from friends' });
    }

    // Relay full message to recipient
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

  // Send a message to a group — with full moderation enforcement
  socket.on('group_message', ({ groupName, body, guestName }) => {
    const group = db.getGroupByName(groupName);
    if (!group) return;
    if (!body?.trim() || body.length > 2000) return;

    const rawDb = require('../db').__rawDb;
    const mod = require('../moderation');
    const settings = mod.getGroupSettings(rawDb, group.id);

    // Ban check
    if (mod.isUserBanned(rawDb, group.id, userId, null))
      return socket.emit('group_error', { error: 'You are banned from this group' });
    // Mute check
    if (userId && mod.isUserMuted(rawDb, group.id, userId))
      return socket.emit('group_error', { error: 'You are muted in this group' });
    // No anons
    if (!settings.allow_anons && !userId)
      return socket.emit('group_error', { error: 'You must log in to post here' });
    // Broadcast mode
    if (settings.broadcast_mode) {
      const role = mod.getModRole(rawDb, group.id, userId, group.owner_id);
      if (!role) return socket.emit('group_error', { error: 'Only moderators can post in broadcast mode' });
    }
    // Slow mode
    if (settings.slow_mode && userId) {
      const role = mod.getModRole(rawDb, group.id, userId, group.owner_id);
      const exempt = role === 'owner' || (settings.slow_mode_exempt_mods && role);
      if (!exempt) {
        const key = `sm:${group.id}:${userId}`;
        const now = Date.now();
        if (!socket._sm) socket._sm = {};
        if (socket._sm[key] && (now - socket._sm[key]) < settings.slow_mode_seconds * 1000)
          return socket.emit('group_error', { error: `Slow mode: wait ${settings.slow_mode_seconds}s` });
        socket._sm[key] = now;
      }
    }
    // Ban links
    if (settings.ban_links && /https?:\/\/|www\./i.test(body))
      return socket.emit('group_error', { error: 'Links are not allowed' });

    // Banned words
    let finalBody = body.trim();
    const censored = mod.censorMessage(rawDb, group.id, finalBody);
    if (censored !== null) {
      if (settings.censor_mode === 'only_author') {
        // Shadow: sender sees it, nobody else does
        return socket.emit('group_message', {
          id: uuid(), body: finalBody, createdAt: Date.now(), groupId: group.id,
          author: userId ? { id: userId, username, avatar: null, isRegistered: true }
            : { id: null, username: guestName || 'Anonymous', avatar: null, isRegistered: false },
        });
      } else if (settings.censor_mode === 'block') {
        return socket.emit('group_error', { error: 'Message blocked: contains banned content' });
      } else { finalBody = censored; }
    }

    // All checks passed
    const msgId = uuid();
    const authorName = userId ? username : (guestName?.trim() || 'Anonymous');
    db.addGroupMessage({ id: msgId, groupId: group.id, authorId: userId || null,
      guestName: userId ? null : authorName, body: finalBody });
    if (userId) db.updateLastRead(group.id, userId);
    // Include sender's color preferences
    let msgColor = '', msgBgColor = '';
    if (userId) {
      const userSettings = db.getUserSettings(userId);
      msgColor = userSettings.msg_color || '';
      msgBgColor = userSettings.msg_bg_color || '';
    }
    const message = {
      id: msgId, body: finalBody, createdAt: Date.now(), groupId: group.id,
      author: userId ? { id: userId, username, avatar: null, isRegistered: true, msgColor, msgBgColor }
        : { id: null, username: authorName, avatar: null, isRegistered: false },
    };
    io.to(`group:${group.id}`).emit('group_message', message);
  });

  // ── Moderation socket events ──────────────────────────────────────────────
  socket.on('mod_delete_message', ({ groupName, messageId }) => {
    const group = db.getGroupByName(groupName);
    if (!group || !userId) return;
    const rawDb = require('../db').__rawDb;
    const mod = require('../moderation');
    if (!mod.getModRole(rawDb, group.id, userId, group.owner_id)) return;
    mod.deleteMessage(rawDb, messageId);
    mod.addModLog(rawDb, { groupId: group.id, actorId: userId, action: 'delete_msg', detail: messageId });
    io.to(`group:${group.id}`).emit('message_deleted', { messageId, groupId: group.id });
  });

  socket.on('mod_ban_user', ({ groupName, targetUsername, reason, deleteMessages }) => {
    const group = db.getGroupByName(groupName);
    if (!group || !userId) return;
    const rawDb = require('../db').__rawDb;
    const mod = require('../moderation');
    if (!mod.getModRole(rawDb, group.id, userId, group.owner_id)) return;
    const target = db.getUserByUsername(targetUsername);
    if (!target || target.id === group.owner_id) return;
    mod.banUser(rawDb, { id: uuid(), groupId: group.id, userId: target.id, reason: reason||'', bannedBy: userId });
    if (deleteMessages) mod.deleteMessagesByUser(rawDb, group.id, target.id);
    mod.removeModerator(rawDb, group.id, target.id);
    mod.addModLog(rawDb, { groupId: group.id, actorId: userId, action: deleteMessages ? 'easy_ban' : 'ban',
      targetId: target.id, targetName: target.username, detail: reason||'' });
    io.to(`group:${group.id}`).emit('user_banned', { userId: target.id, username: target.username, groupId: group.id, deleteMessages });
    for (const sid of presence.getSocketIds(target.id)) {
      io.sockets.sockets.get(sid)?.leave(`group:${group.id}`);
      io.to(sid).emit('group_error', { error: 'You have been banned from this group' });
    }
  });

  socket.on('mod_mute_user', ({ groupName, targetUsername, duration }) => {
    const group = db.getGroupByName(groupName);
    if (!group || !userId) return;
    const rawDb = require('../db').__rawDb;
    const mod = require('../moderation');
    if (!mod.getModRole(rawDb, group.id, userId, group.owner_id)) return;
    const target = db.getUserByUsername(targetUsername);
    if (!target) return;
    mod.muteUser(rawDb, group.id, target.id, (duration||300)*1000, userId);
    mod.addModLog(rawDb, { groupId: group.id, actorId: userId, action: 'mute', targetId: target.id, targetName: target.username });
    io.to(`group:${group.id}`).emit('user_muted', { userId: target.id, username: target.username, groupId: group.id });
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
