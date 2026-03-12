import { useState, useEffect } from 'react';
import { X, Shield, MessageSquare, Users, List, Megaphone, ScrollText, Ban, UserPlus, Trash2, Clock, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import api from '../utils/api';

const TABS = [
  { key:'settings', label:'Restrictions', icon: Shield },
  { key:'words', label:'Banned Words', icon: Ban },
  { key:'mods', label:'Moderators', icon: Users },
  { key:'announce', label:'Announcements', icon: Megaphone },
  { key:'bans', label:'Ban List', icon: List },
  { key:'log', label:'Mod Log', icon: ScrollText },
];

function Toggle({ label, checked, onChange, desc }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <div>
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

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ groupName, isOwner }) {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { addToast } = useStore();

  useEffect(() => {
    api.get(`/groups/${groupName}/settings`).then(({ data }) => setS(data.settings)).catch(() => {});
  }, [groupName]);

  if (!s) return <div style={{ padding:20, color:'var(--text3)', fontSize:13 }}>Loading…</div>;

  const upd = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/groups/${groupName}/settings`, s);
      setS(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      addToast({ icon:'✅', title:'Settings saved' });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
    setSaving(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <Toggle label="Allow anonymous messages" desc="Let non-logged-in users post" checked={!!s.allow_anons} onChange={v => upd('allow_anons', v?1:0)} />
      <Toggle label="Broadcast mode" desc="Only owner and moderators can post" checked={!!s.broadcast_mode} onChange={v => upd('broadcast_mode', v?1:0)} />
      <Toggle label="Closed without moderators" desc="No one can post when no mods are present" checked={!!s.closed_without_mods} onChange={v => upd('closed_without_mods', v?1:0)} />
      <Toggle label="Slow mode" desc={`Users must wait ${s.slow_mode_seconds}s between messages`} checked={!!s.slow_mode} onChange={v => upd('slow_mode', v?1:0)} />
      {!!s.slow_mode && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0 8px', borderBottom:'1px solid var(--border)' }}>
          <label style={{ fontSize:12, color:'var(--text2)', whiteSpace:'nowrap' }}>Interval (seconds):</label>
          <input type="number" className="form-input" value={s.slow_mode_seconds} min={5} max={300}
            onChange={e => upd('slow_mode_seconds', parseInt(e.target.value)||30)}
            style={{ width:80, padding:'4px 8px', fontSize:13 }} />
          <Toggle label="Exempt mods" checked={!!s.slow_mode_exempt_mods} onChange={v => upd('slow_mode_exempt_mods', v?1:0)} />
        </div>
      )}
      <Toggle label="Ban links" desc="Block messages containing URLs" checked={!!s.ban_links} onChange={v => upd('ban_links', v?1:0)} />
      <Toggle label="Ban images" desc="Block image uploads" checked={!!s.ban_images} onChange={v => upd('ban_images', v?1:0)} />
      <Toggle label="Easy ban mode" desc="One-click ban + delete all messages" checked={!!s.easy_ban} onChange={v => upd('easy_ban', v?1:0)} />
      <Toggle label="Show participant counter" checked={!!s.show_counter} onChange={v => upd('show_counter', v?1:0)} />
      <Toggle label="Allow private messaging" checked={!!s.allow_pm} onChange={v => upd('allow_pm', v?1:0)} />

      <div style={{ marginTop:8 }}>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block' }}>Censored message handling</label>
        <select className="form-input" value={s.censor_mode} onChange={e => upd('censor_mode', e.target.value)}
          style={{ fontSize:13, padding:'6px 10px', cursor:'pointer' }}>
          <option value="censor">Replace with ****</option>
          <option value="block">Block message entirely</option>
          <option value="only_author">Only show to author (shadow block)</option>
        </select>
      </div>

      {isOwner && (
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop:12 }}>
          <Save size={13}/> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      )}
    </div>
  );
}

// ── Banned Words Tab ──────────────────────────────────────────────────────────
function BannedWordsTab({ groupName }) {
  const [parts, setParts] = useState('');
  const [exact, setExact] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useStore();

  useEffect(() => {
    api.get(`/groups/${groupName}/banned-words`).then(({ data }) => {
      setParts((data.parts || []).join('\n'));
      setExact((data.exact || []).join('\n'));
    }).catch(() => {});
  }, [groupName]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/groups/${groupName}/banned-words`, {
        parts: parts.split('\n').map(s => s.trim()).filter(Boolean),
        exact: exact.split('\n').map(s => s.trim()).filter(Boolean),
      });
      addToast({ icon:'✅', title:'Banned words saved' });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
    setSaving(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
        Words in <b>word parts</b> are censored even inside longer words. <b>Exact words</b> only match
        whole words. Banned words are resilient to common misspellings and letter substitutions.
      </div>
      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block' }}>Word parts (one per line)</label>
        <textarea className="form-input" value={parts} onChange={e => setParts(e.target.value)}
          rows={6} placeholder="badword&#10;spam&#10;offensive" style={{ fontFamily:'monospace', fontSize:12, resize:'vertical' }} />
      </div>
      <div>
        <label style={{ fontSize:12, fontWeight:600, marginBottom:4, display:'block' }}>Exact words (one per line)</label>
        <textarea className="form-input" value={exact} onChange={e => setExact(e.target.value)}
          rows={4} placeholder="exactmatch&#10;specific" style={{ fontFamily:'monospace', fontSize:12, resize:'vertical' }} />
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        <Save size={13}/> {saving ? 'Saving…' : 'Save Banned Words'}
      </button>
    </div>
  );
}

