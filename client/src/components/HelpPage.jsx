// ─── Help Page — exact Chatango layout ────────────────────────────────────────
import { useState, useEffect } from 'react';

const OWNER_LINKS = [
  ['create','Embedding options'],['large_events','Prepare your group for large events'],
  ['ban_words','Banned content'],['restrictions','Troll and spam protection'],
  ['moderate','Moderation controls'],['auto_moderate','Auto moderation'],
  ['app','Manage with the Chatavar App'],['announcements','Periodic announcements'],
  ['my_group_chat','Issue with my group chat'],['ban_evasion','Evasion of a moderators ban'],
  ['remove','Remove a group from a page'],['delete_group','Delete a group chat'],
  ['https_sec','HTTPS support and security'],['suggestions','I have an idea for Chatavar'],
  ['report_bug','Report a bug'],
];

const USER_COL1 = {
  'Your account': [['change_name','Change user name'],['change_email','Change email'],['change_password','Change password'],['delete_account','Delete account'],['log_in_fail',"Can't log in"],['password_reset',"Password didn't arrive"]],
  'Unused accounts': [['get_unused','Get an unused account'],['unused_issue','Unused account issue']],
  'Profile': [['profile_create','Create a profile'],['profile_automod','Account is hidden from Members'],['profile_edit',"Can't edit"],['profile_upload',"Can't upload picture"]],
};
const USER_COL2 = {
  'Group chat': [['group_moderate','Moderation controls'],['group_auto_mod','Auto moderation'],['group_banned',"Others can't read my messages"],['group_moderator','Become a moderator'],['group_turn_off','Turn off chat in a site I visit'],['group_respond','Respond to a user'],['group_participants','Participants list']],
  'Private chat': [['pm_blocking','Block and unblock people'],['pm_mini','Put a private chat on a web page'],['pm_catcher','Stay online when browser is closed'],['pm_unlist','Limit contact from strangers'],['pm_report','Report inappropriate profiles'],['pm_history','Manage private chat history'],['pm_connection','Connection problems'],['pm_sound','Change message sound'],['pm_colors','Turn off colored messages'],['pm_friends','Add friends']],
};
const USER_COL3 = {
  'Suggestions or ideas': [['suggestions','I have an idea for Chatavar']],
  'Technical problems, bugs': [['report_bug','Report a bug'],['payment','Problem with payment']],
  'Security and Safety': [['compromised','Compromised accounts'],['pm_unlist','Limit contact from strangers'],['parents','Information for parents'],['abuse','Abusive users']],
};

