const COLORS = [
  '#5865f2','#eb459e','#ed4245','#fee75c','#57f287',
  '#1abc9c','#e67e22','#9b59b6','#3498db','#e91e63',
];

function getColor(username) {
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++)
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Discord-style avatar: status dot overlaps bottom-right of circle,
 * with a border that "cuts out" into the background so it looks detached.
 */
export default function Avatar({
  username, size = 'sm', src,
  showStatus = false, status = 'offline',
}) {
  const initial = (username || '?')[0].toUpperCase();
  const bg = src ? 'transparent' : getColor(username || '?');

  return (
    <div className={`avatar-wrap ${size}`} style={{ position:'relative', display:'inline-flex', flexShrink:0 }}>
      <div
        className={`avatar avatar-${size}`}
        style={{ background: bg }}
        title={username}
      >
        {src
          ? <img src={src} alt={username} />
          : initial
        }
      </div>

      {showStatus && (
        <span
          className={`avatar-status ${status}`}
          title={status}
        />
      )}
    </div>
  );
}