// ── Moderators Tab ────────────────────────────────────────────────────────────
function ModsTab({ groupName, isOwner }) {
  const [mods, setMods] = useState([]);
  const [addInput, setAddInput] = useState('');
  const [addRole, setAddRole] = useState('mod');
  const { addToast } = useStore();

  const load = () => api.get(`/groups/${groupName}/moderators`).then(({ data }) => setMods(data.moderators || [])).catch(() => {});
  useEffect(() => { load(); }, [groupName]);

  const add = async () => {
    if (!addInput.trim()) return;
    try {
      const { data } = await api.post(`/groups/${groupName}/moderators`, { username: addInput.trim(), role: addRole });
      setMods(data.moderators || []);
      setAddInput('');
      addToast({ icon:'✅', title:`${addInput.trim()} is now a moderator` });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
  };

  const remove = async (username) => {
    try {
      await api.delete(`/groups/${groupName}/moderators/${username}`);
      setMods(prev => prev.filter(m => m.username !== username));
      addToast({ icon:'✅', title:`Removed ${username} as moderator` });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {mods.length === 0 && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text3)', fontSize:13 }}>No moderators yet</div>
      )}
      {mods.map(m => (
        <div key={m.user_id} style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
          background:'var(--surface2)', borderRadius:8,
        }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>
            {(m.username||'?')[0].toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13 }}>{m.username}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{m.role === 'admin' ? 'Admin' : 'Moderator'}</div>
          </div>
          {isOwner && (
            <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }} onClick={() => remove(m.username)}>
              <Trash2 size={12}/> Remove
            </button>
          )}
        </div>
      ))}
      {isOwner && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, color:'var(--text3)', marginBottom:6 }}>Add moderator</div>
          <div style={{ display:'flex', gap:6 }}>
            <input className="form-input" value={addInput} onChange={e => setAddInput(e.target.value)}
              placeholder="Username…" style={{ flex:1, padding:'6px 10px', fontSize:13 }}
              onKeyDown={e => e.key === 'Enter' && add()} />
            <select className="form-input" value={addRole} onChange={e => setAddRole(e.target.value)}
              style={{ width:90, padding:'6px 8px', fontSize:12, cursor:'pointer' }}>
              <option value="mod">Mod</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={add} disabled={!addInput.trim()}>
              <UserPlus size={12}/> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
