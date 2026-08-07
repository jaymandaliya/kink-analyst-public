import { useState, useEffect } from 'react';
import SkeletonImg from '../SkeletonImg';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSuggestions, sendFriendRequest, dismissSuggestion, fetchGroups, followUser, unfollowUser, fetchAllUsers } from '../../store/slices/usersSlice';
import { fetchUserProfile } from '../../store/slices/profileSlice';
import { fetchEvents } from '../../store/slices/eventsSlice';
import { apiRequest } from '../../services/api';
import CreatePostModal from './CreatePostModal';
import AnimatedNav from './AnimatedNav';

function membershipLabel(tier = '') {
  const map = { platinum: 'Platinum Member', gold: 'Gold Member', free: 'Free Member' };
  return map[tier.toLowerCase()] ?? (tier ? `${tier[0].toUpperCase()}${tier.slice(1)} Member` : 'Member');
}

function formatCount(n = 0) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/* ── Nav strip icons ── */
function HomeIcon()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function CreatePostIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>; }
function EventsIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function PeopleIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ChatIcon()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function CalendarIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function PhotoIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>; }
function SettingsIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

const NAV_ITEMS = [
  { icon: <HomeIcon />,        label: 'Home',        active: true      },
  { icon: <CreatePostIcon />,  label: 'Create Post', create: true      },
  { icon: <EventsIcon />,      label: 'Events',      events: true      },
  { icon: <PeopleIcon />,      label: 'Friends',     groups: true      },
  { icon: <ChatIcon />,        label: 'Messages',    messages: true    },
  { icon: <CalendarIcon />,    label: 'Calendar',    calendar: true    },
  { icon: <PhotoIcon />,       label: 'Media'                          },
  { icon: <SettingsIcon />,    label: 'Settings'                       },
];

function MutualIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 3 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4, display: 'inline-block', position: 'relative', top: '-1px' }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase();
}

