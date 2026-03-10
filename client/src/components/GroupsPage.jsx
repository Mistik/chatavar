import { useState, useEffect, useRef } from 'react';
import { navigate } from '../utils/navigate';
import { useStore } from '../store/useStore';
import AuthModal from './AuthModal';
import api from '../utils/api';
import EmbedConfigurator from './EmbedConfigurator';

// ── Create Group modal ────────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }) {
  const { currentUser } = useStore();
  const [name,         setName]         = useState('');
  const [showProps,    setShowProps]    = useState(false);
  const [title,        setTitle]        = useState('');
  const [ownerMessage, setOwnerMessage] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const submit = async () => {
    if (!slug) { setError('Name required'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/groups', { name: slug, title, ownerMessage });
      onCreated(data.group);
      onClose();
    } catch(e) {
      setError(e.response?.data?.error || 'Failed to create group');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.25)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:200,
      fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      
      <div style={{ position:'absolute',inset:0,overflow:'hidden',opacity:.1,fontSize:14,color:'#2196F3',lineHeight:2.2,padding:8,userSelect:'none',pointerEvents:'none',letterSpacing:2 }}>
        {Array(200).fill('YOUR WEBSITE ').join('')}
      </div>
      <div style={{ background:'#fff',borderRadius:6,padding:'28px 32px',width:520,position:'relative',zIndex:1,boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
        <button onClick={onClose} style={{ position:'absolute',right:14,top:12,background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999' }}>✕</button>

        {/* Group name row */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
          <input ref={ref} value={name} onChange={e => setName(e.target.value)}
            placeholder="Group name"
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={{ flex:1, padding:'10px 12px', border:'1px solid #ddd', borderRadius:4, fontSize:15, fontFamily:'inherit', outline:'none' }}
          />
          <span style={{ fontSize:13, color:'#888', whiteSpace:'nowrap' }}>
            Owner: <a href="#" style={{ color:'#2196F3', textDecoration:'none' }}>{currentUser?.username}</a>
          </span>
        </div>

        {slug && <div style={{ fontSize:11, color:'#2196F3', marginBottom:10, marginLeft:2 }}>chatavar.com/g/{slug}</div>}

        {/* Group properties */}
        <button onClick={() => setShowProps(v=>!v)} style={{ background:'none',border:'none',color:'#2196F3',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:4,padding:'2px 0',marginBottom:showProps?12:0 }}>
          {showProps?'−':'+'} Group properties
          {!showProps && <span style={{ color:'#999', fontWeight:400, fontSize:12 }}> — can be updated in real time</span>}
        </button>

        {showProps && (
          <div style={{ display:'flex', gap:16, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <input value={title} onChange={e => setTitle(e.target.value.slice(0,35))}
                placeholder="Group title"
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:4, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              />
              <div style={{ fontSize:10, color:'#aaa', marginTop:3 }}>Optional (35 chars, spaces ok)</div>
            </div>
            <div style={{ flex:1 }}>
              <input value={ownerMessage} onChange={e => setOwnerMessage(e.target.value)}
                placeholder="Owner's message"
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:4, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              />
              <div style={{ fontSize:10, color:'#aaa', marginTop:3 }}>Optional sticky live message</div>
            </div>
          </div>
        )}

        {error && <div style={{ fontSize:12, color:'#c62828', marginBottom:8 }}>{error}</div>}

        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button onClick={submit} disabled={loading || !slug} style={{
            background:'#FFC107', color:'#333', border:'none', borderRadius:4,
            padding:'10px 24px', fontSize:14, fontWeight:700, cursor: slug ? 'pointer' : 'default',
            opacity: slug ? 1 : .5, fontFamily:'inherit',
          }}>
            {loading ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main GroupsPage ───────────────────────────────────────────────────────────
export default function GroupsPage({ onOpenGroup, onPrivateMessages }) {
  const { currentUser, logout } = useStore();
  const [tab,          setTab]       = useState('mine');
  const [myGroups,     setMyGroups]  = useState([]);
  const [recentGroups, setRecent]    = useState([]);
  const [loading,      setLoading]   = useState(true);
  const [showAuth,     setShowAuth]  = useState(false);
  const [embedGroup,   setEmbedGroup]= useState(null);
  const [confirmDel,   setConfirmDel]= useState(null);

  const load = async () => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    try {
      const [mine, recent] = await Promise.all([api.get('/groups/mine'), api.get('/groups/recent')]);
      setMyGroups(mine.data.groups || []);
      setRecent(recent.data.groups || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentUser?.id]);

  // Auto-show auth modal if arriving here without being logged in
  useEffect(() => {
    if (!currentUser) setShowAuth(true);
  }, []);



  const handleMakeNew = () => { navigate('/new-group'); };

  const handleCreated = (group) => {
    setMyGroups(p => [group, ...p]);
  };

  const handleDelete = async (group) => {
    try {
      await api.delete(`/groups/${group.name}`);
      setMyGroups(p => p.filter(g => g.id !== group.id));
      setRecent(p => p.filter(g => g.id !== group.id));
      setConfirmDel(null);
    } catch(e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const myGroupIds = new Set(myGroups.map(g => g.id));
  const displayGroups = tab === 'mine' ? myGroups : recentGroups;

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:52, borderBottom:'1px solid #e8e8e8' }}>
        <div onClick={() => navigate('/')} style={{ fontSize:24, fontWeight:300, color:'#aaa', letterSpacing:-.5, cursor:'pointer' }}>chatavar</div>
        <div style={{ display:'flex', alignItems:'center', gap:24, fontSize:13, color:'#2196F3' }}>
          {currentUser && (
            <button onClick={() => navigate('/' + currentUser.username + '/chat')} style={{ background:'none', border:'none', color:'#2196F3', fontSize:13, cursor:'pointer', padding:0 }}>
              Private messages for {currentUser.username}
            </button>
          )}
          <a href="#" style={{ color:'#2196F3', textDecoration:'none' }}>Help</a>
          {currentUser ? (
            <button onClick={() => { logout(); navigate('/'); }} style={{ background:'none', border:'none', color:'#2196F3', fontSize:13, cursor:'pointer', padding:0 }}>Log out</button>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ background:'none', border:'none', color:'#2196F3', fontSize:13, cursor:'pointer', padding:0 }}>Log in</button>
          )}
        </div>
      </nav>

      {/* ── Two-column layout ── */}
      <div style={{ display:'flex', maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>

        {/* ── Left: main groups list ── */}
        <div style={{ flex:1, paddingRight:40, paddingTop:24, paddingBottom:80 }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'2px solid #e0e0e0', marginBottom:0 }}>
            {[['mine','My groups'],['recent','Recent']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                background:'none', border:'none', padding:'10px 0', marginRight:24,
                fontWeight: tab === key ? 700 : 400,
                color: tab === key ? '#222' : '#888',
                fontSize:15, cursor:'pointer',
                borderBottom: tab === key ? '2px solid #222' : '2px solid transparent',
                marginBottom:-2,
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Group list */}
          {loading ? (
            <div style={{ padding:'40px 0', textAlign:'center', color:'#aaa' }}>Loading…</div>
          ) : displayGroups.length === 0 ? (
            <div style={{ padding:'48px 0', color:'#aaa', fontSize:14 }}>
              {tab === 'mine' ? 'No groups yet — make a new one below.' : 'No recent group activity.'}
            </div>
          ) : displayGroups.map((g, i) => (
            <div key={g.id} style={{
              display:'flex', alignItems:'center',
              padding:'13px 0',
              borderBottom:'1px solid #eeeeee',
            }}>
              {/* Name + slug */}
              <div style={{ flex:1, cursor:'pointer' }} onClick={() => onOpenGroup(g)}>
                <div style={{ fontWeight:700, fontSize:14, color:'#222' }}>{g.title || g.name}</div>
                <div style={{ fontSize:13, color:'#2196F3' }}>{g.name}</div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
                {myGroupIds.has(g.id) && (
                  <button onClick={() => setEmbedGroup(g)} style={{
                    background:'none', border:'none', color:'#2196F3',
                    fontSize:13, cursor:'pointer', padding:0,
                  }}>
                    &lt;embed code&gt;
                  </button>
                )}
                {myGroupIds.has(g.id) && (
                  confirmDel?.id === g.id ? (
                    <span style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ fontSize:12, color:'#c62828' }}>Delete?</span>
                      <button onClick={() => handleDelete(g)} style={{ background:'#c62828',color:'#fff',border:'none',borderRadius:3,padding:'2px 8px',fontSize:12,cursor:'pointer' }}>Yes</button>
                      <button onClick={() => setConfirmDel(null)} style={{ background:'none',border:'1px solid #ddd',borderRadius:3,padding:'2px 8px',fontSize:12,cursor:'pointer' }}>No</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDel(g)} style={{ background:'none',border:'none',color:'#aaa',cursor:'pointer',fontSize:14,padding:0,lineHeight:1 }}>x</button>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Make a new group button */}
          <div style={{ position:'fixed', bottom:32, left:32 }}>
            <button onClick={handleMakeNew} style={{
              background:'#FFC107', color:'#333', border:'none', borderRadius:4,
              padding:'10px 22px', fontSize:14, fontWeight:700, cursor:'pointer',
            }}>
              Make a new group
            </button>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ width:260, flexShrink:0, paddingTop:32, paddingLeft:24, borderLeft:'1px solid #f0f0f0' }}>
          <div style={{ borderBottom:'1px solid #e0e0e0', paddingBottom:24, marginBottom:24 }}>
            <div style={{ fontWeight:700, color:'#333', marginBottom:12 }}>Chatavar Android app:</div>
            <a href="#" style={{ display:'inline-block', background:'#000', borderRadius:6, padding:'8px 14px', textDecoration:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:22 }}>▶</span>
                <div>
                  <div style={{ color:'#aaa', fontSize:9, letterSpacing:.5 }}>ANDROID APP ON</div>
                  <div style={{ color:'#fff', fontSize:13, fontWeight:700 }}>Google Play</div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop:'1px solid #f0f0f0', padding:'16px 32px', display:'flex', justifyContent:'center', gap:28, marginTop:40 }}>
        {['Help','Terms of use','Privacy policy'].map(l => (
          <a key={l} href="#" style={{ color:'#2196F3', textDecoration:'none', fontSize:13 }}>{l}</a>
        ))}
      </div>

      {/* Modals */}
          {showAuth   && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      {embedGroup && <EmbedConfigurator group={embedGroup} onClose={() => setEmbedGroup(null)} />}
    </div>
  );
}
