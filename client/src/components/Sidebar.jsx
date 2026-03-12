import { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, Check, X, Sun, Moon, LogOut, Edit3, SlidersHorizontal, UserCheck, Settings, Globe, HelpCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTheme } from '../store/useTheme';
import { getRecent } from '../utils/storage';
import { navigate } from '../utils/navigate';
import Avatar from './Avatar';
import { formatDistanceToNowStrict } from 'date-fns';

function shortTime(ts) {
  if (!ts) return '';
  try {
    return formatDistanceToNowStrict(new Date(ts), { addSuffix: false })
      .replace(' seconds','s').replace(' second','s')
      .replace(' minutes','m').replace(' minute','m')
      .replace(' hours','h').replace(' hour','h')
      .replace(' days','d').replace(' day','d');
  } catch { return ''; }
}

const STATUS_COLORS = { online:'var(--green)', away:'var(--yellow)', busy:'var(--red)', offline:'var(--text3)' };
const STATUS_LABELS = { online:'Online', away:'Away', busy:'Do Not Disturb', offline:'Invisible' };

/* ─── Status dropdown ────────────────────────────────────────────────────── */
function StatusDropdown({ onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div className="dropdown" ref={ref} style={{ minWidth:170 }}>
      <div className="dropdown-label">Set Status</div>
      {['online','away','busy','offline'].map(s => (
        <div key={s} className="dropdown-item" onClick={() => { onSelect(s); onClose(); }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:STATUS_COLORS[s], display:'inline-block', flexShrink:0 }} />
          {STATUS_LABELS[s]}
        </div>
      ))}
    </div>
  );
}