// Small popup listing the mutual connections between me and one suggested
// user — opened by clicking the "N mutual" text on a suggestion card.
// Reuses the same fp-* classes as the Followers/Following panel in
// ProfilePage.jsx so it looks consistent without new CSS.
function MutualFriendsModal({ userId, token, onClose, onUserClick }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest(`/api/users/${userId}/mutual-connections?page=1&limit=20`, { token })
      .then((res) => {
        if (cancelled) return;
        const results = Array.isArray(res) ? res : (res?.results ?? []);
        setList(results.map(c => ({
          id: c.id ?? c._id,
          name: c.fullName ?? c.name ?? '',
          avatar: c.avatar?.startsWith?.('http') ? c.avatar : '',
          location: c.location ?? c.city ?? '',
        })));
      })
      .catch(() => { if (!cancelled) setList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, token]);

  return (
    <div className="fp-overlay" onClick={onClose}>
      <div className="fp-panel" onClick={e => e.stopPropagation()}>
        <div className="fp-header">
          <div className="fp-tabs">
            <span className="fp-tab fp-tab--active">Mutual Friends</span>
          </div>
          <button className="fp-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="fp-list">
          {loading && list.length === 0 && (
            <div className="fp-loading">
              <span className="fp-spinner" />
              <p style={{ margin: 0 }}>Loading mutual friends…</p>
            </div>
          )}
          {!loading && list.length === 0 && <p className="fp-empty">No mutual friends</p>}
          {list.map(person => (
            <div className="fp-person" key={person.id}>
              {person.avatar
                ? <img className="fp-avatar" style={{ cursor: 'pointer' }} src={person.avatar} alt={person.name} onClick={() => { onUserClick?.(person.id); onClose(); }} />
                : (
                  <div
                    className="fp-avatar"
                    style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => { onUserClick?.(person.id); onClose(); }}
                  >
                    {initials(person.name)}
                  </div>
                )
              }
              <div className="fp-info">
                <span className="fp-name" style={{ cursor: 'pointer' }} onClick={() => { onUserClick?.(person.id); onClose(); }}>{person.name}</span>
                {person.location && <span className="fp-role">{person.location}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LeftSidebar({ onEventsClick, onMessagesClick, onGroupsClick, onCalendarClick, onCoursesClick, onLibraryClick, onProfileClick, onFollowingClick, onFollowersClick, onMinisitesClick, onGroupClick, onEventClick, onUserClick, onCreateGroup, onCreateEvent }) {
  const dispatch = useDispatch();
  const { user: authUser, token } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.profile);
  const { suggestions, dismissedIds, groups, friendStatusMap, followingIds, allUsers, allUsersLoading, blockedUserIds } = useSelector((state) => state.users);
  const { conversations } = useSelector((state) => state.messages);
  const { events: upcomingEvents } = useSelector((state) => state.events);
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const [createOpen,  setCreateOpen]  = useState(false);
  const [activeNavId, setActiveNavId] = useState('home');
  const [poppingIds,  setPoppingIds]  = useState(new Set());
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [mutualModalId, setMutualModalId] = useState(null); // userId whose mutual friends are being viewed

  useEffect(() => {
    dispatch(fetchUserProfile());
    dispatch(fetchSuggestions(5));
    dispatch(fetchGroups());
    dispatch(fetchEvents({ tab: 'upcoming', limit: 3 }));
  }, [dispatch]);

  // Refetch profile when following changes to keep sidebar counts in sync
  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [followingIds, dispatch]);

  function handleAddFriend(id, status) {
    if (!id) return;
    const selfId = authUser?._id ?? authUser?.id;
    if (selfId && id === selfId) return;
    if (status === 'requested' || status === 'connected') return;
    setPoppingIds(prev => new Set([...prev, id]));
    setTimeout(() => setPoppingIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 500);
    dispatch(sendFriendRequest(id)).then((result) => {
      if (sendFriendRequest.fulfilled.match(result)) dispatch(fetchSuggestions(5));
    });
  }

  function handleDismiss(id) {
    if (!id) return;
    dispatch(dismissSuggestion(id));
  }

  function handleFollowToggle(id, isFollowing) {
    if (!id) return;
    dispatch(isFollowing ? unfollowUser(id) : followUser(id));
  }

  function openAllSuggestions() {
    setShowAllSuggestions(true);
    dispatch(fetchAllUsers());
  }

  const displayName    = profile?.fullName ?? authUser?.fullName ?? 'You';
  const role           = profile?.role ?? '';
  const followingCount = formatCount(profile?.followingCount ?? profile?.following?.length ?? 0);
  const followersCount = formatCount(profile?.followersCount ?? profile?.followers?.length ?? 0);
  const rawAvatar      = profile?.avatar ?? authUser?.avatar ?? '';
  const avatarUrl      = rawAvatar?.startsWith?.('http') ? rawAvatar : '';
  const rawCover       = profile?.coverPhoto ?? authUser?.coverPhoto ?? '';
  const coverUrl       = rawCover?.startsWith?.('http') ? rawCover : '';

  function handleNavNavigate(id) {
    if (id === 'create')   { setCreateOpen(true); return; }
    setActiveNavId(id);
    if (id === 'courses')  onCoursesClick?.();
    if (id === 'library')  onLibraryClick?.();
    if (id === 'events')   onEventsClick?.();
    if (id === 'messages') onMessagesClick?.();
    if (id === 'friends')  onGroupsClick?.();
    if (id === 'calendar')  onCalendarClick?.();
    if (id === 'minisites') onMinisitesClick?.();
  }

  const visibleSuggestions = suggestions.filter(f => {
    const id = f.id ?? f._id;
    return !dismissedIds.includes(id) && !blockedUserIds.includes(id);
  });

  return (
    <aside className="home-left-panel">

      {/* ── Animated expand-on-hover nav ── */}
      <AnimatedNav
        activeId={activeNavId}
        avatarUrl={avatarUrl}
        onNavigate={handleNavNavigate}
        unreadMessages={unreadMessages}
      />

      {createOpen && <CreatePostModal onClose={() => setCreateOpen(false)} onNavigateToEvents={onEventsClick} />}

      {/* ── Sidebar content ── */}
      <div className="left-sidebar-content">

        {/* Profile card */}
        <div className="profile-card">
          <div className="profile-cover" style={{ position: 'relative', overflow: 'hidden' }}>
            {coverUrl
              ? <SkeletonImg src={coverUrl} alt="cover" className="profile-cover-img" />
              : <div className="profile-cover-placeholder" />
            }
          </div>
          <div className="profile-body">
            <div className="profile-avatar-wrap" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
              <div className="profile-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <SkeletonImg
                  src={avatarUrl}
                  alt={displayName}
                  fallback={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{displayName[0]?.toUpperCase()}</span>}
                />
              </div>
            </div>
            <p className="profile-name">{displayName}</p>
            <p className="profile-role">{role}</p>
            <div className="profile-stats">
              <div className="profile-stat" onClick={onFollowingClick} style={{ cursor: 'pointer' }}>
                <span className="stat-num">{followingCount}</span>
                <span className="stat-lbl">Following</span>
              </div>
              <div className="profile-stat-div" />
              <div className="profile-stat" onClick={onFollowersClick} style={{ cursor: 'pointer' }}>
                <span className="stat-num">{followersCount}</span>
                <span className="stat-lbl">Followers</span>
              </div>
            </div>
            <button className="view-profile-btn" onClick={onProfileClick}>View Profile</button>
          </div>
        </div>

        {/* Friend Suggestions */}
        <div className="sidebar-section">
          <div className="section-header">
            <span className="section-title">Friend Suggestions</span>
            {visibleSuggestions.length > 0 && <button className="section-link" onClick={openAllSuggestions}>View all</button>}
          </div>
          <div className="friend-list">
            {visibleSuggestions.slice(0, 5).map(f => {
              const id = f.id ?? f._id;
              const status = friendStatusMap[id] ?? f.friendStatus ?? 'none';
              const requested = status === 'requested';
              const connected = status === 'connected';
              const isFollowing = followingIds.includes(id);
              return (
                <div
                  key={id}
                  className="friend-item all-sugg-item"
                >
                  <button className="all-sugg-cross-btn all-sugg-cross-btn--corner" title="Remove suggestion" onClick={() => handleDismiss(id)}>
                    ✕
                  </button>
                  <div className="friend-item-top">
                    <div
                      className="friend-avatar"
                      style={{ background: f.avatarColor ?? '#3b82f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
                      onClick={() => onUserClick?.(id)}
                    >
                      {f.avatar
                        ? <SkeletonImg
                            src={f.avatar}
                            alt={f.name}
                            fallback={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{initials(f.name)}</span>}
                          />
                        : initials(f.name)
                      }
                    </div>
                    <div className="friend-info">
                      <p className="friend-name" style={{ cursor: 'pointer' }} onClick={() => onUserClick?.(id)}>{f.name}</p>
                      <p
                        className="friend-sub"
                        style={{ margin: '-7px 0 0 0', cursor: f.mutualFriends > 0 ? 'pointer' : 'default' }}
                        onClick={f.mutualFriends > 0 ? () => setMutualModalId(id) : undefined}
                      >
                        {f.mutualFriends > 0 ? (
                          <><MutualIcon />{f.mutualFriends} mutual</>
                        ) : (f.location || f.city) ? (
                          <><LocationIcon />{f.location ?? f.city}</>
                        ) : (
                          <><MutualIcon />{f.sub ?? ''}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="friend-actions all-sugg-actions">
                    <button
                      className={`friend-add-btn${(requested || connected) ? ' friend-add-btn--added' : ''}${poppingIds.has(id) ? ' friend-add-btn--pop' : ''}`}
                      onClick={() => handleAddFriend(id, status)}
                      disabled={requested || connected}
                    >
                      {connected ? '✓ Connected' : requested ? 'Requested' : 'Add Friend'}
                    </button>
                    <button
                      className={`all-sugg-follow-btn${isFollowing ? ' all-sugg-follow-btn--active' : ''}`}
                      onClick={() => handleFollowToggle(id, isFollowing)}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              );
            })}
            {visibleSuggestions.length === 0 && (
              <div className="friend-empty">
                <button className="friend-empty-cta" onClick={openAllSuggestions}>Invite More Friends</button>
              </div>
            )}
          </div>
        </div>

        {/* Your Groups */}
        <div className="sidebar-section">
          <div className="section-header">
            <span className="section-title">Your Groups</span>
            {groups.length > 0 && <button className="section-link" onClick={onGroupsClick}>View all</button>}
          </div>
          {groups.length === 0 ? (
            <button className="sidebar-create-btn" onClick={onCreateGroup}>+ Create Group</button>
          ) : (
            <div className="group-list">
              {groups.map(g => (
                <div key={g.id ?? g._id} className="group-item" style={{ cursor: 'pointer' }} onClick={() => onGroupClick?.(g.id ?? g._id)}>
                  <div className="group-icon" style={{ background: g.color ?? '#3b82f6' }}>
                    {g.name[0]}
                  </div>
                  <div className="friend-info">
                    <p className="friend-name">{g.name}</p>
                    <p className="friend-sub">{g.members}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="sidebar-section">
          <div className="section-header">
            <span className="section-title">Upcoming Events</span>
            {upcomingEvents.length > 0 && <button className="section-link" onClick={onEventsClick}>View all</button>}
          </div>
          {upcomingEvents.length === 0 ? (
            <button className="sidebar-create-btn" onClick={onCreateEvent}>+ Create Event</button>
          ) : (
            <div className="event-list">
              {upcomingEvents.map(e => (
                <div key={e.id} className="sidebar-event-item" style={{ cursor: 'pointer' }} onClick={() => onEventClick?.(e.id)}>
                  <div className="event-thumb" style={{ overflow: 'hidden', borderRadius: 8, position: 'relative' }}>
                    <SkeletonImg
                      src={e.img}
                      alt={e.title}
                      fallback={
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a2540', color: '#3b82f6' }}>
                          <span style={{ width: 18, height: 18 }}><CalendarIcon /></span>
                        </div>
                      }
                    />
                  </div>
                  <div className="friend-info">
                    <p className="friend-name">{e.title}</p>
                    <p className="friend-sub">{e.month} {e.day}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {showAllSuggestions && (
        <AllSuggestionsModal
          suggestions={allUsers.filter(u => !blockedUserIds.includes(u.id ?? u._id))}
          loading={allUsersLoading}
          friendStatusMap={friendStatusMap}
          followingIds={followingIds}
          onClose={() => setShowAllSuggestions(false)}
          onAddFriend={handleAddFriend}
          onFollowToggle={handleFollowToggle}
          onDismiss={handleDismiss}
          onUserClick={onUserClick}
          onMutualClick={setMutualModalId}
        />
      )}

      {mutualModalId && (
        <MutualFriendsModal
          userId={mutualModalId}
          token={token}
          onUserClick={onUserClick}
          onClose={() => setMutualModalId(null)}
        />
      )}
    </aside>
  );
}

export function AllSuggestionsModal({ suggestions, loading, friendStatusMap, followingIds, onClose, onAddFriend, onFollowToggle, onDismiss, onUserClick, onMutualClick }) {
  const [search, setSearch] = useState('');

  const visible = suggestions
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => (b.mutualFriends ?? 0) - (a.mutualFriends ?? 0));

  return (
    <div className="all-sugg-overlay" onClick={onClose}>
      <div className="all-sugg-modal" onClick={e => e.stopPropagation()}>
        <div className="all-sugg-header">
          <h2 className="all-sugg-title">Friend Suggestions</h2>
          <button className="all-sugg-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="all-sugg-search-wrap">
          <input
            className="all-sugg-search"
            placeholder="Search suggestions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="all-sugg-list">
          {loading && visible.length === 0 && <p className="all-sugg-empty">Loading…</p>}
          {!loading && visible.length === 0 && <p className="all-sugg-empty">No suggestions found.</p>}
          {visible.map(f => {
            const id = f.id ?? f._id;
            const status = friendStatusMap[id] ?? f.friendStatus ?? 'none';
            const requested = status === 'requested';
            const connected = status === 'connected';
            const isFollowing = followingIds.includes(id);
            return (
              <div key={id} className="friend-item all-sugg-item">
                <button className="all-sugg-cross-btn all-sugg-cross-btn--corner" title="Remove suggestion" onClick={() => onDismiss(id)}>
                  ✕
                </button>
                <div className="friend-item-top">
                  <div
                    className="friend-avatar"
                    style={{ background: f.avatarColor ?? '#3b82f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
                    onClick={() => onUserClick?.(id)}
                  >
                    {f.avatar
                      ? <SkeletonImg
                          src={f.avatar}
                          alt={f.name}
                          fallback={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{initials(f.name)}</span>}
                        />
                      : initials(f.name)
                    }
                  </div>
                  <div className="friend-info">
                    <p className="friend-name" style={{ cursor: 'pointer' }} onClick={() => onUserClick?.(id)}>{f.name}</p>
                    <p
                      className="friend-sub"
                      style={{ margin: '-7px 0 0 0', cursor: f.mutualFriends ? 'pointer' : 'default' }}
                      onClick={f.mutualFriends ? () => onMutualClick?.(id) : undefined}
                    >
                      {f.mutualFriends ? (
                        <><MutualIcon />{f.mutualFriends} mutual</>
                      ) : (f.location || f.city) ? (
                        <><LocationIcon />{f.location ?? f.city}</>
                      ) : (
                        <><MutualIcon />{f.sub ?? ''}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="friend-actions all-sugg-actions">
                  <button
                    className={`friend-add-btn${(requested || connected) ? ' friend-add-btn--added' : ''}`}
                    onClick={() => onAddFriend(id, status)}
                    disabled={requested || connected}
                  >
                    {connected ? '✓ Connected' : requested ? 'Requested' : 'Add Friend'}
                  </button>
                  <button
                    className={`all-sugg-follow-btn${isFollowing ? ' all-sugg-follow-btn--active' : ''}`}
                    onClick={() => onFollowToggle(id, isFollowing)}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