const ARTICLES = {
  create:{t:'Embedding options',h:'<p>The group configurator allows you to choose between three layouts: <b>Box</b> and two small footprint layouts: <b>Ticker</b> and <b>Tab</b>.</p><p>Each layout requires a permanent Group name, that cannot be changed.</p><p>The Chatavar URL at the top of the group can be disabled by unchecking "Show URL" checkbox in the configurator.</p><p>In the Box view, click on "More color controls" to fully customize the group. The Ticker and Tab views have an expanded Box view, that can be customized when they are clicked in the configurator.</p><p>If you want a plain layout, uncheck "User images" and uncheck "Allow user\'s message styles".</p>'},
  large_events:{t:'Prepare your group for large events',h:'<p>If you are planning to place a group on a site with high traffic, we recommend the following settings:</p><h3>Configure banned content</h3><p>Add banned words, and set "Send censored messages" to "Only to author". Consider banning links and images.</p><h3>Disallow anonymous messages</h3><p>If someone wants to contribute meaningfully, then they will sign in. Set the chat restrictions to "No anons."</p><h3>Switch on slow mode</h3><p>Have users think before they send, set a restriction on how often they can send a message.</p><h3>Make moderators</h3><p>Designate moderators to permanently ban destructive participants.</p><h3>Turn off private messaging</h3><p>When you generate your group code, you can turn off private messaging by unchecking "Private messaging" checkbox in the group configurator.</p>'},
  ban_words:{t:'Banned content',h:'<p>Group owners and administrators can ban certain words from a chat. Log in as the group owner and click the Main menu → Banned content.</p><h3>About banned words</h3><p>Words in the "word parts" box censors words even when they are a part of a longer word. Exact words box will censor a word only when it is surrounded by spaces.</p><p>Banned words are resilient to many misspellings. E.g. if the word "naughty" is on the list, then "nAughty nauggghty nau9hty n.aught.y" will be shown as ****</p><h3>Control who sees censored messages</h3><p>If you set "Send censored messages" to Only to author, the sender of censored message will be unaware that their messages are not delivered to other users. This is the most secure option.</p><h3>Ban rich content</h3><p>Use the checkboxes to ban links, videos, and images.</p>'},
  restrictions:{t:'Troll and spam protection',h:'<p>To mitigate spam and trolling, you can set who and how frequently can message in your chat:</p><h3>No anons</h3><p>Control whether anonymous messages are allowed.</p><h3>Broadcast mode</h3><p>Only the owner and designated moderators can post.</p><h3>Closed without moderators</h3><p>If there are no moderators in the group, no one can post.</p><h3>Slow mode</h3><p>Restrict users to one post per 30 seconds, or an interval that you set. This does not apply to the owner, and moderators can be exempted.</p><h3>Ban proxies and VPNs</h3><p>Prevents messaging from a proxy or VPN service.</p>'},
  moderate:{t:'Moderation controls',h:'<p>As a group owner, you can delete messages and ban people. You can also grant this permission to your group administrators.</p><h3>Ban user</h3><p>Ban a user from chatting in your group — you can unban them using Moderation menu → Unban users.</p><h3>Delete messages</h3><p>Delete this message, or all messages by this user.</p><h3>Add Moderators</h3><p>Moderators can ban users and delete messages. We suggest enough moderators so there\'s always one in a chat over 300 people.</p><h3>Edit Moderators</h3><p>You can grant individual permissions: moderator-level and admin-level.</p>'},
  auto_moderate:{t:'Auto moderation',h:'<p>Auto-moderation uses machine text analysis to detect and reject repetitious or nonsense messages. It works with all languages. Access this as the owner or a moderator from Moderation menu → Auto-moderation.</p>'},
  app:{t:'Manage with the Chatavar App',h:'<p>Embedded Chatavar groups work on Android and iOS. You can moderate and update your group using the Chatavar App.</p>'},
  announcements:{t:'Periodic announcements',h:'<p>Send a set message in the chat at a specified interval. Log in as the owner and click Main menu → Auto announcements.</p><h3>Easy ban</h3><p>Easy ban mode allows you to ban a user and delete all their messages with one click. You can also use easy ban on mobile by swiping across a message.</p>'},
  my_group_chat:{t:'Issue with my group chat',h:'<p>If your group chat isn\'t working:</p><ul><li>Check the embed code is correctly pasted</li><li>Check for JavaScript errors in browser console (F12)</li><li>Clear browser cache and reload</li></ul><p>Contact support@chatavar.com if issues persist.</p>'},
  ban_evasion:{t:"Evasion of a moderator's ban",h:'<p>Chatavar uses IP banning and browser fingerprinting to prevent ban evasion. Enable "Ban proxies and VPNs" and "No anons" for maximum protection.</p>'},
  remove:{t:'Remove a group from a page',h:'<p>Simply delete the embed code from your web page. The group itself still exists at its direct URL.</p>'},
  delete_group:{t:'Delete a group chat',h:'<p>You can delete any group you own from your dashboard. This permanently removes it along with all messages.</p>'},
  https_sec:{t:'HTTPS support and security',h:'<p>When embedded into an HTTPS page, Chatavar automatically uses SSL. The app runs in a separate iframe to protect the embedding site. HTML tags in user messages are discarded.</p>'},
  suggestions:{t:'I have an idea for Chatavar',h:'<p>Send ideas to ideas@chatavar.com or post in #suggestions on our Discord.</p>'},
  report_bug:{t:'Report a bug',h:'<p>Email bugs@chatavar.com with: what you tried, what happened, your browser/OS, and a screenshot if possible.</p>'},
  payment:{t:'Problem with payment',h:'<p>Email support@chatavar.com with your username and payment details.</p>'},
  change_name:{t:'Change user name',h:'<p>You can start a new account with any available name. You need an email not used before. Delete your old account to free up your email.</p>'},
  change_email:{t:'Change email',h:'<p>Go to your chat page and click "Edit profile". Change the email field and save.</p>'},
  change_password:{t:'Change password',h:'<p>Go to your chat page, click "Edit profile", and use the reset password link.</p>'},
  delete_account:{t:'Delete account',h:'<p>You can delete your account from settings. Log out and log in to a different account if you want to delete that one instead.</p>'},
  log_in_fail:{t:"Can't log in",h:'<p>Use the forgot password page to receive a temporary password code.</p>'},
  password_reset:{t:"Password didn't arrive",h:'<p>Check your junk mail folder and add chatavar.com to your safe senders list. Only the last code sent will work.</p>'},
  get_unused:{t:'Get an unused account',h:'<p>If a username has not been used for more than 100 days, you may be able to claim it.</p>'},
  unused_issue:{t:'Unused account issue',h:'<p>Ensure the account has been inactive 100+ days. Allow 48 hours for processing.</p>'},
  profile_create:{t:'Create a profile',h:'<p>Go to your chat page and click "Edit profile". Add your ZIP code to see distances to other users. Profile picture changes are shown instantly to people you\'re chatting with.</p>'},
  profile_automod:{t:'Account is hidden from Members',h:'<p>Auto-detection found potential NSFW content. Re-edit your profile with a different picture and text. Send a bug report if the issue persists.</p>'},
  profile_edit:{t:"Can't edit",h:'<p>You can change age/gender/location values but not delete them. To clear text, replace with a space. Try clearing browser cache if saving fails.</p>'},
  profile_upload:{t:"Can't upload picture",h:'<p>Try a JPEG or GIF under 200KB. Animated GIFs and progressive JPEGs may not work. Try clearing browser cache.</p>'},
  group_moderate:{t:'Moderation controls',h:'<p>As a moderator you can delete messages, ban users, and use easy ban mode depending on your permissions.</p>'},
  group_auto_mod:{t:'Auto moderation',h:'<p>Some groups have auto-moderation that detects spam and nonsense. Try rephrasing if your message is blocked.</p>'},
  group_banned:{t:"Others can't read my messages",h:'<p>The group may use "Only to author" censoring — your messages appear to you but not others because they contain banned words. Try rephrasing.</p>'},
  group_moderator:{t:'Become a moderator',h:'<p>Moderators are appointed by the group owner. Be active, follow rules, and help others.</p>'},
  group_turn_off:{t:'Turn off chat in a site I visit',h:'<p>Collapse the chat or use a browser extension to hide it. Contact the site owner to remove it permanently.</p>'},
  group_respond:{t:'Respond to a user',h:'<p>Click a user\'s name to mention them, or click the reply icon to quote their message.</p>'},
  group_participants:{t:'Participants list',h:'<p>Click the participant counter to see who\'s online. Click a name to view their profile or message them.</p>'},
  pm_blocking:{t:'Block and unblock people',h:'<p>Click the Block link when messaged. Blocking also blocks their IP. Unblock from Account → Block list. Block all anons from Settings.</p>'},
  pm_mini:{t:'Put a private chat on a web page',h:'<p>Embed a mini chat box on your site. Shows green when online, grey when away. Get the embed code from Settings → PM Embed.</p>'},
  pm_catcher:{t:'Stay online when browser is closed',h:'<p>The mobile web app keeps you connected as long as you have the tab open on your phone.</p>'},
  pm_unlist:{t:'Limit contact from strangers',h:'<p>From Settings → Privacy: uncheck "Show my profile in Members" and set "Who can message me" to Friends only or Nobody.</p>'},
  pm_report:{t:'Report inappropriate profiles',h:'<p>Click the report flag icon on a profile. Enough reports automatically restrict the user.</p>'},
  pm_history:{t:'Manage private chat history',h:'<p>History is stored locally on your device, not on servers. Toggle "Save Conversations" in Settings → Privacy. Clearing browser data erases your history.</p>'},
  pm_connection:{t:'Connection problems',h:'<p>Update your browser, disable proxies/VPN, and clear browser cache.</p>'},
  pm_sound:{t:'Change message sound',h:'<p>Go to Settings → Sounds. Choose from Ping, Pop, Chime, or None, and adjust the volume slider.</p>'},
  pm_colors:{t:'Turn off colored messages',h:'<p>Go to Settings → Colors and turn off "Show other users\' colours" to see all messages in plain default style.</p>'},
  pm_friends:{t:'Add friends',h:'<p>Type their screen name in the "Add a friend" box under the Friends tab.</p>'},
  compromised:{t:'Compromised accounts',h:'<p>Change your password immediately from Settings → Password. If locked out, contact support@chatavar.com.</p>'},
  parents:{t:'Information for parents',h:'<p>Users must be 13+ to register. Safety features include blocking, privacy settings, reporting, and auto-moderation. Report concerns to safety@chatavar.com.</p>'},
  abuse:{t:'Abusive users',h:'<p>Block and report the user from their profile. Enough reports auto-restrict them. For serious issues email safety@chatavar.com.</p>'},
};

