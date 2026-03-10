import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import api from '../utils/api';

const SERVER = window.location.origin;

const EXTRA_COLORS = [
  'FF6600','FFCC00','FF99CC','9933CC','006633','336699',
  'FF3399','00CCFF','FF9900','66CC00','0066FF','CC3300',
];

function getEmbedCode(group, cfg) {
  const color = cfg.accentColor || 'CC0000';
  const w = cfg.width || 250, h = cfg.height || 350;
  const corner = cfg.corner || 'bottom-right';
  if (cfg.embedType === 'box') return (
`<!-- Chatavar Box: ${group.title || group.name} -->
<div id="chatavar-box"></div>
<script>
  window.chatavar_config = {
    group: '${group.name}',
    type:  'box',
    color: '#${color}',
    width:  ${w},
    height: ${h},
  };
</script>
<script src="${SERVER}/embed.js" async></script>`);
  if (cfg.embedType === 'tab') return (
`<!-- Chatavar Tab: ${group.title || group.name} -->
<script>
  window.chatavar_config = {
    group:  '${group.name}',
    type:   'tab',
    color:  '#${color}',
    width:   ${w},
    height:  ${h},
    corner: '${corner}',
    label:  '${group.title || group.name}',
  };
</script>
<script src="${SERVER}/embed.js" async></script>`);
  return (
`<!-- Chatavar Button: ${group.title || group.name} -->
<script>
  window.chatavar_config = {
    group:  '${group.name}',
    type:   'button',
    color:  '#${color}',
    width:   ${w},
    height:  ${h},
    corner: '${corner}',
  };
</script>
<script src="${SERVER}/embed.js" async></script>`);
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(()=>setOk(false),2000); }); }}
      style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',background:ok?'#23a55a':'#5865f2',color:'#fff',border:'none',borderRadius:5,fontSize:12,fontWeight:700,cursor:'pointer' }}>
      {ok ? <Check size={12}/> : <Copy size={12}/>}
      {ok ? 'Copied!' : 'Copy code'}
    </button>
  );
}

