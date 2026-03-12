import { useState, useEffect } from 'react';
import { X, ShieldOff, Shield, Key, Trash2, AlertTriangle, Palette, Volume2, Eye, Bell, Code } from 'lucide-react';
import { useStore } from '../store/useStore';
import Avatar from './Avatar';
import api from '../utils/api';

const SOUND_OPTIONS = [
  { value:'ping', label:'Ping (default)' },
  { value:'pop', label:'Pop' },
  { value:'chime', label:'Chime' },
  { value:'none', label:'None' },
];

const COLOR_PRESETS = [
  '', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#ff5722',
];

function Toggle({ label, checked, onChange, desc }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
        {desc && <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!checked)} style={{
        width:40, height:22, borderRadius:11, background: checked ? 'var(--accent)' : 'var(--surface2)',
        cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0, marginLeft:12,
      }}>
        <div style={{
          width:18, height:18, borderRadius:9, background:'#fff', position:'absolute', top:2,
          left: checked ? 20 : 2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)',
        }}/>
      </div>
    </div>
  );
}

// ── Privacy Tab ───────────────────────────────────────────────────────────────
function PrivacyTab() {
  const { userSettings, updateUserSettings, addToast } = useStore();
  const [s, setS] = useState(userSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setS(userSettings); }, [userSettings]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/me/settings', s);
      updateUserSettings(data.settings);
      addToast({ icon:'✅', title:'Privacy settings saved' });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
    setSaving(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <Toggle label="Show my profile in Members" desc="When off, your profile is hidden from the Members/Meet People tab"
        checked={!!s.show_in_members} onChange={v => setS(p => ({...p, show_in_members: v?1:0}))} />
      <Toggle label="Allow anonymous messages" desc="Let non-logged-in users message you via embedded mini box"
        checked={!!s.allow_anon_pm} onChange={v => setS(p => ({...p, allow_anon_pm: v?1:0}))} />
      <div style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Who can message me</div>
        <select className="form-input" value={s.pm_from} onChange={e => setS(p => ({...p, pm_from: e.target.value}))}
          style={{ fontSize:13, padding:'6px 10px', cursor:'pointer' }}>
          <option value="everyone">Everyone</option>
          <option value="friends">Friends only</option>
          <option value="nobody">Nobody</option>
        </select>
      </div>
      <Toggle label="Save conversations locally" desc="Store chat history in your browser. Others may still save on their end."
        checked={!!s.save_conversations} onChange={v => setS(p => ({...p, save_conversations: v?1:0}))} />
      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop:12 }}>
        {saving ? 'Saving…' : 'Save Privacy Settings'}
      </button>
    </div>
  );
}

// ── Appearance Tab ────────────────────────────────────────────────────────────
function AppearanceTab() {
  const { userSettings, updateUserSettings, addToast } = useStore();
  const [s, setS] = useState(userSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setS(userSettings); }, [userSettings]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/me/settings', s);
      updateUserSettings(data.settings);
      addToast({ icon:'✅', title:'Appearance saved' });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
    setSaving(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Your message colour</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>Other users will see your messages in this colour. Leave empty for default.</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {COLOR_PRESETS.map(c => (
            <div key={c||'none'} onClick={() => setS(p => ({...p, msg_color: c}))} style={{
              width:28, height:28, borderRadius:6, cursor:'pointer',
              background: c || 'var(--text)', border: s.msg_color === c ? '2px solid var(--accent)' : '2px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff',
            }}>
              {!c && 'Aa'}
            </div>
          ))}
        </div>
        {s.msg_color && (
          <div style={{ marginTop:8, padding:'8px 12px', borderRadius:6, background:'var(--surface2)' }}>
            <span style={{ color: s.msg_color, fontWeight:600, fontSize:13 }}>Preview: This is how your messages look</span>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Message background colour</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['', '#fef3c7', '#fee2e2', '#dbeafe', '#d1fae5', '#ede9fe', '#fce7f3', '#f0fdf4'].map(c => (
            <div key={c||'none'} onClick={() => setS(p => ({...p, msg_bg_color: c}))} style={{
              width:28, height:28, borderRadius:6, cursor:'pointer',
              background: c || 'transparent', border: s.msg_bg_color === c ? '2px solid var(--accent)' : '2px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--text3)',
            }}>
              {!c && '—'}
            </div>
          ))}
        </div>
      </div>

      <Toggle label="Show other users' colours" desc="Turn off to see all messages in plain default style"
        checked={!!s.show_colors} onChange={v => setS(p => ({...p, show_colors: v?1:0}))} />

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop:4 }}>
        {saving ? 'Saving…' : 'Save Appearance'}
      </button>
    </div>
  );
}