const S = {
  page: { fontFamily:"-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif", background:'#fff', color:'#333', minHeight:'100vh', fontSize:15, lineHeight:'1.6' },
  header: { padding:'18px 60px 0', display:'flex', alignItems:'center', justifyContent:'space-between' },
  brand: { fontSize:36, color:'#09f', fontWeight:300, textDecoration:'none', letterSpacing:'-0.5px', cursor:'pointer' },
  navLinks: { display:'flex', gap:24 },
  navA: { fontSize:15, color:'#09f', textDecoration:'none', cursor:'pointer' },
  tabs: { padding:'24px 60px 0', display:'flex', gap:48 },
  tabActive: { fontSize:24, textDecoration:'none', paddingBottom:10, borderBottom:'3px solid #09f', color:'#222', fontWeight:400, cursor:'pointer', background:'none', border:'none', borderBottomWidth:3, borderBottomStyle:'solid', borderBottomColor:'#09f', fontFamily:'inherit' },
  tabInactive: { fontSize:24, textDecoration:'none', paddingBottom:10, borderBottom:'3px solid transparent', color:'#09f', fontWeight:400, cursor:'pointer', background:'none', border:'none', borderBottomWidth:3, borderBottomStyle:'solid', borderBottomColor:'transparent', fontFamily:'inherit' },
  content: { padding:'28px 60px 60px' },
  link: { display:'block', color:'#09f', textDecoration:'none', fontSize:15, lineHeight:'1.9', cursor:'pointer' },
  sectionTitle: { fontSize:19, fontWeight:400, color:'#222', marginBottom:8 },
  colWrap: { display:'flex', gap:60, flexWrap:'wrap' },
  col: { flex:1, minWidth:220 },
  sectionBlock: { marginBottom:28 },
  articleWrap: { padding:'28px 60px 60px', maxWidth:820 },
  backLink: { fontSize:13, color:'#09f', display:'inline-block', marginBottom:16, cursor:'pointer', textDecoration:'none' },
  articleTitle: { fontSize:20, fontWeight:400, color:'#222', marginBottom:18 },
  articleBody: { fontSize:15, lineHeight:'1.7', color:'#333' },
  footer: { padding:'20px 60px', borderTop:'1px solid #eee', marginTop:40, display:'flex', gap:20 },
  footerLink: { fontSize:13, color:'#aaa', textDecoration:'none' },
};

