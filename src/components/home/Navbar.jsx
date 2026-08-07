import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import SkeletonImg from '../SkeletonImg';
import { logout } from '../../store/slices/authSlice';
import { showLogin } from '../../store/slices/uiSlice';
import { fetchNotifications, markNotificationsRead, markNotificationRead } from '../../store/slices/notificationsSlice';
import { fetchMyPostsCount } from '../../store/slices/postsSlice';
import { disconnectSocket } from '../../services/socket';
import { fetchAllUsers, acceptFriendRequest, rejectFriendRequest } from '../../store/slices/usersSlice';
import { acceptInvitation, rejectInvitation } from '../../store/slices/invitationsSlice';
import { showToast } from '../../store/slices/toastSlice';

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-5-5.917V4a1 1 0 1 0-2 0v1.083A6 6 0 0 0 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Navbar({ onMessagesClick, onProfileClick, onConnectionsClick, onPostsClick, onPostClick, onUserClick, onNavigateToConnections }) {
  const dispatch               = useDispatch();
  const { user: authUser }     = useSelector((state) => state.auth);
  const { profile }            = useSelector((state) => state.profile);
  const { notifications, unreadCount } = useSelector((state) => state.notifications);
  const { myPostsTotal }       = useSelector((state) => state.posts);
  const { conversations }      = useSelector((state) => state.messages);
  const { allUsers }           = useSelector((state) => state.users);
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  // authUser/profile postsCount reflect the logged-in user; myPostsTotal (from
  // /api/users/me/posts) is the accurate fallback â€” NOT state.posts, which is the
  // whole feed's posts across all users.
  const totalPosts       = authUser?.postsCount ?? profile?.postsCount ?? myPostsTotal;
  // Total Connections = accepted friend connections (NOT followers).
  const totalConnections = authUser?.connectionCount ?? profile?.connectionsCount ?? profile?.connectionCount ?? 0;

  const displayName = profile?.fullName || authUser?.fullName || 'Alex Rivera';
  const rawAvatar   = profile?.avatar ?? authUser?.avatar ?? '';
  const avatarUrl   = rawAvatar?.startsWith?.('http') ? rawAvatar : '';

  const [notifOpen,  setNotifOpen]  = useState(false);
  const [userOpen,   setUserOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [respondingNotifId, setRespondingNotifId] = useState(null);
  const [respondedNotifActions, setRespondedNotifActions] = useState(() => new Map());
  const notifRef                    = useRef(null);
  const userRef                     = useRef(null);
  const searchRef                   = useRef(null);

  useEffect(() => {
    dispatch(fetchNotifications());
    dispatch(fetchMyPostsCount());
    dispatch(fetchAllUsers());
  }, [dispatch]);

  useEffect(() => {
    if (!notifOpen) return;
    function onOut(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [notifOpen]);

  useEffect(() => {
    if (!userOpen) return;
    function onOut(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [userOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function onOut(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [searchOpen]);

  // Handle search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results = allUsers.filter(user =>
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user._id && user._id.includes(query))
    ).slice(0, 8); // Limit to 8 results
    setSearchResults(results);
  }, [searchQuery, allUsers]);

  function handleBell() {
    setNotifOpen(v => !v);
  }

  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
    setSearchOpen(true);
  }

  function handleUserClick(userId) {
    setSearchQuery('');
    setSearchOpen(false);
    setSearchResults([]);
    // Navigate to user profile using the callback from HomePage
    if (userId && onUserClick) {
      console.log('ðŸ” [search] Navigating to user profile:', userId);
      onUserClick(userId);
    }
  }

  async function handleAcceptRequest(n, nid) {
    const senderId = n.actor?._id ?? n.actor?.id;
    if (!senderId || respondingNotifId) return;
    setRespondingNotifId(nid);
    try {
      const result = await dispatch(acceptFriendRequest(senderId));
      if (acceptFriendRequest.fulfilled.match(result)) {
        setRespondedNotifActions(prev => new Map(prev).set(nid, 'accepted'));
        dispatch(showToast({ message: 'Connection request accepted', type: 'success' }));
      } else {
        dispatch(showToast({ message: result.payload?.message || 'Failed to accept request', type: 'error' }));
      }
    } finally {
      setRespondingNotifId(null);
    }
  }

  async function handleRejectRequest(n, nid) {
    const senderId = n.actor?._id ?? n.actor?.id;
    if (!senderId || respondingNotifId) return;
    setRespondingNotifId(nid);
    try {
      const result = await dispatch(rejectFriendRequest(senderId));
      if (rejectFriendRequest.fulfilled.match(result)) {
        setRespondedNotifActions(prev => new Map(prev).set(nid, 'declined'));
        dispatch(showToast({ message: 'Connection request declined', type: 'info' }));
      } else {
        dispatch(showToast({ message: result.payload?.message || 'Failed to decline request', type: 'error' }));
      }
    } finally {
      setRespondingNotifId(null);
    }
  }

  async function handleAcceptGroupInvite(n, nid) {
    const invId = n.relatedInvitation?._id ?? n.relatedInvitation?.id ?? nid;
    if (!invId || respondingNotifId) return;
    setRespondingNotifId(nid);
    try {
      const result = await dispatch(acceptInvitation(invId));
      if (acceptInvitation.fulfilled.match(result)) {
        setRespondedNotifActions(prev => new Map(prev).set(nid, 'accepted'));
        dispatch(showToast({ message: 'Joined group!', type: 'success' }));
      } else {
        dispatch(showToast({ message: result.payload?.message || 'Failed to accept', type: 'error' }));
      }
    } finally {
      setRespondingNotifId(null);
    }
  }

  async function handleRejectGroupInvite(n, nid) {
    const invId = n.relatedInvitation?._id ?? n.relatedInvitation?.id ?? nid;
    if (!invId || respondingNotifId) return;
    setRespondingNotifId(nid);
    try {
      const result = await dispatch(rejectInvitation(invId));
      if (rejectInvitation.fulfilled.match(result)) {
        setRespondedNotifActions(prev => new Map(prev).set(nid, 'declined'));
        dispatch(showToast({ message: 'Invitation declined', type: 'info' }));
      } else {
        dispatch(showToast({ message: result.payload?.message || 'Failed to decline', type: 'error' }));
      }
    } finally {
      setRespondingNotifId(null);
    }
  }

  return (
    <nav className="home-navbar">
      <div className="navbar-left">
        <span className="navbar-logo">Kink Analyst</span>
        <div className="navbar-search-wrap" ref={searchRef} style={{ position: 'relative', marginLeft: '24px' }}>
          <input
            type="text"
            placeholder="Search users"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setSearchOpen(true)}
            className="navbar-search-input"
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: '1px solid #3b4556',
              backgroundColor: '#1a202c',
              color: '#d0d6ec',
              width: '200px',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="navbar-search-dropdown">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="navbar-search-item"
                  onClick={() => handleUserClick(user._id)}
                >
                  <div className="navbar-search-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: '18px', color: '#5b8cff' }}>
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="navbar-search-info">
                    <p className="navbar-search-name">{user.name}</p>
                    {user.location && (
                      <p className="navbar-search-location">ðŸ“ {user.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="navbar-center">
        <div className="navbar-stat-pill" onClick={onPostsClick} style={{ cursor: 'pointer' }}>
          <span className="navbar-stat-num">{totalPosts}</span>
          <span className="navbar-stat-lbl">Total Posts</span>
        </div>
        <div className="navbar-divider" />
        <div className="navbar-stat-pill" onClick={onConnectionsClick} style={{ cursor: 'pointer' }}>
          <span className="navbar-stat-num">{totalConnections}</span>
          <span className="navbar-stat-lbl">Total Connections</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Messages */}
        <button className="navbar-icon-btn" aria-label="Messages" onClick={onMessagesClick}>
          <ChatBubbleIcon />
          {unreadMessages > 0 && (
            <span className="notif-badge notif-badge--green">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
          )}
        </button>

        {/* Notifications */}
        <div className="navbar-notif-wrap" ref={notifRef}>
          <button className="navbar-icon-btn" aria-label="Notifications" onClick={handleBell}>
            <BellIcon />
            {unreadCount > 0 && (
              <span className="notif-badge notif-badge--red">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="navbar-notif-dropdown">
              <div className="navbar-notif-header">
                <span className="navbar-notif-title">Notifications</span>
                {unreadCount > 0 ? (
                  <button
                    className="navbar-notif-mark-all"
                    onClick={() => dispatch(markNotificationsRead())}
                  >
                    Mark all as read
                  </button>
                ) : (
                  <span className="navbar-notif-pill">{notifications.length} new</span>
                )}
              </div>
              {notifications.map((n, i) => {
                const nid = n.id ?? n._id;
                const respondedAction = respondedNotifActions.get(nid);
                const isPendingRequest = n.type === 'friend_request' && !respondedAction;
                const isPendingGroupInvite = (n.type === 'group_invitation' || n.relatedGroup) && !respondedAction;
                if (n.relatedGroup) console.log('Group invite notif:', { type: n.type, has_relatedGroup: true });
                return (
                  <div
                    key={nid ?? i}
                    className="navbar-notif-item"
                    style={{ '--ni': i, cursor: 'pointer' }}
                    onClick={() => {
                      if (n.unread && nid) dispatch(markNotificationRead(nid));
                      setNotifOpen(false);

                      // Handle different notification types
                      if (n.type === 'friend_request' || n.type === 'friend_request_accepted') {
                        // Navigate to Connections tab with Sent Requests view
                        onNavigateToConnections?.('sent-requests');
                      } else if (n.type === 'group_invitation' && n.relatedGroup) {
                        // Navigate to the group
                        const gid = n.relatedGroup?._id ?? n.relatedGroup?.id;
                        if (gid) window.location.hash = '#/group/' + gid;
                      } else if (n.relatedPost) {
                        // mention/comment/like notifications carry the post they refer to
                        onPostClick?.(n.relatedPost);
                      }
                    }}
                  >
                    <div className="navbar-notif-icon" style={{ background: '#3b82f622', color: '#3b82f6' }}>
                      {n.emoji ?? 'ðŸ””'}
                    </div>
                    <div className="navbar-notif-body">
                      <p className="navbar-notif-text">{n.text}</p>
                      <p className="navbar-notif-sub">{timeAgo(n.createdAt)}</p>
                      {isPendingRequest && (
                        <div className="navbar-notif-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="navbar-notif-action navbar-notif-action--accept"
                            disabled={respondingNotifId === nid}
                            onClick={() => handleAcceptRequest(n, nid)}
                          >
                            {respondingNotifId === nid ? '...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            className="navbar-notif-action navbar-notif-action--reject"
                            disabled={respondingNotifId === nid}
                            onClick={() => handleRejectRequest(n, nid)}
                          >
                            {respondingNotifId === nid ? '...' : 'Reject'}
                          </button>
                        </div>
                      )}
                      {isPendingGroupInvite && (
                        <div className="navbar-notif-actions" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="navbar-notif-action navbar-notif-action--accept" disabled={respondingNotifId === nid} onClick={() => handleAcceptGroupInvite(n, nid)}>
                            {respondingNotifId === nid ? '...' : 'Accept'}
                          </button>
                          <button type="button" className="navbar-notif-action navbar-notif-action--reject" disabled={respondingNotifId === nid} onClick={() => handleRejectGroupInvite(n, nid)}>
                            {respondingNotifId === nid ? '...' : 'Reject'}
                          </button>
                        </div>
                      )}
                      {respondedAction && (
                        <p className="navbar-notif-responded">
                          {respondedAction === 'accepted' ? (n.type === 'group_invitation' ? 'Joined!' : 'Request accepted') : 'Declined'}
                        </p>
                      )}
                    </div>
                    {n.unread && <span className="navbar-notif-dot" />}
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <p style={{ padding: '12px 16px', color: '#5c6a8c', fontSize: '13px' }}>No notifications yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="navbar-user-wrap" ref={userRef}>
          <button className="navbar-user" onClick={() => setUserOpen(v => !v)}>
            <div className="navbar-avatar-wrap">
              <div className="navbar-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} aria-hidden="true">
                <SkeletonImg
                  src={avatarUrl}
                  alt={displayName}
                  fallback={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontWeight: 700 }}>{displayName[0]?.toUpperCase()}</span>}
                />
              </div>
              <span className="navbar-online-dot" />
            </div>
            <div className="navbar-user-info">
              <span className="navbar-username">{displayName}</span>
              <span className="navbar-active-now">Active Now</span>
            </div>
            <span className="navbar-chevron"><ChevronDownIcon /></span>
          </button>

          {userOpen && (
            <div className="navbar-user-dropdown">
              <div className="navbar-user-dropdown-header" style={{ cursor: 'pointer' }} onClick={() => { setUserOpen(false); onProfileClick?.(); }}>
                <div className="navbar-ud-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <SkeletonImg
                    src={avatarUrl}
                    alt={displayName}
                    fallback={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontWeight: 700 }}>{displayName[0]?.toUpperCase()}</span>}
                  />
                </div>
                <div>
                  <p className="navbar-ud-name">{displayName}</p>
                  <p className="navbar-ud-status">Active Now</p>
                </div>
              </div>
              <div className="navbar-ud-divider" />
              {/* <button className="navbar-ud-item" onClick={() => { setUserOpen(false); onProfileClick?.(); }}>
                <SettingsIcon /> Settings
              </button> */}
              <div className="navbar-ud-divider" />
              <button className="navbar-ud-item navbar-ud-item--logout" onClick={() => { disconnectSocket(); dispatch(logout()); dispatch(showLogin()); }}>
                <LogoutIcon /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

