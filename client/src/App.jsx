// ─── Chatavar — App Router ────────────────────────────────────────────────────
//
//  URL structure:
//    /                     → Landing (logged out) | redirect → /:username
//    /get-started          → Landing with auth modal open
//    /:username            → Groups dashboard
//    /:username/chat       → Private messages (DM app)
//    /g/:groupname         → Group chat page
//
//  Auth is resolved in index.jsx (bootAuth) before React renders.
//  This component never calls /me — it just reads the already-resolved store.
//
import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { useSocket } from './hooks/useSocket';
import Sidebar           from './components/Sidebar';
import ChatWindow        from './components/ChatWindow';
import ProfilePanel      from './components/ProfilePanel';
import Toasts            from './components/Toasts';
import ProfileEditModal  from './components/ProfileEditModal';
import SettingsPanel     from './components/SettingsPanel';
import LandingPage       from './components/LandingPage';
import GroupsPage        from './components/GroupsPage';
import GroupChatWindow   from './components/GroupChatWindow';
import CreateGroupPage   from './components/CreateGroupPage';
import HelpPage          from './components/HelpPage';
import api               from './utils/api';
import { navigate }      from './utils/navigate';
export { navigate };
import './styles/globals.css';
import './store/useTheme';

// ── Tiny router ───────────────────────────────────────────────────────────────
function getRoute() {
  const path = window.location.pathname;
  const gMatch    = path.match(/^\/g\/([^/]+)/);
  if (gMatch) return { type: 'group', groupName: gMatch[1] };
  const chatMatch = path.match(/^\/([^/]+)\/chat$/);
  if (chatMatch) return { type: 'chat', username: chatMatch[1] };
  if (path.startsWith('/new-group')) return { type: 'new-group' };
  if (path === '/get-started') return { type: 'get-started' };
  if (path === '/help') return { type: 'help' };
  const dashMatch = path.match(/^\/([^/]+)$/);
  if (dashMatch && !['widget-login','embed.js','health','help'].includes(dashMatch[1]))
    return { type: 'dashboard', username: dashMatch[1] };
  return { type: 'landing' };
}

// ── DM chat view ──────────────────────────────────────────────────────────────
function ChatApp({ username }) {
  const { activeChat, setSidebarOpen, profilePanelUser, settingsOpen, setSettingsOpen } = useStore();
  const [editProfile, setEditProfile] = useState(false);
  useEffect(() => {
    if (window.innerWidth <= 768 && activeChat) setSidebarOpen(false);
  }, [activeChat]);
  return (
    <div className="app">
      <Sidebar
        onEditProfile={() => setEditProfile(true)}
        onShowGroups={() => navigate(`/${username}`)}
        groupsActive={false}
      />
      <ChatWindow />
      {profilePanelUser && <ProfilePanel />}
      {editProfile && <ProfileEditModal onClose={() => setEditProfile(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      <Toasts />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { currentUser, logout } = useStore();
  const [route,    setRoute]    = useState(getRoute);
  const [groupObj, setGroupObj] = useState(null);

  // Track URL changes
  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // If logged in and on landing/get-started, redirect to dashboard
  useEffect(() => {
    if (!currentUser) return;
    const r = getRoute();
    if (r.type === 'landing' || r.type === 'get-started') {
      navigate(`/${currentUser.username}`, true);
    }
  }, [currentUser?.id]);

  // Load group object for /g/ routes
  useEffect(() => {
    if (route.type !== 'group' || !route.groupName) return;
    setGroupObj(null);
    api.get(`/groups/${route.groupName}`)
      .then(({ data }) => setGroupObj(data.group))
      .catch(() => setGroupObj(null));
  }, [route.type, route.groupName]);

  useSocket();

  // ── /g/:groupname ─────────────────────────────────────────────────────────
  if (route.type === 'group') {
    if (!groupObj) return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', color:'#aaa', fontFamily:'sans-serif', fontSize:14 }}>
        Loading group…
      </div>
    );
    return (
      <>
        <GroupChatWindow
          group={groupObj}
          onBack={() => currentUser ? navigate(`/${currentUser.username}`) : navigate('/')}
        />
        <Toasts />
      </>
    );
  }

  // ── /help ──────────────────────────────────────────────────────────────────
  if (route.type === 'help') {
    return <HelpPage
      onBack={() => navigate(currentUser ? `/${currentUser.username}` : '/')}
      onLogout={currentUser ? () => { logout(); navigate('/'); } : null}
    />;
  }

  // ── /:username/chat ───────────────────────────────────────────────────────
  if (route.type === 'chat') {
    if (!currentUser || currentUser.username.toLowerCase() !== route.username.toLowerCase()) {
      navigate(currentUser ? `/${currentUser.username}` : '/', true);
      return null;
    }
    return <ChatApp username={currentUser.username} />;
  }

  // ── /:username (groups dashboard) ────────────────────────────────────────
  if (route.type === 'dashboard') {
    return (
      <>
        <GroupsPage
          username={route.username}
          onOpenGroup={g => navigate(`/g/${g.name}`)}
          onPrivateMessages={() => navigate(`/${currentUser?.username}/chat`)}
        />
        <Toasts />
      </>
    );
  }

  // ── /new-group — create group page ──────────────────────────────────────
  if (route.type === 'new-group') {
    return <><CreateGroupPage /><Toasts /></>;
  }

  // ── /get-started — show landing with auth modal open ─────────────────────
  if (route.type === 'get-started') {
    if (currentUser) { navigate(`/${currentUser.username}`, true); return null; }
    return <LandingPage onGetStarted={() => navigate('/get-started')} forceAuth />;
  }

  // ── / — Landing (logged-in users always redirect to dashboard) ──────────
  if (currentUser) { navigate(`/${currentUser.username}`, true); return null; }
  return <LandingPage onGetStarted={() => navigate('/get-started')} />;
}
