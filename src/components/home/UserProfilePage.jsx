import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AnimatedNav from "./AnimatedNav";
import PostCard from "./PostCard";
import SkeletonImg from "../SkeletonImg";
import ReportModal from "./ReportModal";
import { EventsTab, MediaTab } from "./ProfilePage";
import { followUser, unfollowUser, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, blockUser, unblockUser, fetchBlockStatus } from "../../store/slices/usersSlice";
import { normalizePost, setViewedPosts as setViewedPostsAction } from "../../store/slices/postsSlice";
import { fetchConnections } from "../../store/slices/profileSlice";
import { toggleBlock } from "../../store/slices/messagesSlice";
import { showToast } from "../../store/slices/toastSlice";
import { apiRequest } from "../../services/api";
import { getSocket } from "../../services/socket";
import Loader from "../Loader";

const TABS = ["Feed", "About", "Connections", "Photos", "Events"];

function BackArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 2 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
function MsgIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function PersonAddIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MutualIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 3 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ⚠️ TEMPORARY MOCK — used as a fallback when the real API call fails (e.g.
// because post.author has no _id yet, or the /users/:id endpoints don't
// exist on the backend yet). Lets you confirm the click → navigate → render
// chain works end-to-end before the backend is wired up. Delete this once
// the real fetch succeeds reliably.
const MOCK_USER = {
  _id: "mock-arpit",
  fullName: "Arpit",
  role: "Frontend Developer",
  location: "Ahmedabad, India",
  joinedAt: "2022-03-14",
  avatar: "",
  bio: "This is placeholder bio text for Arpit — replace once the real /users/:id endpoint is wired up.",
  followersCount: 128,
  followingCount: 96,
  postsCount: 12,
  isFollowing: false,
};

const MOCK_POSTS = [
  {
    _id: "mock-post-1",
    author: { _id: "mock-arpit", fullName: "Arpit", avatar: "" },
    caption: "Just shipped a new feature 🚀",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    likes: ["user1", "user2", "user3"],
    comments: [
      {
        _id: "mock-comment-1",
        author: { _id: "mock-user-1", fullName: "Sara Khan", avatar: "" },
        text: "This looks awesome! Great work 🔥",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        likes: 2,
        replies: [
          {
            _id: "mock-reply-1",
            author: { _id: "mock-user-4", fullName: "Arpit", avatar: "" },
            text: "Thanks Sara! 🙏",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
            likes: 1,
          },
        ],
      },
      {
        _id: "mock-comment-2",
        author: { _id: "mock-user-2", fullName: "Dev Patel", avatar: "" },
        text: "Nice, when's it going live?",
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        likes: 0,
        replies: [],
      },
    ],
    shares: [],
  },
  {
    _id: "mock-post-2",
    author: { _id: "mock-arpit", fullName: "Arpit", avatar: "" },
    caption: "Coffee + code = perfect Sunday ☕️",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=800&q=80",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    likes: ["user4", "user5"],
    comments: [
      {
        _id: "mock-comment-3",
        author: { _id: "mock-user-3", fullName: "Priya Shah", avatar: "" },
        text: "Same energy here 😄",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        likes: 1,
        replies: [],
      },
    ],
    shares: ["user6"],
  },
  {
    _id: "mock-post-3",
    author: { _id: "mock-arpit", fullName: "Arpit", avatar: "" },
    caption: "Weekend hike with the team 🏔️",
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    likes: ["user1", "user6", "user7", "user8"],
    comments: [],
    shares: [],
  },
];

const MOCK_PHOTOS = [
  { id: "mock-photo-1", images: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80"] },
  { id: "mock-photo-2", images: ["https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80"] },
  { id: "mock-photo-3", images: ["https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80"] },
  { id: "mock-photo-4", images: ["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80"] },
  { id: "mock-photo-5", images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80"] },
  { id: "mock-photo-6", images: ["https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80"] },
];

export default function UserProfilePage({
  userId, onBack, onMessageUser, onEventsClick, onEventsCreateClick,
  onGroupsClick, onCoursesClick, onLibraryClick, onMinisitesClick, onUserClick, onEventClick,
}) {
  const dispatch = useDispatch();
  const { user: authUser, token } = useSelector((s) => s.auth);
  const { followingIds, friendStatusMap, blockedUserIds, blockingId } = useSelector((s) => s.users);
  // Blocking here (usersSlice) and blocking a conversation (messagesSlice) are
  // separate backend actions — if a DM with this person already exists, keep
  // its conversation-level block state in sync too, so the chat's own
  // Block/Unblock button and message input reflect the same status.
  const { conversations: messageConversations, blockedConvIds } = useSelector((s) => s.messages);
  // Posts live in Redux (not local state) so PostCard's like/comment/reply/share
  // dispatches — which update state.posts.viewedPosts — are reflected here.
  const viewedPosts = useSelector((s) => s.posts.viewedPosts);

  // ⚠️ Local state standing in for Redux until profileSlice.js gets by-id thunks
  const [viewedUser, setViewedUser] = useState(null);
  const [viewedPhotos, setViewedPhotos] = useState([]);
  const [viewedConnections, setViewedConnections] = useState(null); // null = not yet loaded
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("Feed");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followHover, setFollowHover] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [photoLbIdx, setPhotoLbIdx] = useState(null); // Photos tab lightbox
  const [blockedMessage, setBlockedMessage] = useState(null); // Block error message
  const [photoLikes, setPhotoLikes] = useState({}); // { photoId: { count, liked } }

  // Fetch user data
  const fetchViewedUser = async () => {
    if (!userId || !token) return;
    try {
      const userRes = await apiRequest(`/api/users/${userId}`, { token });
      setViewedUser(userRes?.user ?? userRes);
    } catch (err) {
      console.error("Error refetching user data:", err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    dispatch(setViewedPostsAction([]));
    // PostCard's @mention comment box reads state.profile.connections — this
    // page never populated it otherwise, so mentions silently degraded to
    // whatever (if anything) an earlier Feed visit happened to leave behind.
    dispatch(fetchConnections());
    // Seeds blockedUserIds for this profile — Feed only populates it for
    // authors of posts you've actually scrolled past, so a direct profile
    // visit could otherwise show "Block" for someone you already blocked.
    dispatch(fetchBlockStatus(userId));
    Promise.all([
      apiRequest(`/api/users/${userId}`, { token }).catch(e => ({ error: e })),
      apiRequest(`/api/users/${userId}/posts`, { token }).catch(e => ({ error: e })),
    ])
      .then(([userRes, postsRes]) => {
        if (cancelled) return;

        // Check for blocking errors
        const userError = userRes?.error;
        const postsError = postsRes?.error;

        if (userError?.status === 403 || postsError?.status === 403) {
          setBlockedMessage("You don't have access to this profile");
          setViewedUser(null);
          dispatch(setViewedPostsAction([]));
          return;
        }

        setBlockedMessage(null);
        setViewedUser(userRes?.user ?? userRes);
        dispatch(setViewedPostsAction((postsRes?.posts ?? postsRes ?? []).map(normalizePost)));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Error loading profile:", err.message);
        setBlockedMessage("Unable to load this profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, token, dispatch]);

  // Refetch user data when follower/following counts change
  useEffect(() => {
    if (!userId || userId === authUser?.id) return;
    // Refetch user data to get updated follower/following counts
    fetchViewedUser();
  }, [followingIds, userId, authUser?.id, token]);

  useEffect(() => {
    if (activeTab !== "Photos" || !userId) return;
    apiRequest(`/api/users/${userId}/photos`, { token })
      .then((res) => {
        const photos = res?.photos ?? res ?? [];
        setViewedPhotos(photos);
        const likes = {};
        photos.forEach(photo => {
          const photoId = photo.id || photo._id;
          likes[photoId] = { count: photo.likesCount || 0, liked: photo.likedByMe || false };
        });
        setPhotoLikes(likes);
      })
      .catch((err) => {
        console.warn("Falling back to mock photos:", err.message);
        setViewedPhotos(MOCK_PHOTOS);
      });
  }, [activeTab, userId, token]);

  function handlePhotoLike(photoId, e) {
    e.stopPropagation();
    if (!photoId) {
      console.warn("Photo ID is missing");
      return;
    }
    setPhotoLikes(prev => {
      const current = prev[photoId] || { count: 0, liked: false };
      const newLiked = !current.liked;
      const newCount = newLiked ? current.count + 1 : Math.max(0, current.count - 1);

      apiRequest(`/api/photos/${photoId}/like`, {
        token,
        method: newLiked ? 'POST' : 'DELETE'
      }).catch((err) => {
        console.warn("Failed to update like:", err.message);
        setPhotoLikes(prev => ({ ...prev, [photoId]: current }));
      });

      return { ...prev, [photoId]: { count: newCount, liked: newLiked } };
    });
  }

  // Socket listeners for real-time photo like updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePhotoLiked = (data) => {
      if (data.photoId) {
        setPhotoLikes(prev => ({
          ...prev,
          [data.photoId]: { count: data.likesCount, liked: data.userId === authUser?.id }
        }));
      }
    };

    const handlePhotoUnliked = (data) => {
      if (data.photoId) {
        setPhotoLikes(prev => ({
          ...prev,
          [data.photoId]: { count: data.likesCount, liked: data.userId === authUser?.id }
        }));
      }
    };

    socket.on('photo:liked', handlePhotoLiked);
    socket.on('photo:unliked', handlePhotoUnliked);

    return () => {
      socket.off('photo:liked', handlePhotoLiked);
      socket.off('photo:unliked', handlePhotoUnliked);
    };
  }, [authUser?.id]);

  // Reset per-user tab data when the viewed profile changes, so we refetch for
  // the new user instead of showing the previous one's (or a stale empty) list.
  useEffect(() => {
    setViewedConnections(null);
    setViewedPhotos([]);
  }, [userId]);

  useEffect(() => {
    if (activeTab !== "Connections" || !userId || viewedConnections !== null) return;
    setConnectionsLoading(true);
    apiRequest(`/api/users/${userId}/connections`, { token })
      .then((res) => {
        const list = Array.isArray(res) ? res
          : (res?.connections ?? res?.data ?? res?.results ?? []);
        const normalized = Array.isArray(list) ? list.map(c => ({
          id: c.userId,
          name: c.fullName,
          avatar: c.avatar,
          location: c.city,
          isMutual: c.isMutual,
          friendStatus: c.friendStatus,
          isFollowing: c.isFollowing
        })) : [];
        setViewedConnections(normalized);
      })
      .catch((err) => {
        console.warn("Could not load connections for this user:", err.message);
        setViewedConnections([]);
      })
      .finally(() => setConnectionsLoading(false));
  }, [activeTab, userId, token, viewedConnections]);

  useEffect(() => {
    setIsFollowing(
      followingIds.includes(userId) || !!viewedUser?.isFollowing,
    );
  }, [followingIds, userId, viewedUser]);

  // Viewing your own profile from somewhere else in the app — bounce to the
  // normal editable ProfilePage rather than rendering the read-only one.
  const isSelf = authUser?._id === userId;

  // Relationship: optimistic override wins, else the flag from the profile fetch.
  const friendStatus = friendStatusMap[userId] ?? viewedUser?.friendStatus ?? 'none';
  const isConnected  = friendStatus === 'connected';
  const isBlocked    = blockedUserIds.includes(userId);

  function handleFollowToggle() {
    setIsFollowing((prev) => !prev);
    dispatch(isFollowing ? unfollowUser(userId) : followUser(userId));
  }

  function handleConnect()  { dispatch(sendFriendRequest(userId)); }
  function handleAccept()   { dispatch(acceptFriendRequest(userId)); }
  function handleReject()   { dispatch(rejectFriendRequest(userId)); }

  function openBlockConfirm() { setBlockConfirmOpen(true); }

  async function handleBlockConfirm() {
    const result = await dispatch(blockUser(userId));
    if (blockUser.fulfilled.match(result)) {
      setBlockConfirmOpen(false);
      dispatch(showToast({ message: `${displayName} has been blocked`, type: 'success' }));
      // toggleBlock flips whatever the current state is, so only fire it when
      // the conversation isn't already blocked — otherwise this would undo it.
      const existingConv = messageConversations.find(c => c.participantId === userId);
      if (existingConv && !blockedConvIds[existingConv.id]) dispatch(toggleBlock(existingConv.id));
    } else {
      dispatch(showToast({ message: result.payload ?? 'Failed to block user', type: 'error' }));
    }
  }

  async function handleUnblock() {
    const result = await dispatch(unblockUser(userId));
    if (unblockUser.fulfilled.match(result)) {
      dispatch(showToast({ message: `${displayName} has been unblocked`, type: 'success' }));
      const existingConv = messageConversations.find(c => c.participantId === userId);
      if (existingConv && blockedConvIds[existingConv.id]) dispatch(toggleBlock(existingConv.id));
    } else {
      dispatch(showToast({ message: result.payload ?? 'Failed to unblock user', type: 'error' }));
    }
  }

  function handleChatClick() {
    if (!isConnected) return;
    onMessageUser?.(userId);
  }

  function handleNav(id) {
    if (id === "home")      onBack?.();
    if (id === "events")    onEventsClick?.();
    if (id === "friends")   onGroupsClick?.();
    // Left-nav "Messages" is the main app nav button — always takes you to Messages,
    // unlike the profile's own "Chat" button which is gated on being connected.
    if (id === "messages")  onMessageUser?.(userId);
    if (id === "courses")   onCoursesClick?.();
    if (id === "library")   onLibraryClick?.();
    if (id === "minisites") onMinisitesClick?.();
  }

  if (loading && !viewedUser) {
    return <Loader />;
  }

  const displayName = viewedUser?.fullName ?? "User";
  const role = viewedUser?.profession ?? viewedUser?.role ?? "";

  const rawAvatar = viewedUser?.avatar ?? "";
  const avatarUrl = rawAvatar?.startsWith?.("http") && rawAvatar.trim() ? rawAvatar : "";
  const coverUrl = viewedUser?.coverPhoto?.startsWith?.("http") ? viewedUser.coverPhoto : null;

  const followersCount = viewedUser?.followersCount ?? 0;
  const followingCount = viewedUser?.followingCount ?? 0;
  const postsCount = viewedUser?.postsCount ?? viewedPosts.length;
  const mutualCount = viewedUser?.mutualCount ?? 0;

  return (
    <>
    <div className="prof-page">
      <AnimatedNav activeId="home" avatarUrl={authUser?.avatar} onNavigate={handleNav} />

      <div className="prof-main">
        {/* ── Cover (no edit button — read-only) ── */}
        <div className="prof-cover" style={{ position: "relative", overflow: "hidden" }}>
          {coverUrl
            ? <SkeletonImg src={coverUrl} alt="cover" className="prof-cover-img" />
            : <div className="prof-cover-placeholder" />
          }
          <button className="prof-cover-back-btn" onClick={onBack} title="Back to Feed">
            <BackArrowIcon />
          </button>
        </div>

        {/* ── Identity ── */}
        <div className="prof-identity">
          <div className="prof-avatar-wrap" style={{ position: "relative", overflow: "hidden", cursor: "default" }}>
            <SkeletonImg
              src={avatarUrl}
              alt={displayName}
              className="prof-avatar-img"
              fallback={
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
                  {initials(displayName)}
                </span>
              }
            />
          </div>

          <div className="prof-info">
            <div className="prof-name-row">
              <h1 className="prof-name">{displayName}</h1>
            </div>
            <div className="prof-meta-row">
              {role && (
                <>
                  <span className="prof-meta-item"><BriefcaseIcon /> {role}</span>
                  <span className="prof-meta-sep">·</span>
                </>
              )}
              <span className="prof-meta-item"><PinIcon /> {viewedUser?.location ?? "Unknown"}</span>
              <span className="prof-meta-sep">·</span>
              {viewedUser?.dateOfBirth && (
                <>
                  <span className="prof-meta-item">
                    <CalIcon /> DOB: {new Date(viewedUser.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </>
              )}
            </div>
            <div className="prof-counts-row">
              <button className="prof-count-item">
                <span className="prof-count-num">{followersCount.toLocaleString()}</span>
                <span className="prof-count-lbl">Followers</span>
              </button>
              <span className="prof-count-div" />
              <button className="prof-count-item">
                <span className="prof-count-num">{followingCount.toLocaleString()}</span>
                <span className="prof-count-lbl">Following</span>
              </button>
              <span className="prof-count-div" />
              <button className="prof-count-item">
                <span className="prof-count-num">{postsCount}</span>
                <span className="prof-count-lbl">Posts</span>
              </button>
              {!isSelf && mutualCount > 0 && (
                <>
                  <span className="prof-count-div" />
                  <button className="prof-count-item" onClick={() => setActiveTab("Connections")} title="View mutual connections">
                    <span className="prof-count-num">{mutualCount.toLocaleString()}</span>
                    <span className="prof-count-lbl">Mutual</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Action buttons (replaces the edit/avatar controls on own profile) ── */}
          {!isSelf && !blockedMessage && (
            <div className="prof-actions">
              {/* Primary relationship button */}
              {friendStatus === 'incoming' ? (
                <>
                  <button
                    className="prof-edit-btn"
                    style={{ background: "#2563eb", border: "1px solid #2563eb", color: "#fff" }}
                    onClick={handleAccept}
                  >
                    <CheckIcon /> Accept
                  </button>
                  <button
                    className="prof-edit-btn"
                    style={{ background: "#1a2338", border: "1px solid #1e2a42", color: "#cbd5e1" }}
                    onClick={handleReject}
                  >
                    Ignore
                  </button>
                </>
              ) : friendStatus === 'connected' ? (
                <button
                  className="prof-edit-btn"
                  style={{ background: "#2563eb", border: "1px solid #2563eb", color: "#fff" }}
                  onClick={() => onMessageUser?.(userId)}
                >
                  <MsgIcon /> Message
                </button>
              ) : friendStatus === 'requested' ? (
                <button
                  className="prof-edit-btn"
                  style={{ background: "#1a2338", border: "1px solid #1e2a42", color: "#cbd5e1" }}
                  onClick={handleReject}
                  title="Cancel request"
                >
                  <ClockIcon /> Pending
                </button>
              ) : (
                <button
                  className="prof-edit-btn"
                  style={{ background: "#2563eb", border: "1px solid #2563eb", color: "#fff" }}
                  onClick={handleConnect}
                >
                  <PersonAddIcon /> Connect
                </button>
              )}

              {/* Follow toggle — independent of connection */}
              <button
                className="prof-edit-btn"
                style={
                  isFollowing
                    ? {
                        background: followHover ? "rgba(239,68,68,0.15)" : "#1a2338",
                        border: `1px solid ${followHover ? "#ef4444" : "#1e2a42"}`,
                        color: followHover ? "#ef4444" : "#cbd5e1",
                      }
                    : undefined
                }
                onMouseEnter={() => setFollowHover(true)}
                onMouseLeave={() => setFollowHover(false)}
                onClick={handleFollowToggle}
              >
                {isFollowing ? (
                  followHover ? <>Unfollow</> : <><CheckIcon /> Following</>
                ) : (
                  <><PersonAddIcon /> Follow</>
                )}
              </button>

              {/* Chat — only when not connected show a disabled hint; connected uses Message above */}
              {friendStatus !== 'connected' && (
                <button
                  className="prof-edit-btn"
                  style={{ background: "#1a2338", border: "1px solid #1e2a42", color: "#5c6a8c", opacity: 0.6, cursor: "not-allowed" }}
                  onClick={handleChatClick}
                  title={`Connect with ${displayName.split(' ')[0]} to message`}
                >
                  <MsgIcon /> Chat
                </button>
              )}

              <button
                className="prof-edit-btn"
                style={{ background: "#1a2338", border: "1px solid #1e2a42", color: "#ef4444" }}
                onClick={() => setReportOpen(true)}
              >
                <ReportIcon /> Report
              </button>

              <button
                className="prof-edit-btn"
                style={
                  isBlocked
                    ? { background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#ef4444" }
                    : { background: "#1a2338", border: "1px solid #1e2a42", color: "#ef4444" }
                }
                onClick={isBlocked ? handleUnblock : openBlockConfirm}
                disabled={blockingId === userId}
              >
                <BlockIcon /> {blockingId === userId ? (isBlocked ? 'Unblocking...' : 'Blocking...') : (isBlocked ? 'Blocked' : 'Block')}
              </button>
            </div>
          )}
        </div>

        {blockConfirmOpen && (
          <div className="dpm-overlay" onClick={() => setBlockConfirmOpen(false)}>
            <div className="dpm-box" onClick={(e) => e.stopPropagation()}>
              <h2 className="dpm-title">Block {displayName}?</h2>
              <p className="dpm-desc">They won't be able to see your profile or posts, and you won't see theirs either. You can unblock them anytime from here.</p>
              <div className="dpm-actions">
                <button className="dpm-cancel-btn" onClick={() => setBlockConfirmOpen(false)} type="button">Cancel</button>
                <button className="dpm-confirm-btn" onClick={handleBlockConfirm} disabled={blockingId === userId} type="button">
                  {blockingId === userId ? 'Blocking...' : 'Block User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="prof-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`prof-tab${activeTab === tab ? " prof-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Connections" && viewedConnections?.length > 0 && (
                <span className="prof-tab-badge">{viewedConnections.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div
          className={`prof-content${(activeTab === "Photos" || activeTab === "Events" || activeTab === "Connections") ? " prof-content--wide" : ""}`}
          style={activeTab === "Feed" ? { width: "100%", maxWidth: "100%", boxSizing: "border-box" } : undefined}
        >
          {activeTab === "Feed" && (
            <div className="prof-feed" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
              {blockedMessage && (
                <div style={{ textAlign: "center", padding: "48px 32px", color: "#ef4444", fontSize: 14 }}>
                  <BlockIcon />
                  <p style={{ marginTop: "12px", fontWeight: "500" }}>{blockedMessage}</p>
                </div>
              )}
              {!blockedMessage && viewedPosts.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px", color: "#5c6a8c", fontSize: 14 }}>
                  No posts yet.
                </div>
              )}
              {!blockedMessage && viewedPosts.map((post) => (
                <div key={post._id} style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                  <PostCard post={post} onUserClick={onUserClick} />
                </div>
              ))}
            </div>
          )}

          {activeTab === "Photos" && (() => {
            const photoUrls = viewedPhotos.map(p => p.images?.[0]).filter(Boolean);
            const closeLb = () => setPhotoLbIdx(null);
            const prevLb = () => setPhotoLbIdx(i => (i - 1 + photoUrls.length) % photoUrls.length);
            const nextLb = () => setPhotoLbIdx(i => (i + 1) % photoUrls.length);

            // Check if user has any photos or albums
            const hasContent = viewedPhotos.length > 0;

            return (
            <div className="prof-conn-layout">
              <div style={{ flex: 1 }}>
                {hasContent ? (
                  <>
                    <MediaTab readOnly userId={userId} />
                    <div className="media-tab">
                      <h3 className="media-subhead">All photos</h3>
                      <div className="media-grid">
                  {viewedPhotos.map((photo, i) => {
                    const photoId = photo.id || photo._id;
                    const likeInfo = photoLikes[photoId] || { count: 0, liked: false };
                    return (
                      <div key={photoId} className="media-photo-card" style={{ cursor: "pointer", position: 'relative' }} onClick={() => setPhotoLbIdx(i)}>
                        <div className="media-photo-wrap">
                          <SkeletonImg src={photo.images?.[0]} alt="" className="media-photo-img" />
                        </div>
                        <button
                          className={`media-photo-like-btn${likeInfo.liked ? ' liked' : ''}`}
                          onClick={(e) => handlePhotoLike(photoId, e)}
                          title={likeInfo.liked ? "Unlike" : "Like"}
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: likeInfo.liked ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.5)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            zIndex: 10
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.background = likeInfo.liked ? 'rgba(239, 68, 68, 1)' : 'rgba(0, 0, 0, 0.7)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = likeInfo.liked ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.5)';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={likeInfo.liked ? 'currentColor' : 'none'} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                        </button>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            background: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            zIndex: 10
                          }}
                        >
                          {likeInfo.count}
                        </span>
                      </div>
                    );
                  })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5c6a8c' }}>
                    <p style={{ fontSize: 16 }}>No photos yet.</p>
                  </div>
                )}
              </div>

              {photoLbIdx !== null && photoUrls[photoLbIdx] && (
                <div className="post-lightbox" onClick={closeLb}>
                  <button className="post-lightbox-close" onClick={closeLb} aria-label="Close" type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {photoUrls.length > 1 && <span className="post-lightbox-count">{photoLbIdx + 1} / {photoUrls.length}</span>}
                  {photoUrls.length > 1 && (
                    <button className="post-lightbox-arrow post-lightbox-arrow--prev" onClick={e => { e.stopPropagation(); prevLb(); }} aria-label="Previous" type="button">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                  )}
                  <div className="post-lightbox-stage" onClick={e => e.stopPropagation()}>
                    <img src={photoUrls[photoLbIdx]} alt="" className="post-lightbox-media" />
                  </div>
                  {photoUrls.length > 1 && (
                    <button className="post-lightbox-arrow post-lightbox-arrow--next" onClick={e => { e.stopPropagation(); nextLb(); }} aria-label="Next" type="button">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            );
          })()}

          {activeTab === "About" && (() => {
            const fmtDob = (d) => {
              if (!d) return "";
              try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
              catch { return ""; }
            };
            const personal = [
              { label: "Full Name",           value: viewedUser?.fullName },
              { label: "Profession",          value: viewedUser?.profession ?? viewedUser?.role },
              { label: "Date of Birth",       value: fmtDob(viewedUser?.dateOfBirth) },
              { label: "Gender",              value: viewedUser?.gender },
              { label: "Relationship Status", value: viewedUser?.relationshipStatus },
              { label: "Location",            value: viewedUser?.location },
              { label: "Website",             value: viewedUser?.website },
            ].filter(f => f.value);
            const edu = Array.isArray(viewedUser?.education) ? viewedUser.education : [];
            return (
              <div className="about-tab">
                <h2 className="about-section-title">Profile Info</h2>
                <div className="about-card">
                  <div className="about-card-header">
                    <span className="about-card-label">Overview</span>
                  </div>
                  {viewedUser?.bio
                    ? <p className="about-bio-text">{viewedUser.bio}</p>
                    : <p className="about-bio-empty">No overview added yet.</p>}
                </div>

                <div className="about-card" style={{ marginTop: 16 }}>
                  <div className="about-card-header"><span className="about-card-label">Personal Information</span></div>
                  {personal.length === 0 ? (
                    <p className="about-bio-empty">No details added yet.</p>
                  ) : (
                    <div className="about-info-section">
                      {personal.map(f => (
                        <div key={f.label} className="about-info-row">
                          <div className="about-info-row-body">
                            <span className="about-info-row-label">{f.label}</span>
                            <span className="about-info-row-value">{f.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="about-card" style={{ marginTop: 16 }}>
                  <div className="about-card-header"><span className="about-card-label">Education</span></div>
                  {edu.length === 0 ? (
                    <p className="about-bio-empty">No education added yet.</p>
                  ) : (
                    edu.map((e, i) => (
                      <div key={e._id ?? e.id ?? i} className="about-edu-item" style={{ padding: "10px 0" }}>
                        <p className="about-edu-school" style={{ margin: 0, fontWeight: 600, color: "#e2e8f0" }}>{e.school}</p>
                        {e.degree && <p className="about-edu-degree" style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13 }}>{e.degree}{e.years ? ` · ${e.years}` : ""}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === "Connections" && (
            <div className="prof-conn-tab">
              <div className="prof-conn-header">
                <div className="prof-conn-header-left">
                  <h3 className="prof-conn-title">Connections</h3>
                  <span className="prof-conn-count">{viewedConnections?.length ?? 0}</span>
                </div>
              </div>
              {connectionsLoading && (
                <div style={{ textAlign: "center", padding: "32px", color: "#5c6a8c", fontSize: 14 }}>
                  Loading connections…
                </div>
              )}
              {!connectionsLoading && (viewedConnections?.length ?? 0) === 0 && (
                <div style={{ textAlign: "center", padding: "32px", color: "#5c6a8c", fontSize: 14 }}>
                  No connections to show.
                </div>
              )}
              {!connectionsLoading && viewedConnections?.length > 0 && (
                <div className="prof-conn-list">
                  {viewedConnections.map((conn) => {
                    const cid = conn.id ?? conn._id;
                    const name = conn.name ?? conn.fullName ?? "Unknown";
                    const avatar = conn.avatar?.startsWith?.("http") ? conn.avatar : "";
                    const myId = authUser?._id ?? authUser?.id;
                    const isSelfConn = cid === myId;
                    const cStatus = friendStatusMap[cid] ?? conn.friendStatus ?? "none";
                    const cFollowing = followingIds.includes(cid) || !!conn.isFollowing;
                    return (
                      <div key={cid} className="prof-conn-item">
                        <div
                          className="prof-conn-avatar-wrap"
                          style={{ cursor: onUserClick ? "pointer" : "default" }}
                          onClick={() => onUserClick?.(cid)}
                        >
                          {avatar
                            ? <img src={avatar} alt={name} className="prof-conn-avatar" />
                            : <span className="prof-conn-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#3b82f6", color: "#fff", fontWeight: 700 }}>{initials(name)}</span>
                          }
                        </div>
                        <div className="prof-conn-info">
                          <div className="prof-conn-name-row">
                            <span
                              className="prof-conn-name"
                              style={{ cursor: onUserClick ? "pointer" : "default" }}
                              onClick={() => onUserClick?.(cid)}
                            >
                              {name}
                            </span>
                          </div>
                          {conn.isMutual ? (
                            <div className="prof-conn-shared" style={{ margin: '-7px 0 0 0' }}>
                              <span className="prof-conn-shared-text"><MutualIcon /> Mutual friend</span>
                            </div>
                          ) : conn.location ? (
                            <div className="prof-conn-shared" style={{ margin: '-7px 0 0 0' }}>
                              <span className="prof-conn-shared-text"><PinIcon /> {conn.location}</span>
                            </div>
                          ) : null}
                          {conn.role && <span className="prof-conn-role">{conn.role}</span>}
                        </div>
                        {!isSelfConn && (
                          <div className="prof-conn-actions">
                            <button
                              className="prof-conn-btn prof-conn-btn--msg"
                              disabled={cStatus === "requested" || cStatus === "connected"}
                              onClick={() => {
                                if (cStatus === "none") {
                                  dispatch(sendFriendRequest(cid));
                                } else if (cStatus === "incoming") {
                                  dispatch(acceptFriendRequest(cid));
                                }
                              }}
                            >
                              {cStatus === "connected" ? "Connected" : cStatus === "requested" ? "Pending" : cStatus === "incoming" ? "Respond" : "Connect"}
                            </button>
                            <button
                              className="prof-conn-btn prof-conn-btn--remove"
                              style={cFollowing ? { color: "#4ade80", borderColor: "#16a34a" } : undefined}
                              onClick={() => dispatch(cFollowing ? unfollowUser(cid) : followUser(cid))}
                            >
                              {cFollowing ? "Following" : "Follow"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "Events" && (
            <EventsTab onEventsClick={onEventsClick} onCreateEvent={onEventsCreateClick} onEventClick={onEventClick} readOnly />
          )}
        </div>
      </div>
    </div>

    {reportOpen && <ReportModal userId={userId} onClose={() => setReportOpen(false)} />}
    </>
  );
}
