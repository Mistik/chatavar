import { navigate } from '../utils/navigate';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../utils/api';

export default function AuthModal({ onClose, onSuccess, title = 'Group owner' }) {
  const [mode,     setMode]     = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const setAuth = useStore(s => s.setAuth);

  const submit = async (m) => {
    if (!username.trim() || !password.trim()) { setError('Username and password required'); return; }
    setLoading(true); setError('');
    try {
      const ep = m === 'login' ? '/login' : '/register';
      const { data } = await api.post(ep, { username: username.trim(), password });
      setAuth(data.user, data.token);
      // Navigate to user's dashboard
      navigate('/' + data.user.username, true);
      onSuccess?.();
    } catch(e) {
      setError(e.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.25)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }} onClick={e => e.target === e.currentTarget && onClose()}>

      
      <div style={{
        position:'absolute', inset:0, overflow:'hidden', opacity:.12,
        fontSize:14, color:'#2196F3', lineHeight:2.2, padding:8,
        userSelect:'none', pointerEvents:'none', letterSpacing:2,
      }}>
        {Array(200).fill('YOUR WEBSITE ').join('')}
      </div>

      <div style={{
        background:'#fff', borderRadius:6, padding:'28px 32px',
        width:440, position:'relative', zIndex:1,
        boxShadow:'0 8px 40px rgba(0,0,0,.2)',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position:'absolute', right:14, top:12,
          background:'none', border:'none', cursor:'pointer',
          fontSize:18, color:'#999', lineHeight:1,
        }}>✕</button>

        <h2 style={{ fontSize:22, fontWeight:400, color:'#222', marginBottom:20 }}>{title}</h2>

        {error && (
          <div style={{ background:'#ffebee', color:'#c62828', padding:'8px 12px', borderRadius:4, fontSize:13, marginBottom:12 }}>
            {error}
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom:10 }}>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            onKeyDown={e => e.key === 'Enter' && submit(mode)}
            style={{
              width:'100%', padding:'12px 14px',
              border:'1px solid #ddd', borderRadius:4,
              fontSize:15, fontFamily:'inherit', outline:'none',
              boxSizing:'border-box',
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom:20 }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={e => e.key === 'Enter' && submit(mode)}
            style={{
              width:'100%', padding:'12px 14px',
              border:'1px solid #ddd', borderRadius:4,
              fontSize:15, fontFamily:'inherit', outline:'none',
              boxSizing:'border-box',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={() => submit('register')} disabled={loading} style={{
            padding:'10px 22px', background:'#e0e0e0', color:'#333',
            border:'none', borderRadius:4, fontSize:14, fontWeight:500,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            Sign up
          </button>
          <button onClick={() => submit('login')} disabled={loading} style={{
            padding:'10px 22px', background:'#e0e0e0', color:'#333',
            border:'none', borderRadius:4, fontSize:14, fontWeight:500,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            {loading ? '…' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