function AnnouncementsTab({ groupName }) {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [interval, setInterval_] = useState(15);
  const { addToast } = useStore();

  const load = () => api.get(`/groups/${groupName}/announcements`).then(({ data }) => setItems(data.announcements || [])).catch(() => {});
  useEffect(() => { load(); }, [groupName]);

  const add = async () => {
    if (!msg.trim()) return;
    try {
      const { data } = await api.post(`/groups/${groupName}/announcements`, { message: msg.trim(), intervalMinutes: interval });
      setItems(data.announcements || []);
      setMsg('');
      addToast({ icon:'✅', title:'Announcement added' });
    } catch (e) { addToast({ icon:'❌', title:'Error', message: e.response?.data?.error || 'Failed' }); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/groups/${groupName}/announcements/${id}`);
      setItems(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
        Auto-post messages at a set interval. Messages appear as system messages in the chat.
      </div>
      {items.length === 0 && (
        <div style={{ textAlign:'center', padding:'16px 0', color:'var(--text3)', fontSize:13 }}>No announcements</div>
      )}
      {items.map(a => (
        <div key={a.id} style={{
          display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
          background:'var(--surface2)', borderRadius:8,
        }}>
          <Megaphone size={14} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, wordBreak:'break-word' }}>{a.message}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              <Clock size={10} style={{ verticalAlign:'middle', marginRight:3 }} />
              Every {Math.round(a.interval_ms / 60000)} min
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ color:'var(--red)' }} onClick={() => remove(a.id)}>
            <Trash2 size={12}/>
          </button>
        </div>
      ))}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.6, color:'var(--text3)', marginBottom:6 }}>New announcement</div>
        <textarea className="form-input" value={msg} onChange={e => setMsg(e.target.value)} rows={2}
          placeholder="Message text…" style={{ fontSize:13, resize:'vertical', marginBottom:6 }} />
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <label style={{ fontSize:12, color:'var(--text2)', whiteSpace:'nowrap' }}>Every</label>
          <input type="number" className="form-input" value={interval} min={1} max={1440}
            onChange={e => setInterval_(parseInt(e.target.value)||15)}
            style={{ width:60, padding:'4px 8px', fontSize:13 }} />
          <label style={{ fontSize:12, color:'var(--text2)' }}>minutes</label>
          <button className="btn btn-primary btn-sm" onClick={add} disabled={!msg.trim()} style={{ marginLeft:'auto' }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ban List Tab ──────────────────────────────────────────────────────────────
function BansTab({ groupName }) {
  const [bans, setBans] = useState([]);
  const { addToast } = useStore();

  const load = () => api.get(`/groups/${groupName}/bans`).then(({ data }) => setBans(data.bans || [])).catch(() => {});
  useEffect(() => { load(); }, [groupName]);

  const unban = async (banId) => {
    try {
      await api.post(`/groups/${groupName}/unban/${banId}`);
      setBans(prev => prev.filter(b => b.id !== banId));
      addToast({ icon:'✅', title:'User unbanned' });
    } catch {}
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {bans.length === 0 && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text3)', fontSize:13 }}>No banned users</div>
      )}
      {bans.map(b => (
        <div key={b.id} style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
          background:'var(--surface2)', borderRadius:8,
        }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13 }}>{b.banned_username || b.guest_name || b.ip_address || 'Unknown'}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>
              Banned by {b.banned_by_name || '?'} · {new Date(b.banned_at).toLocaleDateString()}
              {b.reason && <> · {b.reason}</>}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color:'var(--accent)' }} onClick={() => unban(b.id)}>
            Unban
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Mod Log Tab ───────────────────────────────────────────────────────────────
function LogTab({ groupName }) {
  const [log, setLog] = useState([]);
  useEffect(() => {
    api.get(`/groups/${groupName}/mod-log?limit=100`).then(({ data }) => setLog(data.log || [])).catch(() => {});
  }, [groupName]);

  const actionLabels = {
    ban:'Banned', easy_ban:'Easy banned', unban:'Unbanned', mute:'Muted',
    delete_msg:'Deleted message', delete_all_msgs:'Deleted all messages',
    add_mod:'Added moderator', remove_mod:'Removed moderator',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {log.length === 0 && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text3)', fontSize:13 }}>No moderation activity</div>
      )}
      {log.map(entry => (
        <div key={entry.id} style={{ padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12, lineHeight:1.5 }}>
          <span style={{ fontWeight:600 }}>{entry.actor_name || '?'}</span>
          <span style={{ color:'var(--text2)' }}> {actionLabels[entry.action] || entry.action} </span>
          {entry.target_name && <span style={{ fontWeight:600 }}>{entry.target_name}</span>}
          {entry.detail && <span style={{ color:'var(--text3)' }}> — {entry.detail}</span>}
          <div style={{ fontSize:10, color:'var(--text3)' }}>{new Date(entry.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function GroupModPanel({ groupName, isOwner, onClose }) {
  const [tab, setTab] = useState('settings');

  return (
    <div style={{
      width:320, flexShrink:0, borderLeft:'1px solid var(--border)',
      background:'var(--surface)', display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
          <Shield size={15} style={{ color:'var(--accent)' }}/> Moderation
        </span>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={15}/></button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:2, padding:'8px 10px', borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'4px 8px', fontSize:11, fontWeight:600, borderRadius:6, border:'none', cursor:'pointer',
            background: tab === t.key ? 'var(--accent)' : 'transparent',
            color: tab === t.key ? '#fff' : 'var(--text2)',
            display:'flex', alignItems:'center', gap:4, fontFamily:'inherit',
          }}>
            <t.icon size={11}/> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:14 }}>
        {tab === 'settings' && <SettingsTab groupName={groupName} isOwner={isOwner} />}
        {tab === 'words' && <BannedWordsTab groupName={groupName} />}
        {tab === 'mods' && <ModsTab groupName={groupName} isOwner={isOwner} />}
        {tab === 'announce' && <AnnouncementsTab groupName={groupName} />}
        {tab === 'bans' && <BansTab groupName={groupName} />}
        {tab === 'log' && <LogTab groupName={groupName} />}
      </div>
    </div>
  );
}
