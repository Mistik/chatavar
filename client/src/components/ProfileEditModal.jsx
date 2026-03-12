import { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import Avatar from './Avatar';

export default function ProfileEditModal({ onClose }) {
  const { currentUser, updateCurrentUser, addToast } = useStore();
  const [form, setForm] = useState({
    age: currentUser?.age || '', gender: currentUser?.gender || '',
    location: currentUser?.location || '', bio: currentUser?.bio || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || null);
  const [avatarData, setAvatarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef(null);
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate
    if (!['image/jpeg','image/png','image/gif'].includes(file.type)) {
      setError('Only JPG, PNG, and GIF files are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setAvatarData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        avatar: avatarData || currentUser?.avatar || null,
      };
      const { data } = await api.put('/profile', payload);
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

          {/* Avatar upload */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:4 }}>
            <div style={{ position:'relative', cursor:'pointer' }} onClick={() => fileRef.current?.click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="" style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover' }} />
              ) : (
                <Avatar username={currentUser?.username || '?'} size="lg" />
              )}
              <div style={{
                position:'absolute', bottom:-2, right:-2, width:24, height:24, borderRadius:'50%',
                background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 2px 6px rgba(0,0,0,.2)',
              }}>
                <Camera size={12}/>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif"
                onChange={handleFileChange} style={{ display:'none' }} />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>{currentUser?.username}</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>Click the avatar to upload a picture</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>JPG, PNG, or GIF · Max 5 MB</div>
            </div>
          </div>

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
            <textarea className="auth-input" placeholder="Tell people about yourself…" value={form.bio} onChange={upd('bio')} rows={3} style={{resize:'vertical'}} maxLength={200} />
            <div style={{ fontSize:10, color:'var(--text3)', textAlign:'right', marginTop:2 }}>{form.bio.length}/200</div>
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