export default function EmbedConfigurator({ group, onClose }) {
  const [cfg, setCfg] = useState({ embedType:'box', width:250, height:350, accentColor:'CC0000', tickerEnabled:true, corner:'bottom-right', showUrl:true });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [showMoreColors, setShowMoreColors] = useState(false);
  const [customColor, setCustomColor] = useState('CC0000');
  const [previewTab, setPreviewTab] = useState('desktop');

  useEffect(() => {
    api.get(`/groups/${group.name}/embed`).then(({ data }) => {
      const s = data.settings;
      setCfg({ embedType:s.embed_type, width:s.width, height:s.height, accentColor:s.accent_color, tickerEnabled:!!s.ticker_enabled, corner:s.corner, showUrl:!!s.show_url });
      setCustomColor(s.accent_color);
    }).catch(()=>{});
  }, [group.name]);

  const set = (k,v) => setCfg(p=>({...p,[k]:v}));
  const accentHex = '#' + cfg.accentColor;

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/groups/${group.name}/embed`, { embedType:cfg.embedType, width:cfg.width, height:cfg.height, accentColor:cfg.accentColor, tickerEnabled:cfg.tickerEnabled?1:0, corner:cfg.corner, showUrl:cfg.showUrl?1:0 });
      setSavedMsg('Saved!'); setTimeout(()=>setSavedMsg(''),2000);
    } catch {}
    setSaving(false);
  };

  const embedCode = getEmbedCode(group, cfg);
  const widgetUrl = `${SERVER}/g/${group.name}?color=${cfg.accentColor}&showUrl=${cfg.showUrl?1:0}`;

  const PreviewBox = () => (
    <div style={{ width:220, border:'1px solid #ddd', borderRadius:6, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.1)' }}>
      <div style={{ background:accentHex, color:'#fff', padding:'5px 8px', fontSize:11 }}>
        <div style={{ fontWeight:700 }}>{group.title || group.name}</div>
        {cfg.showUrl && <div style={{ opacity:.8, fontSize:9 }}>{SERVER}/g/{group.name}</div>}
      </div>
      <div style={{ background:'#fff', padding:8, minHeight:80 }}>
        <div style={{ display:'flex',gap:6,alignItems:'flex-start',marginBottom:6 }}>
          <div style={{ width:22,height:22,borderRadius:'50%',background:'#3ba55c',flexShrink:0 }}/>
          <div><div style={{ fontSize:10,fontWeight:700,color:accentHex }}>Apollo</div><div style={{ fontSize:10,color:'#333',lineHeight:1.4 }}>Welcome to the chat!</div></div>
        </div>
        <div style={{ display:'flex',gap:6,alignItems:'flex-start' }}>
          <div style={{ width:22,height:22,borderRadius:'50%',background:'#ed4245',flexShrink:0 }}/>
          <div><div style={{ fontSize:10,fontWeight:700,color:accentHex }}>Artemis</div><div style={{ fontSize:10,color:'#333',lineHeight:1.4 }}>Hello everyone 👋</div></div>
        </div>
      </div>
      <div style={{ background:'#f5f5f5',borderTop:'1px solid #e0e0e0',padding:'5px 6px',display:'flex',gap:4 }}>
        <div style={{ flex:1,background:'#fff',border:'1px solid #ddd',borderRadius:3,padding:'3px 6px',fontSize:9,color:'#aaa' }}>Type here</div>
        <div style={{ background:accentHex,color:'#fff',borderRadius:3,padding:'3px 7px',fontSize:9,fontWeight:700 }}>→</div>
      </div>
      <div style={{ background:accentHex,padding:'3px 8px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <span style={{ fontSize:9,color:'rgba(255,255,255,.9)',fontWeight:700 }}>chatavar</span>
        <span style={{ fontSize:9,color:'rgba(255,255,255,.8)' }}>🔊 12  Set name</span>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:10,width:'100%',maxWidth:860,maxHeight:'92vh',overflow:'auto',display:'flex',flexDirection:'column',boxShadow:'0 8px 40px rgba(0,0,0,.25)',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        {/* Header */}
        <div style={{ padding:'14px 20px',borderBottom:'1px solid #eee',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:700,fontSize:16 }}>Embed: {group.title || group.name}</div>
            <div style={{ fontSize:12,color:'#999' }}>Configure how the chatbox appears on your website</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#999',lineHeight:1 }}>✕</button>
        </div>

        <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
          {/* Left controls */}
          <div style={{ width:260,flexShrink:0,padding:'18px 18px',overflow:'auto',borderRight:'1px solid #eee' }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#888',marginBottom:6,textTransform:'uppercase',letterSpacing:.5 }}>Group name</div>
              <input value={group.name} readOnly style={{ width:'100%',padding:'7px 10px',border:'1px solid #eee',borderRadius:4,fontSize:13,background:'#f8f8f8',color:'#999',boxSizing:'border-box' }}/>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#888',marginBottom:6,textTransform:'uppercase',letterSpacing:.5 }}>Embed as</div>
              {[['box','Box'],['tab','Tab'],['button','Live button']].map(([v,l]) => (
                <label key={v} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5,cursor:'pointer',fontSize:13 }}>
                  <input type="radio" checked={cfg.embedType===v} onChange={()=>set('embedType',v)}/> {l}
                </label>
              ))}
              {cfg.embedType !== 'button' && (
                <label style={{ display:'flex',alignItems:'center',gap:8,marginTop:4,cursor:'pointer',fontSize:13 }}>
                  <input type="checkbox" checked={cfg.tickerEnabled} onChange={e=>set('tickerEnabled',e.target.checked)}/> Mobile ticker
                </label>
              )}
            </div>

            {cfg.embedType === 'box' && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#888',marginBottom:6,textTransform:'uppercase',letterSpacing:.5 }}>Size</div>
                <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:13 }}>
                  <input type="number" value={cfg.width} min={150} max={800} onChange={e=>set('width',parseInt(e.target.value)||250)}
                    style={{ width:58,padding:'5px 6px',border:'1px solid #ddd',borderRadius:4,fontSize:12 }}/> px by
                  <input type="number" value={cfg.height} min={200} max={900} onChange={e=>set('height',parseInt(e.target.value)||350)}
                    style={{ width:58,padding:'5px 6px',border:'1px solid #ddd',borderRadius:4,fontSize:12 }}/> px
                </div>
              </div>
            )}

            {(cfg.embedType==='tab'||cfg.embedType==='button') && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#888',marginBottom:6,textTransform:'uppercase',letterSpacing:.5 }}>Corner</div>
                {[['bottom-right','Bottom right'],['bottom-left','Bottom left']].map(([v,l])=>(
                  <label key={v} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5,cursor:'pointer',fontSize:13 }}>
                    <input type="radio" checked={cfg.corner===v} onChange={()=>set('corner',v)}/> {l}
                  </label>
                ))}
              </div>
            )}

            {/* Color */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#888',marginBottom:6,textTransform:'uppercase',letterSpacing:.5 }}>Color</div>
              <div style={{ display:'flex',gap:4,flexWrap:'wrap',marginBottom:6 }}>
                <button onClick={()=>{set('accentColor','FFFFFF');setCustomColor('FFFFFF');}}
                  style={{ width:22,height:22,borderRadius:3,border:`2px solid ${cfg.accentColor==='FFFFFF'?'#333':'#ccc'}`,backgroundImage:'repeating-conic-gradient(#ccc 0 25%,#fff 0 50%)',backgroundSize:'8px 8px',cursor:'pointer',padding:0 }}/>
                {['FFFFFF','000000','CC0000','99CC00','3399FF','CC3300'].map(c=>(
                  <button key={c} onClick={()=>{set('accentColor',c);setCustomColor(c);}}
                    style={{ width:22,height:22,borderRadius:3,background:`#${c}`,cursor:'pointer',border:`2px solid ${cfg.accentColor===c?'#333':'#ccc'}`,padding:0 }}/>
                ))}
              </div>
              {showMoreColors && (
                <div style={{ display:'flex',gap:4,flexWrap:'wrap',marginBottom:6 }}>
                  {EXTRA_COLORS.map(c=>(
                    <button key={c} onClick={()=>{set('accentColor',c);setCustomColor(c);}}
                      style={{ width:22,height:22,borderRadius:3,background:`#${c}`,cursor:'pointer',border:`2px solid ${cfg.accentColor===c?'#333':'#ccc'}`,padding:0 }}/>
                  ))}
                </div>
              )}
              <div style={{ display:'flex',gap:6,alignItems:'center',marginBottom:4 }}>
                <div style={{ flex:1,height:16,borderRadius:3,background:`linear-gradient(to right,#${cfg.accentColor}00,#${cfg.accentColor})` }}/>
              </div>
              <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                <div style={{ width:18,height:18,borderRadius:3,background:accentHex,border:'1px solid #ccc',flexShrink:0 }}/>
                <input value={customColor} maxLength={6}
                  onChange={e=>{const v=e.target.value.toUpperCase().replace(/[^0-9A-F]/g,'');setCustomColor(v);if(v.length===6)set('accentColor',v);}}
                  style={{ width:80,padding:'3px 6px',border:'1px solid #ddd',borderRadius:4,fontFamily:'monospace',fontSize:12 }}/>
                <button onClick={()=>setShowMoreColors(v=>!v)} style={{ background:'none',border:'none',color:'#2196F3',fontSize:11,cursor:'pointer',padding:0 }}>
                  {showMoreColors?'Fewer':'More'} colours
                </button>
              </div>
            </div>

            <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,marginBottom:16 }}>
              <input type="checkbox" checked={cfg.showUrl} onChange={e=>set('showUrl',e.target.checked)}/> Show group URL in header
            </label>

            <button onClick={save} disabled={saving}
              style={{ width:'100%',padding:'9px',background:'#2196F3',color:'#fff',border:'none',borderRadius:4,fontSize:13,fontWeight:700,cursor:'pointer' }}>
              {saving?'Saving…':savedMsg||'Save Settings'}
            </button>
          </div>

          {/* Right: preview + code */}
          <div style={{ flex:1,padding:'18px 22px',overflow:'auto' }}>
            <div style={{ display:'flex',gap:0,marginBottom:14,borderBottom:'1px solid #eee' }}>
              {['desktop','mobile'].map(t=>(
                <button key={t} onClick={()=>setPreviewTab(t)} style={{ background:'none',border:'none',padding:'6px 14px',fontWeight:previewTab===t?700:400,color:previewTab===t?'#222':'#aaa',borderBottom:previewTab===t?'2px solid #2196F3':'2px solid transparent',cursor:'pointer',fontSize:13,marginBottom:-1,textTransform:'capitalize' }}>
                  {t} view
                </button>
              ))}
            </div>

            {/* Preview on fake website bg */}
            <div style={{ background:'repeating-linear-gradient(45deg,#e3f2fd 0,#e3f2fd 10px,#f5faff 10px,#f5faff 20px)',borderRadius:8,padding:24,minHeight:260,display:'flex',alignItems:cfg.embedType==='box'?'flex-start':'flex-end',justifyContent:cfg.corner==='bottom-left'?'flex-start':'flex-end',position:'relative' }}>
              <div style={{ position:'absolute',inset:0,overflow:'hidden',opacity:.35,fontSize:11,color:'#90caf9',lineHeight:1.8,padding:8,userSelect:'none',pointerEvents:'none' }}>
                {Array(30).fill('YOUR WEBSITE ').join('')}
              </div>
              <div style={{ position:'relative',zIndex:1 }}>
                {cfg.embedType==='box' && <PreviewBox/>}
                {cfg.embedType==='tab' && (
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end' }}>
                    <div style={{ background:accentHex,color:'#fff',padding:'6px 16px',fontSize:11,fontWeight:700,borderRadius:'6px 6px 0 0' }}>💬 {group.title||group.name}</div>
                    <PreviewBox/>
                  </div>
                )}
                {cfg.embedType==='button' && (
                  <button style={{ background:accentHex,color:'#fff',border:'none',borderRadius:99,padding:'10px 20px',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>💬 Chat</button>
                )}
              </div>
            </div>

            {/* Embed code */}
            <div style={{ marginTop:18 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                <span style={{ fontSize:13,fontWeight:700 }}>Embed code</span>
                <CopyBtn text={embedCode}/>
              </div>
              <pre style={{ background:'#f8f8f8',border:'1px solid #eee',borderRadius:6,padding:'12px 14px',fontSize:11,fontFamily:'monospace',overflowX:'auto',lineHeight:1.6,color:'#333',whiteSpace:'pre-wrap',wordBreak:'break-all' }}>{embedCode}</pre>
            </div>

            <div style={{ marginTop:10,fontSize:12,color:'#888' }}>
              Direct link:{' '}
              <a href={widgetUrl} target="_blank" rel="noopener" style={{ color:'#2196F3',display:'inline-flex',alignItems:'center',gap:3 }}>
                {widgetUrl.slice(0,55)}{widgetUrl.length>55?'…':''} <ExternalLink size={10}/>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
