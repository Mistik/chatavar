const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const fs          = require('fs');
const authRoutes  = require('./routes/auth');
const userRoutes  = require('./routes/users');
const groupRoutes = require('./routes/groups');
const helpRoutes  = require('./routes/help');
const modRoutes   = require('./routes/moderation');
const config      = require('./config');

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

function createApp() {
  const app = express();

  // ── Wide-open CORS for widget iframe / embed.js ──────────────────────────
  app.use((req, res, next) => {
    const widgetPaths = ['/g/', '/widget-bundle.js', '/embed.js', '/widget-login'];
    if (widgetPaths.some(p => req.path.startsWith(p))) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(express.json());

  if (process.env.NODE_ENV !== 'production') {
  }

  // ── Serve built client assets (widget-bundle.js, index.html, etc) ────────
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
  }

  // ── /embed.js — the loader script website owners copy-paste ─────────────
  app.get('/embed.js', (req, res) => {
    const SERVER = `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
(function() {
  var cfg = window.chatavar_config || {};
  if (!cfg.group) { console.warn('[chatavar] window.chatavar_config.group is required'); return; }
  var server = '${SERVER}';
  var color  = (cfg.color || 'CC0000').replace('#','');
  var type   = cfg.type   || 'box';
  var width  = cfg.width  || 250;
  var height = cfg.height || 350;
  var corner = cfg.corner || 'bottom-right';
  var showUrl= cfg.showUrl !== false ? 1 : 0;

  var src = server + '/g/' + cfg.group +
    '?color=' + encodeURIComponent(color) +
    '&showUrl=' + showUrl;

  function makeIframe() {
    var f = document.createElement('iframe');
    f.src = src;
    f.style.border = 'none';
    f.setAttribute('allowtransparency','true');
    f.title = 'chatavar — ' + cfg.group;
    return f;
  }

  if (type === 'box') {
    var el = document.getElementById('chatavar-box') || document.getElementById('chatavar') || document.createElement('div');
    if (!el.parentNode) document.body.appendChild(el);
    var f = makeIframe();
    f.width  = width;
    f.height = height;
    f.style.display = 'block';
    el.appendChild(f);

  } else if (type === 'tab') {
    // Sticky corner tab that expands to a box
    var corners = { 'bottom-right': {bottom:'0',right:'0'}, 'bottom-left': {bottom:'0',left:'0'} };
    var pos = corners[corner] || corners['bottom-right'];
    var wrap = document.createElement('div');
    wrap.id = 'cv-tab-wrap';
    Object.assign(wrap.style, { position:'fixed', zIndex:99999, transition:'all .25s' }, pos);

    var tab = document.createElement('div');
    tab.innerHTML = '&#x1F4AC; ' + (cfg.label || 'Chat');
    Object.assign(tab.style, {
      background: '#' + color, color:'#fff', padding:'7px 18px', cursor:'pointer',
      fontFamily:'sans-serif', fontSize:'13px', fontWeight:'700', userSelect:'none',
      borderRadius: corner==='bottom-right'?'8px 0 0 0':'0 8px 0 0',
    });

    var box = document.createElement('div');
    box.style.cssText = 'display:none;';
    var f = makeIframe();
    f.width = width; f.height = height;
    box.appendChild(f);

    var open = false;
    tab.onclick = function() {
      open = !open;
      box.style.display = open ? 'block' : 'none';
    };

    wrap.appendChild(tab);
    wrap.appendChild(box);
    document.body.appendChild(wrap);

  } else if (type === 'button') {
    var corners2 = { 'bottom-right': {bottom:'12px',right:'12px'}, 'bottom-left': {bottom:'12px',left:'12px'} };
    var pos2 = corners2[corner] || corners2['bottom-right'];
    var btn = document.createElement('button');
    btn.innerHTML = '&#x1F4AC; Chat';
    Object.assign(btn.style, {
      position:'fixed', zIndex:99999, background:'#'+color, color:'#fff',
      border:'none', borderRadius:'99px', padding:'10px 20px', cursor:'pointer',
      fontFamily:'sans-serif', fontSize:'14px', fontWeight:'700', boxShadow:'0 2px 12px rgba(0,0,0,.2)',
    }, pos2);

    var chatOpen = false;
    var chatFrame = null;
    btn.onclick = function() {
      chatOpen = !chatOpen;
      if (chatOpen && !chatFrame) {
        chatFrame = document.createElement('div');
        Object.assign(chatFrame.style, {
          position:'fixed', zIndex:99998, bottom:'64px', right:'12px',
          boxShadow:'0 4px 24px rgba(0,0,0,.2)', borderRadius:'8px', overflow:'hidden',
        });
        var f = makeIframe();
        f.width = width; f.height = height;
        chatFrame.appendChild(f);
        document.body.appendChild(chatFrame);
      }
      if (chatFrame) chatFrame.style.display = chatOpen ? 'block' : 'none';
    };
    document.body.appendChild(btn);
  }
})();
`);
  });

  // ── /g/:name — serve the widget iframe page ───────────────────────────────
  app.get('/g/:name', (req, res) => {
    const db = require('./db');
    const group = db.getGroupByName(req.params.name);
    if (!group) return res.status(404).send('<h3>Group not found</h3>');

    const color   = (req.query.color || group.accent_color || 'CC0000').replace('#','');
    const showUrl = req.query.showUrl !== '0' ? 1 : 0;
    const server  = `${req.protocol}://${req.get('host')}`;

    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${group.title || group.name} — chatavar</title>
<style>*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%;overflow:hidden}</style>
<script>
  window.__CV_GROUP  = ${JSON.stringify(group.name)};
  window.__CV_COLOR  = ${JSON.stringify(color)};
  window.__CV_SERVER = ${JSON.stringify(server)};
  window.__CV_SHOW_URL = ${showUrl};
</script>
</head>
<body>
<div id="root"></div>
<script>
// Inline config — widget reads from window params, not URL, for iframe compatibility
var s = new URLSearchParams(window.location.search);
window.history.replaceState(null,'',
  '?group=' + encodeURIComponent(window.__CV_GROUP) +
  '&color=' + encodeURIComponent(window.__CV_COLOR) +
  '&server=' + encodeURIComponent(window.__CV_SERVER) +
  '&showUrl=' + window.__CV_SHOW_URL
);
</script>
<script src="/widget-bundle.js"></script>
</body></html>`);
  });

  // ── /widget-login — popup login for embedded widget ───────────────────────
  app.get('/widget-login', (req, res) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><title>Log in — chatavar</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f5f7}
  .box{background:#fff;border-radius:12px;padding:28px;width:320px;box-shadow:0 4px 24px rgba(0,0,0,.12)}
  h2{font-size:18px;margin-bottom:4px;color:#111}
  .sub{font-size:13px;color:#888;margin-bottom:20px}
  input{width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:10px;font-family:inherit;outline:none}
  input:focus{border-color:#CC0000}
  button{width:100%;padding:10px;background:#CC0000;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer}
  .err{color:#ed4245;font-size:12px;margin-bottom:8px;display:none}
  .foot{margin-top:14px;text-align:center;font-size:12px;color:#aaa}
  .foot a{color:#CC0000;text-decoration:none}
</style>
</head>
<body>
<div class="box">
  <h2>log in to chatavar</h2>
  <p class="sub">Sign in to chat with your account.</p>
  <div class="err" id="err"></div>
  <input id="u" placeholder="Username" autocomplete="username"/>
  <input id="p" placeholder="Password" type="password" autocomplete="current-password"/>
  <button onclick="login()">Log In</button>
  <p class="foot">No account? <a href="/" target="_blank">register on chatavar</a></p>
</div>
<script>
async function login(){
  var err=document.getElementById('err');
  err.style.display='none';
  var res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:document.getElementById('u').value,password:document.getElementById('p').value})});
  var d=await res.json();
  if(!res.ok){err.textContent=d.error||'Login failed';err.style.display='block';return;}
  // Get user info
  var me=await fetch('/api/me',{headers:{Authorization:'Bearer '+d.token}}).then(r=>r.json());
  window.opener&&window.opener.postMessage({type:'CV_LOGIN',token:d.token,user:me.user},'*');
  document.body.innerHTML='<div style="text-align:center;padding:40px;font-family:sans-serif"><h2 style="color:#3ba55c">✓ Logged in!</h2><p style="color:#888;margin-top:8px">Closing…</p></div>';
  setTimeout(()=>window.close(),1200);
}
document.addEventListener('keydown',e=>{if(e.key==='Enter')login();});
</script>
</body></html>`);
  });

  // ── /pm-embed.js — loader script for private chat mini box on external sites ─
  app.get('/pm-embed.js', (req, res) => {
    const SERVER = `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
(function(){
  var cfg = window.chatavar_pm || {};
  if(!cfg.user){console.warn('[chatavar] window.chatavar_pm.user is required');return;}
  var server = '${SERVER}';
  var color  = (cfg.color||'0088ff').replace('#','');
  var corner = cfg.corner||'bottom-right';
  var label  = cfg.label||'Message '+cfg.user;

  var isRight = corner==='bottom-right';
  var wrap = document.createElement('div');
  wrap.id = 'cv-pm-wrap';
  Object.assign(wrap.style,{position:'fixed',zIndex:'99999',bottom:'0'},
    isRight?{right:'0'}:{left:'0'});

  // Status dot — updated via polling
  var dot = document.createElement('span');
  Object.assign(dot.style,{width:'8px',height:'8px',borderRadius:'50%',
    background:'#999',display:'inline-block',marginRight:'6px',transition:'background .3s'});

  // Tab button
  var tab = document.createElement('div');
  tab.appendChild(dot);
  tab.appendChild(document.createTextNode(label));
  Object.assign(tab.style,{
    background:'#'+color,color:'#fff',padding:'8px 18px',cursor:'pointer',
    fontFamily:'-apple-system,sans-serif',fontSize:'13px',fontWeight:'700',
    userSelect:'none',display:'flex',alignItems:'center',
    borderRadius:isRight?'8px 0 0 0':'0 8px 0 0'});

  // Chat frame
  var box = document.createElement('div');
  box.style.cssText = 'display:none;';
  var f = document.createElement('iframe');
  f.src = server+'/pm/'+encodeURIComponent(cfg.user)+'?color='+color;
  f.style.border='none';
  f.width = cfg.width||280;
  f.height = cfg.height||380;
  f.setAttribute('allowtransparency','true');
  f.title = 'Chat with '+cfg.user;
  box.appendChild(f);

  var open = false;
  tab.onclick = function(){open=!open;box.style.display=open?'block':'none';};

  wrap.appendChild(box);
  wrap.appendChild(tab);
  document.body.appendChild(wrap);

  // Poll online status every 15s
  function checkStatus(){
    fetch(server+'/api/users/'+encodeURIComponent(cfg.user))
      .then(function(r){return r.json()})
      .then(function(d){dot.style.background=d.user&&d.user.online?'#22c55e':'#999'})
      .catch(function(){});
  }
  checkStatus();
  setInterval(checkStatus,15000);
})();
`);
  });

  // ── /pm/:username — self-contained private chat iframe page ─────────────
  app.get('/pm/:username', (req, res) => {
    const db = require('./db');
    const presence = require('./presence');
    const target = db.getUserByUsername(req.params.username);
    if (!target) return res.status(404).send('<h3>User not found</h3>');

    const color = (req.query.color || '0088ff').replace('#', '');
    const server = `${req.protocol}://${req.get('host')}`;
    const isOnline = presence.isOnline(target.id);

    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chat with ${target.username}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body{display:flex;flex-direction:column;background:#fff}
.hdr{padding:10px 14px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;flex-shrink:0}
.hdr-avatar{width:32px;height:32px;border-radius:50%;background:#${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}
.hdr-name{font-weight:700;font-size:14px;color:#111}
.hdr-status{font-size:11px;display:flex;align-items:center;gap:4px}
.hdr-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.msgs{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.msg{max-width:85%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.45;word-break:break-word}
.msg.mine{align-self:flex-end;background:#${color};color:#fff;border-bottom-right-radius:4px}
.msg.theirs{align-self:flex-start;background:#f3f4f6;color:#111;border-bottom-left-radius:4px}
.msg-time{font-size:9px;opacity:.6;margin-top:2px}
.input-bar{padding:8px 10px;border-top:1px solid #e5e7eb;display:flex;gap:6px;flex-shrink:0;background:#fff}
.input-bar input{flex:1;padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:20px;font-size:13px;outline:none;font-family:inherit}
.input-bar input:focus{border-color:#${color}}
.input-bar button{width:34px;height:34px;border-radius:50%;border:none;background:#${color};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.input-bar button:disabled{opacity:.4;cursor:default}
.login-bar{padding:12px 14px;text-align:center;font-size:12px;color:#888;border-top:1px solid #e5e7eb;flex-shrink:0}
.login-bar a{color:#${color};font-weight:600;text-decoration:none;cursor:pointer}
.empty{flex:1;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:13px;text-align:center;padding:20px}
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-avatar">${target.username[0].toUpperCase()}</div>
  <div>
    <div class="hdr-name">${target.username}</div>
    <div class="hdr-status">
      <span class="hdr-dot" id="statusDot" style="background:${isOnline ? '#22c55e' : '#999'}"></span>
      <span id="statusText">${isOnline ? 'Online' : 'Offline'}</span>
    </div>
  </div>
</div>
<div class="msgs" id="msgs">
  <div class="empty" id="emptyMsg">Send a message to start chatting</div>
</div>
<div id="authArea"></div>

<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
var SERVER = ${JSON.stringify(server)};
var TARGET = ${JSON.stringify(target.username)};
var token = null;
var myUsername = null;
var socket = null;

// Check for stored token
try { token = localStorage.getItem('cv_pm_token'); } catch(e){}

function initSocket() {
  if (socket) socket.disconnect();
  socket = io(SERVER.replace('http','ws').replace(':${config.port}',':${config.wsPort}'), {
    auth: { token: token },
    transports: ['websocket','polling'],
  });
  socket.on('connect', function(){
    socket.emit('status_update',{status:'online'});
  });
  socket.on('message_signal', function(data){
    if (data.fromUsername.toLowerCase() === TARGET.toLowerCase()) {
      addMessage(data.message || {text: data.fromUsername+' sent a message'}, false);
    }
  });
  socket.on('init', function(){});
  socket.on('online_users', function(users){
    var online = users.some(function(u){return u.username&&u.username.toLowerCase()===TARGET.toLowerCase()});
    document.getElementById('statusDot').style.background = online?'#22c55e':'#999';
    document.getElementById('statusText').textContent = online?'Online':'Offline';
  });
}

function showLoggedIn(username) {
  myUsername = username;
  document.getElementById('authArea').innerHTML =
    '<div class="input-bar">' +
    '<input id="msgInput" placeholder="Message '+TARGET+'…" autocomplete="off"/>' +
    '<button id="sendBtn" onclick="sendMsg()" disabled>&#9654;</button>' +
    '</div>' +
    '<div style="text-align:center;padding:4px;font-size:10px;color:#aaa">chatting as <b>'+username+'</b></div>';
  var inp = document.getElementById('msgInput');
  inp.addEventListener('input', function(){document.getElementById('sendBtn').disabled=!inp.value.trim()});
  inp.addEventListener('keydown', function(e){if(e.key==='Enter'&&inp.value.trim())sendMsg()});
}

function showLoginPrompt() {
  document.getElementById('authArea').innerHTML =
    '<div class="login-bar">' +
    '<a onclick="doLogin()">Log in</a> or <a href="'+SERVER+'" target="_blank">register</a> to send messages' +
    '</div>';
}

function doLogin() {
  var w = window.open(SERVER+'/widget-login','cv_login','width=380,height=480');
  window.addEventListener('message', function handler(e){
    if(e.data&&e.data.type==='CV_LOGIN'){
      token = e.data.token;
      myUsername = e.data.user.username;
      try{localStorage.setItem('cv_pm_token',token)}catch(ex){}
      window.removeEventListener('message',handler);
      initSocket();
      showLoggedIn(myUsername);
    }
  });
}

function sendMsg() {
  var inp = document.getElementById('msgInput');
  var text = inp.value.trim();
  if (!text||!socket||!myUsername) return;
  var msg = {id:Date.now()+'',fromUsername:myUsername,toUsername:TARGET,text:text,timestamp:Date.now()};
  socket.emit('private_message',{toUsername:TARGET,message:msg});
  addMessage(msg, true);
  inp.value = '';
  document.getElementById('sendBtn').disabled = true;
}

function addMessage(msg, mine) {
  var el = document.getElementById('emptyMsg');
  if(el) el.remove();
  var msgs = document.getElementById('msgs');
  var div = document.createElement('div');
  div.className = 'msg '+(mine?'mine':'theirs');
  div.textContent = msg.text||'';
  var time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = new Date(msg.timestamp||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  div.appendChild(time);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// Boot
if (token) {
  fetch(SERVER+'/api/me',{headers:{Authorization:'Bearer '+token}})
    .then(function(r){if(!r.ok)throw 0;return r.json()})
    .then(function(d){myUsername=d.user.username;initSocket();showLoggedIn(myUsername)})
    .catch(function(){token=null;try{localStorage.removeItem('cv_pm_token')}catch(e){}showLoginPrompt()});
} else {
  showLoginPrompt();
}

// Poll status
setInterval(function(){
  fetch(SERVER+'/api/users/'+encodeURIComponent(TARGET))
    .then(function(r){return r.json()})
    .then(function(d){
      var on=d.user&&d.user.online;
      document.getElementById('statusDot').style.background=on?'#22c55e':'#999';
      document.getElementById('statusText').textContent=on?'Online':'Offline';
    }).catch(function(){});
},20000);
</script>
</body></html>`);
  });

  // ── REST API ─────────────────────────────────────────────────────────────
  app.use('/api', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/groups', modRoutes);
  app.use('/help', helpRoutes);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ── Client-side routing fallback (production) ─────────────────────────────
  // Any route not matched above (e.g. /zubair, /zubair/chat, /g/mygroup) gets
  // index.html so the React router can handle it.
  if (fs.existsSync(CLIENT_DIST)) {
    app.get('*', (req, res) => {
      // Don't catch API or socket routes
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  } else {
    app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  }

  return app;
}

module.exports = { createApp };
