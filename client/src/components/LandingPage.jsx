import { useState } from 'react';
import AuthModal from './AuthModal';

// ── Feature row ───────────────────────────────────────────────────────────────
function Feature({ icon, title, desc }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:32, padding:'48px 0', borderBottom:'1px solid #eee' }}>
      <div style={{ width:120, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:64, opacity:.25 }}>{icon}</div>
      </div>
      <div>
        <h3 style={{ color:'#2196F3', fontSize:22, fontWeight:400, marginBottom:10 }}>{title}</h3>
        <p style={{ color:'#666', fontSize:15, lineHeight:1.7, maxWidth:520 }}>{desc}</p>
      </div>
    </div>
  );
}

// ── Mock chatbox for hero ─────────────────────────────────────────────────────
function MockChatbox({ color = '#CC0000', title = 'Breaking News', messages }) {
  const msgs = messages || [
    { name:'Bob',    color:'#e65100', text:'@Alice I don\'t think a lot of people do anymore, smartphones have pretty much replaced them.' },
    { name:'Doug',   color:'#1565c0', text:'@Rachel The last tornado was this last Thursday EF-0. Last major... I have no idea.' },
    { name:'Kelly',  color:'#2e7d32', text:'is there looking like any tornadic activity in the metro?' },
    { name:'Rachel', color:'#6a1571', text:'@Bob raining in Plainesville already.' },
  ];
  return (
    <div style={{ width:200, border:'1px solid #ddd', borderRadius:4, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,.15)', background:'#fff', fontSize:12 }}>
      <div style={{ background:color, color:'#fff', padding:'5px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:13 }}>{title}</div>
          <div style={{ fontSize:9, opacity:.8 }}>chatavar.com/g/{title.toLowerCase().replace(/\s+/g,'-')}</div>
        </div>
        <span style={{ cursor:'pointer', opacity:.8 }}>✕</span>
      </div>
      <div style={{ background:'#fff', overflow:'hidden' }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:'flex', gap:6, padding:'5px 6px', borderBottom:'1px solid #f5f5f5', alignItems:'flex-start' }}>
            <div style={{ width:28,height:28,borderRadius:'50%',background:m.color,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11 }}>
              {m.name[0]}
            </div>
            <div style={{ fontSize:11, color:'#333', lineHeight:1.4, flex:1 }}>
              <span style={{ fontWeight:700, color:m.color }}>{m.name}: </span>{m.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'5px 6px', borderTop:'1px solid #eee', display:'flex', gap:4, background:'#fafafa' }}>
        <div style={{ flex:1, background:'#fff', border:'1px solid #ddd', borderRadius:3, padding:'3px 6px', fontSize:11, color:'#aaa' }}>Type here</div>
        <span style={{ fontSize:10 }}>😊</span><span style={{ fontSize:10, fontWeight:700 }}>A</span>
      </div>
      <div style={{ background:color, padding:'3px 8px', display:'flex', justifyContent:'space-between' }}>
        <span style={{ color:'rgba(255,255,255,.9)', fontSize:10, fontWeight:700 }}>chatavar</span>
        <span style={{ color:'rgba(255,255,255,.8)', fontSize:10 }}>🔊 146 &nbsp; Set name</span>
      </div>
    </div>
  );
}

export default function LandingPage({ onGetStarted, forceAuth = false }) {
  const [showAuth, setShowAuth] = useState(forceAuth);

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', overflowY:'auto' }}>

      {/* ── Nav ── */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:60, borderBottom:'1px solid #f0f0f0', position:'sticky', top:0, background:'#fff', zIndex:100 }}>
        <div style={{ fontSize:26, fontWeight:300, color:'#2196F3', letterSpacing:-.5 }}>chatavar</div>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          <a href="#features" style={{ color:'#555', textDecoration:'none', fontSize:14 }}>Help</a>
          <button onClick={() => setShowAuth(true)} style={{ background:'none', border:'none', color:'#555', fontSize:14, cursor:'pointer', padding:0 }}>
            Log in
          </button>
          <button onClick={() => setShowAuth(true)} style={{
            background:'#FFC107', color:'#333', border:'none', borderRadius:4,
            padding:'8px 22px', fontSize:14, fontWeight:700, cursor:'pointer',
          }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ textAlign:'center', padding:'72px 24px 0' }}>
        <h1 style={{ fontSize:40, fontWeight:300, color:'#333', marginBottom:0, letterSpacing:-.5 }}>
          Live group chat for websites
        </h1>
      </div>

      {/* ── Chatbox carousel ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', gap:0, padding:'40px 0 60px', overflow:'hidden', position:'relative' }}>
        {/* Left faded box */}
        <div style={{ opacity:.35, transform:'scale(.92)', transformOrigin:'right center', marginRight:-20 }}>
          <div style={{ background:'#f8f8f8', border:'1px solid #e0e0e0', borderRadius:8, padding:'12px 16px', width:200 }}>
            <div style={{ fontSize:11, color:'#999', textAlign:'right', marginBottom:4 }}>BLOG &nbsp; REVIEWS &nbsp; STORE</div>
            <MockChatbox color='#555' title='Game On' messages={[
              {name:'Riley',color:'#888',text:'Grey had 35 extra jumps, guys'},
              {name:'Jessie',color:'#888',text:'This room makes me think of Jet Force Gemini!'},
              {name:'Charlie',color:'#888',text:"They're like guns but on ceiling"},
            ]}/>
          </div>
        </div>

        {/* Center box — full visibility on fake news site */}
        <div style={{ zIndex:2, transform:'scale(1.05)', margin:'0 8px' }}>
          <div style={{ background:'#f8f8f8', border:'1px solid #ddd', borderRadius:8, padding:'12px', width:380, boxShadow:'0 4px 24px rgba(0,0,0,.1)' }}>
            <div style={{ fontSize:18, color:'#999', fontWeight:300, marginBottom:8 }}>NEWS 24/7</div>
            <div style={{ display:'flex', gap:12 }}>
              {/* Fake article wireframe */}
              <div style={{ flex:1 }}>
                <div style={{ background:'#e0e0e0', borderRadius:3, height:80, display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8, color:'#bbb', fontSize:20 }}>▶</div>
                <div style={{ fontWeight:700, color:'#333', marginBottom:6, fontSize:12 }}>Breaking News: Headline!</div>
                {[60,80,70,55,75,65].map((w,i) => (
                  <div key={i} style={{ background:'#e0e0e0', height:8, borderRadius:2, width:`${w}%`, marginBottom:5 }}/>
                ))}
              </div>
              {/* Chatbox */}
              <MockChatbox color='#CC0000' title='News Chat' messages={[
                {name:'Bob',   color:'#e65100',text:"@Alice I don't think a lot of people do anymore, smartphones have pretty much replaced them."},
                {name:'Doug',  color:'#1565c0',text:'@Rachel The last tornado was this last Thursday EF-0.'},
                {name:'Kelly', color:'#2e7d32',text:'is there looking like any tornadic activity in the metro?'},
                {name:'Rachel',color:'#6a1571',text:'@Bob raining in Plainesville already.'},
              ]}/>
            </div>
          </div>
        </div>

        {/* Right faded box */}
        <div style={{ opacity:.35, transform:'scale(.92)', transformOrigin:'left center', marginLeft:-20 }}>
          <div style={{ background:'#f8f8f8', border:'1px solid #e0e0e0', borderRadius:8, padding:'12px 16px', width:200 }}>
            <div style={{ fontSize:11, color:'#999', textAlign:'right', marginBottom:4 }}>SPORTSNET</div>
            <div style={{ background:'#e0e0e0', height:80, borderRadius:3, display:'flex',alignItems:'center',justifyContent:'center', color:'#bbb', marginBottom:6 }}>📺</div>
            <div style={{ display:'flex', gap:4, marginBottom:4 }}>
              {['#ccc','#bbb','#ddd'].map((c,i)=><div key={i} style={{height:24,flex:1,background:c,borderRadius:2}}/>)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tagline ── */}
      <div style={{ textAlign:'center', padding:'0 24px 72px' }}>
        <p style={{ color:'#666', fontSize:17 }}>Keep your community on your site</p>
      </div>

      {/* ── Features ── */}
      <div id="features" style={{ maxWidth:720, margin:'0 auto', padding:'0 40px' }}>
        <Feature
          icon="🛡️"
          title="Clean conversation"
          desc="Auto-moderation: Advanced machine text analysis. Community moderation: Fine-grained moderator permissions."
        />
        <Feature
          icon="⚡"
          title="Fast on large sites"
          desc="Handles traffic spikes for breaking live events. Administrators can set a message rate limit per user, to keep large groups readable."
        />
        <Feature
          icon="💻"
          title="Works on all devices"
          desc="Optimized to work on mobile, tablets and desktop."
        />
        <Feature
          icon="🏷️"
          title="Free"
          desc="Chatavar is free to use. Embed live chat on any website with no limits."
        />
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{ textAlign:'center', padding:'72px 24px 40px' }}>
        <button onClick={() => setShowAuth(true)} style={{
          background:'#FFC107', color:'#333', border:'none', borderRadius:4,
          padding:'13px 40px', fontSize:16, fontWeight:700, cursor:'pointer',
        }}>
          Get Started
        </button>
      </div>

      {/* ── Footer ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', padding:'16px 40px', borderTop:'1px solid #f0f0f0', gap:24 }}>
        {['Help','Terms of use','Privacy policy','About us'].map(l => (
          <a key={l} href="#" style={{ color:'#2196F3', textDecoration:'none', fontSize:13 }}>{l}</a>
        ))}
      </div>

      {showAuth && <AuthModal title="log in to chatavar" onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); }} />}
    </div>
  );
}
