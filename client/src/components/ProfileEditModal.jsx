import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import api from '../utils/api';

export default function ProfileEditModal({ onClose }) {
  const { currentUser, updateCurrentUser, addToast } = useStore();
  const [form, setForm] = useState({
    age: currentUser?.age || '', gender: currentUser?.gender || '',
    location: currentUser?.location || '', bio: currentUser?.bio || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await api.put('/profile', { ...form, age: form.age ? parseInt(form.age) : null });
      updateCurrentUser(data.user);
      addToast({ icon:'✅', title:'Profile updated', message:'Your changes have been saved.' });
      onClose();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Edit Profile</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {error && <div className="auth-error">{error}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="auth-field">
              <label className="auth-label">Age</label>
              <input className="auth-input" type="number" placeholder="25" min="13" max="99" value={form.age} onChange={upd('age')} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Gender</label>
              <select className="auth-input" value={form.gender} onChange={upd('gender')} style={{cursor:'pointer'}}>
                <option value="">Not specified</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="NB">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label">Location</label>
            <input className="auth-input" placeholder="City, Country" value={form.location} onChange={upd('location')} />
          </div>
          <div className="auth-field">
            <label className="auth-label">Bio</label>
            <textarea className="auth-input" placeholder="Tell people about yourself…" value={form.bio} onChange={upd('bio')} rows={3} style={{resize:'vertical'}} />
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
