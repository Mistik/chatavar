// ─── Chatavar Embedded Group Chat Widget ─────────────────────────────────────
// Runs inside an iframe injected by embed.js. Config is passed via URL params.
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const params   = new URLSearchParams(window.location.search);
const GROUP    = params.get('group') || '';
const SERVER   = params.get('server') || window.location.origin;
const COLOR    = '#' + (params.get('color') || 'CC0000');
const SHOW_URL = params.get('showUrl') !== '0';

const API = SERVER + '/api';

// ── Time format ───────────────────────────────────────────────────────────────
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) +
    ', ' + d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const ACOLORS = ['#5865f2','#3ba55c','#ed4245','#faa61a','#eb459e','#00b0f4'];
function Av({ name, avatar, size=32 }) {
  if (avatar) return <img src={avatar} style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />;
  const bg = ACOLORS[(name||'?').charCodeAt(0) % ACOLORS.length];
  return (
    <div style={{ width:size,height:size,borderRadius:'50%',background:bg,color:'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:size*.38,fontWeight:800,flexShrink:0,userSelect:'none' }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

// ── Message row ───────────────────────────────────────────────────────────────
function MsgRow({ msg, prev }) {
  const grouped = prev && prev.author.username === msg.author.username
    && (msg.createdAt - prev.createdAt) < 4*60000;
  return (
    <div style={{ display:'flex',gap:8,padding:grouped?'1px 10px':'8px 10px 1px',alignItems:'flex-start' }}>
      <div style={{ width:36,flexShrink:0,paddingTop:2 }}>
        {!grouped && <Av name={msg.author.username} avatar={msg.author.avatar} />}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        {!grouped && (
          <div style={{ display:'flex',alignItems:'baseline',gap:6,marginBottom:1 }}>
            <span style={{ fontWeight:700,fontSize:13,color:COLOR }}>{msg.author.username}</span>
            <span style={{ fontSize:10,color:'#999' }}>{fmtTime(msg.createdAt)}</span>
          </div>
        )}
        <div style={{ fontSize:13,color:'#222',lineHeight:1.5,wordBreak:'break-word',whiteSpace:'pre-wrap' }}>
          {msg.body}
        </div>
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function WidgetApp() {
  const [group,      setGroup]      = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [guestName,  setGuestName]  = useState(() => localStorage.getItem('cv_guest_name') || '');
  const [token,      setToken]      = useState(() => localStorage.getItem('cv_widget_token') || null);
  const [me,         setMe]         = useState(null);
  const [onlineCount,setOnlineCount]= useState(0);
  const [typers,     setTypers]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const socketRef  = useRef(null);
  const bottomRef  = useRef(null);
  const typingRef  = useRef(null);

  // Load group + messages
  useEffect(() => {
    fetch(`${API}/groups/${GROUP}/messages?limit=60`, {
      headers: token ? { Authorization:`Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { setMessages(d.messages||[]); setLoading(false); })
      .catch(() => { setError('Could not load chat'); setLoading(false); });

    fetch(`${API}/groups/${GROUP}`)
      .then(r=>r.json()).then(d=>setGroup(d.group)).catch(()=>{});

    if (token) {
      fetch(`${API}/me`,{ headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.ok?r.json():null)
        .then(d=>{ if(d?.user) setMe(d.user); else { localStorage.removeItem('cv_widget_token'); setToken(null); } })
        .catch(()=>{});
    }
  }, []);

  // Socket
  useEffect(() => {
    const sock = io(SERVER, {
      transports:['websocket','polling'],
      auth: token ? { token } : undefined,
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      sock.emit('join_group', { groupName: GROUP });
    });
    sock.on('group_message', msg => {
      if (!GROUP || msg.groupId) {
        setMessages(p => [...p, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
      }
    });
    sock.on('group_presence', ({ count }) => setOnlineCount(count));
    sock.on('group_typing', ({ username:u, isTyping }) => {
      setTypers(p => isTyping ? [...new Set([...p,u])] : p.filter(x=>x!==u));
    });
    return () => { sock.emit('leave_group_room',{groupName:GROUP}); sock.disconnect(); };
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'instant' });
  }, [loading]);

  const send = () => {
    const body = input.trim();
    if (!body) return;
    const name = me ? me.username : guestName.trim();
    if (!name) return;
    socketRef.current?.emit('group_message', { groupName:GROUP, body, guestName: me ? undefined : name });
    setInput('');
    clearTimeout(typingRef.current);
    socketRef.current?.emit('group_typing', { groupName:GROUP, isTyping:false });
  };

  const handleInput = e => {
    setInput(e.target.value);
    socketRef.current?.emit('group_typing', { groupName:GROUP, isTyping:true, guestName });
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      socketRef.current?.emit('group_typing', { groupName:GROUP, isTyping:false });
    }, 1500);
  };

  const handleLogin = () => {
    const popup = window.open(`${SERVER}/widget-login?group=${GROUP}`, 'cv-login',
      'width=420,height=520,left=' + (screen.width/2-210) + ',top=' + (screen.height/2-260));
    const onMsg = e => {
      if (e.data?.type === 'CV_LOGIN' && e.data.token) {
        localStorage.setItem('cv_widget_token', e.data.token);
        setToken(e.data.token);
        if (e.data.user) setMe(e.data.user);
        window.removeEventListener('message', onMsg);
      }
    };
    window.addEventListener('message', onMsg);
  };

  const handleLogout = () => {
    localStorage.removeItem('cv_widget_token');
    setToken(null); setMe(null);
  };

  const saveGuestName = n => {
    setGuestName(n);
    localStorage.setItem('cv_guest_name', n);
  };

  if (error) return (
    <div style={{ height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif',color:'#999',fontSize:13 }}>
      {error}
    </div>
  );

  const displayName = me?.username || guestName;
  const canSend = !!input.trim() && !!displayName;

  return (
    <div style={{ height:'100vh',display:'flex',flexDirection:'column',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',fontSize:13 }}>

      {/* Header */}
      <div style={{ background:COLOR,color:'#fff',padding:'6px 10px',display:'flex',flexDirection:'column',flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span style={{ fontWeight:700,fontSize:14 }}>{group?.title || group?.name || GROUP}</span>
          <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:11 }}>
            <span>🔊 {onlineCount}</span>
            {me ? (
              <button onClick={handleLogout} style={{ background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize:11 }}>
                Log out
              </button>
            ) : (
              <button onClick={handleLogin} style={{ background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize:11 }}>
                Log in
              </button>
            )}
          </div>
        </div>
        {SHOW_URL && group && (
          <div style={{ fontSize:10,opacity:.8 }}>{SERVER}/g/{group.name}</div>
        )}
      </div>

      {/* Owner pinned message */}
      {group?.owner_message && (
        <div style={{ background:'#fff8e1',borderBottom:'1px solid #ffe082',padding:'5px 10px',fontSize:11,color:'#5d4037' }}>
          📌 {group.owner_message}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1,overflow:'auto',background:'#fff' }}>
        {loading && <div style={{ padding:20,textAlign:'center',color:'#ccc' }}>Loading…</div>}
        {!loading && messages.length === 0 && (
          <div style={{ padding:20,textAlign:'center',color:'#ccc' }}>No messages yet. Say hello!</div>
        )}
        {messages.map((m,i) => <MsgRow key={m.id} msg={m} prev={messages[i-1]||null} />)}
        {typers.length > 0 && (
          <div style={{ padding:'2px 10px 6px',fontSize:11,color:'#aaa',display:'flex',alignItems:'center',gap:6 }}>
            <span style={{ display:'flex',gap:3 }}>
              {[0,1,2].map(i=>(
                <span key={i} style={{ width:4,height:4,borderRadius:'50%',background:'#ccc',display:'inline-block',
                  animation:'blink 1.2s infinite',animationDelay:`${i*.2}s` }}/>
              ))}
            </span>
            {typers.slice(0,2).join(', ')} typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background:'#f5f5f5',borderTop:'1px solid #e0e0e0',padding:'6px 8px',flexShrink:0 }}>
        {!me && (
          <input value={guestName} onChange={e=>saveGuestName(e.target.value)}
            placeholder="Set name" maxLength={30}
            style={{ width:'100%',boxSizing:'border-box',marginBottom:5,padding:'4px 8px',border:'1px solid #ddd',borderRadius:4,fontSize:12,fontFamily:'inherit',outline:'none' }}
          />
        )}
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <input value={input} onChange={handleInput}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),send())}
            placeholder={displayName ? `Chat as ${displayName}…` : 'Enter a name above first'}
            disabled={!displayName}
            style={{ flex:1,padding:'6px 10px',border:'1px solid #ddd',borderRadius:4,fontSize:13,fontFamily:'inherit',outline:'none',background:displayName?'#fff':'#f0f0f0' }}
          />
          <button onClick={send} disabled={!canSend}
            style={{ background:canSend?COLOR:'#ccc',color:'#fff',border:'none',borderRadius:4,padding:'6px 12px',cursor:canSend?'pointer':'default',fontWeight:700,fontSize:12 }}>
            Send
          </button>
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4 }}>
          <span style={{ fontSize:10,color:'#aaa',fontWeight:700 }}>chatavar</span>
          {me && <span style={{ fontSize:10,color:'#aaa' }}>Logged in as <strong>{me.username}</strong></span>}
          {!me && guestName && <span style={{ fontSize:10,color:'#aaa' }}>Chatting as <strong>{guestName}</strong></span>}
          {!me && !guestName && <span style={{ fontSize:10,color:'#aaa' }}>Enter a name to chat</span>}
        </div>
      </div>
      <style>{`@keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
    </div>
  );
}
