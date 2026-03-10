import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Users, Hash, Settings, Send, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import api from '../utils/api';

// ── Avatar initials ───────────────────────────────────────────────────────────
const COLORS = ['#5865f2','#3ba55c','#ed4245','#faa61a','#eb459e','#00b0f4','#1abc9c'];
function miniColor(name) { return COLORS[(name||'?').charCodeAt(0) % COLORS.length]; }

function MsgAvatar({ username, avatar, size=30 }) {
  if (avatar) return <img src={avatar} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />;
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:miniColor(username),
      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*.4, fontWeight:800, flexShrink:0, userSelect:'none',
    }}>
      {(username||'?')[0].toUpperCase()}
    </div>
  );
}

// ── Format timestamp ──────────────────────────────────────────────────────────
function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  if (isToday) return time;
  return d.toLocaleDateString([], { month:'short', day:'numeric' }) + ', ' + time;
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingIndicator({ typers }) {
  if (!typers.length) return null;
  const names = typers.slice(0,3).join(', ') + (typers.length>3?' and others':'');
  return (
    <div style={{ padding:'4px 16px 8px', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text3)' }}>
      <div style={{ display:'flex', gap:3 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:5, height:5, borderRadius:'50%', background:'var(--text3)',
            animation:'bounce 1.2s infinite', animationDelay:`${i*.2}s`,
          }} />
        ))}
      </div>
      <span><strong>{names}</strong> {typers.length===1?'is':'are'} typing…</span>
    </div>
  );
}

// ── Single message ────────────────────────────────────────────────────────────
function Message({ msg, prevMsg, accent }) {
  const sameAuthor = prevMsg && prevMsg.author.username === msg.author.username
    && (msg.createdAt - prevMsg.createdAt) < 5 * 60 * 1000;

  return (
    <div style={{
      display:'flex', gap:10, padding: sameAuthor ? '1px 16px' : '8px 16px 1px',
      alignItems:'flex-start',
    }}>
      <div style={{ width:30, flexShrink:0, paddingTop:2 }}>
        {!sameAuthor && <MsgAvatar username={msg.author.username} avatar={msg.author.avatar} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        {!sameAuthor && (
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:2 }}>
            <span style={{ fontWeight:700, fontSize:13.5, color: msg.author.isRegistered ? accent : 'var(--text)' }}>
              {msg.author.username}
            </span>
            {msg.author.isRegistered && (
              <span style={{ fontSize:9, background:'rgba(88,101,242,.12)', color:accent,
                             borderRadius:99, padding:'1px 5px', fontWeight:800 }}>✓</span>
            )}
            <span style={{ fontSize:11, color:'var(--text3)' }}>{fmtTime(msg.createdAt)}</span>
          </div>
        )}
        <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.55, wordBreak:'break-word', whiteSpace:'pre-wrap' }}>
          {msg.body}
        </div>
      </div>
    </div>
  );
}

// ── Edit group panel ──────────────────────────────────────────────────────────
function EditPanel({ group, onClose, onUpdated }) {
  const [title, setTitle] = useState(group.title || '');
  const [ownerMessage, setOwnerMessage] = useState(group.owner_message || '');
  const [description, setDescription] = useState(group.description || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const { data } = await api.put(`/groups/${group.name}`, { title, ownerMessage, description, accentColor: group.accent_color });
      onUpdated(data.group);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{
      width:260, flexShrink:0, borderLeft:'1px solid var(--border)',
      background:'var(--surface)', display:'flex', flexDirection:'column', overflow:'auto',
    }}>
      <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:700, fontSize:14 }}>Group Settings</span>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><Settings size={14}/></button>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <div>
          <label className="form-label">Title</label>
          <input className="form-input" value={title} onChange={e=>setTitle(e.target.value.slice(0,35))} />
        </div>
        <div>
          <label className="form-label">Pinned message</label>
          <input className="form-input" value={ownerMessage} onChange={e=>setOwnerMessage(e.target.value)}
            placeholder="Shown at top of chat" />
        </div>
        <div>
          <label className="form-label">Description</label>
          <textarea className="form-input" value={description} onChange={e=>setDescription(e.target.value)}
            rows={3} style={{ resize:'vertical', fontFamily:'inherit' }} />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={loading}>
          {loading ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
        <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>
          Share link:<br/>
          <code style={{ color:'var(--accent)', wordBreak:'break-all' }}>
            {window.location.origin}/g/{group.name}
          </code>
        </div>
      </div>
    </div>
  );
}

