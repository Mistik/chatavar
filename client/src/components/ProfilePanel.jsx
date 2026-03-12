import { useState } from 'react';
import { X, MessageCircle, UserPlus, Check, MapPin, Calendar, User,
         UserMinus, Ban, ShieldOff, Flag } from 'lucide-react';
import { useStore } from '../store/useStore';
import Avatar from './Avatar';
import api from '../utils/api';

const GENDER_LABELS = { M:'Male', F:'Female', NB:'Non-binary', Other:'Other' };

export default function ProfilePanel() {
  const { profilePanelUser: user, setProfilePanelUser,
          onlineUsers, friends, socket, blockedUsers,
          setActiveChat, friendRequests, clearUnread,
          removeFriend, addBlocked, removeBlocked, addToast } = useStore();

  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const [confirmBlock,    setConfirmBlock]    = useState(false);
  const [reportOpen,      setReportOpen]      = useState(false);
  const [reportReason,    setReportReason]    = useState('');
  const [reported,        setReported]        = useState(false);

  if (!user) return null;

  const isOnline  = onlineUsers.some(u => u.id === user.id);
  const isFriend  = friends.some(f => f.id === user.id);
  const isPending = friendRequests.some(r => r.id === user.id);
  const isBlocked = blockedUsers.some(b => b.id === user.id);

  const handleUnfriend = () => {
    socket?.emit('remove_friend', { targetUserId: user.id });
    removeFriend(user.id);
    setConfirmUnfriend(false);
  };

  const handleBlock = () => {
    socket?.emit('block_user', { targetUsername: user.username });
    addBlocked({ id: user.id, username: user.username });
    setConfirmBlock(false);
    setProfilePanelUser(null);
  };

  const handleUnblock = () => {
    socket?.emit('unblock_user', { targetUsername: user.username });
    removeBlocked(user.id);
  };

  return (
    <div className="profile-panel">
      {/* Banner */}
      <div className="profile-banner" style={{ position:'relative' }}>
        <button onClick={() => setProfilePanelUser(null)} style={{
          position:'absolute', top:10, right:10,
          background:'rgba(0,0,0,.3)', border:'none', borderRadius:6,
          color:'#fff', cursor:'pointer', padding:'4px 6px',
          display:'flex', alignItems:'center',
        }}>
          <X size={15} />
        </button>
      </div>

      {/* Avatar */}
      <div className="profile-avatar-row">
        <Avatar username={user.username} size="xl" src={user.avatar}
                showStatus status={isOnline ? 'online' : 'offline'} />
      </div>

      <div className="profile-body">
        {/* Name + online status — clean, no grey circle */}
        <div>
          <div className="profile-name">{user.username}</div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:5, marginTop:3,
            fontSize:12, fontWeight:600,
            color: isOnline ? 'var(--green)' : 'var(--text3)',
          }}>
            <span style={{
              width:7, height:7, borderRadius:'50%', flexShrink:0,
              background: isOnline ? 'var(--green)' : 'var(--text3)',
            }} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {isBlocked && (
            <div style={{ fontSize:11, color:'var(--red)', fontWeight:600, marginTop:4 }}>
              🚫 You have blocked this user
            </div>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <>
            <div className="profile-divider" />
            <div>
              <div className="profile-section-title" style={{marginBottom:6}}>About me</div>
              <div className="profile-bio">"{user.bio}"</div>
            </div>
          </>
        )}

        {/* Meta */}
        {(user.age || user.gender || user.location) && (
          <>
            <div className="profile-divider" />
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {user.age && (
                <div className="profile-meta-row">
                  <Calendar size={13} style={{flexShrink:0,color:'var(--text3)'}} />
                  <span>{user.age} years old</span>
                </div>
              )}
              {user.gender && (
                <div className="profile-meta-row">
                  <User size={13} style={{flexShrink:0,color:'var(--text3)'}} />
                  <span>{GENDER_LABELS[user.gender] || user.gender}</span>
                </div>
              )}
              {user.location && (
                <div className="profile-meta-row">
                  <MapPin size={13} style={{flexShrink:0,color:'var(--text3)'}} />
                  <span>{user.location}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="profile-divider" />

        {/* Primary action */}
        {!isBlocked && (
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', gap:7 }}
            onClick={() => { setActiveChat({ username: user.username, userId: user.id }); clearUnread(user.username); setProfilePanelUser(null); }}>
            <MessageCircle size={14} /> Send Message
          </button>
        )}

        {/* Friend actions */}
        {!isBlocked && !isFriend && (
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', gap:7 }}
            onClick={() => socket?.emit('friend_request', { toUsername: user.username })}
            disabled={isPending}>
            {isPending ? <><Check size={14}/> Request Sent</> : <><UserPlus size={14}/> Add Friend</>}
          </button>
        )}

        {!isBlocked && isFriend && !confirmUnfriend && (
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', gap:7, color:'var(--text2)' }}
            onClick={() => setConfirmUnfriend(true)}>
            <UserMinus size={14} /> Unfriend
          </button>
        )}

        {confirmUnfriend && (
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:12, color:'var(--text2)', textAlign:'center' }}>
              Remove <strong>{user.username}</strong> as a friend?
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}
                onClick={() => setConfirmUnfriend(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" style={{ flex:1, justifyContent:'center' }}
                onClick={handleUnfriend}>Unfriend</button>
            </div>
          </div>
        )}

        {/* Block / Unblock */}
        <div className="profile-divider" />

        {!isBlocked && !confirmBlock && (
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', gap:7, color:'var(--red)' }}
            onClick={() => setConfirmBlock(true)}>
            <Ban size={14} /> Block {user.username}
          </button>
        )}

        {confirmBlock && (
          <div style={{ background:'var(--red-dim)', border:'1px solid rgba(218,55,60,.2)', borderRadius:'var(--radius)', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:12, color:'var(--text)', textAlign:'center' }}>
              Block <strong>{user.username}</strong>? They won't be able to message you and will be removed as a friend.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}
                onClick={() => setConfirmBlock(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" style={{ flex:1, justifyContent:'center' }}
                onClick={handleBlock}><Ban size={12}/> Block</button>
            </div>
          </div>
        )}

        {isBlocked && (
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', gap:7 }}
            onClick={handleUnblock}>
            <ShieldOff size={14} /> Unblock {user.username}
          </button>
        )}

        {/* Report */}
        {!reported && !reportOpen && (
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', gap:7, color:'var(--text3)', fontSize:12 }}
            onClick={() => setReportOpen(true)}>
            <Flag size={13} /> Report {user.username}
          </button>
        )}
        {reportOpen && (
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Report {user.username}</div>
            <select className="form-input" value={reportReason} onChange={e => setReportReason(e.target.value)}
              style={{ fontSize:12, padding:'6px 10px', cursor:'pointer' }}>
              <option value="">Select a reason…</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="spam">Spam</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="impersonation">Impersonation</option>
              <option value="hate_speech">Hate speech</option>
              <option value="other">Other</option>
            </select>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}
                onClick={() => { setReportOpen(false); setReportReason(''); }}>Cancel</button>
              <button className="btn btn-danger btn-sm" style={{ flex:1, justifyContent:'center' }}
                disabled={!reportReason}
                onClick={async () => {
                  try {
                    await api.post(`/users/${user.username}/report`, { reason: reportReason });
                    addToast({ icon:'🚩', title:'Report submitted', message:'Thank you for reporting.' });
                    setReported(true); setReportOpen(false);
                  } catch (e) { addToast({ icon:'⚠️', title:'Error', message: e.response?.data?.error || 'Failed' }); }
                }}>
                <Flag size={11}/> Submit Report
              </button>
            </div>
          </div>
        )}
        {reported && (
          <div style={{ textAlign:'center', fontSize:12, color:'var(--text3)', padding:'8px 0' }}>
            <Flag size={12} style={{ verticalAlign:'middle', marginRight:4 }}/> Report submitted
          </div>
        )}
      </div>
    </div>
  );
}