// ── Sounds Tab ────────────────────────────────────────────────────────────────
function SoundsTab() {
  const { userSettings, updateUserSettings, addToast } = useStore();
  const [s, setS] = useState(userSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setS(userSettings); }, [userSettings]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/me/settings', s);
      updateUserSettings(data.settings);
      addToast({ icon:'✅', title:'Sound settings saved' });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
    setSaving(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Message notification sound</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {SOUND_OPTIONS.map(opt => (
            <label key={opt.value} style={{
              display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
              background: s.msg_sound === opt.value ? 'var(--accent-dim, rgba(88,101,242,.1))' : 'var(--surface2)',
              borderRadius:8, cursor:'pointer', border: s.msg_sound === opt.value ? '1px solid var(--accent)' : '1px solid transparent',
            }}>
              <input type="radio" name="sound" checked={s.msg_sound === opt.value}
                onChange={() => setS(p => ({...p, msg_sound: opt.value}))}
                style={{ accentColor:'var(--accent)' }} />
              <span style={{ fontSize:13, fontWeight: s.msg_sound === opt.value ? 600 : 400 }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Volume</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Volume2 size={14} style={{ color:'var(--text3)', flexShrink:0 }} />
          <input type="range" min={0} max={100} value={s.msg_volume}
            onChange={e => setS(p => ({...p, msg_volume: parseInt(e.target.value)}))}
            style={{ flex:1, accentColor:'var(--accent)' }} />
          <span style={{ fontSize:12, color:'var(--text2)', minWidth:32, textAlign:'right' }}>{s.msg_volume}%</span>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop:4 }}>
        {saving ? 'Saving…' : 'Save Sound Settings'}
      </button>
    </div>
  );
}

// ── Blocked Users Tab ─────────────────────────────────────────────────────────
function BlockedTab() {
  const { blockedUsers, socket, removeBlocked } = useStore();
  const handleUnblock = (user) => {
    socket?.emit('unblock_user', { targetUsername: user.username });
    removeBlocked(user.id);
  };
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.7, color:'var(--text3)', marginBottom:12 }}>
        Blocked Users ({blockedUsers.length})
      </div>
      {blockedUsers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text3)', fontSize:13 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🛡️</div>No blocked users
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {blockedUsers.map(u => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surface2)', borderRadius:8, padding:'10px 12px' }}>
              <Avatar username={u.username} size="sm" />
              <span style={{ flex:1, fontWeight:600, fontSize:13 }}>{u.username}</span>
              <button className="btn btn-ghost btn-sm" style={{ gap:5, color:'var(--accent)' }} onClick={() => handleUnblock(u)}>
                <ShieldOff size={12}/> Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Password Tab ──────────────────────────────────────────────────────────────
function PasswordTab() {
  const { addToast } = useStore();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (newPass !== confirm) return setError('New passwords do not match');
    if (newPass.length < 4) return setError('Password must be at least 4 characters');
    setLoading(true);
    try {
      await api.put('/password', { currentPassword: current, newPassword: newPass });
      addToast({ icon:'✅', title:'Password changed' });
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {error && <div style={{ fontSize:12, color:'var(--red)', background:'rgba(220,38,38,.08)', padding:'8px 12px', borderRadius:6 }}>{error}</div>}
      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block', color:'var(--text2)' }}>Current password</label>
        <input type="password" className="form-input" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
      </div>
      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block', color:'var(--text2)' }}>New password</label>
        <input type="password" className="form-input" value={newPass} onChange={e => setNewPass(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block', color:'var(--text2)' }}>Confirm new password</label>
        <input type="password" className="form-input" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading || !current || !newPass || !confirm}>
        <Key size={13}/> {loading ? 'Changing…' : 'Change Password'}
      </button>
    </form>
  );
}

// ── Account Tab ───────────────────────────────────────────────────────────────
function AccountTab() {
  const { addToast, logout, currentUser } = useStore();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const username = currentUser?.username || '';

  const handleDelete = async () => {
    setError('');
    if (confirmText !== username) return setError('Username does not match');
    setLoading(true);
    try {
      await api.delete('/account', { data: { password } });
      addToast({ icon:'👋', title:'Account deleted' });
      logout();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    setLoading(false);
  };

  if (step === 0) return (
    <div style={{ border:'1px solid var(--red)', borderRadius:8, padding:16, background:'rgba(220,38,38,.04)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <AlertTriangle size={16} style={{ color:'var(--red)' }} />
        <span style={{ fontWeight:700, fontSize:14, color:'var(--red)' }}>Delete Account</span>
      </div>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:12 }}>
        Permanently deletes your account, groups, messages, friends, and profile. Cannot be undone.
      </p>
      <button onClick={() => setStep(1)} style={{
        background:'var(--red)', color:'#fff', border:'none', fontSize:13, fontWeight:700,
        padding:'8px 16px', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'inherit',
      }}><Trash2 size={13}/> I want to delete my account</button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {error && <div style={{ fontSize:12, color:'var(--red)', background:'rgba(220,38,38,.08)', padding:'8px 12px', borderRadius:6 }}>{error}</div>}
      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block' }}>Enter your password</label>
        <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block' }}>Type <strong>{username}</strong> to confirm</label>
        <input className="form-input" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={username} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-ghost" onClick={() => setStep(0)}>Cancel</button>
        <button onClick={handleDelete} disabled={loading || !password || confirmText !== username} style={{
          background:'var(--red)', color:'#fff', border:'none', fontSize:13, fontWeight:700,
          padding:'8px 16px', borderRadius:6, cursor:'pointer', fontFamily:'inherit',
          opacity: loading || !password || confirmText !== username ? 0.5 : 1,
        }}><Trash2 size={13}/> {loading ? 'Deleting…' : 'Delete Forever'}</button>
      </div>
    </div>
  );
}

// ── PM Embed Tab ──────────────────────────────────────────────────────────────
function PMEmbedTab() {
  const { currentUser } = useStore();
  const [color, setColor] = useState('0088ff');
  const [copied, setCopied] = useState(false);
  const username = currentUser?.username || 'yourname';
  const origin = window.location.origin;

  const code = `<script>
window.chatavar_pm = {
  user: "${username}",
  color: "${color}",
  corner: "bottom-right"
};
</script>
<script src="${origin}/pm-embed.js"></script>`;

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
        Embed a private chat widget on your personal website or blog. Visitors can click it to message you directly. A green dot shows when you're online.
      </div>

      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:6, display:'block' }}>Accent colour</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['0088ff','CC0000','22c55e','9b59b6','e67e22','e91e63','1abc9c','333333'].map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width:28, height:28, borderRadius:6, cursor:'pointer', background:'#'+c,
              border: color === c ? '2px solid var(--text)' : '2px solid transparent',
            }}/>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:6, display:'block' }}>Preview</label>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          background:'#'+color, color:'#fff', padding:'8px 18px',
          borderRadius:'8px 8px 0 0', fontSize:13, fontWeight:700,
        }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }}/>
          Message {username}
        </div>
      </div>

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <label style={{ fontSize:12, fontWeight:600 }}>Embed code</label>
          <button className="btn btn-ghost btn-sm" onClick={copy} style={{ fontSize:11, gap:4 }}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre style={{
          background:'var(--surface2)', padding:12, borderRadius:8, fontSize:11,
          fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all',
          lineHeight:1.5, color:'var(--text)', overflow:'auto', maxHeight:160,
        }}>{code}</pre>
      </div>

      <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>
        Paste this code just before <code style={{ background:'var(--surface2)', padding:'1px 4px', borderRadius:3 }}>&lt;/body&gt;</code> on
        any webpage. The widget appears as a tab in the bottom-right corner. Visitors log in via a popup to send you messages.
      </div>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { key:'blocked', label:'Blocked', icon: ShieldOff },
  { key:'privacy', label:'Privacy', icon: Eye },
  { key:'appearance', label:'Colors', icon: Palette },
  { key:'sounds', label:'Sounds', icon: Bell },
  { key:'embed', label:'PM Embed', icon: Code },
  { key:'password', label:'Password', icon: Key },
  { key:'account', label:'Account', icon: AlertTriangle },
];

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function SettingsPanel({ onClose }) {
  const [tab, setTab] = useState('blocked');

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:500 }}>
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={17} style={{ color:'var(--accent)' }} />
            <span className="modal-title">Settings</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        <div style={{ display:'flex', gap:2, marginBottom:16, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'5px 10px', fontSize:11, fontWeight:600, borderRadius:6, border:'none', cursor:'pointer',
              background: tab === t.key ? 'var(--accent)' : 'var(--surface2)',
              color: tab === t.key ? '#fff' : 'var(--text2)',
              display:'flex', alignItems:'center', gap:4, fontFamily:'inherit',
            }}>
              <t.icon size={11}/> {t.label}
            </button>
          ))}
        </div>

        {tab === 'blocked' && <BlockedTab />}
        {tab === 'privacy' && <PrivacyTab />}
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'sounds' && <SoundsTab />}
        {tab === 'embed' && <PMEmbedTab />}
        {tab === 'password' && <PasswordTab />}
        {tab === 'account' && <AccountTab />}
      </div>
    </div>
  );
}