// ── Main GroupChatWindow ──────────────────────────────────────────────────────
export default function GroupChatWindow({ group: initialGroup, onBack }) {
  const { currentUser, socket } = useStore();
  const [group,     setGroup]     = useState(initialGroup);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [hasMore,   setHasMore]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [typers,    setTypers]    = useState([]);
  const [showEdit,  setShowEdit]  = useState(false);
  const [atBottom,  setAtBottom]  = useState(true);
  const messagesRef = useRef(null);
  const typingTimer = useRef(null);
  const accent = `#${group.accent_color || '5865f2'}`;
  const isOwner = currentUser?.id === group.owner_id;

  // Load message history
  useEffect(() => {
    setLoading(true);
    api.get(`/groups/${group.name}/messages?limit=80`)
      .then(({ data }) => {
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
        setLoading(false);
        scrollToBottom(true);
      })
      .catch(() => setLoading(false));
  }, [group.name]);

  // Socket: join room + listen
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_group', { groupName: group.name });

    const onMsg = (msg) => {
      if (msg.groupId !== group.id) return;
      setMessages(prev => [...prev, msg]);
      // Auto-scroll if near bottom
      const el = messagesRef.current;
      if (el) {
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (nearBottom) setTimeout(() => scrollToBottom(), 50);
      }
      // Mark read
      api.get(`/groups/${group.name}/messages?limit=1`).catch(()=>{});
    };

    const onPresence = ({ groupId, count }) => {
      if (groupId === group.id) setOnlineCount(count);
    };

    const onTyping = ({ groupId, username: typerName, isTyping }) => {
      if (groupId !== group.id) return;
      if (typerName === (currentUser?.username || guestName)) return;
      setTypers(prev => isTyping
        ? [...new Set([...prev, typerName])]
        : prev.filter(t => t !== typerName)
      );
    };

    socket.on('group_message', onMsg);
    socket.on('group_presence', onPresence);
    socket.on('group_typing', onTyping);

    return () => {
      socket.emit('leave_group_room', { groupName: group.name });
      socket.off('group_message', onMsg);
      socket.off('group_presence', onPresence);
      socket.off('group_typing', onTyping);
    };
  }, [socket, group.id, group.name]);

  const scrollToBottom = (instant=false) => {
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'instant' : 'smooth' });
  };

  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    // Load more when scrolled near top
    if (el.scrollTop < 80 && hasMore && !loadingMore) loadMore();
  };

  const loadMore = async () => {
    if (!messages.length) return;
    setLoadingMore(true);
    const oldest = messages[0].createdAt;
    try {
      const { data } = await api.get(`/groups/${group.name}/messages?limit=60&before=${oldest}`);
      const el = messagesRef.current;
      const prevHeight = el?.scrollHeight || 0;
      setMessages(prev => [...(data.messages||[]), ...prev]);
      setHasMore(data.hasMore || false);
      // Preserve scroll position
      if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevHeight; });
    } catch {}
    setLoadingMore(false);
  };

  const emitTyping = (isTyping) => {
    if (!socket) return;
    socket.emit('group_typing', { groupName: group.name, isTyping, guestName });
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    if (!typingTimer.current) emitTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { emitTyping(false); typingTimer.current=null; }, 1500);
  };

  const sendMessage = () => {
    const body = input.trim();
    if (!body || !socket) return;
    if (!currentUser && !guestName.trim()) return;
    socket.emit('group_message', { groupName: group.name, body, guestName: guestName.trim() });
    setInput('');
    clearTimeout(typingTimer.current);
    typingTimer.current = null;
    emitTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Main chat column */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Header */}
          <div style={{
            padding:'0 16px', height:52, display:'flex', alignItems:'center', gap:10,
            background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0,
          }}>
            <button className="btn btn-ghost btn-icon" onClick={onBack}>
              <ArrowLeft size={17}/>
            </button>
            <div style={{ width:30, height:30, borderRadius:8, background:accent,
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Hash size={14} color="#fff"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {group.title || group.name}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block' }}/>
                {onlineCount} online · {group.member_count || 0} members
              </div>
            </div>
            {isOwner && (
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEdit(v=>!v)} title="Group settings">
                <Settings size={15}/>
              </button>
            )}
          </div>

          {/* Owner pinned message */}
          {group.owner_message && (
            <div style={{
              background: `${accent}18`, borderBottom:`1px solid ${accent}40`,
              padding:'8px 16px', fontSize:12, color:'var(--text2)',
              display:'flex', gap:6, alignItems:'center',
            }}>
              <span style={{ fontWeight:800, color:accent, fontSize:11 }}>📌</span>
              {group.owner_message}
            </div>
          )}

          {/* Messages */}
          <div ref={messagesRef} onScroll={handleScroll} style={{
            flex:1, overflow:'auto', paddingTop:8, paddingBottom:4,
          }}>
            {loadingMore && (
              <div style={{ textAlign:'center', padding:'8px', color:'var(--text3)', fontSize:12 }}>Loading…</div>
            )}
            {loading && (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:40, color:'var(--text3)', fontSize:13 }}>
                Loading messages…
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>👋</div>
                <div style={{ fontWeight:700, marginBottom:4 }}>Welcome to #{group.name}!</div>
                <div style={{ fontSize:13 }}>Be the first to say something.</div>
              </div>
            )}
            {messages.map((m,i) => (
              <Message key={m.id} msg={m} prevMsg={messages[i-1] || null} accent={accent} />
            ))}
            <TypingIndicator typers={typers} />
          </div>

          {/* Scroll to bottom button */}
          {!atBottom && (
            <div style={{ position:'absolute', bottom:80, right:20, zIndex:10 }}>
              <button className="btn btn-primary btn-icon" onClick={() => scrollToBottom()}
                style={{ borderRadius:'50%', width:36, height:36, boxShadow:'0 2px 12px rgba(0,0,0,.2)' }}>
                <ChevronDown size={16}/>
              </button>
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding:'8px 12px', background:'var(--surface)',
            borderTop:'1px solid var(--border)', flexShrink:0,
          }}>
            {!currentUser && (
              <input className="form-input" value={guestName} onChange={e=>setGuestName(e.target.value)}
                placeholder="Your name (required)" style={{ marginBottom:6, fontSize:12 }} />
            )}
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea
                value={input} onChange={handleInput} onKeyDown={handleKeyDown}
                placeholder={currentUser ? `Message #${group.name}…` : 'Message (guest)…'}
                rows={1}
                disabled={!currentUser && !guestName.trim()}
                style={{
                  flex:1, padding:'9px 12px', border:'1.5px solid var(--border)',
                  borderRadius:8, background:'var(--bg)', color:'var(--text)',
                  fontSize:13.5, fontFamily:'inherit', resize:'none',
                  outline:'none', lineHeight:1.45, maxHeight:120, overflow:'auto',
                  transition:'border-color .15s',
                }}
                onFocus={e=>e.target.style.borderColor=accent}
                onBlur={e=>e.target.style.borderColor='var(--border)'}
              />
              <button onClick={sendMessage}
                disabled={!input.trim() || (!currentUser && !guestName.trim())}
                style={{
                  width:36, height:36, borderRadius:8, border:'none',
                  background: input.trim() ? accent : 'var(--surface2)',
                  color: input.trim() ? '#fff' : 'var(--text3)',
                  cursor: input.trim() ? 'pointer' : 'default',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, transition:'all .15s',
                }}>
                <Send size={15}/>
              </button>
            </div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:4, textAlign:'right' }}>
              {currentUser ? (
                <>chatting as <strong>{currentUser.username}</strong></>
              ) : (
                <>guest · <a href="/login" style={{color:'var(--accent)'}}>log in</a> for more features</>
              )}
            </div>
          </div>
        </div>

        {/* Settings sidebar */}
        {showEdit && isOwner && (
          <EditPanel group={group} onClose={()=>setShowEdit(false)} onUpdated={setGroup} />
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)}
        }
      `}</style>
    </div>
  );
}
