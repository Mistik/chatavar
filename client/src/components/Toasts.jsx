import { X } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Toasts() {
  const { toasts, removeToast, setActiveChat } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast"
          style={{ cursor: t.username ? 'pointer' : 'default' }}
          onClick={() => { if (t.username) { setActiveChat({ username: t.username }); removeToast(t.id); } }}
        >
          <span style={{ fontSize:22, flexShrink:0 }}>{t.icon}</span>
          <div className="toast-content">
            <div className="toast-title">{t.title}</div>
            <div className="toast-msg">{t.message}</div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); removeToast(t.id); }}
            style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer',
                     display:'flex', alignItems:'center', padding:2, borderRadius:4 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