function Link({ k, label, onClick }) {
  return <a style={S.link} onClick={() => onClick(k)}>{label}</a>;
}

function Section({ title, links, onClick }) {
  return (
    <div style={S.sectionBlock}>
      <div style={S.sectionTitle}>{title}</div>
      {links.map(([k, label]) => <Link key={k} k={k} label={label} onClick={onClick} />)}
    </div>
  );
}

function ColSections({ sections, onClick }) {
  return (
    <div>
      {Object.entries(sections).map(([title, links]) => (
        <Section key={title} title={title} links={links} onClick={onClick} />
      ))}
    </div>
  );
}

export default function HelpPage({ onBack, onLogout }) {
  const [tab, setTab] = useState('owners');
  const [article, setArticle] = useState(null);

  // Handle hash in URL
  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (hash && ARTICLES[hash]) setArticle(hash);
  }, []);

  const showArticle = (key) => {
    setArticle(key);
    window.scrollTo(0, 0);
  };

  const backToIndex = () => {
    setArticle(null);
    window.scrollTo(0, 0);
  };

  const art = article ? ARTICLES[article] : null;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <a style={S.brand} onClick={onBack}>Chatavar</a>
        <div style={S.navLinks}>
          <a style={S.navA}>Help</a>
          {onLogout
            ? <a style={S.navA} onClick={onLogout}>Log out</a>
            : <a style={S.navA} onClick={onBack}>Log in</a>
          }
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button
          style={tab === 'owners' ? S.tabActive : S.tabInactive}
          onClick={() => { setTab('owners'); setArticle(null); }}
        >Site owners</button>
        <button
          style={tab === 'users' ? S.tabActive : S.tabInactive}
          onClick={() => { setTab('users'); setArticle(null); }}
        >Chatavar users</button>
      </div>

      {/* Article view */}
      {art ? (
        <div style={S.articleWrap}>
          <a style={S.backLink} onClick={backToIndex}>← Back</a>
          <h2 style={S.articleTitle}>{art.t}</h2>
          <div style={S.articleBody} dangerouslySetInnerHTML={{ __html: art.h }} />
        </div>
      ) : (
        <>
          {/* Owners tab — single column list */}
          {tab === 'owners' && (
            <div style={S.content}>
              {OWNER_LINKS.map(([k, label]) => (
                <Link key={k} k={k} label={label} onClick={showArticle} />
              ))}
            </div>
          )}

          {/* Users tab — 3-column layout */}
          {tab === 'users' && (
            <div style={S.content}>
              <div style={S.colWrap}>
                <div style={S.col}><ColSections sections={USER_COL1} onClick={showArticle} /></div>
                <div style={S.col}><ColSections sections={USER_COL2} onClick={showArticle} /></div>
                <div style={S.col}><ColSections sections={USER_COL3} onClick={showArticle} /></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={S.footer}>
        <a style={S.footerLink}>Terms of use</a>
        <a style={S.footerLink}>Privacy policy</a>
      </div>

      {/* Reset default body styles for this page */}
      <style>{`
        .help-page h3 { font-size:15px; font-weight:600; margin:18px 0 6px; color:#333; }
        .help-page ul, .help-page ol { margin:8px 0 14px 24px; }
        .help-page li { margin-bottom:5px; line-height:1.6; }
        .help-page p { margin-bottom:14px; }
      `}</style>
    </div>
  );
}
