import { useState, useRef, useEffect, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './MessagesPage.css';
import AnimatedNav from './AnimatedNav';
import CreatePostModal from './CreatePostModal';
import {
  fetchConversations, fetchMessages, sendMessage, markRead,
  startDM, createGroup, fetchAssets,
  toggleBlock, reportConversation, deleteConversation, fetchOnlineUsers, clearUnread,
  fetchBlockedConversations, removeBlockedUser,
  fetchConversationDetail, fetchGroupMembers, deleteGroup, leaveGroup,
  addGroupMembers, removeGroupMember, setActiveConvId, updateGroup, syncMessages,
} from '../../store/slices/messagesSlice';
import { fetchConnections } from '../../store/slices/profileSlice';
import { blockUser, unblockUser } from '../../store/slices/usersSlice';
import { showToast } from '../../store/slices/toastSlice';
import {
  joinConversation, leaveConversation,
  emitTypingStart, emitTypingStop, onUserTyping, onUserStoppedTyping,
} from '../../services/socket';

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

// Turns any http(s)/www URL in a chat message into a clickable link that
// opens in a new tab, leaving the rest of the text untouched.
function linkifyText(text) {
  if (!text) return text;
  return text.split(URL_PATTERN).map((part, i) => {
    if (!/^(https?:\/\/|www\.)/i.test(part)) return part;
    const href = part.startsWith('http') ? part : `https://${part}`;
    return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="msg-bubble-link">{part}</a>;
  });
}

/* ── App nav icons ── */
function FeedNavIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function EventNavIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function GroupsNavIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function CalendarNavIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function MessagesNavIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }

/* ── UI icons ── */
function SearchIcon()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function CheckIcon()       { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function DoubleCheckIcon() { return <svg width="16" height="13" viewBox="0 0 28 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 7 5 11 13 3"/><polyline points="9 7 13 11 21 3"/></svg>; }
function AttachPlusIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>; }
function PhotoIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>; }
function DocFileIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function EmojiIcon()       { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>; }
function MicIcon()         { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>; }
function SendIcon()        { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
function ChevronRightIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function BlockIcon()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>; }
function AlertIcon()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function PinIcon()         { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function TrashIcon()       { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }
function UnlockIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>; }