/* ─── Recent Tab ─────────────────────────────────────────────────────────── */
function RecentTab() {
  const { currentUser, setActiveChat, activeChat, unreadCounts, clearUnread, onlineUsers } = useStore();
  const recent = getRecent();
  if (!recent.length) return (
    <div className="empty-state">
      <div className="empty-state-icon">💬</div>
      <h3>No conversations</h3>
      <p>Find people to chat with in the Members tab</p>
    </div>
  );
  return (
    <div className="user-list">
      {recent.map(r => {
        const isOnline = onlineUsers.some(u => u.username?.toLowerCase() === r.username.toLowerCase());
        const unread   = unreadCounts[r.username] || 0;
        const active   = activeChat?.username?.toLowerCase() === r.username.toLowerCase();
        return (
          <div key={r.username} className={`user-item ${active ? 'active' : ''}`}
            onClick={() => { setActiveChat({ username: r.username }); clearUnread(r.username); }}>
            <Avatar username={r.username} size="md" showStatus status={isOnline ? 'online' : 'offline'} />
            <div className="user-item-info">
              <div className="user-item-top">
                <span className="user-item-name">{r.username}</span>
                <span className="user-item-time">{shortTime(r.lastMessage?.timestamp)}</span>
              </div>
              <div className="user-item-preview">
                {r.lastMessage?.fromMe && <span style={{color:'var(--text3)'}}>You: </span>}
                {r.lastMessage?.text || <em style={{color:'var(--text3)'}}>No messages yet</em>}
              </div>
            </div>
            {unread > 0 && <span className="unread-pill">{unread}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Friends Tab ────────────────────────────────────────────────────────── */
function FriendsTab() {
  const { friends, friendRequests, setActiveChat, activeChat, socket,
          removeFriendRequest, clearUnread, unreadCounts } = useStore();
  const [search,  setSearch]  = useState('');
  const [addInput, setAddInput] = useState('');
  const [addStatus, setAddStatus] = useState(''); // 'sent' | 'error' | ''

  const filtered = friends.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  const accept  = (req) => { socket?.emit('accept_friend', { fromUserId: req.id }); removeFriendRequest(req.id); };
  const decline = (req) => { socket?.emit('decline_friend', { fromUserId: req.id }); removeFriendRequest(req.id); };

  const sendAddRequest = () => {
    const name = addInput.trim();
    if (!name) return;
    socket?.emit('friend_request', { toUsername: name });
    setAddInput('');
    setAddStatus('sent');
    setTimeout(() => setAddStatus(''), 3000);
  };

  return (
    <>
      {/* Pending requests */}
      {friendRequests.length > 0 && (
        <div style={{ borderBottom:'1px solid var(--border)', paddingBottom:4 }}>
          <div className="section-label">Pending — {friendRequests.length}</div>
          {friendRequests.map(req => (
            <div key={req.id} className="friend-req-card">
              <Avatar username={req.username} size="sm" />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13}}>{req.username}</div>
                {req.location && <div style={{fontSize:11,color:'var(--text3)'}}>{req.location}</div>}
              </div>
              <div className="friend-req-actions">
                <button className="btn btn-success btn-sm btn-icon" onClick={() => accept(req)}><Check size={13}/></button>
                <button className="btn btn-danger btn-sm btn-icon"  onClick={() => decline(req)}><X size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="search-wrap">
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input className="search-input" placeholder="Search friends..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Friends list */}
      <div className="user-list" style={{ flex:1 }}>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>{friends.length === 0 ? 'No friends yet' : 'No results'}</h3>
            <p>{friends.length === 0 ? 'Use the box below to add someone by username' : 'Try a different search'}</p>
          </div>
        )}
        {filtered.map(f => {
          const unread = unreadCounts[f.username] || 0;
          const active = activeChat?.username?.toLowerCase() === f.username.toLowerCase();
          return (
            <div key={f.id} className={`user-item ${active ? 'active' : ''}`}
              onClick={() => { setActiveChat({ username: f.username, userId: f.id }); clearUnread(f.username); }}>
              <Avatar username={f.username} size="md" showStatus status={f.online ? 'online' : 'offline'} />
              <div className="user-item-info">
                <div className="user-item-top">
                  <span className="user-item-name">{f.username}</span>
                  {(f.age || f.gender) && <span className="user-item-time">{[f.age, f.gender].filter(Boolean).join(', ')}</span>}
                </div>
                <div className="user-item-meta">{f.location || 'No location'}</div>
              </div>
              {unread > 0 && <span className="unread-pill">{unread}</span>}
            </div>
          );
        })}
      </div>

      
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '10px 10px calc(10px + var(--safe-bottom))',
        flexShrink: 0,
        background: 'var(--surface)',
      }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, color:'var(--text3)', marginBottom:6 }}>
          Add a friend
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <input
            className="search-input"
            placeholder="Username..."
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAddRequest()}
            style={{ flex:1, borderRadius:'var(--radius-sm)', padding:'8px 12px' }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={sendAddRequest}
            disabled={!addInput.trim()}
            style={{ flexShrink:0 }}
          >
            <UserPlus size={13} /> Add
          </button>
        </div>
        {addStatus === 'sent' && (
          <div style={{ fontSize:11, color:'var(--green)', marginTop:5, display:'flex', alignItems:'center', gap:4 }}>
            <Check size={11}/> Request sent!
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Members Tab ────────────────────────────────────────────────────────── */
function MembersTab() {
  const { onlineUsers, currentUser, friends, socket, setActiveChat, activeChat, friendRequests, clearUnread } = useStore();
  const [search,      setSearch]      = useState('');
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [FilterModal, setFilterModal] = useState(null);
  const [filters, setFilters] = useState({
    genderM: false, genderF: false, genderNB: false,
    ageMin: 13, ageMax: 80, location: '',
  });

  useEffect(() => {
    import('./SearchFilterModal').then(m => setFilterModal(() => m.default));
  }, []);

  const hasActiveFilters = filters.genderM || filters.genderF || filters.genderNB
    || filters.ageMin > 13 || filters.ageMax < 80 || filters.location !== '';

  const others   = onlineUsers.filter(u => u.username !== currentUser?.username && !u._hidden);
  const filtered = others.filter(u => {
    if (search && !u.username.toLowerCase().includes(search.toLowerCase())
      && !u.location?.toLowerCase().includes(search.toLowerCase())) return false;
    const anyGender = filters.genderM || filters.genderF || filters.genderNB;
    if (anyGender) {
      const ok = (filters.genderM && u.gender === 'M')
              || (filters.genderF && u.gender === 'F')
              || (filters.genderNB && u.gender === 'NB');
      if (!ok) return false;
    }
    if (u.age && (u.age < filters.ageMin || u.age > filters.ageMax)) return false;
    if (filters.location && !u.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
    return true;
  });

  const isFriend  = u => friends.some(f => f.id === u.id);
  const isPending = u => friendRequests.some(r => r.id === u.id);
  const addFriend = u => socket?.emit('friend_request', { toUsername: u.username });

  return (
    <>
      <div className="members-bar">
        <div className="search-input-wrap" style={{ flex:1 }}>
          <Search size={14} className="search-icon" />
          <input className="search-input" placeholder="Search members..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          className={`btn btn-sm ${hasActiveFilters ? 'btn-primary' : 'btn-ghost'}`}
          style={{ gap:5, flexShrink:0 }}
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal size={13} />
          {hasActiveFilters ? 'Filtered' : 'Filter'}
        </button>
      </div>

      {hasActiveFilters && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, padding:'0 10px 6px' }}>
          {(filters.genderM || filters.genderF || filters.genderNB) && (
            <span style={{ fontSize:11, background:'var(--accent-dim)', color:'var(--accent)', borderRadius:99, padding:'2px 8px', fontWeight:600 }}>
              {[filters.genderM&&'Male', filters.genderF&&'Female', filters.genderNB&&'NB'].filter(Boolean).join(', ')}
            </span>
          )}
          {(filters.ageMin > 13 || filters.ageMax < 80) && (
            <span style={{ fontSize:11, background:'var(--accent-dim)', color:'var(--accent)', borderRadius:99, padding:'2px 8px', fontWeight:600 }}>
              Age {filters.ageMin}–{filters.ageMax < 80 ? filters.ageMax : '80+'}
            </span>
          )}
          {filters.location && (
            <span style={{ fontSize:11, background:'var(--accent-dim)', color:'var(--accent)', borderRadius:99, padding:'2px 8px', fontWeight:600 }}>
              {filters.location}
            </span>
          )}
        </div>
      )}

      <div style={{ padding:'0 12px 6px', display:'flex', alignItems:'center' }}>
        <span className="online-badge"><span>●</span>{filtered.length} online</span>
      </div>

      {filterOpen && FilterModal && (
        <FilterModal initial={filters} onApply={setFilters} onClose={() => setFilterOpen(false)} />
      )}

      <div className="user-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🌐</div>
            <h3>No members found</h3>
            <p>Adjust filters or wait for others to join</p>
          </div>
        )}
        {filtered.map(u => {
          const active  = activeChat?.username?.toLowerCase() === u.username.toLowerCase();
          const friend  = isFriend(u);
          const pending = isPending(u);
          return (
            <div key={u.id} className={`user-item ${active ? 'active' : ''}`}
              onClick={() => { setActiveChat({ username: u.username, userId: u.id }); clearUnread(u.username); }}>
              <Avatar username={u.username} size="md" showStatus status="online" />
              <div className="user-item-info">
                <div className="user-item-top">
                  <span className="user-item-name">{u.username}</span>
                  {(u.age || u.gender) && <span className="user-item-time">{[u.age, u.gender].filter(Boolean).join(', ')}</span>}
                </div>
                {u.location ? <div className="user-item-meta">{u.location}</div>
                  : <div className="user-item-meta" style={{fontStyle:'italic'}}>No location</div>}
                {u.bio && <div className="user-item-preview">{u.bio}</div>}
              </div>
              <button
                className={`btn btn-sm ${friend ? 'btn-ghost' : 'btn-primary'} btn-icon`}
                style={{ padding:'5px 8px', flexShrink:0 }}
                onClick={e => { e.stopPropagation(); if (!friend && !pending) addFriend(u); }}
                disabled={friend || pending}
                title={friend ? 'Already friends' : pending ? 'Request sent' : 'Add friend'}
              >
                {friend ? <UserCheck size={13}/> : pending ? '...' : <UserPlus size={13}/>}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Main Sidebar ───────────────────────────────────────────────────────── */
export default function Sidebar({ onEditProfile, onShowGroups, groupsActive }) {
  const { currentUser, logout, myStatus, setMyStatus, socket, sidebarOpen, friendRequests, setSettingsOpen } = useStore();
  const { theme, toggle: toggleTheme } = useTheme();
  const [tab, setTab]           = useState('recent');
  const [statusOpen, setStatusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const statusRef = useRef(null);
  const menuRef = useRef(null);

  const handleStatusChange = (s) => {
    setMyStatus(s);
    socket?.emit('status_update', { status: s });
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  return (
    <div className={`sidebar ${!sidebarOpen ? 'hidden' : ''}`}>

      {/* ── Me row ── */}
      <div className="sidebar-header">
        <div style={{ position:'relative' }} ref={statusRef}>
          <div onClick={() => setStatusOpen(v => !v)} style={{ cursor:'pointer' }}>
            <Avatar username={currentUser?.username || '?'} size="md" showStatus status={myStatus} />
          </div>
          {statusOpen && (
            <StatusDropdown onSelect={handleStatusChange} onClose={() => setStatusOpen(false)} />
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="sidebar-me-name">{currentUser?.username}</div>
          <div className="sidebar-me-status" style={{ color: STATUS_COLORS[myStatus] }}>
            {STATUS_LABELS[myStatus]}
          </div>
        </div>
        {/* Single menu button — Chatango style */}
        <div style={{ position:'relative' }} ref={menuRef}>
          <button className="btn btn-ghost btn-icon" onClick={() => setMenuOpen(v => !v)} title="Menu"
            style={{ fontSize:18, padding:'4px 6px' }}>☰</button>
          {menuOpen && (
            <div style={{
              position:'absolute', right:0, top:'calc(100% + 6px)',
              background:'var(--surface)', border:'1px solid var(--border2)',
              borderRadius:10, padding:6, zIndex:999, minWidth:200, width:'max-content',
              boxShadow:'0 8px 30px rgba(0,0,0,.15)', animation:'fadeUp .15s ease',
            }}>
              <div className="dropdown-item" onClick={() => { onEditProfile(); setMenuOpen(false); }}>
                <Edit3 size={14}/> Edit profile
              </div>
              <div className="dropdown-item" onClick={() => { onShowGroups(); setMenuOpen(false); }}>
                <Globe size={14}/> Groups
              </div>
              <div className="dropdown-item" onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}>
                <Settings size={14}/> Settings
              </div>
              <div className="dropdown-item" onClick={() => { navigate('/help'); setMenuOpen(false); }}>
                <HelpCircle size={14}/> Help
              </div>
              <div className="dropdown-item" onClick={() => { toggleTheme(); setMenuOpen(false); }}>
                {theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
                {theme === 'dark' ? ' Light mode' : ' Dark mode'}
              </div>
              <div style={{ borderTop:'1px solid var(--border)', margin:'4px 0' }} />
              <div className="dropdown-item" onClick={logout} style={{ color:'var(--red)' }}>
                <LogOut size={14}/> Log out
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {[
          { key:'recent',  label:'Recent' },
          { key:'friends', label:'Friends', badge: friendRequests.length },
          { key:'members', label:'Members' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {tab === 'recent'  && <RecentTab />}
        {tab === 'friends' && <FriendsTab />}
        {tab === 'members' && <MembersTab />}
      </div>
    </div>
  );
}
