import { X, ShieldOff, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import Avatar from './Avatar';

export default function SettingsPanel({ onClose }) {
  const { blockedUsers, socket, removeBlocked } = useStore();

  const handleUnblock = (user) => {
    socket?.emit('unblock_user', { targetUsername: user.username });
    removeBlocked(user.id);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:460 }}>

        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={17} style={{ color:'var(--accent)' }} />
            <span className="modal-title">Settings</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        {/* Blocked users section */}
        <div>
          <div style={{
            fontSize:11, fontWeight:700, textTransform:'uppercase',
            letterSpacing:.7, color:'var(--text3)', marginBottom:12,
          }}>
            Blocked Users ({blockedUsers.length})
          </div>

          {blockedUsers.length === 0 ? (
            <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text3)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🛡️</div>
              No blocked users
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {blockedUsers.map(u => (
                <div key={u.id} style={{
                  display:'flex', alignItems:'center', gap:10,
                  background:'var(--surface2)', borderRadius:'var(--radius)',
                  padding:'10px 12px',
                }}>
                  <Avatar username={u.username} size="sm" />
                  <span style={{ flex:1, fontWeight:600, fontSize:13 }}>{u.username}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ gap:5, color:'var(--accent)' }}
                    onClick={() => handleUnblock(u)}
                  >
                    <ShieldOff size={12}/> Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