const EMOJI_LIST = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤔','🙄','😴','😭',
  '😢','😅','😉','😇','🥳','😱','🤩','😜','🤗','🙌','👏','👍',
  '👎','🙏','💪','🔥','✨','🎉','❤️','🧡','💛','💚','💙','💜',
  '🖤','💯','⭐','🌟','☀️','🌈','🍕','🍔','☕','🎂','🎁','📸',
];
function ReadCheckIcon()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>; }
function BackArrowIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>; }
function DownloadIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function InfoIcon()        { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>; }
function LinkItemIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function DocDownloadIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function PdfIcon()         { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function DocxIcon()        { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function XlsxIcon()        { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>; }
function PptxIcon()        { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>; }

const SA_TABS = [
  { id: 'media', label: 'Media' },
  { id: 'links', label: 'Links' },
  { id: 'docs',  label: 'Docs'  },
];

const DOC_TYPE_META = {
  pdf:  { icon: <PdfIcon />,  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  docx: { icon: <DocxIcon />, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  xlsx: { icon: <XlsxIcon />, color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  pptx: { icon: <PptxIcon />, color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
};

function initials(name) {
  return (name ?? '').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function formatSystemDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// Date objects' getFullYear/getMonth/getDate (no "UTC" prefix) read the
// browser's local timezone, so "day" here always means the viewer's local
// calendar day — this is what makes the separator (and the message time
// below) correct regardless of which timezone the server wrote createdAt in.
function localDayKey(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateSepLabel(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return 'Today';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (localDayKey(iso) === localDayKey(today)) return 'Today';
  if (localDayKey(iso) === localDayKey(yesterday)) return 'Yesterday';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDocSize(bytes) {
  const n = Number(bytes);
  if (!n || !Number.isFinite(n)) return '';
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

const PREVIEWABLE_DOC_EXTS = new Set(['pdf', 'txt']);
function isPreviewableDoc(name) {
  return PREVIEWABLE_DOC_EXTS.has(name?.split('.').pop()?.toLowerCase());
}

// Cloudinary's raw-upload responses carry their own Content-Disposition with the
// internal storage id as the filename, which browsers prefer over the anchor's
// `download` attribute for cross-origin links. A blob: URL has no such header, so
// building the download from a locally-fetched blob is the only reliable way to
// force the real file name.
function triggerBlobDownload(blobUrl, filename) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerBlobDownload(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function SharedAssetsView({ conv, onBack, onOpenLightbox, onOpenDoc }) {
  const dispatch = useDispatch();
  const { assets, assetsLoading } = useSelector(s => s.messages);

  const [tab, setTab] = useState('media');

  const convAssets = assets[conv.id] ?? {};
  const items      = convAssets[tab] ?? [];
  const storage    = convAssets.storage;
  const usedGB     = storage?.usedGB  ?? 0;
  const totalGB    = storage?.totalGB ?? 10;
  const pct        = Math.round((usedGB / totalGB) * 100);

  // Fetch counts/items for all three tabs up front so the tab labels show
  // correct per-tab counts immediately, without waiting for the user to switch tabs.
  useEffect(() => {
    SA_TABS.forEach(t => dispatch(fetchAssets({ convId: conv.id, tab: t.id })));
  }, [conv.id, dispatch]);

  return (
    <div className="sa-wrap">
      <div className="sa-main">
        <button className="sa-back-btn" onClick={onBack}>
          <BackArrowIcon /> Back to Chat
        </button>

        <h1 className="sa-title">Shared Assets</h1>
        <p className="sa-subtitle">
          Assets shared in conversation with{' '}
          <span className="sa-conv-name">{conv.name}</span>
        </p>

        <div className="sa-tabs">
          {SA_TABS.map(t => (
            <button
              key={t.id}
              className={`sa-tab${tab === t.id ? ' sa-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label} {convAssets.totals?.[t.id] != null && <span className="sa-tab-count">({convAssets.totals[t.id]})</span>}
            </button>
          ))}
        </div>
        <div className="sa-tab-underline" />

        {assetsLoading && <p style={{ color: '#5c6a8c', fontSize: 13, padding: '16px 0' }}>Loading…</p>}

        {/* ── Media tab ── */}
        {!assetsLoading && tab === 'media' && (
          <div className="sa-media-grid">
            {items.length === 0 && <p style={{ color: '#5c6a8c', fontSize: 13 }}>No media yet.</p>}
            {items.map((item, i) => (
              <div
                key={item.id ?? i}
                className="sa-media-thumb"
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => onOpenLightbox?.(items, i)}
              >
                {item.type === 'video'
                  ? <video src={item.url} muted className="sa-media-img" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  : <img src={item.url} alt="" className="sa-media-img" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                }
                {item.type === 'video' && <span className="msg-media-grid-play">▶</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── Links tab ── */}
        {!assetsLoading && tab === 'links' && (
          <div className="sa-list">
            {items.length === 0 && <p style={{ color: '#5c6a8c', fontSize: 13 }}>No links yet.</p>}
            {items.map((link, i) => (
              <a
                key={link.id ?? i}
                className="sa-link-item"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="sa-link-icon"><LinkItemIcon /></div>
                <div className="sa-link-body">
                  <p className="sa-link-title">{link.title ?? link.url}</p>
                  <p className="sa-link-domain">{link.domain ?? ''}</p>
                </div>
                <div className="sa-link-meta">
                  <span className="sa-link-shared">Shared by <strong>{link.sharedBy ?? ''}</strong></span>
                  <div className="sa-link-time-row">
                    <span className="sa-link-time">{link.time ?? ''}</span>
                    {/* <div className="sa-link-avatar" style={{ background: conv.color }}>{initials(conv.name)}</div> */}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* ── Docs tab ── */}
        {!assetsLoading && tab === 'docs' && (
          <div className="sa-list">
            {items.length === 0 && <p style={{ color: '#5c6a8c', fontSize: 13 }}>No documents yet.</p>}
            {items.map((doc, i) => {
              const ext  = doc.name?.split('.').pop()?.toLowerCase() ?? 'pdf';
              const meta = DOC_TYPE_META[ext] ?? DOC_TYPE_META.pdf;
              const previewable = isPreviewableDoc(doc.name);
              return (
                <div
                  key={doc.id ?? i}
                  className="sa-doc-item"
                  style={previewable ? { cursor: 'pointer' } : undefined}
                  onClick={() => previewable && onOpenDoc?.({ url: doc.url, name: doc.name })}
                >
                  <div className="sa-doc-icon" style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
                  <div className="sa-doc-body">
                    <p className="sa-doc-name">{doc.name}</p>
                    <p className="sa-doc-meta">{formatDocSize(doc.size)} • Shared by {doc.sharedBy ?? ''} • {doc.time ?? ''}</p>
                  </div>
                  <button type="button" className="sa-doc-download" title="Download" onClick={e => { e.stopPropagation(); downloadFile(doc.url, doc.name); }}><DocDownloadIcon /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

function CameraIcon()      { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
function CheckSmIcon()     { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function EditIcon()        { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>; }
function GroupNewIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function GroupBadgeIcon()  { return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ArrowRightSmIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>; }

function NewMessageModal({ onClose, onStartDM, onOpenConversation, onCreateGroup, onViewProfile }) {
  const dispatch = useDispatch();
  const { connections, connectionsLoading } = useSelector(s => s.profile);
  const { blockedUsers } = useSelector(s => s.messages);
  // Users blocked from their profile page (usersSlice) and users blocked from
  // inside a specific chat (messagesSlice) are two separate backend actions —
  // treat either one as "blocked" here so a blocked person can't be reached
  // through the New Message flow either way.
  const { blockedUserIds: profileBlockedIds } = useSelector(s => s.users);

  const [view,        setView]        = useState('dm');
  const [search,      setSearch]      = useState('');
  const [groupName,   setGroupName]   = useState('');
  const [description, setDescription] = useState('');
  const [selected,    setSelected]    = useState([]);
  const [groupImg,    setGroupImg]    = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const imgInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchConnections({ limit: 50 }));
  }, [dispatch]);

  // "New Message" is scoped to people you're already connected with — chat directly via
  // the conversationId the connections endpoint already resolves, or create one on first message.
  // Exclude anyone currently blocked — blockedUsers holds normalized
  // conversation objects (see fetchBlockedConversations), so match on
  // participantId (the blocked person's user id), not the conversation id.
  const blockedUserIds = new Set([...blockedUsers.map(b => b.participantId).filter(Boolean), ...profileBlockedIds]);
  const connectionContacts = connections.map(c => ({
    id: c.id,
    name: c.name,
    role: c.role,
    location: c.location,
    avatarUrl: c.avatar,
    online: c.online,
    conversationId: c.conversationId,
  })).filter(c => c.id && !blockedUserIds.has(c.id));

  const filteredConnections = connectionContacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleChatWithConnection(c) {
    if (c.conversationId) {
      onOpenConversation?.({ id: c.conversationId, type: 'dm', name: c.name, color: '#3b82f6', avatarUrl: c.avatarUrl, participantId: c.id });
    } else {
      onStartDM?.(c.id);
    }
    onClose();
  }

  function toggleContact(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleViewProfile(contact) {
    onViewProfile?.(contact.id);
    onClose();
  }

  async function handleCreateGroupSubmit() {
    if (!groupName.trim() || selected.length === 0 || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const result = await onCreateGroup?.({ name: groupName.trim(), description: description.trim(), memberIds: selected, image: groupImg });
      if (!result || createGroup.fulfilled.match(result)) onClose();
    } finally {
      setCreatingGroup(false);
    }
  }

  function switchToGroup() { setSearch(''); setSelected([]); setView('group'); }
  function switchToDM()    { setSearch(''); setGroupName(''); setDescription(''); setSelected([]); setView('dm'); }

  return (
    <div className="nm-overlay" onClick={onClose}>
      <div className="nm-modal" onClick={e => e.stopPropagation()}>
        <div className="nm-header">
          <div>
            <h2 className="nm-title">{view === 'dm' ? 'New Message' : 'Create Group'}</h2>
            <p className="nm-subtitle">
              {view === 'dm' ? 'Search for someone to start a conversation.' : 'Set up a group chat with your contacts.'}
            </p>
          </div>
          <button className="nm-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="nm-body">
          {view === 'dm' && (
            <>
              <button className="nm-group-link" onClick={switchToGroup}>
                <GroupNewIcon /> Create New Group
              </button>

              <div className="nm-contact-search-wrap" style={{ marginBottom: 12 }}>
                <SearchIcon />
                <input
                  className="nm-contact-search"
                  placeholder="Search people..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="nm-contacts-section">
                <span className="nm-contacts-title">Your Connections</span>
                <div className="nm-contact-list">
                  {connectionsLoading && filteredConnections.length === 0 && (
                    <p style={{ color: '#5c6a8c', fontSize: 13, padding: '8px 16px' }}>Loading connections…</p>
                  )}
                  {!connectionsLoading && filteredConnections.length === 0 && (
                    <p style={{ color: '#5c6a8c', fontSize: 13, padding: '8px 16px' }}>No connections found.</p>
                  )}
                  {filteredConnections.map(c => (
                    <div key={c.id} className="nm-contact-item" onClick={() => handleChatWithConnection(c)}>
                      <div
                        className="nm-contact-avatar"
                        style={{ background: '#3b82f6', cursor: 'pointer' }}
                        title="View profile"
                        onClick={e => { e.stopPropagation(); handleViewProfile(c); }}
                      >
                        {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : initials(c.name)}
                      </div>
                      <div className="nm-contact-info">
                        <p className="nm-contact-name">{c.name}</p>
                        <p className="nm-contact-role">{[c.role, c.location].filter(Boolean).join(' · ')}</p>
                      </div>
                      <div className="nm-contact-actions" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="nm-contact-action-btn nm-contact-action-btn--primary"
                          onClick={() => handleChatWithConnection(c)}
                        >
                          Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {view === 'group' && (
            <>
              <div className="nm-form-row">
                <div className="nm-img-upload" onClick={() => imgInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                  {groupImg
                    ? <img src={URL.createObjectURL(groupImg)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    : <CameraIcon />
                  }
                  <span className="nm-img-badge"><CheckSmIcon /></span>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files[0] && setGroupImg(e.target.files[0])}
                  />
                </div>
                <div className="nm-form-fields">
                  <div className="nm-field">
                    <label className="nm-label">Group Name</label>
                    <input className="nm-input" placeholder="Enter group name..." value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
                  </div>
                  <div className="nm-field">
                    <label className="nm-label">Description (Optional)</label>
                    <textarea className="nm-textarea" placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="nm-contacts-section">
                <div className="nm-contacts-header">
                  <span className="nm-contacts-title">Add Members</span>
                  <div className="nm-contacts-right">
                    <div className="nm-contact-search-wrap">
                      <SearchIcon />
                      <input className="nm-contact-search" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {connectionContacts.length > 0 && (
                      <button className="nm-select-all" onClick={() => setSelected(connectionContacts.map(c => c.id))}>Select All</button>
                    )}
                  </div>
                </div>
                <div className="nm-contact-list">
                  {connectionsLoading && filteredConnections.length === 0 && (
                    <p style={{ color: '#5c6a8c', fontSize: 13, padding: '8px 16px' }}>Loading connections…</p>
                  )}
                  {!connectionsLoading && filteredConnections.length === 0 && (
                    <p style={{ color: '#5c6a8c', fontSize: 13, padding: '8px 16px' }}>No connections found.</p>
                  )}
                  {filteredConnections.map(c => {
                    const checked = selected.includes(c.id);
                    return (
                      <div key={c.id} className={`nm-contact-item${checked ? ' nm-contact-item--selected' : ''}`} onClick={() => toggleContact(c.id)}>
                        <div className="nm-contact-avatar" style={{ background: '#3b82f6' }}>
                          {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : initials(c.name)}
                        </div>
                        <div className="nm-contact-info">
                          <p className="nm-contact-name">{c.name}</p>
                          <p className="nm-contact-role">{[c.role, c.location].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className={`nm-checkbox${checked ? ' nm-checkbox--checked' : ''}`}>{checked && <CheckSmIcon />}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="nm-footer">
          {view === 'dm' ? (
            <button className="nm-cancel-btn" onClick={onClose}>Cancel</button>
          ) : (
            <>
              <button className="nm-cancel-btn" onClick={switchToDM} disabled={creatingGroup}>Back</button>
              <button
                className={`nm-create-btn${creatingGroup ? ' nm-create-btn--loading' : ''}`}
                disabled={!groupName.trim() || selected.length === 0 || creatingGroup}
                onClick={handleCreateGroupSubmit}
              >
                {creatingGroup && <span className="msg-confirm-spinner" />}
                {creatingGroup ? 'Creating…' : <>Create Group <ArrowRightSmIcon /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const TABS = ['All', 'Unread', 'Groups', 'Online', 'Blocked'];

const TAB_PARAM = { All: 'all', Unread: 'unread', Groups: 'groups', Online: 'online' };

// Same POST /api/conversations/:id/report endpoint as before — this list is
// just a static frontend picker (no backend reasons endpoint for
// conversations/groups), unlike posts which fetch theirs via fetchReportReasons.
const CONVERSATION_REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Inappropriate content',
  'Scam or fraud',
  'Other',
];

export default function MessagesPage({ onBack, onEventsClick, onGroupsClick, onCalendarClick, onLibraryClick, onCoursesClick, onMinisitesClick, onUserClick, initialUserId, onInitUserConsumed, initialConvId, onInitConvConsumed, onViewStateChange }) {
  const dispatch = useDispatch();
  const {
    conversations, conversationsLoading,
    messages: allMessages,
    messagesLoading,
    blockedConvIds,
    reportedConvIds,
    blockedUsers,
    blockedUsersLoading,
    sending,
    groupMembers,
    groupMembersLoading,
    groupMembersConvId,
    onlineUsers,
  } = useSelector(s => s.messages);
  const { connections } = useSelector(s => s.profile);
  const { user: authUser } = useSelector(s => s.auth);
  // Blocking someone from their profile page (usersSlice) is a separate
  // backend action from blocking a conversation (messagesSlice) — treat
  // either as blocked so they disappear from the chat list either way.
  const { blockedUserIds: profileBlockedIds } = useSelector(s => s.users);
  const myUserId = authUser?._id ?? authUser?.id ?? null;
  // "Quick Online" is a separate list from the conversations list — it needs
  // its own blocked-user exclusion (both conversation-level and profile-level
  // blocks) since it doesn't go through getOnlineStatus()/visibleConversations.
  const blockedConnectionIds = new Set([...blockedUsers.map(b => b.participantId).filter(Boolean), ...profileBlockedIds]);
  const onlineConnections = connections.filter(c => c.online && !blockedConnectionIds.has(c.id));

  const [tab,              setTab]             = useState('All');
  const [createPostOpen,   setCreatePostOpen]  = useState(false);
  const [search,           setSearch]          = useState('');
  const [debouncedSearch,  setDebouncedSearch] = useState('');
  const [activeConv,       setActiveConv]      = useState(null);
  const [chatKey,          setChatKey]         = useState(0);
  const [inputMsg,         setInputMsg]        = useState('');
  const [newMsgOpen,       setNewMsgOpen]      = useState(false);
  const [showAssets,       setShowAssets]      = useState(false);
  const [chatSearchOpen,   setChatSearchOpen]  = useState(false);
  const [chatSearchQuery,  setChatSearchQuery] = useState('');
  const [typingUser,       setTypingUser]      = useState(null);
  const [lightbox,         setLightbox]        = useState(null); // { items: [{url,type}], index } | null
  const [docPreview,       setDocPreview]      = useState(null);
  const [previewBlobUrl,   setPreviewBlobUrl]  = useState(null);
  const [previewLoading,   setPreviewLoading]  = useState(false);
  const [previewFailed,    setPreviewFailed]   = useState(false);
  const [emojiOpen,        setEmojiOpen]       = useState(false);
  const [attachOpen,       setAttachOpen]      = useState(false);
  const [confirmAction,    setConfirmAction]   = useState(null); // 'block' | 'report' | 'delete' | 'deleteGroup' | 'leaveGroup' | null
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [reportReason,    setReportReason]     = useState(CONVERSATION_REPORT_REASONS[0]);
  const [groupInfoOpen,   setGroupInfoOpen]    = useState(false);
  const [descExpanded,    setDescExpanded]     = useState(false);
  const [descOverflowing, setDescOverflowing]  = useState(false);
  const descRef = useRef(null);
  const [showAddMembers,  setShowAddMembers]   = useState(false);
  const [addMembersSelected, setAddMembersSelected] = useState([]);
  const [addMembersSubmitting, setAddMembersSubmitting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [editingGroupInfo, setEditingGroupInfo] = useState(false);
  const [editGroupName,    setEditGroupName]    = useState('');
  const [editGroupDesc,    setEditGroupDesc]    = useState('');
  const [editGroupImg,     setEditGroupImg]     = useState(null);
  const [editGroupSubmitting, setEditGroupSubmitting] = useState(false);
  const [blockedConfirm,   setBlockedConfirm]  = useState(null); // { type: 'unblock' | 'delete', user } | null
  const [blockedConfirmSubmitting, setBlockedConfirmSubmitting] = useState(false);

  const messagesEndRef  = useRef(null);
  const emojiRef        = useRef(null);
  const attachRef       = useRef(null);
  const msgInputRef     = useRef(null);
  const typingTimerRef  = useRef(null);
  const isTypingRef     = useRef(false);
  const fileInputRef    = useRef(null);
  const lightboxTouchX  = useRef(null);
  const editGroupImgInputRef = useRef(null);

  /* Fetch online users (drives conversation online dots) + blocked users + connections (Quick Online panel) on mount */
  useEffect(() => {
    dispatch(fetchOnlineUsers());
    dispatch(fetchBlockedConversations());
    dispatch(fetchConnections({ limit: 100 }));
  }, [dispatch]);

  // `activeConvId` (used by receiveMessage to suppress the unread badge for
  // whatever conversation is currently open) otherwise stays stuck at whatever
  // was last opened here — this page unmounts on navigating to another
  // section, but nothing else clears the Redux flag, so it would silently
  // keep suppressing that one conversation's unread count even from Home/Feed.
  useEffect(() => {
    return () => { dispatch(setActiveConvId(null)); };
  }, [dispatch]);

  /* Navigated here with a specific user (Chat button on a profile) — get-or-create the DM and open it.
     Guarded by a ref because React.StrictMode double-invokes effects in dev, and the backend isn't
     guaranteed to dedupe two concurrent "create DM" calls into a single conversation. */
  const startedDMForRef = useRef(null);
  useEffect(() => {
    if (!initialUserId || startedDMForRef.current === initialUserId) return;
    startedDMForRef.current = initialUserId;
    // Already have this DM loaded locally — open it directly instead of hitting the create endpoint again.
    const existing = conversations.find(c => c.type === 'dm' && c.participantId === initialUserId);
    if (existing) {
      openConversation(existing);
      onInitUserConsumed?.();
      return;
    }
    (async () => {
      const result = await dispatch(startDM(initialUserId));
      if (startDM.fulfilled.match(result)) openConversation(result.payload);
      onInitUserConsumed?.();
    })();
  }, [initialUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Restore a specific conversation (DM or group) after a page refresh —
     ?section=messages&id=<conversationId>. Distinct from initialUserId above,
     which starts/opens a DM by *user* id (the "Chat" button on a profile);
     this restores by conversation id directly, so it also covers groups. */
  const restoredConvForRef = useRef(null);
  useEffect(() => {
    if (!initialConvId || restoredConvForRef.current === initialConvId || conversations.length === 0) return;
    const found = conversations.find(c => c.id === initialConvId);
    if (found) {
      restoredConvForRef.current = initialConvId;
      openConversation(found);
      onInitConvConsumed?.();
    }
  }, [initialConvId, conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report the active conversation up to HomePage so it can keep the URL in
  // sync (?section=messages&id=) for refresh restore.
  useEffect(() => {
    onViewStateChange?.({ convId: activeConv?.id ?? null });
  }, [activeConv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* Fetch conversations on mount + whenever tab / search changes ('Blocked' has its own data source) */
  useEffect(() => {
    if (tab === 'Blocked') return;
    dispatch(fetchConversations({ tab: TAB_PARAM[tab], search: debouncedSearch }));
  }, [tab, debouncedSearch, dispatch]);

  /* Refresh the blocked list whenever the Blocked tab is opened */
  useEffect(() => {
    if (tab === 'Blocked') dispatch(fetchBlockedConversations());
  }, [tab, dispatch]);

  /* Fallback for when the socket misses something (dropped connection, a
     network/proxy that blocks websockets entirely, etc) — silently resync
     the open conversation from the API every few seconds. Cheap and safe:
     syncMessages doesn't touch messagesLoading (no spinner flicker) and
     merges rather than replaces, so it can't clobber a message that's still
     mid-send. This is a backstop, not the primary delivery path — sockets
     still handle real-time delivery when they're working. */
  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(() => {
      dispatch(syncMessages({ convId: activeConv.id }));
    }, 8000);
    return () => clearInterval(interval);
  }, [activeConv?.id, dispatch]);

  /* Join/leave socket room + typing listeners when conversation changes */
  useEffect(() => {
    if (!activeConv) return;
    joinConversation(activeConv.id);

    const offTyping = onUserTyping(() => {
      setTypingUser(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
    });
    const offStopped = onUserStoppedTyping(() => setTypingUser(null));

    return () => {
      leaveConversation(activeConv.id);
      offTyping?.();
      offStopped?.();
    };
  }, [activeConv?.id]); // eslint-disable-line

  /* Auto-scroll on new messages */
  const msgCount = allMessages[activeConv?.id]?.length ?? 0;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgCount]);

  /* Close emoji/attach popovers on outside click */
  useEffect(() => {
    function onOutsideClick(e) {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false);
      if (attachRef.current && !attachRef.current.contains(e.target)) setAttachOpen(false);
    }
    if (emojiOpen || attachOpen) document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [emojiOpen, attachOpen]);

  // Cloudinary's "raw" delivery serves docs as application/octet-stream with an
  // attachment disposition, so pointing an <iframe> straight at docPreview.url just
  // force-downloads it instead of rendering. Fetch the bytes ourselves and hand the
  // iframe a blob: URL typed as application/pdf, which the browser renders inline.
  useEffect(() => {
    if (!docPreview) return;
    let cancelled = false;
    let objectUrl = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-in-effect loading/error flags
    setPreviewLoading(true);
    setPreviewFailed(false);
    const mime = docPreview.name?.split('.').pop()?.toLowerCase() === 'txt' ? 'text/plain' : 'application/pdf';
    fetch(docPreview.url)
      .then(res => { if (!res.ok) throw new Error('fetch failed'); return res.blob(); })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob.slice(0, blob.size, mime));
        setPreviewBlobUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setPreviewFailed(true); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewBlobUrl(null);
      setPreviewFailed(false);
    };
  }, [docPreview]);

  function openConversation(conv) {
    setActiveConv(conv);
    dispatch(setActiveConvId(conv.id));
    setChatKey(k => k + 1);
    setShowAssets(false);
    setChatSearchOpen(false);
    setChatSearchQuery('');
    dispatch(clearUnread({ convId: conv.id })); // instant badge clear
    dispatch(fetchMessages({ convId: conv.id }));
    dispatch(markRead(conv.id));
    // Member IDs are needed to compute "N online" in the header (cross-referenced
    // against the platform-wide online-users list) — previously only fetched when
    // the Group Info panel itself was opened, so the header couldn't show it.
    if (conv.type === 'group') dispatch(fetchGroupMembers(conv.id));
  }

  async function handleSend() {
    if (!inputMsg.trim() || !activeConv || sending) return;
    const text = inputMsg.trim();
    setInputMsg('');
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTypingStop(activeConv.id);
      clearTimeout(typingTimerRef.current);
    }
    // Flag link-containing texts distinctly from plain text so the backend
    // can index them for the Shared Assets "Links" tab (fetchAssets?tab=links) —
    // the bubble itself still renders on the same plain-text path either way
    // (linkifyText handles the clickable-anchor part), so this only affects
    // categorization, not the chat UI.
    const type = /https?:\/\/[^\s]+|www\.[^\s]+/i.test(text) ? 'link' : 'text';
    dispatch(sendMessage({ convId: activeConv.id, type, text }));
  }

  // The send-message endpoint now takes a `files[]` array (up to 20), so a
  // multi-select becomes one grouped "album" message instead of N separate
  // ones. Media (image/video) and docs are split into at most two calls —
  // one album per type — since they render as different bubble shapes.
  async function handleSendFiles(fileList) {
    if (!fileList?.length || !activeConv || sending) return;
    const files = Array.from(fileList);
    const mediaFiles = files.filter(f => f.type.startsWith('image') || f.type.startsWith('video'));
    const docFiles = files.filter(f => !f.type.startsWith('image') && !f.type.startsWith('video'));
    if (mediaFiles.length) {
      const msgType = mediaFiles.every(f => f.type.startsWith('video')) ? 'video' : 'image';
      await dispatch(sendMessage({ convId: activeConv.id, type: msgType, files: mediaFiles }));
    }
    if (docFiles.length) {
      await dispatch(sendMessage({ convId: activeConv.id, type: 'file', files: docFiles }));
    }
  }

  function openAttachPicker(kind) {
    setAttachOpen(false);
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = kind === 'photos'
      ? 'image/*'
      : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';
    fileInputRef.current.click();
  }

  function triggerTyping() {
    if (!activeConv) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTypingStart(activeConv.id);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTypingStop(activeConv.id);
    }, 1500);
  }

  function handleInputChange(e) {
    setInputMsg(e.target.value);
    triggerTyping();
  }

  function insertEmoji(emoji) {
    const el = msgInputRef.current;
    const start = el?.selectionStart ?? inputMsg.length;
    const end = el?.selectionEnd ?? inputMsg.length;
    const next = inputMsg.slice(0, start) + emoji + inputMsg.slice(end);
    setInputMsg(next);
    triggerTyping();
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleStartDM(userId) {
    const result = await dispatch(startDM(userId));
    if (startDM.fulfilled.match(result)) openConversation(result.payload);
    setNewMsgOpen(false);
  }

  // A connection's conversationId is already known — skip the get-or-create round trip
  // and open it directly.
  function handleOpenConnectionChat(conv) {
    openConversation(conv);
    setNewMsgOpen(false);
  }

  async function handleCreateGroup(groupData) {
    const result = await dispatch(createGroup(groupData));
    if (createGroup.fulfilled.match(result)) {
      openConversation(result.payload);
    } else {
      dispatch(showToast({ message: result.payload || 'Failed to create group', type: 'error' }));
    }
    return result;
  }

  function openGroupInfo() {
    if (!activeConv || activeConv.type !== 'group') return;
    setGroupInfoOpen(true);
    setDescExpanded(false);
    dispatch(fetchConversationDetail(activeConv.id));
    dispatch(fetchGroupMembers(activeConv.id));
  }

  function closeGroupInfo() {
    setGroupInfoOpen(false);
    setShowAddMembers(false);
    setAddMembersSelected([]);
    setDescExpanded(false);
    setEditingGroupInfo(false);
    setEditGroupImg(null);
  }

  function startEditGroupInfo() {
    setEditGroupName(liveActiveConv.name ?? '');
    setEditGroupDesc(liveActiveConv.description ?? '');
    setEditGroupImg(null);
    setEditingGroupInfo(true);
  }

  function cancelEditGroupInfo() {
    setEditingGroupInfo(false);
    setEditGroupImg(null);
  }

  async function handleSaveGroupInfo() {
    if (!activeConv || !editGroupName.trim()) return;
    setEditGroupSubmitting(true);
    const result = await dispatch(updateGroup({
      convId: activeConv.id,
      name: editGroupName.trim(),
      description: editGroupDesc.trim(),
      image: editGroupImg,
    }));
    if (updateGroup.fulfilled.match(result)) {
      dispatch(showToast({ message: 'Group updated', type: 'success' }));
      setEditingGroupInfo(false);
      setEditGroupImg(null);
    } else {
      dispatch(showToast({ message: result.payload ?? 'Failed to update group', type: 'error' }));
    }
    setEditGroupSubmitting(false);
  }

  function toggleAddMemberSelected(id) {
    setAddMembersSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleAddMembersSubmit() {
    if (!activeConv || addMembersSelected.length === 0) return;
    setAddMembersSubmitting(true);
    const result = await dispatch(addGroupMembers({ convId: activeConv.id, memberIds: addMembersSelected }));
    if (addGroupMembers.fulfilled.match(result)) {
      dispatch(showToast({ message: 'Members added', type: 'success' }));
      setShowAddMembers(false);
      setAddMembersSelected([]);
    } else {
      dispatch(showToast({ message: result.payload ?? 'Failed to add members', type: 'error' }));
    }
    setAddMembersSubmitting(false);
  }

  async function handleRemoveMember(memberId) {
    if (!activeConv) return;
    setRemovingMemberId(memberId);
    const result = await dispatch(removeGroupMember({ convId: activeConv.id, memberId }));
    if (removeGroupMember.fulfilled.match(result)) {
      dispatch(showToast({ message: 'Member removed', type: 'success' }));
    } else {
      dispatch(showToast({ message: result.payload ?? 'Failed to remove member', type: 'error' }));
    }
    setRemovingMemberId(null);
  }

  function closeConfirm() { setConfirmAction(null); setReportReason(CONVERSATION_REPORT_REASONS[0]); }

  async function handleConfirmAction() {
    if (!activeConv) return closeConfirm();
    setConfirmSubmitting(true);
    if (confirmAction === 'block') {
      const result = await dispatch(toggleBlock(activeConv.id));
      if (toggleBlock.fulfilled.match(result)) {
        dispatch(showToast({ message: result.payload.blocked ? 'Conversation blocked' : 'Conversation unblocked', type: 'success' }));
        // blockedConvIds (used for this chat's own Block/Unblock button) updates
        // immediately, but blockedUsers — what the Blocked tab AND the "New
        // Message" connections list filter against — only gets refreshed via
        // this fetch. Without it, someone just blocked this session keeps
        // showing up in "New Message" until the next full page load.
        dispatch(fetchBlockedConversations());
        // Blocking a conversation and blocking a user are separate backend
        // actions (messagesSlice vs usersSlice) — but a 1:1 chat only ever
        // has one other participant, so blocking it here should read as
        // blocking that person everywhere (profile page, suggestions, etc.),
        // not just muting this one chat.
        const participantId = getParticipantId(activeConv);
        if (participantId && activeConv.type !== 'group') {
          dispatch(result.payload.blocked ? blockUser(participantId) : unblockUser(participantId));
        }
      } else {
        dispatch(showToast({ message: result.payload ?? 'Failed to update block status', type: 'error' }));
      }
    } else if (confirmAction === 'report') {
      const result = await dispatch(reportConversation({ convId: activeConv.id, reason: reportReason }));
      if (reportConversation.fulfilled.match(result)) {
        dispatch(showToast({ message: 'Conversation reported for review', type: 'success' }));
      } else {
        dispatch(showToast({ message: result.payload ?? 'Failed to report conversation', type: 'error' }));
      }
    } else if (confirmAction === 'delete') {
      const result = await dispatch(deleteConversation(activeConv.id));
      if (deleteConversation.fulfilled.match(result)) {
        dispatch(showToast({ message: 'Chat deleted', type: 'success' }));
        setActiveConv(null); dispatch(setActiveConvId(null));
      } else {
        dispatch(showToast({ message: result.payload ?? 'Failed to delete chat', type: 'error' }));
      }
    } else if (confirmAction === 'deleteGroup') {
      const result = await dispatch(deleteGroup(activeConv.id));
      if (deleteGroup.fulfilled.match(result)) {
        dispatch(showToast({ message: 'Group deleted', type: 'success' }));
        setActiveConv(null); dispatch(setActiveConvId(null));
        setGroupInfoOpen(false);
      } else {
        dispatch(showToast({ message: result.payload ?? 'Failed to delete group', type: 'error' }));
      }
    } else if (confirmAction === 'leaveGroup') {
      const result = await dispatch(leaveGroup(activeConv.id));
      if (leaveGroup.fulfilled.match(result)) {
        dispatch(showToast({ message: 'You left the group', type: 'success' }));
        setActiveConv(null); dispatch(setActiveConvId(null));
        setGroupInfoOpen(false);
      } else {
        dispatch(showToast({ message: result.payload ?? 'Failed to leave group', type: 'error' }));
      }
    }
    setConfirmSubmitting(false);
    closeConfirm();
  }

  // The blocked-users list only carries user ids, and blocked conversations aren't
  // guaranteed to be present in whatever page of `conversations` happens to be loaded —
  // so resolve straight from the user id via the same get-or-create DM endpoint used by
  // "Chat" buttons on profiles, instead of searching the local list.
  async function resolveConvIdForUser(userId) {
    const existing = conversations.find(c => c.participantId === userId);
    if (existing) return existing.id;
    const result = await dispatch(startDM(userId));
    return startDM.fulfilled.match(result) ? result.payload.id : null;
  }

  async function handleOpenChatWithUser(user) {
    const convId = await resolveConvIdForUser(user.id);
    if (!convId) {
      dispatch(showToast({ message: "Couldn't open the conversation for this user.", type: 'error' }));
      return;
    }
    const conv = conversations.find(c => c.id === convId)
      ?? { id: convId, type: 'dm', name: user.name, color: '#3b82f6', avatarUrl: user.avatarUrl ?? user.avatar, participantId: user.id };
    openConversation(conv);
  }

  // Open the confirm popup immediately — resolving the conversation id (which may need a
  // network round trip via resolveConvIdForUser) happens on actual confirm, not before the
  // popup can even show.
  function openBlockedConfirm(type, user) {
    setBlockedConfirm({ type, user });
  }

  function closeBlockedConfirm() { setBlockedConfirm(null); }

  async function handleBlockedConfirmAction() {
    if (!blockedConfirm) return;
    const { type, user } = blockedConfirm;
    // `user` here is a normalized conversation (from fetchBlockedConversations),
    // so `user.id` is already the conversation id — no resolve step needed.
    const convId = user.id;
    setBlockedConfirmSubmitting(true);
    if (type === 'unblock') {
      const result = await dispatch(toggleBlock(convId));
      if (toggleBlock.fulfilled.match(result)) {
        dispatch(removeBlockedUser(user.id));
        dispatch(showToast({ message: `${user.name} unblocked`, type: 'success' }));
        // Keep the profile-level block status (usersSlice) in sync too — see
        // the same note in handleConfirmAction's 'block' branch.
        if (user.participantId) dispatch(unblockUser(user.participantId));
      } else {
        dispatch(showToast({ message: result.payload ?? 'Failed to unblock user', type: 'error' }));
      }
    } else if (type === 'delete') {
      const result = await dispatch(deleteConversation(convId));
      if (deleteConversation.fulfilled.match(result)) {
        dispatch(removeBlockedUser(user.id));
        dispatch(showToast({ message: 'Chat deleted', type: 'success' }));
      } else {
        dispatch(showToast({ message: result.payload ?? 'Failed to delete chat', type: 'error' }));
      }
    }
    setBlockedConfirmSubmitting(false);
    closeBlockedConfirm();
  }

  function handleUserClick(userId) {
    if (!onUserClick) return;
    if (!userId) {
      dispatch(showToast({ message: "Can't open this profile — missing user info.", type: 'error' }));
      return;
    }
    onUserClick(userId);
  }

  // The conversations-list API doesn't echo back the other participant's user id, and the
  // messages API's equivalent field is unreliable across backend versions — but every 1:1 DM
  // is necessarily with a connection, and the connections API already gives us a direct
  // conversationId → user id mapping. Prefer that over whatever (if anything) fetchMessages
  // managed to backfill onto conv.participantId.
  function getParticipantId(conv) {
    if (!conv) return null;
    return conv.participantId ?? connections.find(c => c.conversationId === conv.id)?.id ?? null;
  }

  // conv.online gets clobbered to false by the online-users resync (messagesSlice)
  // whenever conv.participantId is null — which is common, since the plain
  // conversations-list endpoint doesn't echo participant ids. connections[].online
  // is keyed by user id (not conversation id) and is kept live via socket
  // regardless, so prefer it whenever we can resolve who the conversation is with.
  function getOnlineStatus(conv) {
    if (!conv) return false;
    // A blocked conversation shouldn't show a live "online" dot/status —
    // blocking someone should read as fully disconnected, not just muted.
    if (blockedConvIds[conv.id]) return false;
    const pid = getParticipantId(conv);
    const conn = pid ? connections.find(c => c.id === pid) : null;
    return conn ? conn.online : conv.online;
  }

  function openLightbox(items, index) {
    const visuals = items.filter(m => m.type === 'image' || m.type === 'video');
    if (visuals.length === 0) return;
    setLightbox({ items: visuals, index: Math.max(0, Math.min(index, visuals.length - 1)) });
  }
  function closeLightbox() { setLightbox(null); }
  function lightboxPrev(e) {
    e?.stopPropagation();
    setLightbox(prev => prev && { ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length });
  }
  function lightboxNext(e) {
    e?.stopPropagation();
    setLightbox(prev => prev && { ...prev, index: (prev.index + 1) % prev.items.length });
  }

  /* Lightbox keyboard nav: ← → to browse, Esc to close */
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lightboxPrev();
      else if (e.key === 'ArrowRight') lightboxNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const messages   = activeConv ? (allMessages[activeConv.id] ?? []) : [];
  // Client-side filter over whatever's currently loaded — doesn't reach further
  // back than the chat has already paginated in. Search only affects what's
  // rendered below; `messages` itself stays the true list for scroll/count logic.
  const searchActive = chatSearchOpen && chatSearchQuery.trim().length > 0;
  const displayedMessages = searchActive
    ? messages.filter(m => (m.text ?? '').toLowerCase().includes(chatSearchQuery.trim().toLowerCase()))
    : messages;
  const isBlocked  = activeConv ? (blockedConvIds[activeConv.id] ?? false) : false;
  const isReported = activeConv ? (reportedConvIds[activeConv.id] ?? false) : false;
  // activeConv is a snapshot taken when the chat was opened, so it goes stale as soon as the
  // store updates (e.g. a socket "online"/"offline" event) — always render the live copy from
  // the conversations list instead of the frozen selection.
  const liveActiveConv = activeConv ? (conversations.find(c => c.id === activeConv.id) ?? activeConv) : null;
  const activeOnline = getOnlineStatus(liveActiveConv);
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  // A conversation-level block (messagesSlice) already gets moved server-side
  // into the "Blocked" tab, but a profile-level block (usersSlice) has no
  // such backend-side effect on the conversations list — filter those out
  // here so a blocked person's chat doesn't linger in "All".
  const visibleConversations = conversations.filter(c => !profileBlockedIds.includes(getParticipantId(c)));

  // "N online" in the group header — cross-references this group's member IDs
  // (fetched in openConversation) against the platform-wide online-users list
  // (already used for the DM online dot). Only valid once groupMembers has
  // actually loaded for THIS conversation, not a stale copy from another group.
  const groupOnlineCount = (liveActiveConv?.type === 'group' && groupMembersConvId === liveActiveConv.id)
    ? groupMembers.filter(m => onlineUsers.some(u => u.id === m.id)).length
    : null;

  // Whether the group description actually overflows its 4-line clamp —
  // measured from the real rendered box instead of guessing off character
  // count, which can be wrong for text with unusually long/short average
  // word length. Deliberately excludes descExpanded from the deps: this
  // should only re-measure the CLAMPED box (the expanded one never
  // overflows itself), so "See more"/"See less" doesn't flicker once toggled.
  useEffect(() => {
    if (!groupInfoOpen || !descRef.current) return;
    setDescOverflowing(descRef.current.scrollHeight > descRef.current.clientHeight + 1);
  }, [groupInfoOpen, liveActiveConv?.description]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Chat view ── */
  if (activeConv) {
    return (
      <div className="msg-page" style={{ overflow: showAssets ? 'auto' : undefined }}>
        <AnimatedNav
          activeId="messages"
          onNavigate={id => {
            if (id === 'create')    { setCreatePostOpen(true); return; }
            if (id === 'messages')  { setActiveConv(null); dispatch(setActiveConvId(null)); setShowAssets(false); return; }
            if (id === 'home')      onBack?.();
            if (id === 'courses')   onCoursesClick?.();
            if (id === 'library')   onLibraryClick?.();
            if (id === 'events')    onEventsClick?.();
            if (id === 'friends')   onGroupsClick?.();
            if (id === 'calendar')  onCalendarClick?.();
            if (id === 'minisites') onMinisitesClick?.();
          }}
        />
        {createPostOpen && <CreatePostModal onClose={() => setCreatePostOpen(false)} />}

        {/* Compact conversation list */}
        <div className="msg-conv-panel">
          <div className="msg-conv-panel-header">
            <span className="msg-conv-panel-title">Messages</span>
            <button className="msg-compose-label-btn msg-compose-label-btn--sm" onClick={() => setNewMsgOpen(true)}>New Message</button>
          </div>
          <div className="msg-conv-panel-list">
            {visibleConversations.map(conv => (
              <div
                key={conv.id}
                className={`msg-compact-item${activeConv.id === conv.id ? ' msg-compact-item--active' : ''}`}
                onClick={() => openConversation(conv)}
              >
                <div className="msg-avatar-wrap">
                  <div
                    className="msg-avatar msg-avatar--sm"
                    style={{ background: '#3b82f6', cursor: conv.type !== 'group' ? 'pointer' : 'default' }}
                    title={conv.type !== 'group' ? 'View profile' : undefined}
                    onClick={conv.type !== 'group' ? e => { e.stopPropagation(); handleUserClick(getParticipantId(conv)); } : undefined}
                  >
                    {conv.avatarUrl ? <img src={conv.avatarUrl} alt="" /> : initials(conv.name)}
                  </div>
                  {getOnlineStatus(conv) && <span className="msg-online-dot" />}
                  {conv.type === 'group' && <span className="msg-group-icon-badge"><GroupBadgeIcon /></span>}
                </div>
                <div className="msg-compact-body">
                  <div className="msg-compact-top">
                    <span className="msg-compact-name">{conv.name}</span>
                    <span className="msg-compact-time">{conv.lastMessage?.time ?? ''}</span>
                  </div>
                  <div className="msg-compact-bottom">
                    <span className="msg-compact-preview">{conv.lastMessage ? conv.lastMessage.text : conv.location}</span>
                    {conv.unreadCount > 0 && <span className="msg-badge">{conv.unreadCount}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showAssets
          ? <SharedAssetsView conv={liveActiveConv} onBack={() => setShowAssets(false)} onOpenLightbox={openLightbox} onOpenDoc={setDocPreview} />
          : <>
          {/* Chat area */}
          <div className="msg-chat-area" key={chatKey}>
            <div className="msg-chat-header">
              <div
                className="msg-chat-header-user"
                onClick={liveActiveConv.type === 'group' ? openGroupInfo : () => handleUserClick(getParticipantId(liveActiveConv))}
                style={{ cursor: 'pointer' }}
              >
                <div className="msg-avatar-wrap">
                  <div className="msg-avatar msg-avatar--md" style={{ background: '#3b82f6' }}>
                    {liveActiveConv.avatarUrl ? <img src={liveActiveConv.avatarUrl} alt="" /> : initials(liveActiveConv.name)}
                  </div>
                  {activeOnline && <span className="msg-online-dot" />}
                </div>
                <div>
                  <p className="msg-chat-name">{liveActiveConv.name}</p>
                  {liveActiveConv.type === 'group' ? (
                    <p className="msg-chat-status">
                      {typeof liveActiveConv.memberCount === 'number' ? `${liveActiveConv.memberCount} members` : 'Group'}
                      {typeof groupOnlineCount === 'number' && groupOnlineCount > 0 && ` · ${groupOnlineCount} online`}
                    </p>
                  ) : (
                    <p className={`msg-chat-status${activeOnline ? ' msg-chat-status--online' : ''}`}>
                      {activeOnline ? '● Online' : 'Offline'}
                    </p>
                  )}
                </div>
              </div>
              {chatSearchOpen ? (
                <div className="msg-chat-search-bar">
                  <SearchIcon />
                  <input
                    className="msg-chat-search-input"
                    type="text"
                    placeholder="Search messages..."
                    value={chatSearchQuery}
                    onChange={e => setChatSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="msg-chat-search-close-btn"
                    onClick={() => { setChatSearchOpen(false); setChatSearchQuery(''); }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button className="msg-chat-search-btn" onClick={() => setChatSearchOpen(true)}><SearchIcon /></button>
              )}
            </div>

            <div className="msg-chat-messages">
              {messagesLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#5c6a8c', fontSize: 13 }}>Loading messages…</div>
              )}

              {!messagesLoading && messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#5c6a8c', fontSize: 13 }}>No messages yet. Say hello!</div>
              )}

              {!messagesLoading && searchActive && displayedMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#5c6a8c', fontSize: 13 }}>No messages match "{chatSearchQuery.trim()}".</div>
              )}

              {displayedMessages.map((msg, idx) => {
                // A separator shows whenever this message's local calendar day
                // differs from the previous message's (or it's the first one) —
                // not searchActive, since search results skip around in time and
                // a per-day separator there would be misleading, not helpful.
                const prevMsg = displayedMessages[idx - 1];
                // Optimistic pending messages (see sendMessage.pending in
                // messagesSlice.js) have no createdAt yet — treat them as "now"
                // so they don't spuriously re-trigger a same-day separator.
                const msgCreatedAt = msg.createdAt || new Date().toISOString();
                const showDateSep = !searchActive && (idx === 0 || localDayKey(msgCreatedAt) !== localDayKey(prevMsg.createdAt || new Date().toISOString()));
                const dateSep = showDateSep && (
                  <div className="msg-date-sep"><span>{dateSepLabel(msgCreatedAt)}</span></div>
                );

                if (msg.type === 'system') {
                  const actorName = msg.actor?.name || 'Someone';
                  const targetName = msg.target?.name || 'a member';
                  const createdDate = formatSystemDate(msg.createdAt);
                  const systemText = {
                    created: `${actorName} created this group${createdDate ? ` on ${createdDate}` : ''}`,
                    joined: `${actorName} joined the group`,
                    left: `${actorName} left the group`,
                    // actor = the admin who removed someone; target = who got removed.
                    removed: `${actorName} removed ${targetName} from the group`,
                    renamed: `${actorName} renamed the group`,
                  }[msg.systemAction] ?? msg.text ?? `${actorName} updated the group`;
                  return (
                    <Fragment key={msg.id}>
                      {dateSep}
                      <div className="msg-system-row">
                        <span className="msg-system-text">{systemText}</span>
                      </div>
                    </Fragment>
                  );
                }
                const mediaVisuals = msg.media.filter(m => m.type === 'image' || m.type === 'video');
                const mediaDocs = msg.media.filter(m => m.type !== 'image' && m.type !== 'video');
                const isMediaMsg = msg.type === 'image' || msg.type === 'video';
                const isFileMsg = msg.type === 'file';
                // A DM only ever has one possible "them", so activeConv's own avatar/name
                // is correct there — but in a group each message can come from a different
                // member, so look that member up (groupMembers already has their real
                // avatarUrl, proven correct in the Group Info panel) instead of falling
                // back to the group's own avatar/initial for every sender.
                const groupSender = activeConv.type === 'group'
                  ? groupMembers.find(gm => gm.id === msg.senderId)
                  : null;
                const bubbleAvatarUrl = groupSender?.avatarUrl || msg.senderAvatar || activeConv.avatarUrl;
                const bubbleAvatarName = groupSender?.name || msg.senderName || activeConv.name;
                return (
                <Fragment key={msg.id}>
                {dateSep}
                <div className={`msg-bubble-row${msg.from === 'me' ? ' msg-bubble-row--me' : ''}`} style={msg.pending ? { opacity: 0.6 } : undefined}>
                  {msg.from !== 'me' && (
                    <div
                      className="msg-avatar msg-avatar--xs"
                      style={{ background: '#3b82f6', flexShrink: 0, cursor: activeConv.type !== 'group' ? 'pointer' : 'default' }}
                      title={activeConv.type !== 'group' ? 'View profile' : undefined}
                      onClick={activeConv.type !== 'group' ? () => handleUserClick(getParticipantId(activeConv)) : undefined}
                    >
                      {bubbleAvatarUrl ? <img src={bubbleAvatarUrl} alt="" /> : initials(bubbleAvatarName)}
                    </div>
                  )}
                  <div className="msg-bubble-col">
                    {isMediaMsg ? (
                      <div className="msg-bubble-img-wrap">
                        {mediaVisuals.length === 0 ? (
                          <div className="msg-img-placeholder" />
                        ) : mediaVisuals.length === 1 ? (
                          mediaVisuals[0].type === 'video'
                            ? <video src={mediaVisuals[0].url} controls className="msg-img-placeholder" style={{ width: '100%', background: '#0d1424' }} />
                            : <img src={mediaVisuals[0].url} alt="" className="msg-img-placeholder" style={{ objectFit: 'cover', cursor: 'pointer' }} onClick={() => openLightbox(mediaVisuals, 0)} />
                        ) : (
                          <div className="msg-media-grid">
                            {mediaVisuals.map((item, i) => (
                              <div key={i} className="msg-media-grid-item" onClick={() => openLightbox(mediaVisuals, i)} style={{ cursor: 'pointer', position: 'relative' }}>
                                {item.type === 'video'
                                  ? <video src={item.url} muted />
                                  : <img src={item.url} alt="" />
                                }
                                {item.type === 'video' && <span className="msg-media-grid-play">▶</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="msg-bubble-meta msg-bubble-meta--right">
                          <span className="msg-bubble-time">{msg.pending ? '···' : msg.time}</span>
                          {msg.from === 'me' && msg.read && !msg.pending && <span className="msg-read-check"><ReadCheckIcon /></span>}
                        </div>
                      </div>
                    ) : isFileMsg ? (
                      <div className={`msg-bubble${msg.from === 'me' ? ' msg-bubble--sent' : ' msg-bubble--received'}`}>
                        {mediaDocs.length > 0 ? (
                          <div className="msg-file-chip-list">
                            {mediaDocs.map((doc, i) => (
                              isPreviewableDoc(doc.fileName) ? (
                                <button key={i} type="button" className="msg-file-chip" onClick={() => setDocPreview({ url: doc.url, name: doc.fileName })}>
                                  <span className="msg-file-icon">{(DOC_TYPE_META[doc.fileName?.split('.').pop()?.toLowerCase()] ?? DOC_TYPE_META.pdf).icon}</span>
                                  <span className="msg-file-name">{doc.fileName || 'Attachment'}</span>
                                </button>
                              ) : (
                                <button key={i} type="button" className="msg-file-chip" onClick={() => downloadFile(doc.url, doc.fileName || 'Attachment')}>
                                  <span className="msg-file-icon">{(DOC_TYPE_META[doc.fileName?.split('.').pop()?.toLowerCase()] ?? DOC_TYPE_META.pdf).icon}</span>
                                  <span className="msg-file-name">{doc.fileName || 'Attachment'}</span>
                                </button>
                              )
                            ))}
                          </div>
                        ) : (
                          <p className="msg-bubble-text">{msg.text ? linkifyText(msg.text) : 'Attachment'}</p>
                        )}
                      </div>
                    ) : (
                      <div className={`msg-bubble${msg.from === 'me' ? ' msg-bubble--sent' : ' msg-bubble--received'}`}>
                        <p className="msg-bubble-text">{linkifyText(msg.text)}</p>
                      </div>
                    )}
                    {!isMediaMsg && (
                      <div className={`msg-bubble-meta${msg.from === 'me' ? ' msg-bubble-meta--right' : ''}`}>
                        <span className="msg-bubble-time">{msg.pending ? '···' : msg.time}</span>
                        {msg.from === 'me' && msg.read && !msg.pending && <span className="msg-read-check"><ReadCheckIcon /></span>}
                      </div>
                    )}
                  </div>
                </div>
                </Fragment>
                );
              })}

              {typingUser && (
                <div className="msg-bubble-row">
                  <div
                    className="msg-avatar msg-avatar--xs"
                    style={{ background: '#3b82f6', flexShrink: 0, cursor: activeConv.type !== 'group' ? 'pointer' : 'default' }}
                    title={activeConv.type !== 'group' ? 'View profile' : undefined}
                    onClick={activeConv.type !== 'group' ? () => handleUserClick(getParticipantId(activeConv)) : undefined}
                  >
                    {activeConv.avatarUrl ? <img src={activeConv.avatarUrl} alt="" /> : initials(activeConv.name)}
                  </div>
                  <div className="msg-bubble msg-bubble--received" style={{ fontStyle: 'italic', color: '#94a3b8' }}>typing…</div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Hidden file input — covers images, videos, and documents */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
              style={{ display: 'none' }}
              onChange={e => {
                handleSendFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {isBlocked ? (
              <div className="msg-blocked-bar">
                <p className="msg-blocked-text">You have blocked this conversation</p>
                <div className="msg-blocked-actions">
                  <button
                    className="msg-blocked-btn msg-blocked-btn--delete"
                    type="button"
                    onClick={() => setConfirmAction(
                      liveActiveConv.type !== 'group' ? 'delete'
                        : liveActiveConv.myRole === 'admin' ? 'deleteGroup'
                        : 'leaveGroup'
                    )}
                  >
                    {liveActiveConv.type !== 'group' ? 'Delete Chat' : liveActiveConv.myRole === 'admin' ? 'Delete Group' : 'Leave Group'}
                  </button>
                  <button className="msg-blocked-btn msg-blocked-btn--unblock" type="button" onClick={() => setConfirmAction('block')}>Unblock</button>
                </div>
              </div>
            ) : (
              <div className="msg-input-bar">
                <div className="msg-attach-wrap" ref={attachRef}>
                  <button className="msg-input-icon-btn" title="Attach file" onClick={() => setAttachOpen(v => !v)}><AttachPlusIcon /></button>
                  {attachOpen && (
                    <div className="msg-attach-popover">
                      <button type="button" className="msg-attach-item" onClick={() => openAttachPicker('photos')}>
                        <PhotoIcon /> Photos
                      </button>
                      <button type="button" className="msg-attach-item" onClick={() => openAttachPicker('docs')}>
                        <DocFileIcon /> Docs
                      </button>
                    </div>
                  )}
                </div>
                <input
                  ref={msgInputRef}
                  className="msg-input"
                  type="text"
                  placeholder="Type a message..."
                  value={inputMsg}
                  onChange={handleInputChange}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  disabled={sending}
                />
                <div className="msg-emoji-wrap" ref={emojiRef}>
                  <button
                    className="msg-input-icon-btn"
                    type="button"
                    title="Add emoji"
                    onClick={() => setEmojiOpen(v => !v)}
                  >
                    <EmojiIcon />
                  </button>
                  {emojiOpen && (
                    <div className="msg-emoji-popover">
                      {EMOJI_LIST.map(em => (
                        <button key={em} type="button" className="msg-emoji-btn" onClick={() => insertEmoji(em)}>{em}</button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Audio record — not implemented yet, hidden for now */}
                {/* <button className="msg-input-icon-btn"><MicIcon /></button> */}
                <button
                  className={`msg-send-btn${inputMsg.trim() ? ' msg-send-btn--active' : ''}`}
                  onClick={handleSend}
                  disabled={!inputMsg.trim() || sending}
                >
                  <SendIcon />
                </button>
              </div>
            )}
          </div>

          {newMsgOpen && (
            <NewMessageModal
              onClose={() => setNewMsgOpen(false)}
              onStartDM={handleStartDM}
              onOpenConversation={handleOpenConnectionChat}
              onCreateGroup={handleCreateGroup}
              onViewProfile={handleUserClick}
            />
          )}

          {/* Contact info panel */}
          <div className="msg-contact-panel" key={`panel-${chatKey}`}>
            <div
              className="msg-contact-avatar-wrap"
              onClick={liveActiveConv.type !== 'group' ? () => handleUserClick(getParticipantId(liveActiveConv)) : undefined}
              style={{ cursor: liveActiveConv.type !== 'group' ? 'pointer' : 'default' }}
            >
              <div className="msg-contact-avatar" style={{ background: '#3b82f6' }}>
                {liveActiveConv.avatarUrl ? <img src={liveActiveConv.avatarUrl} alt="" /> : initials(liveActiveConv.name)}
              </div>
              {activeOnline && <span className="msg-contact-online-dot" />}
            </div>
            <p
              className="msg-contact-name"
              onClick={liveActiveConv.type !== 'group' ? () => handleUserClick(getParticipantId(liveActiveConv)) : undefined}
              style={{ cursor: liveActiveConv.type !== 'group' ? 'pointer' : 'default' }}
            >
              {liveActiveConv.name}
            </p>
            {liveActiveConv.location && (
              <p className="msg-contact-location"><PinIcon />{liveActiveConv.location}</p>
            )}
            <p className="msg-contact-role">{liveActiveConv.role}</p>

            <div className="msg-media-section">
              <div className="msg-media-header">
                <span className="msg-media-title">Media, Links, and Docs</span>
                <button className="msg-see-all" onClick={() => setShowAssets(true)}>See All</button>
              </div>
            </div>

            <div className="msg-contact-actions">
              {liveActiveConv.type !== 'group' && (
                <button className="msg-action-item" onClick={() => setConfirmAction('block')}>
                  <span className="msg-action-icon msg-action-icon--red"><BlockIcon /></span>
                  <span className="msg-action-label">
                    {isBlocked ? `Unblock ${liveActiveConv.name.split(' ')[0]}` : `Block ${liveActiveConv.name.split(' ')[0]}`}
                  </span>
                  <ChevronRightIcon />
                </button>
              )}
              <button
                className={`msg-action-item${isReported ? ' msg-action-item--disabled' : ''}`}
                onClick={() => !isReported && setConfirmAction('report')}
                disabled={isReported}
              >
                <span className="msg-action-icon msg-action-icon--orange"><AlertIcon /></span>
                <span className="msg-action-label">{isReported ? 'Reported' : 'Report Conversation'}</span>
                {!isReported && <ChevronRightIcon />}
              </button>
            </div>
          </div>
        </>}

        {/* ── Lightbox / media slider ── */}
        {lightbox && (() => {
          const current  = lightbox.items[lightbox.index];
          const hasMulti = lightbox.items.length > 1;
          return (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={closeLightbox}
              onTouchStart={e => { lightboxTouchX.current = e.touches[0].clientX; }}
              onTouchEnd={e => {
                if (lightboxTouchX.current == null) return;
                const dx = e.changedTouches[0].clientX - lightboxTouchX.current;
                lightboxTouchX.current = null;
                if (Math.abs(dx) < 40 || !hasMulti) return;
                dx > 0 ? lightboxPrev() : lightboxNext();
              }}
            >
              <button
                onClick={closeLightbox}
                style={{ position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 38, height: 38, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                aria-label="Close"
              >✕</button>

              {hasMulti && (
                <span style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: '#cbd5e1', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {lightbox.index + 1} / {lightbox.items.length}
                </span>
              )}

              {hasMulti && (
                <button
                  onClick={lightboxPrev}
                  style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Previous"
                >‹</button>
              )}

              {current.type === 'video' ? (
                <video
                  key={current.url}
                  src={current.url}
                  controls
                  autoPlay
                  onClick={e => e.stopPropagation()}
                  style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
                />
              ) : (
                <img
                  key={current.url}
                  src={current.url}
                  alt=""
                  onClick={e => e.stopPropagation()}
                  style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 10, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
                />
              )}

              {hasMulti && (
                <button
                  onClick={lightboxNext}
                  style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Next"
                >›</button>
              )}

              {hasMulti && (
                <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {lightbox.items.map((_, i) => (
                    <span
                      key={i}
                      onClick={e => { e.stopPropagation(); setLightbox(prev => prev && { ...prev, index: i }); }}
                      style={{ width: 6, height: 6, borderRadius: '50%', cursor: 'pointer', background: i === lightbox.index ? '#fff' : 'rgba(255,255,255,0.35)' }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Doc preview ── */}
        {docPreview && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column' }}
            onClick={() => setDocPreview(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <span style={{ color: '#e0e6f8', fontSize: 14, fontWeight: 500 }}>{docPreview.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => (previewBlobUrl ? triggerBlobDownload(previewBlobUrl, docPreview.name) : downloadFile(docPreview.url, docPreview.name))}
                  title="Download"
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                ><DownloadIcon /></button>
                <button
                  onClick={() => setDocPreview(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 38, height: 38, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  aria-label="Close"
                >✕</button>
              </div>
            </div>
            {previewLoading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                Loading preview…
              </div>
            )}
            {!previewLoading && previewFailed && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }} onClick={e => e.stopPropagation()}>
                <span>Couldn't load a preview for this file.</span>
                <button
                  type="button"
                  onClick={() => downloadFile(docPreview.url, docPreview.name)}
                  style={{ color: '#3b82f6', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                >Download instead</button>
              </div>
            )}
            {!previewLoading && !previewFailed && previewBlobUrl && (
              <iframe
                src={previewBlobUrl}
                title={docPreview.name}
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
              />
            )}
          </div>
        )}

        {/* ── Block / Report / Delete confirmation ── */}
        {confirmAction && (
          <div className="msg-confirm-overlay" onClick={closeConfirm}>
            <div className="msg-confirm-box" onClick={e => e.stopPropagation()}>
              <h2 className="msg-confirm-title">
                {confirmAction === 'block'
                  ? (isBlocked ? `Unblock ${liveActiveConv.name.split(' ')[0]}?` : `Block ${liveActiveConv.name.split(' ')[0]}?`)
                  : confirmAction === 'delete'
                    ? 'Delete Chat?'
                    : confirmAction === 'deleteGroup'
                      ? 'Delete Group?'
                      : confirmAction === 'leaveGroup'
                        ? 'Leave Group?'
                        : liveActiveConv.type === 'group' ? 'Report Group' : 'Report Conversation'}
              </h2>
              <p className="msg-confirm-desc">
                {confirmAction === 'block'
                  ? (isBlocked
                      ? `${liveActiveConv.name} will be able to message you again.`
                      : `${liveActiveConv.name} won't be able to send you messages, and you won't see theirs either. You can unblock them anytime.`)
                  : confirmAction === 'delete'
                    ? `This will delete the chat with ${liveActiveConv.name} from your inbox. They'll keep their copy, and the chat will come back if either of you sends a new message.`
                    : confirmAction === 'deleteGroup'
                      ? `This will permanently delete "${liveActiveConv.name}" for everyone in the group. This can't be undone.`
                      : confirmAction === 'leaveGroup'
                        ? `You'll stop receiving messages from "${liveActiveConv.name}" unless someone adds you back.`
                        : liveActiveConv.type === 'group'
                          ? `Are you sure you want to report "${liveActiveConv.name}" for review? Our team will look into it.`
                          : 'Are you sure you want to report this conversation for review? Our team will look into it.'}
              </p>
              {confirmAction === 'report' && (
                <div className="msg-report-reasons">
                  {CONVERSATION_REPORT_REASONS.map(r => (
                    <label key={r} className="msg-report-reason-item">
                      <input
                        type="radio"
                        name="conv-report-reason"
                        checked={reportReason === r}
                        onChange={() => setReportReason(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              )}
              <div className="msg-confirm-actions">
                <button className="msg-confirm-cancel-btn" onClick={closeConfirm} disabled={confirmSubmitting}>Cancel</button>
                <button
                  className={`msg-confirm-confirm-btn${confirmAction === 'block' && isBlocked ? ' msg-confirm-confirm-btn--neutral' : ''}${confirmSubmitting ? ' msg-confirm-confirm-btn--loading' : ''}`}
                  onClick={handleConfirmAction}
                  disabled={confirmSubmitting}
                >
                  {confirmSubmitting && <span className="msg-confirm-spinner" />}
                  {confirmSubmitting
                    ? (confirmAction === 'block' ? (isBlocked ? 'Unblocking…' : 'Blocking…')
                        : confirmAction === 'delete' ? 'Deleting…'
                        : confirmAction === 'deleteGroup' ? 'Deleting…'
                        : confirmAction === 'leaveGroup' ? 'Leaving…'
                        : 'Reporting…')
                    : (confirmAction === 'block' ? (isBlocked ? 'Unblock' : 'Block')
                        : confirmAction === 'delete' ? 'Delete'
                        : confirmAction === 'deleteGroup' ? 'Delete Group'
                        : confirmAction === 'leaveGroup' ? 'Leave Group'
                        : 'Report')}
                </button>
              </div>
            </div>
          </div>
        )}

        {groupInfoOpen && liveActiveConv && (
          <div className="msg-confirm-overlay" onClick={closeGroupInfo}>
            <div className="grp-info-box" onClick={e => e.stopPropagation()}>
              <div className="grp-info-header">
                <h2 className="msg-confirm-title">Group Info</h2>
                <button className="grp-info-close-btn" onClick={closeGroupInfo}>✕</button>
              </div>

              <div className="grp-info-identity">
                {editingGroupInfo ? (
                  <>
                    <div
                      className="grp-info-avatar grp-info-avatar--editable"
                      style={{ background: '#3b82f6', cursor: 'pointer' }}
                      onClick={() => editGroupImgInputRef.current?.click()}
                    >
                      {editGroupImg
                        ? <img src={URL.createObjectURL(editGroupImg)} alt="" />
                        : (liveActiveConv.avatarUrl ? <img src={liveActiveConv.avatarUrl} alt="" /> : initials(liveActiveConv.name))}
                      <span className="grp-info-avatar-edit-badge"><CameraIcon /></span>
                      <input
                        ref={editGroupImgInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => e.target.files[0] && setEditGroupImg(e.target.files[0])}
                      />
                    </div>
                    <input
                      className="grp-info-edit-name-input"
                      value={editGroupName}
                      onChange={e => setEditGroupName(e.target.value)}
                      placeholder="Group name"
                      maxLength={80}
                    />
                    <textarea
                      className="grp-info-edit-desc-input"
                      value={editGroupDesc}
                      onChange={e => setEditGroupDesc(e.target.value)}
                      placeholder="Group description (optional)"
                      rows={3}
                    />
                    <div className="grp-info-edit-actions">
                      <button className="grp-info-edit-cancel-btn" onClick={cancelEditGroupInfo} disabled={editGroupSubmitting}>Cancel</button>
                      <button
                        className="grp-info-edit-save-btn"
                        onClick={handleSaveGroupInfo}
                        disabled={!editGroupName.trim() || editGroupSubmitting}
                      >
                        {editGroupSubmitting ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grp-info-avatar" style={{ background: '#3b82f6' }}>
                      {liveActiveConv.avatarUrl ? <img src={liveActiveConv.avatarUrl} alt="" /> : initials(liveActiveConv.name)}
                    </div>
                    <p className="grp-info-name">{liveActiveConv.name}</p>
                    {liveActiveConv.description && (
                      <>
                        <p ref={descRef} className={`grp-info-desc${descExpanded ? '' : ' grp-info-desc--clamped'}`}>
                          {liveActiveConv.description}
                        </p>
                        {descOverflowing && (
                          <button className="grp-info-desc-toggle" onClick={() => setDescExpanded(v => !v)}>
                            {descExpanded ? 'See less' : 'See more'}
                          </button>
                        )}
                      </>
                    )}
                    <p className="grp-info-member-count">
                      {typeof liveActiveConv.memberCount === 'number'
                        ? `${liveActiveConv.memberCount} member${liveActiveConv.memberCount === 1 ? '' : 's'}`
                        : 'Members'}
                    </p>
                    {liveActiveConv.myRole === 'admin' && (
                      <button className="grp-info-edit-btn" onClick={startEditGroupInfo}>
                        <EditIcon /> Edit Group
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="grp-info-members">
                <div className="grp-info-section-head">
                  <p className="grp-info-section-title">Members</p>
                  {liveActiveConv.myRole === 'admin' && (
                    <button className="grp-info-add-btn" onClick={() => setShowAddMembers(v => !v)}>
                      {showAddMembers ? 'Cancel' : '+ Add'}
                    </button>
                  )}
                </div>

                {showAddMembers && (
                  <div className="grp-info-add-panel">
                    <div className="grp-info-add-list">
                      {connections.filter(c => !groupMembers.find(m => m.id === c.id)).map(c => {
                        const checked = addMembersSelected.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            className={`grp-info-add-row${checked ? ' grp-info-add-row--selected' : ''}`}
                            onClick={() => toggleAddMemberSelected(c.id)}
                          >
                            <div className="msg-avatar msg-avatar--xs" style={{ background: '#3b82f6' }}>
                              {c.avatar ? <img src={c.avatar} alt="" /> : initials(c.name)}
                            </div>
                            <span className="grp-info-member-name">{c.name}</span>
                            <div className={`nm-checkbox${checked ? ' nm-checkbox--checked' : ''}`}>{checked && <CheckSmIcon />}</div>
                          </div>
                        );
                      })}
                      {connections.filter(c => !groupMembers.find(m => m.id === c.id)).length === 0 && (
                        <p style={{ color: '#5c6a8c', fontSize: 13, padding: '8px 0' }}>All your connections are already in this group.</p>
                      )}
                    </div>
                    <button
                      className="grp-info-add-confirm-btn"
                      disabled={addMembersSelected.length === 0 || addMembersSubmitting}
                      onClick={handleAddMembersSubmit}
                    >
                      {addMembersSubmitting ? 'Adding…' : `Add ${addMembersSelected.length || ''} to group`}
                    </button>
                  </div>
                )}

                {groupMembersLoading && (
                  <p style={{ color: '#5c6a8c', fontSize: 13, padding: '8px 0' }}>Loading members…</p>
                )}
                {!groupMembersLoading && groupMembers.length === 0 && (
                  <p style={{ color: '#5c6a8c', fontSize: 13, padding: '8px 0' }}>No members to show yet.</p>
                )}
                {groupMembers.map(m => (
                  <div
                    key={m.id}
                    className="grp-info-member-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleUserClick(m.id)}
                  >
                    <div className="msg-avatar msg-avatar--xs" style={{ background: '#3b82f6' }}>
                      {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : initials(m.name)}
                    </div>
                    <span className="grp-info-member-name">{m.name}</span>
                    {m.role === 'admin' && <span className="grp-info-admin-badge">Admin</span>}
                    {liveActiveConv.myRole === 'admin' && m.id !== myUserId && (
                      <button
                        className="grp-info-remove-member-btn"
                        aria-label={`Remove ${m.name}`}
                        disabled={removingMemberId === m.id}
                        onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.id); }}
                      >
                        {removingMemberId === m.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grp-info-actions">
                {liveActiveConv.myRole === 'admin' && (
                  <button
                    className="grp-info-danger-btn"
                    onClick={() => { closeGroupInfo(); setConfirmAction('deleteGroup'); }}
                  >
                    Delete Group
                  </button>
                )}
                {liveActiveConv.myRole === 'member' && (
                  <button
                    className="grp-info-danger-btn"
                    onClick={() => { closeGroupInfo(); setConfirmAction('leaveGroup'); }}
                  >
                    Leave Group
                  </button>
                )}
                {liveActiveConv.myRole == null && (
                  <p style={{ color: '#5c6a8c', fontSize: 12.5, margin: 0 }}>Loading your role in this group…</p>
                )}
                <button
                  className="grp-info-report-btn"
                  disabled={isReported}
                  onClick={() => { closeGroupInfo(); setConfirmAction('report'); }}
                >
                  {isReported ? 'Reported' : 'Report Group'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── List view (no conversation selected) ── */
  return (
    <>
    <div className="msg-page">
      <AnimatedNav
        activeId="messages"
        onNavigate={id => {
          if (id === 'create')   { setCreatePostOpen(true); return; }
          if (id === 'messages') { setTab('All'); setSearch(''); return; }
          if (id === 'home')     onBack?.();
          if (id === 'courses')  onCoursesClick?.();
          if (id === 'library')  onLibraryClick?.();
          if (id === 'events')   onEventsClick?.();
          if (id === 'friends')  onGroupsClick?.();
          if (id === 'calendar') onCalendarClick?.();
        }}
      />

      {newMsgOpen && (
        <NewMessageModal
          onClose={() => setNewMsgOpen(false)}
          onStartDM={handleStartDM}
          onOpenConversation={handleOpenConnectionChat}
          onCreateGroup={handleCreateGroup}
          onViewProfile={handleUserClick}
        />
      )}

      <div className="msg-main">
        <div className="msg-header">
          <div className="msg-header-row">
            <div>
              <h1 className="msg-title">Messages</h1>
              <p className="msg-subtitle">Manage your private conversations</p>
            </div>
            <button className="msg-compose-label-btn" onClick={() => setNewMsgOpen(true)}>New Message</button>
          </div>
        </div>

        <div className="msg-tabs">
          {TABS.map(t => (
            <button key={t} className={`msg-tab${tab === t ? ' msg-tab--active' : ''}`} onClick={() => setTab(t)}>
              {t}
              {t === 'Unread' && totalUnread > 0 && <span className="msg-tab-badge">{totalUnread}</span>}
            </button>
          ))}
        </div>

        <div className="msg-search-wrap">
          <SearchIcon />
          <input
            className="msg-search"
            type="text"
            placeholder={tab === 'Blocked' ? 'Search blocked users...' : 'Search conversations...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="msg-list">
          {tab === 'Blocked' ? (
            <>
              {blockedUsersLoading && blockedUsers.length === 0 && (
                <div className="msg-list-loading">
                  <span className="msg-spinner" />
                  <p>Loading blocked users…</p>
                </div>
              )}
              {!blockedUsersLoading && blockedUsers.length === 0 && (
                <div className="msg-list-empty">
                  <span className="msg-list-empty-icon"><BlockIcon /></span>
                  <p className="msg-list-empty-title">No blocked users</p>
                  <p className="msg-list-empty-sub">Users you block will show up here.</p>
                </div>
              )}
              {blockedUsers
                .filter(u => !debouncedSearch || u.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
                .map(u => (
                <div key={u.id} className="msg-conv msg-conv--blocked" onClick={() => openConversation(u)}>
                  <div className="msg-avatar-wrap">
                    <div
                      className="msg-avatar"
                      style={{ background: '#3b82f6', cursor: 'pointer' }}
                      title="View profile"
                      onClick={e => { e.stopPropagation(); handleUserClick(u.id); }}
                    >
                      {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : initials(u.name)}
                    </div>
                  </div>
                  <div className="msg-conv-body">
                    <div className="msg-conv-top">
                      <span className="msg-conv-name">{u.name}</span>
                    </div>
                    <div className="msg-conv-bottom">
                      <span className="msg-conv-preview">{[u.role, u.location].filter(Boolean).join(' · ')}</span>
                    </div>
                  </div>
                  <div className="msg-blocked-row-actions" onClick={e => e.stopPropagation()}>
                    <button className="msg-blocked-row-btn msg-blocked-row-btn--unblock" title="Unblock" onClick={() => openBlockedConfirm('unblock', u)}>
                      <UnlockIcon /> Unblock
                    </button>
                    <button className="msg-blocked-row-btn msg-blocked-row-btn--danger" title="Delete Chat" onClick={() => openBlockedConfirm('delete', u)}>
                      <TrashIcon /> Delete Chat
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
          {conversationsLoading && conversations.length === 0 && (
            <div className="msg-list-loading">
              <span className="msg-spinner" />
              <p>Loading conversations…</p>
            </div>
          )}
          {!conversationsLoading && conversations.length === 0 && tab === 'Unread' && (
            <div className="msg-list-empty">
              <span className="msg-list-empty-icon">🎉</span>
              <p className="msg-list-empty-title">You're all caught up! 🎉</p>
              <p className="msg-list-empty-sub">No unread messages right now.</p>
            </div>
          )}
          {!conversationsLoading && conversations.length === 0 && tab === 'Groups' && (
            <div className="msg-list-empty">
              <span className="msg-list-empty-icon"><GroupsNavIcon /></span>
              <p className="msg-list-empty-title">No groups yet</p>
              <p className="msg-list-empty-sub">Create a group, invite friends, and start the conversation.</p>
              <button className="msg-list-empty-cta" onClick={() => setNewMsgOpen(true)}>Create Group</button>
            </div>
          )}
          {!conversationsLoading && conversations.length === 0 && tab !== 'Unread' && tab !== 'Groups' && (
            <div className="msg-list-empty">
              <span className="msg-list-empty-icon"><MessagesNavIcon /></span>
              <p className="msg-list-empty-title">No conversations yet</p>
              <p className="msg-list-empty-sub">Start a conversation with a friend or connection to see it here.</p>
              <button className="msg-list-empty-cta" onClick={() => setNewMsgOpen(true)}>New Message</button>
            </div>
          )}
          {visibleConversations.map(conv => (
            <div
              key={conv.id}
              className={`msg-conv${conv.unreadCount > 0 ? ' msg-conv--unread' : ''}`}
              onClick={() => openConversation(conv)}
            >
              <div className="msg-avatar-wrap">
                <div
                  className="msg-avatar"
                  style={{ background: '#3b82f6', cursor: conv.type !== 'group' ? 'pointer' : 'default' }}
                  title={conv.type !== 'group' ? 'View profile' : undefined}
                  onClick={conv.type !== 'group' ? e => { e.stopPropagation(); handleUserClick(getParticipantId(conv)); } : undefined}
                >
                  {conv.avatarUrl ? <img src={conv.avatarUrl} alt="" /> : initials(conv.name)}
                </div>
                {getOnlineStatus(conv) && <span className="msg-online-dot" />}
                {conv.type === 'group' && <span className="msg-group-icon-badge"><GroupBadgeIcon /></span>}
              </div>
              <div className="msg-conv-body">
                <div className="msg-conv-top">
                  <span className="msg-conv-name">{conv.name}</span>
                  <div className="msg-conv-meta">
                    <span className="msg-conv-time">{conv.lastMessage?.time ?? ''}</span>
                    {conv.unreadCount > 0 && <span className="msg-badge">{conv.unreadCount}</span>}
                  </div>
                </div>
                <div className="msg-conv-bottom">
                  <span className="msg-conv-preview">{conv.lastMessage ? conv.lastMessage.text : conv.location}</span>
                  {conv.lastMessage && (
                    <span className="msg-checks">
                      {conv.unreadCount > 0 ? <DoubleCheckIcon /> : <CheckIcon />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
            </>
          )}
        </div>
      </div>

      <div className="msg-right">
        <div className="msg-panel">
          <div className="msg-panel-header">
            <span className="msg-panel-title">Quick Online</span>
            {onlineConnections.length > 0 && (
              <button className="msg-view-all" onClick={() => setNewMsgOpen(true)}>View All</button>
            )}
          </div>
          <div className="msg-online-list">
            {onlineConnections.length === 0 && (
              <p style={{ color: '#5c6a8c', fontSize: 12.5, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>No connections online.</p>
            )}
            {onlineConnections.slice(0, 5).map(c => (
              <div key={c.id} className="msg-online-item" title={`Chat with ${c.name}`} style={{ cursor: 'pointer' }} onClick={() => handleOpenChatWithUser(c)}>
                <div className="msg-online-avatar" style={{ background: '#3b82f6' }}>
                  {c.avatar ? <img src={c.avatar} alt="" /> : initials(c.name)}
                </div>
                <span className="msg-online-dot msg-online-dot--sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="msg-support-card">
          <p className="msg-support-title">Chat Support</p>
          <p className="msg-support-desc">Need help with your Flow? Our team is available 24/7 to assist you with any questions.</p>
          <button className="msg-support-btn">Open Help Center</button>
        </div>
      </div>
    </div>

    {blockedConfirm && (
      <div className="msg-confirm-overlay" onClick={closeBlockedConfirm}>
        <div className="msg-confirm-box" onClick={e => e.stopPropagation()}>
          <h2 className="msg-confirm-title">
            {blockedConfirm.type === 'unblock' ? `Unblock ${blockedConfirm.user.name.split(' ')[0]}?` : 'Delete Chat?'}
          </h2>
          <p className="msg-confirm-desc">
            {blockedConfirm.type === 'unblock'
              ? `${blockedConfirm.user.name} will be able to message you again.`
              : `This will delete the chat with ${blockedConfirm.user.name} from your inbox. They'll keep their copy, and the chat will come back if either of you sends a new message.`}
          </p>
          <div className="msg-confirm-actions">
            <button className="msg-confirm-cancel-btn" onClick={closeBlockedConfirm} disabled={blockedConfirmSubmitting}>Cancel</button>
            <button
              className={`msg-confirm-confirm-btn${blockedConfirm.type === 'unblock' ? ' msg-confirm-confirm-btn--neutral' : ''}${blockedConfirmSubmitting ? ' msg-confirm-confirm-btn--loading' : ''}`}
              onClick={handleBlockedConfirmAction}
              disabled={blockedConfirmSubmitting}
            >
              {blockedConfirmSubmitting && <span className="msg-confirm-spinner" />}
              {blockedConfirmSubmitting
                ? (blockedConfirm.type === 'unblock' ? 'Unblocking…' : 'Deleting…')
                : (blockedConfirm.type === 'unblock' ? 'Unblock' : 'Delete')}
            </button>
          </div>
        </div>
      </div>
    )}

    {createPostOpen && <CreatePostModal onClose={() => setCreatePostOpen(false)} />}
    </>
  );
}
