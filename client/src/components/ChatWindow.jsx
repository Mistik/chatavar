import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ChevronLeft, UserPlus, Check, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getMessages, saveMessage } from '../utils/storage';
import { format, isToday, isYesterday } from 'date-fns';
import Avatar from './Avatar';
import { v4 as uuidv4 } from 'uuid';
import api from '../utils/api';

function fmtTime(ts) { return format(new Date(ts), 'h:mm a'); }
function fmtDate(ts) {
  const d = new Date(ts);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

function groupMessages(msgs) {
  const out = [];
  let lastDate = null;
  msgs.forEach((msg, i) => {
    const day = format(new Date(msg.timestamp), 'yyyy-MM-dd');
    if (day !== lastDate) {
      out.push({ type:'divider', date:msg.timestamp, key:`d-${msg.timestamp}` });
      lastDate = day;
    }
    const prev = msgs[i-1];
    const isFirst = !prev || prev.fromUsername !== msg.fromUsername
      || (msg.timestamp - prev.timestamp > 5*60*1000);
    out.push({ type:'message', msg, isFirst });
  });
  return out;
}

export default function ChatWindow() {
  const { currentUser, activeChat, socket, typingUsers,
          setSidebarOpen, setProfilePanelUser,
          onlineUsers, friends } = useStore();

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [chatUser,  setChatUser]  = useState(null);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  const their = activeChat?.username;
  const isOnline = onlineUsers.some(u => u.username?.toLowerCase() === their?.toLowerCase());
  const isFriend = friends.some(f => f.username?.toLowerCase() === their?.toLowerCase());
  const [addSent, setAddSent] = useState(false);
  useEffect(() => { setAddSent(false); }, [their]);

  // Load messages from localStorage when chat changes
  useEffect(() => {
    if (!activeChat || !currentUser) return;
    setMessages(getMessages(currentUser.username, their));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'instant' }), 50);
    api.get(`/users/${their}`).then(({ data }) => setChatUser(data.user)).catch(() => setChatUser(null));
    inputRef.current?.focus();
  }, [activeChat?.username, currentUser?.username]);

  // Listen for incoming messages — payload now includes full message content
  useEffect(() => {
    if (!socket || !activeChat || !currentUser) return;
    const handler = ({ fromUsername, message }) => {
      if (fromUsername.toLowerCase() !== their?.toLowerCase()) return;

      // Save the incoming message to our localStorage so it persists
      saveMessage(currentUser.username, fromUsername, message);
      setMessages(prev => [...prev, message]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 40);
    };
    socket.on('message_signal', handler);
    return () => socket.off('message_signal', handler);
  }, [socket, activeChat?.username, currentUser?.username]);

  const sendTyping = useCallback((v) => {
    if (isTypingRef.current === v) return;
    isTypingRef.current = v;
    socket?.emit('typing', { toUsername: their, isTyping: v });
  }, [socket, their]);

  const handleInput = (e) => {
    setInput(e.target.value);
    sendTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 1500);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const send = () => {
    if (!input.trim() || !currentUser || !their) return;
    const text = input.trim();
    setInput('');
    sendTyping(false);
    clearTimeout(typingTimer.current);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const msg = {
      id:           uuidv4(),
      fromUsername: currentUser.username,
      toUsername:   their,
      text,
      timestamp:    Date.now(),
    };

    // Save to sender's localStorage immediately
    saveMessage(currentUser.username, their, msg);
    setMessages(prev => [...prev, msg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 30);

    // Send full message to server — server relays it to recipient
    socket?.emit('private_message', { toUsername: their, message: msg });
  };

  const isTheirTyping = typingUsers[their];
  const grouped = groupMessages(messages);

  if (!activeChat) {
    return (
      <div className="main">
        <div className="chat-header">
          <span className="logo">chatavar</span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">✨</div>
          <h3>Select a conversation</h3>
          <p>Choose someone from the sidebar or find new people in Members</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main">
      {/* Header */}
      <div className="chat-header">
        <button className="mobile-back" onClick={() => setSidebarOpen(true)}>
          <ChevronLeft size={18} style={{marginRight:-2}} /> Back
        </button>
        <div style={{ cursor: chatUser ? 'pointer' : 'default' }}
          onClick={() => chatUser && setProfilePanelUser(chatUser)}>
          <Avatar username={their} size="sm" showStatus status={isOnline ? 'online' : 'offline'} src={chatUser?.avatar} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="chat-header-name">{their}</div>
          <div className="chat-header-status" style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: isOnline ? 'var(--green)' : 'var(--text3)' }} />
            <span style={{ color: isOnline ? 'var(--green)' : 'var(--text3)' }}>{isOnline ? 'Online' : 'Offline'}</span>
            {chatUser?.location && <span style={{ color:'var(--text3)' }}>· {chatUser.location}</span>}
          </div>
        </div>
        {!isFriend && !addSent && (
          <button className="btn btn-primary btn-sm"
            onClick={() => { socket?.emit('friend_request', { toUsername: their }); setAddSent(true); }}
            style={{ gap:5, flexShrink:0 }}>
            <UserPlus size={13} /> Add
          </button>
        )}
        {!isFriend && addSent && (
          <span style={{ fontSize:11, color:'var(--accent)', fontWeight:600, display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <Check size={13} /> Sent
          </span>
        )}
        {isFriend && (
          <span style={{ fontSize:11, color:'var(--green)', fontWeight:600, display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <Check size={13} /> Friends
          </span>
        )}
        <button className="btn btn-ghost btn-icon" onClick={() => chatUser && setProfilePanelUser(chatUser)} title="View profile">
          <User size={15} />
        </button>
      </div>

      {/* Profile info banner */}
      {chatUser && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
          background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <Avatar username={their} size="sm" src={chatUser.avatar} />
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>{chatUser.username}</span>
            {(chatUser.gender || chatUser.age || chatUser.location) && (
              <span style={{ color:'var(--text2)', fontSize:12, marginLeft:6 }}>
                {[chatUser.gender, chatUser.age, chatUser.location].filter(Boolean).join(', ')}
              </span>
            )}
            {chatUser.bio && (
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {chatUser.bio}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ flex:'none', textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:13 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👋</div>
            Start your conversation with <strong style={{color:'var(--text2)'}}>{their}</strong>
          </div>
        )}
        {grouped.map(item => {
          if (item.type === 'divider') {
            return <div key={item.key} className="date-divider">{fmtDate(item.date)}</div>;
          }
          const { msg, isFirst } = item;
          const mine = msg.fromUsername === currentUser.username;
          return (
            <div key={msg.id} className={`message-group ${mine ? 'mine' : 'theirs'}`}>
              {isFirst && !mine && <div className="message-sender-name">{msg.fromUsername}</div>}
              <div className="message-bubble-wrap">
                {!mine && isFirst && <Avatar username={msg.fromUsername} size="xs" />}
                {!mine && !isFirst && <div style={{ width:24 }} />}
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>{msg.text}</div>
                  {isFirst && (
                    <div className="message-time" style={{ textAlign: mine ? 'right' : 'left' }}>
                      {fmtTime(msg.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTheirTyping && (
          <div className="typing-wrap">
            <Avatar username={their} size="xs" />
            <div className="typing-bubble">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <textarea ref={inputRef} className="chat-input"
          placeholder={`Message ${their}…`} value={input}
          onChange={handleInput}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1} />
        <button className="send-btn" onClick={send} disabled={!input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
