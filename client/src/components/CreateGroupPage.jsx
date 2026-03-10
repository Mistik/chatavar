// ─── Create Group — Step 1 (pick type) + Step 2 (configure + name) ───────────
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { navigate } from '../utils/navigate';
import AuthModal from './AuthModal';
import api from '../utils/api';

// ─── Watermark background ────────────────────────────────────────────────────
function FakeSiteBg({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ position:'relative', background:'#fff', overflow:'hidden', cursor:onClick?'pointer':'default', ...style }}>
      <div style={{ position:'absolute',inset:0,fontSize:11,color:'#90CAF9',lineHeight:1.9,padding:6,userSelect:'none',pointerEvents:'none',letterSpacing:1.5,opacity:.5,wordBreak:'break-all' }}>
        {Array(150).fill('YOUR WEBSITE ').join('')}
      </div>
      {children}
    </div>
  );
}

// ─── Phone frame (mobile preview) ────────────────────────────────────────────
function PhoneFrame({ children }) {
  return (
    <div style={{ display:'inline-block', border:'3px solid #90CAF9', borderRadius:24, padding:'24px 8px 16px', background:'#fff', width:300, boxShadow:'0 0 0 1px #b3d9f7' }}>
      {children}
    </div>
  );
}

// ─── Mock messages ────────────────────────────────────────────────────────────
const MSGS = [
  { name:'Poseidon', img:'🌊', text:'Ideal for news, live video, community, gaming, and hobby sites.' },
  { name:'Zeus',     img:'⚡', text:'You can monitor and moderate the group from any device, from anywhere.' },
  { name:'Artemis',  img:'🐯', text:'Embed as a small Button, a sticky Tab or a larger Box.' },
  { name:'Atlas',    img:'🌍', text:'The group has sophisticated content controls: intelligent word banning, rate limits, and moderation.' },
  { name:'Apollo',   img:'🐺', text:'Optional anonymity, controlled by the group owner.' },
];

// ─── Box preview ─────────────────────────────────────────────────────────────
function MockBox({ cfg, groupName = 'groupname', w, h }) {
  const { color, roundCorners, showUrl, userImages, fontSize, fontWeight, fontFamily } = cfg;
  const msgStyle = { fontSize: fontSize+'px', fontWeight, fontFamily };
  const radius = roundCorners ? 8 : 0;
  return (
    <div style={{ width: w||250, fontFamily:'sans-serif', fontSize:12, borderRadius:radius, overflow:'hidden', border:'1px solid #ccc', boxShadow:'0 2px 12px rgba(0,0,0,.15)' }}>
      <div style={{ background:color, color:'#fff', padding:'5px 8px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:13 }}>Example Title</div>
          {showUrl && <div style={{ fontSize:9, opacity:.85 }}>http://{groupName}.chatavar.com</div>}
        </div>
        <span style={{ fontSize:13, opacity:.8 }}>✕</span>
      </div>
      <div style={{ background:'#fff', maxHeight: h ? h-80 : 240, overflowY:'hidden' }}>
        {MSGS.map((m,i) => (
          <div key={i} style={{ display:'flex', gap:6, padding:'5px 8px', borderBottom:'1px solid #f0f0f0', alignItems:'flex-start' }}>
            {userImages && <div style={{ width:32,height:32,borderRadius:'50%',background:'#eee',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>{m.img}</div>}
            <div style={{ flex:1, lineHeight:1.4, color:'#222', ...msgStyle }}>
              <span style={{ fontWeight:700, color }}>{m.name}: </span>{m.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'5px 8px', borderTop:'1px solid #ddd', display:'flex', alignItems:'center', gap:4, background:'#fafafa' }}>
        <span style={{ fontSize:12 }}>📷</span><span style={{ fontSize:12, fontWeight:700, color:'#888' }}>#</span>
        <input placeholder="Type here" readOnly style={{ flex:1, border:'1px solid #ddd', borderRadius:2, padding:'3px 6px', fontSize:11, outline:'none', background:'#fff' }}/>
        <span style={{ fontSize:11 }}>😊</span><span style={{ fontSize:11, fontWeight:700, color }}>A</span>
      </div>
      <div style={{ background:color, padding:'4px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'rgba(255,255,255,.9)', fontSize:10, fontWeight:700 }}>chatavar</span>
        <span style={{ color:'rgba(255,255,255,.85)', fontSize:10 }}>🔊 144 &nbsp; Set name</span>
      </div>
    </div>
  );
}

// ─── Ticker bar preview ───────────────────────────────────────────────────────
function MockTicker({ cfg, fullWidth }) {
  const { tickerBg, tickerText, fontSize, fontWeight, fontFamily } = cfg;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      background: '#'+tickerBg, color: '#'+tickerText,
      padding:'6px 14px 6px 10px', fontSize: fontSize+'px',
      fontWeight, fontFamily,
      width: fullWidth ? '100%' : 'auto',
      boxSizing:'border-box',
      overflow:'hidden',
    }}>
      <span style={{ fontSize:11 }}>▶</span>
      <span style={{ flex:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
        <b>Apollo:</b> The Box is ideal for live video feeds…
      </span>
      <span style={{ fontWeight:800, flexShrink:0, marginLeft:8 }}>144</span>
      <span style={{ fontSize:16 }}>💬</span>
    </div>
  );
}

// ─── Tab preview ──────────────────────────────────────────────────────────────
function MockTab({ cfg, corner = 'bottomright', fullWidth }) {
  const { tickerBg, tickerText, fontSize, fontWeight, fontFamily } = cfg;
  const isBottom = corner.startsWith('bottom');
  const isRight  = corner.endsWith('right');
  const posStyle = fullWidth
    ? { bottom:0, left:0, right:0 }
    : { [isBottom?'bottom':'top']:0, [isRight?'right':'left']:0 };

  return (
    <div style={{
      position:'absolute', ...posStyle,
      background:'#'+tickerBg, color:'#'+tickerText,
      padding: fullWidth ? '8px 14px' : '8px 16px',
      fontSize: fontSize+'px', fontWeight, fontFamily,
      display:'flex', alignItems:'center', gap:8,
      cursor:'pointer', width: fullWidth ? '100%' : 'auto',
      boxSizing:'border-box',
      borderRadius: fullWidth ? 0 : (isBottom ? '4px 4px 0 0' : '0 0 4px 4px'),
    }}>
      <span style={{ fontWeight:800 }}>145</span>
      <span style={{ fontSize:16 }}>💬</span>
    </div>
  );
}

// ─── Live button preview ──────────────────────────────────────────────────────
function MockButton({ cfg }) {
  const { tickerBg, tickerText, btnW, btnH, fontSize, fontWeight, fontFamily } = cfg;
  const tooSmall = btnW < 100 || btnH < 18;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{
        background:'#'+tickerBg, color:'#'+tickerText,
        width: Math.max(btnW||75, 60), height: Math.max(btnH||30, 20),
        display:'flex', alignItems:'center', justifyContent:'center',
        gap:6, fontSize: fontSize+'px', fontWeight, fontFamily, cursor:'pointer',
        borderRadius:3,
      }}>
        <span style={{ fontWeight:800 }}>115</span>
        <span style={{ fontSize:16 }}>💬</span>
      </div>
      {tooSmall && <div style={{ fontSize:11, color:'#e53935', display:'flex', alignItems:'center', gap:4 }}>
        <span>⚠</span> Minimum size is 100px by 18px
      </div>}
    </div>
  );
}

// ─── Colour picker (mini inline swatch row + hex input) ───────────────────────
const PAL = [
  ['FFFFFF','CCCCCC','999999','666666','333333','000000'],
  ['FF0000','FF6600','FFCC00','99CC00','0099FF','CC00CC'],
  ['FF9999','FFCC99','FFFF99','CCFF99','99CCFF','CC99FF'],
];
const EXTRA_PAL = ['FF3300','FF6633','FF9966','FF9900','FFCC33','CCFF00','00FF99','00CCFF','0066FF','3300FF','9900FF','FF00CC'];

function ColorPicker({ value, onChange, label }) {
  const [hex, setHex]       = useState(value);
  const [show, setShow]     = useState(false);
  const [extra, setExtra]   = useState(false);

  useEffect(() => { setHex(value); }, [value]);

  const pick = (c) => { onChange(c); setHex(c); };
  const swatch = (c) => (
    <button key={c} onClick={() => pick(c)} style={{ width:20,height:20,background:`#${c}`,border:`2px solid ${value===c?'#333':'#ccc'}`,cursor:'pointer',padding:0,borderRadius:2,flexShrink:0 }}/>
  );

  return (
    <div style={{ marginBottom:10 }}>
      {label && <div style={{ fontSize:13, color:'#444', marginBottom:4 }}>{label}</div>}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <div style={{ width:22,height:22,background:`#${value}`,border:'1px solid #ccc',borderRadius:2,cursor:'pointer',flexShrink:0 }} onClick={() => setShow(v=>!v)}/>
        <input value={hex} maxLength={6}
          onChange={e => { const v=e.target.value.toUpperCase().replace(/[^0-9A-F]/g,''); setHex(v); if(v.length===6) pick(v); }}
          style={{ width:68,padding:'3px 6px',border:'1px solid #ddd',borderRadius:3,fontFamily:'monospace',fontSize:12,outline:'none' }}
        />
        <button onClick={() => setShow(v=>!v)} style={{ width:22,height:22,border:'1px solid #ccc',borderRadius:2,background:'#f5f5f5',cursor:'pointer',fontSize:10 }}>▼</button>
      </div>
      {show && (
        <div style={{ marginTop:6 }}>
          {/* gradient bar */}
          <div style={{ height:16,borderRadius:2,background:`linear-gradient(to right,transparent,#${value})`,marginBottom:4 }}/>
          {PAL.map((row,i) => (
            <div key={i} style={{ display:'flex', gap:2, marginBottom:2 }}>
              {i===0 && <button onClick={() => pick('FFFFFF')} style={{ width:20,height:20,padding:0,border:`2px solid ${value==='FFFFFF'?'#333':'#ccc'}`,backgroundImage:'repeating-conic-gradient(#ccc 0 25%,#fff 0 50%)',backgroundSize:'6px 6px',cursor:'pointer',borderRadius:2 }}/>}
              {row.map(swatch)}
            </div>
          ))}
          {extra && <div style={{ display:'flex', gap:2, flexWrap:'wrap', maxWidth:160, marginTop:2 }}>{EXTRA_PAL.map(swatch)}</div>}
          <button onClick={() => setExtra(v=>!v)} style={{ fontSize:11, color:'#2196F3', background:'none', border:'none', cursor:'pointer', padding:'2px 0', marginTop:2 }}>
            {extra ? '− Less' : '+ More color controls'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Font selector ────────────────────────────────────────────────────────────
const FONTS = ['sans-serif','serif','monospace','Arial','Georgia','Verdana','Tahoma','Trebuchet MS'];
function FontSelector({ fontFamily, fontSize, fontWeight, onChange }) {
  return (
    <div>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>
        {/* Label passed by parent */}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <select value={fontFamily} onChange={e => onChange({ fontFamily: e.target.value })}
          style={{ flex:1, padding:'4px 6px', border:'1px solid #ccc', borderRadius:3, fontSize:13, outline:'none' }}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button style={{ width:22,height:22,border:'1px solid #ccc',borderRadius:2,background:'#f5f5f5',cursor:'pointer',fontSize:10 }}>▼</button>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <input type="number" value={fontSize} min={8} max={24} onChange={e => onChange({ fontSize: +e.target.value||13 })}
          style={{ width:46,padding:'4px 6px',border:'1px solid #ccc',borderRadius:3,fontSize:12,outline:'none' }}/>
        <select style={{ padding:'4px 6px',border:'1px solid #ccc',borderRadius:3,fontSize:13,outline:'none' }}>
          <option>px</option><option>em</option>
        </select>
        <span style={{ fontSize:13 }}>Weight:</span>
        <select value={fontWeight} onChange={e => onChange({ fontWeight: e.target.value })}
          style={{ padding:'4px 6px',border:'1px solid #ccc',borderRadius:3,fontSize:13,outline:'none' }}>
          <option value="normal">normal</option><option value="bold">bold</option><option value="lighter">light</option>
        </select>
      </div>
    </div>
  );
}

// ─── Corner picker ────────────────────────────────────────────────────────────
const CORNERS = [
  ['topleft','topright'],
  ['bottomleft','bottomright'],
];
function CornerPicker({ value, onChange }) {
  return (
    <div>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Ticker alignment</div>
      <div style={{ display:'flex', gap:4, marginBottom:8 }}>
        {CORNERS.map((row,ri) => (
          <div key={ri} style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {row.map(c => (
              <button key={c} onClick={() => onChange(c)} style={{
                width:36, height:28, border:'2px solid #ccc', borderRadius:3, cursor:'pointer', padding:0,
                background: value===c ? '#1976D2' : '#e0e0e0',
              }}/>
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize:12, color:'#555', textTransform:'capitalize' }}>{value.replace('bottom','Bottom ').replace('top','Top ').replace('left','left').replace('right','right')}</div>
    </div>
  );
}

// ─── Quick colour bar (step 1 and below previews) ─────────────────────────────
const QUICK = ['000000','FF0000','99CC00','0099FF','CC0000'];
function QuickColorBar({ value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'center' }}>
      <button onClick={() => onChange('FFFFFF')} style={{ width:24,height:24,padding:0,border:`2px solid ${value==='FFFFFF'?'#555':'#bbb'}`,backgroundImage:'repeating-conic-gradient(#ccc 0 25%,#fff 0 50%)',backgroundSize:'8px 8px',cursor:'pointer',borderRadius:2 }}/>
      <button onClick={() => onChange('FFFFFF')} style={{ width:24,height:24,padding:0,border:`2px solid ${value==='FFFFFF'?'#555':'#bbb'}`,background:'#fff',cursor:'pointer',borderRadius:2 }}/>
      {QUICK.map(c => <button key={c} onClick={() => onChange(c)} style={{ width:24,height:24,padding:0,border:`2px solid ${value===c?'#555':'#bbb'}`,background:`#${c}`,cursor:'pointer',borderRadius:2 }}/>)}
      <div style={{ width:24,height:24,background:`#${value}`,border:'1px solid #bbb',borderRadius:2 }}/>
      <span style={{ fontSize:12,fontFamily:'monospace',color:'#555',minWidth:52 }}>{value.toUpperCase()}</span>
      <button style={{ width:22,height:22,border:'1px solid #ccc',borderRadius:2,background:'#f5f5f5',cursor:'pointer',fontSize:10 }}>▼</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — PickView
// ═══════════════════════════════════════════════════════════════════════════════
function PickCard({ title, desc, onClick, children }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ cursor:'pointer' }}>
      <div style={{ fontWeight:700, fontSize:17, marginBottom:2 }}>{title}</div>
      <div style={{ fontSize:13, color:'#888', marginBottom:10 }}>{desc}</div>
      <div style={{ borderRadius:4, overflow:'hidden', boxShadow: hover ? '0 0 0 3px rgba(33,150,243,.4)' : 'none', transition:'box-shadow .15s' }}>
        {children}
      </div>
    </div>
  );
}

function PickView() {
  const [color, setColor] = useState('CC0000');
  const accentHex = '#' + color;
  const pickCfg = { color: accentHex, tickerBg: color, tickerText: 'FFFFFF', roundCorners: false, showUrl: true, userImages: true, fontSize: 13, fontWeight: 'normal', fontFamily: 'sans-serif', btnW: 115, btnH: 30 };

  const pick = (type) => navigate(`/new-group/setup?type=${type}&color=${color}`);

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <nav style={{ display:'flex', alignItems:'center', padding:'0 32px', height:52, borderBottom:'1px solid #eee' }}>
        <div onClick={() => navigate('/')} style={{ fontSize:24, fontWeight:300, color:'#aaa', letterSpacing:-.5, cursor:'pointer' }}>chatavar</div>
      </nav>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px 40px 60px' }}>
        <h2 style={{ fontSize:26, fontWeight:400, marginBottom:32 }}>Start a group: choose a default view</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
          <PickCard title="Box" desc="Live community on your site" onClick={() => pick('box')}>
            <FakeSiteBg style={{ border:'2px solid #e0e0e0', minHeight:340, padding:16, display:'flex', justifyContent:'center' }}>
              <MockBox cfg={pickCfg} />
            </FakeSiteBg>
          </PickCard>
          <div style={{ display:'flex', flexDirection:'column', gap:40 }}>
            <PickCard title="Ticker" desc="Compact view with scrolling messages" onClick={() => pick('ticker')}>
              <FakeSiteBg style={{ border:'2px solid #e0e0e0', height:120, display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'0 24px' }}>
                <MockTicker cfg={pickCfg} />
              </FakeSiteBg>
            </PickCard>
            <PickCard title="Tab" desc="Pins to any corner of your site" onClick={() => pick('tab')}>
              <FakeSiteBg style={{ border:'2px solid #e0e0e0', height:130 }}>
                <MockTab cfg={pickCfg} corner="bottomright" />
              </FakeSiteBg>
            </PickCard>
          </div>
        </div>
        <div style={{ marginTop:36 }}>
          <QuickColorBar value={color} onChange={setColor} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — GroupSetup
// ═══════════════════════════════════════════════════════════════════════════════
function GroupSetup() {
  const { currentUser } = useStore();
  const params   = new URLSearchParams(window.location.search);
  const initType = params.get('type')  || 'box';
  const initCol  = params.get('color') || 'CC0000';

  // ── form ──
  const [name,      setName]      = useState('');
  const [showProps, setShowProps] = useState(false);
  const [title,     setTitle]     = useState('');
  const [ownerMsg,  setOwnerMsg]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showAuth,  setShowAuth]  = useState(false);

  // ── embed type ──
  const [embedType, setEmbed]   = useState(initType);
  const [mobileTab, setMobile]  = useState(false);

  // ── box settings ──
  const [color,        setColor]       = useState(initCol);
  const [sizeMode,     setSizeMode]    = useState('fixed');
  const [boxW,         setBoxW]        = useState(250);
  const [boxH,         setBoxH]        = useState(350);
  const [roundCorners, setRound]       = useState(false);
  const [showUrl,      setShowUrl]     = useState(true);
  const [userImages,   setUserImages]  = useState(true);
  const [allowStyles,  setAllowStyles] = useState(true);
  const [customFont,   setCustomFont]  = useState(false);
  const [msgSound,     setMsgSound]    = useState(true);
  const [privateMsgs,  setPrivateMsgs] = useState(true);
  const [fullMobile,   setFullMobile]  = useState(true);

  // ── ticker/tab/button settings ──
  const [tickerBg,     setTickerBg]    = useState(initCol);
  const [tickerText,   setTickerText]  = useState('FFFFFF');
  const [tickerEnabled,setTickerOn]    = useState(true);
  const [tickerW,      setTickerW]     = useState(200);
  const [tickerH,      setTickerH]     = useState(30);
  const [corner,       setCorner]      = useState('bottomright');
  const [btnW,         setBtnW]        = useState(115);
  const [btnH,         setBtnH]        = useState(30);
  const [fontFamily,   setFontFamily]  = useState('sans-serif');
  const [fontSize,     setFontSize]    = useState(13);
  const [fontWeight,   setFontWeight]  = useState('normal');

  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const slug     = name.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  const isValid  = slug.length >= 3;
  const btnBg    = isValid ? '#FFC107' : '#e0e0e0';
  const btnColor = isValid ? '#333' : '#999';

  // cfg objects passed to mock previews
  const boxCfg = { color: '#'+color, roundCorners, showUrl, userImages, allowStyles, fontSize, fontWeight, fontFamily };
  const tickCfg = { tickerBg, tickerText, tickerEnabled, tickerW, tickerH, fontSize, fontWeight, fontFamily, btnW, btnH };

  const doCreate = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/groups', { name: slug, title, ownerMessage: ownerMsg, accentColor: color });
      navigate(`/g/${data.group.name}`);
    } catch(e) {
      setError(e.response?.data?.error || 'Failed to create group');
      setLoading(false);
    }
  };
  const handleCreate = () => {
    if (!isValid) return;
    if (!currentUser) { setShowAuth(true); return; }
    doCreate();
  };

  // ── left panel sections ──────────────────────────────────────────────────
  const embedAsPanel = (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Embed as</div>
      {[['box','Box'],['tab','Tab'],['button','Live button']].map(([v,l]) => (
        <label key={v} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, cursor:'pointer', fontSize:13 }}>
          <input type="radio" name="embedType" checked={embedType===v} onChange={() => setEmbed(v)}/> {l}
        </label>
      ))}
      {embedType !== 'button' && (
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, marginTop:2 }}>
          <input type="checkbox" checked={fullMobile} onChange={e => setFullMobile(e.target.checked)}/> Full width ticker on mobile
        </label>
      )}
    </div>
  );

  // Box-specific left panel
  const boxPanel = (
    <>
      {embedAsPanel}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Size</div>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, cursor:'pointer', fontSize:13 }}>
          <input type="radio" name="sizeMode" checked={sizeMode==='fixed'} onChange={() => setSizeMode('fixed')}/> Fixed
        </label>
        {sizeMode==='fixed' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, marginLeft:20, marginBottom:6 }}>
            <input type="number" value={boxW} min={150} max={800} onChange={e => setBoxW(+e.target.value||250)}
              style={{ width:54,padding:'3px 5px',border:'1px solid #ccc',borderRadius:3,fontSize:12,outline:'none' }}/> px by
            <input type="number" value={boxH} min={200} max={900} onChange={e => setBoxH(+e.target.value||350)}
              style={{ width:54,padding:'3px 5px',border:'1px solid #ccc',borderRadius:3,fontSize:12,outline:'none' }}/> px
          </div>
        )}
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
          <input type="radio" name="sizeMode" checked={sizeMode==='responsive'} onChange={() => setSizeMode('responsive')}/> Responsive
        </label>
        {sizeMode==='responsive' && <div style={{ fontSize:11,color:'#888',marginLeft:20,marginTop:2 }}>Scales to fit its parent container</div>}
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Color</div>
        <ColorPicker value={color} onChange={setColor} />
        <button style={{ fontSize:12, color:'#2196F3', background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>More color controls</button>
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Box settings</div>
        {[
          [userImages,   setUserImages,  'User images'],
          [allowStyles,  setAllowStyles, 'Allow user message styles'],
          [customFont,   setCustomFont,  'Custom font size'],
          [msgSound,     setMsgSound,    'Message sound'],
          [showUrl,      setShowUrl,     'Show URL'],
          [privateMsgs,  setPrivateMsgs, 'Private messaging'],
          [roundCorners, setRound,       'Round corners'],
        ].map(([val, setter, label]) => (
          <label key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}/> {label}
          </label>
        ))}
      </div>
    </>
  );

  // Tab-specific left panel
  const tabPanel = (
    <>
      {embedAsPanel}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Ticker</div>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
          <input type="checkbox" checked={tickerEnabled} onChange={e => setTickerOn(e.target.checked)}/> Enabled
        </label>
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Ticker size</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
          <input type="number" value={tickerW} min={80} max={600} onChange={e => setTickerW(+e.target.value||200)}
            style={{ width:54,padding:'3px 5px',border:'1px solid #ccc',borderRadius:3,fontSize:12,outline:'none' }}/> px by
          <input type="number" value={tickerH} min={20} max={80} onChange={e => setTickerH(+e.target.value||30)}
            style={{ width:54,padding:'3px 5px',border:'1px solid #ccc',borderRadius:3,fontSize:12,outline:'none' }}/> px
        </div>
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Color</div>
        <ColorPicker value={tickerBg}   onChange={setTickerBg}   label="Ticker background:" />
        <ColorPicker value={tickerText} onChange={setTickerText} label="Ticker text and icon:" />
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Ticker font</div>
        <FontSelector fontFamily={fontFamily} fontSize={fontSize} fontWeight={fontWeight}
          onChange={v => { if(v.fontFamily) setFontFamily(v.fontFamily); if(v.fontSize) setFontSize(v.fontSize); if(v.fontWeight) setFontWeight(v.fontWeight); }}
        />
      </div>
      <CornerPicker value={corner} onChange={setCorner} />
    </>
  );

  // Button-specific left panel
  const buttonPanel = (
    <>
      {embedAsPanel}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Ticker</div>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
          <input type="checkbox" checked={tickerEnabled} onChange={e => setTickerOn(e.target.checked)}/> Enabled
        </label>
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Button size</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
          <input type="number" value={btnW} min={50} max={400} onChange={e => setBtnW(+e.target.value||75)}
            style={{ width:54,padding:'3px 5px',border:'1px solid #ccc',borderRadius:3,fontSize:12,outline:'none' }}/> px by
          <input type="number" value={btnH} min={18} max={120} onChange={e => setBtnH(+e.target.value||30)}
            style={{ width:54,padding:'3px 5px',border:'1px solid #ccc',borderRadius:3,fontSize:12,outline:'none' }}/> px
        </div>
        {(btnW < 100 || btnH < 18) && <div style={{ fontSize:11,color:'#e53935',marginTop:4 }}>⚠ Minimum size is 100px by 18px</div>}
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Color</div>
        <ColorPicker value={tickerBg}   onChange={setTickerBg}   label="Button background:" />
        <ColorPicker value={tickerText} onChange={setTickerText} label="Button text and icon:" />
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Button font</div>
        <FontSelector fontFamily={fontFamily} fontSize={fontSize} fontWeight={fontWeight}
          onChange={v => { if(v.fontFamily) setFontFamily(v.fontFamily); if(v.fontSize) setFontSize(v.fontSize); if(v.fontWeight) setFontWeight(v.fontWeight); }}
        />
      </div>
    </>
  );

  const leftPanel = embedType==='box' ? boxPanel : embedType==='tab' ? tabPanel : buttonPanel;

  // ── right side preview ────────────────────────────────────────────────────
  // Box: desktop = sized box; mobile = phone frame with ticker bar at bottom
  // Tab: desktop = FakeSite with sticky tab; mobile = phone with full-width tab
  // Button: always desktop+mobile same (no tabs)

  const showMobileTabs = embedType !== 'button';

  const desktopPreview = (
    <FakeSiteBg style={{ border:'1px solid #ddd', height:460, flex:1 }}>
      {embedType === 'box' && (
        <div style={{ padding:16, display:'flex', justifyContent:'flex-end', alignItems:'flex-start' }}>
          <MockBox cfg={boxCfg} groupName={slug||'groupname'} w={sizeMode==='fixed'?Math.min(boxW,320):undefined} h={sizeMode==='fixed'?Math.min(boxH,380):undefined} />
        </div>
      )}
      {embedType === 'tab' && (
        <>
          <MockTab cfg={tickCfg} corner={corner} />
          <div style={{ position:'absolute', bottom:8, right:8, fontSize:11, color:'#888', zIndex:3 }}>Click the Tab to edit expanded view</div>
        </>
      )}
      {embedType === 'button' && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:460 }}>
          <MockButton cfg={tickCfg} />
        </div>
      )}
    </FakeSiteBg>
  );

  const mobilePreview = (
    <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}>
      <PhoneFrame>
        {/* Fixed-height relative container so absolute children (tab) work */}
        <div style={{ position:'relative', height:460, overflow:'hidden', background:'#fff' }}>
          {/* watermark inside phone */}
          <div style={{ position:'absolute', inset:0, fontSize:10, color:'#90CAF9', lineHeight:1.9, padding:4, userSelect:'none', pointerEvents:'none', letterSpacing:1, opacity:.5, wordBreak:'break-all', zIndex:0 }}>
            {Array(80).fill('YOUR WEBSITE ').join('')}
          </div>

          {/* Box: show scaled box + optional full-width ticker pinned to bottom */}
          {embedType === 'box' && (
            <>
              <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'center', paddingTop:12, transform:'scale(0.75)', transformOrigin:'top center' }}>
                <MockBox cfg={boxCfg} groupName={slug||'groupname'} w={250} h={300} />
              </div>
              {fullMobile && (
                <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:2 }}>
                  <MockTicker cfg={{ ...tickCfg, tickerBg: color, tickerText:'FFFFFF' }} fullWidth />
                </div>
              )}
            </>
          )}

          {/* Tab: full-width bar pinned to bottom of phone */}
          {embedType === 'tab' && (
            <MockTab cfg={tickCfg} corner="bottomleft" fullWidth />
          )}

          {/* Button */}
          {embedType === 'button' && (
            <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
              <MockButton cfg={tickCfg} />
            </div>
          )}
        </div>
      </PhoneFrame>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', padding:'0 32px', height:52, borderBottom:'1px solid #eee' }}>
        <div onClick={() => navigate('/')} style={{ fontSize:24, fontWeight:300, color:'#aaa', letterSpacing:-.5, cursor:'pointer' }}>chatavar</div>
      </nav>

      {/* Top bar: name + owner + create */}
      <div style={{ borderBottom:'1px solid #eee', padding:'14px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, maxWidth:1200, margin:'0 auto' }}>
          <button onClick={() => navigate('/new-group')} style={{ background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer',padding:'0 4px',lineHeight:1 }}>←</button>
          <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
            placeholder="Group name"
            onKeyDown={e => e.key==='Enter' && handleCreate()}
            style={{ width:220,padding:'8px 12px',border:'1px solid #ccc',borderRadius:3,fontSize:14,fontFamily:'inherit',outline:'none' }}
          />
          {slug && <div style={{ fontSize:11, color:'#2196F3' }}>chatavar.com/g/{slug}</div>}
          <span style={{ fontSize:13, color:'#888', marginLeft:'auto' }}>
            Owner: <span style={{ color:'#2196F3' }}>{currentUser?.username || '—'}</span>
          </span>
          <button onClick={handleCreate} disabled={loading} style={{ background:btnBg,color:btnColor,border:'none',borderRadius:3,padding:'8px 22px',fontSize:14,fontWeight:600,cursor:isValid?'pointer':'default',fontFamily:'inherit',transition:'background .15s' }}>
            {loading ? 'Creating…' : 'Create Group'}
          </button>
        </div>
        <div style={{ maxWidth:1200, margin:'10px auto 0', paddingLeft:52 }}>
          <button onClick={() => setShowProps(v=>!v)} style={{ background:'none',border:'none',color:'#2196F3',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:4,padding:0 }}>
            <span style={{ fontWeight:700 }}>{showProps?'−':'+'}</span> Group properties
            {!showProps && <span style={{ color:'#aaa',fontWeight:400,fontSize:12 }}> — can be updated in real time</span>}
          </button>
          {showProps && (
            <div style={{ display:'flex', gap:20, marginTop:10 }}>
              <div>
                <input value={title} onChange={e => setTitle(e.target.value.slice(0,35))} placeholder="Group title"
                  style={{ padding:'6px 10px',border:'1px solid #ccc',borderRadius:3,fontSize:13,fontFamily:'inherit',outline:'none',width:190 }}/>
                <div style={{ fontSize:10,color:'#aaa',marginTop:2 }}>Optional (35 chars)</div>
              </div>
              <div>
                <input value={ownerMsg} onChange={e => setOwnerMsg(e.target.value)} placeholder="Owner's message"
                  style={{ padding:'6px 10px',border:'1px solid #ccc',borderRadius:3,fontSize:13,fontFamily:'inherit',outline:'none',width:190 }}/>
                <div style={{ fontSize:10,color:'#aaa',marginTop:2 }}>Optional sticky live message</div>
              </div>
            </div>
          )}
        </div>
        {error && <div style={{ color:'#c62828',fontSize:13,marginTop:6,maxWidth:1200,margin:'6px auto 0',paddingLeft:52 }}>{error}</div>}
      </div>

      {/* Body: left panel + right preview */}
      <div style={{ display:'flex', maxWidth:1200, margin:'0 auto', padding:'0 32px' }}>

        {/* Left */}
        <div style={{ width:280, flexShrink:0, paddingTop:24, paddingRight:32, borderRight:'1px solid #f0f0f0' }}>
          {leftPanel}
        </div>

        {/* Right */}
        <div style={{ flex:1, paddingTop:24, paddingLeft:32 }}>
          {/* Desktop/Mobile tabs */}
          {showMobileTabs ? (
            <div style={{ display:'flex', borderBottom:'2px solid #eee', marginBottom:16, gap:0 }}>
              {[['Desktop view', false],['Mobile view', true]].map(([label, isMobile]) => (
                <button key={label} onClick={() => setMobile(isMobile)} style={{
                  background:'none', border:'none', padding:'7px 16px', fontSize:13, cursor:'pointer',
                  color: mobileTab===isMobile ? '#2196F3' : '#888',
                  borderBottom: mobileTab===isMobile ? '2px solid #2196F3' : '2px solid transparent',
                  marginBottom:-2, fontWeight: mobileTab===isMobile ? 700 : 400,
                }}>{label}</button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize:13, color:'#888', marginBottom:16, fontWeight:600 }}>Desktop and Mobile view</div>
          )}

          {/* Preview */}
          {(!showMobileTabs || !mobileTab) ? desktopPreview : mobilePreview}
        </div>
      </div>

      {showAuth && (
        <AuthModal title="Create a group" onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); doCreate(); }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export — pick step from URL
// ═══════════════════════════════════════════════════════════════════════════════
export default function CreateGroupPage() {
  return window.location.pathname.startsWith('/new-group/setup') ? <GroupSetup /> : <PickView />;
}
