import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';

// A pure-attachment message (image/video/file, no caption) has no `text` to
// preview with — show a plain-English stand-in instead of a blank line, same
// convention WhatsApp/Messenger use for their conversation list.
function attachmentPreviewText(type, fromMe) {
  const label = type === 'image' ? 'a photo' : type === 'video' ? 'a video' : 'an attachment';
  return fromMe ? `You sent ${label}` : `Sent ${label}`;
}

function lastMessagePreviewText({ text, type, fromMe }) {
  return text || attachmentPreviewText(type, fromMe);
}

// Prefer computing the clock time from createdAt client-side — toLocaleTimeString
// with no timeZone option renders in the viewer's own browser timezone, so this
// self-corrects regardless of what timezone the server wrote createdAt in. Only
// falls back to a pre-formatted `time` string from the backend (or '') when
// createdAt is missing/unparseable, e.g. not-yet-migrated older payloads.
function localMsgTime(createdAt, fallback) {
  const d = new Date(createdAt);
  if (createdAt && !Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return fallback ?? '';
}

function normalizeConversation(c) {
  return {
    id: c.id ?? c._id ?? '',
    type: c.type ?? 'dm',
    name: c.name ?? '',
    role: c.role ?? '',
    color: c.color ?? '#3b82f6',
    avatarUrl: c.avatarUrl?.startsWith?.('http') ? c.avatarUrl : (c.avatar?.startsWith?.('http') ? c.avatar : ''),
    online: c.online ?? false,
    // Some list-endpoint entries carry a truthy-but-empty `lastMessage: {}` for
    // conversations that have no messages yet — only treat it as a real
    // message when it actually has text or a type, otherwise fall through to
    // null so the UI shows the user's location instead of a fake preview.
    lastMessage: (c.lastMessage && (c.lastMessage.text || c.lastMessage.type)) ? {
      text: lastMessagePreviewText({
        text: c.lastMessage.text,
        type: c.lastMessage.type,
        fromMe: c.lastMessage.fromMe ?? false,
      }),
      time: localMsgTime(c.lastMessage.createdAt, c.lastMessage.time),
      fromMe: c.lastMessage.fromMe ?? false,
    } : null,
    unreadCount: c.unreadCount ?? 0,
    participantId: c.participantId ?? c.participant?.id ?? c.participant?._id ?? null,
    location: c.location ?? '',
    // Group-only fields. The list endpoint (fetchConversations) now sends
    // these directly for type:"group" entries, so they're usually populated
    // immediately — but fetchConversationDetail can also (re)supply them, and
    // every group render must still treat missing values as "unknown", not "zero".
    description: c.description ?? '',
    memberCount: typeof c.memberCount === 'number' ? c.memberCount : null,
    createdBy: c.createdBy ?? null,
    myRole: c.myRole ?? null, // 'admin' | 'member' | null (unknown)
  };
}

function normalizeGroupMember(m) {
  return {
    id: m.id ?? m._id ?? '',
    name: m.name ?? m.fullName ?? '',
    avatarUrl: m.avatarUrl?.startsWith?.('http') ? m.avatarUrl : (m.avatar?.startsWith?.('http') ? m.avatar : ''),
    role: m.role ?? 'member', // 'admin' | 'member'
    joinedAt: m.joinedAt ?? null,
  };
}

function normalizeMessage(m) {
  // Backend always sends `media` now (synthesised from the legacy single-mediaUrl
  // shape for old messages, [] for text-only) — but stay defensive in case an
  // older cached payload or a not-yet-migrated response is missing it.
  const media = Array.isArray(m.media)
    ? m.media.filter(it => it?.url?.startsWith?.('http')).map(it => ({
        url: it.url,
        type: it.type ?? 'file',
        fileName: it.fileName ?? it.name ?? decodeURIComponent(it.url.split('/').pop()),
        fileSize: it.fileSize ?? null,
        fileType: it.fileType ?? null,
      }))
    : (m.mediaUrl?.startsWith?.('http')
        ? [{ url: m.mediaUrl, type: m.type ?? 'file', fileName: m.fileName ?? m.name ?? decodeURIComponent(m.mediaUrl.split('/').pop()), fileSize: null, fileType: null }]
        : []);
  // Group chats need to know WHICH member sent each message (a DM only ever
  // has one possible "them", so it never needed this) — accept whatever shape
  // the backend uses (nested `sender` object or flat senderId/senderName/senderAvatar).
  const sender = m.sender ?? null;
  return {
    id: m.id ?? m._id ?? '',
    from: m.from ?? 'them',
    // 'text' | 'image' | 'video' | 'file' | 'system'. System messages ("X
    // joined", "X left", "Group created by Y") carry no `from`/bubble side —
    // they render as a centered line keyed off `systemAction` + `actor`
    // (+ `target` for actions someone did TO someone else, e.g. 'removed').
    type: m.type ?? 'text',
    systemAction: m.systemAction ?? null, // 'created' | 'joined' | 'left' | 'removed' | 'renamed'
    actor: m.actor ? { id: m.actor.id ?? m.actor._id ?? '', name: m.actor.name ?? '' } : null,
    target: m.target ? { id: m.target.id ?? m.target._id ?? '', name: m.target.name ?? '' } : null,
    text: m.text ?? '',
    media,
    time: localMsgTime(m.createdAt, m.time),
    read: m.read ?? false,
    createdAt: m.createdAt ?? '',
    senderId: m.senderId ?? sender?.id ?? sender?._id ?? null,
    senderName: m.senderName ?? sender?.name ?? sender?.fullName ?? '',
    senderAvatar: m.senderAvatar?.startsWith?.('http') ? m.senderAvatar
      : sender?.avatarUrl?.startsWith?.('http') ? sender.avatarUrl
      : sender?.avatar?.startsWith?.('http') ? sender.avatar
      : '',
  };
}

// 1. GET /api/conversations
export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async ({ tab = 'all', search = '', page = 1, limit = 30 } = {}, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const params = new URLSearchParams({ page, limit });
      if (tab !== 'all') params.set('tab', tab);
      if (search) params.set('search', search);
      const data = await apiRequest(`/api/conversations?${params}`, { token });
      return {
        conversations: (data.conversations ?? []).map(normalizeConversation),
        total: data.total ?? 0,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 2. GET /api/conversations/:id/messages
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async ({ convId, page = 1, limit = 50 }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}/messages?page=${page}&limit=${limit}`, { token });
      return {
        convId,
        messages: (data.messages ?? []).map(normalizeMessage),
        page: data.page ?? page,
        hasMore: data.hasMore ?? false,
        // The list endpoint doesn't echo the other participant's profile or the
        // requester's persisted block/report state — this one does.
        otherUserId: data.otherUser?.userId ?? data.otherUser?.id ?? data.otherUser?._id ?? null,
        otherUserLocation: data.otherUser?.location ?? '',
        isBlocked: typeof data.isBlocked === 'boolean' ? data.isBlocked : null,
        isReported: typeof data.isReported === 'boolean' ? data.isReported : null,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 2b. GET /api/conversations/:id/messages — silent background resync, used as a
// fallback in case the socket missed a message (dropped connection, blocked
// websockets, etc). Deliberately doesn't touch messagesLoading (no spinner
// flicker every poll) and merges rather than replaces, so it can't wipe out
// an optimistic message that's still mid-send when a poll happens to land.
export const syncMessages = createAsyncThunk(
  'messages/syncMessages',
  async ({ convId, page = 1, limit = 50 }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}/messages?page=${page}&limit=${limit}`, { token });
      return { convId, messages: (data.messages ?? []).map(normalizeMessage) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 3. POST /api/conversations/:id/messages
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ convId, type = 'text', text, file, files }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      // API always expects multipart/form-data
      const form = new FormData();
      form.append('type', type);
      if (text) form.append('text', text);
      // `files[]` (new, up to 20) for a multi-select send; `file` (legacy, single)
      // still works standalone — never send both for the same call.
      if (files?.length) files.forEach(f => form.append('files[]', f));
      else if (file) form.append('file', file);
      const body = form; const isFormData = true;
      const data = await apiRequest(`/api/conversations/${convId}/messages`, { method: 'POST', token, body, isFormData });
      return { convId, message: normalizeMessage(data.message ?? {}) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 4. PUT /api/conversations/:id/read
export const markRead = createAsyncThunk(
  'messages/markRead',
  async (convId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/conversations/${convId}/read`, { method: 'PUT', token });
      return { convId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 5. POST /api/conversations — start DM
export const startDM = createAsyncThunk(
  'messages/startDM',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest('/api/conversations', { method: 'POST', token, body: { userId } });
      const conv = normalizeConversation(data);
      // The create/get-or-create response doesn't always echo back a `participant`
      // object — fall back to the userId we know we started this DM with, so
      // "click avatar to view profile" never ends up with a null participantId.
      return { ...conv, participantId: conv.participantId ?? userId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6. POST /api/conversations/group — create group
export const createGroup = createAsyncThunk(
  'messages/createGroup',
  async ({ name, description, memberIds, image }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const form = new FormData();
      form.append('name', name);
      if (description) form.append('description', description);
      (memberIds ?? []).forEach(id => form.append('memberIds', id));
      if (image) form.append('image', image);
      const data = await apiRequest('/api/conversations/group', { method: 'POST', token, body: form, isFormData: true });
      return normalizeConversation({ ...data, id: data.id ?? data._id });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6a2. PUT /api/conversations/:id/group — admin-only, edit name/description/photo.
// Response is a flat PARTIAL update ({ conversationId, name, avatarUrl, description }),
// not a full conversation object — merge just these fields, don't run it through
// normalizeConversation (that would default missing type/memberCount/myRole and
// clobber what's already in state, same reasoning as groupUpdatedRemote below).
export const updateGroup = createAsyncThunk(
  'messages/updateGroup',
  async ({ convId, name, description, image }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const form = new FormData();
      if (name !== undefined) form.append('name', name);
      if (description !== undefined) form.append('description', description);
      if (image) form.append('image', image);
      const data = await apiRequest(`/api/conversations/${convId}/group`, { method: 'PUT', token, body: form, isFormData: true });
      return {
        convId,
        name: data.name,
        avatarUrl: data.avatarUrl?.startsWith?.('http') ? data.avatarUrl : undefined,
        description: data.description,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6b. GET /api/conversations/:id — group details (member count, admin, description)
export const fetchConversationDetail = createAsyncThunk(
  'messages/fetchConversationDetail',
  async (convId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}`, { token });
      return normalizeConversation(data.conversation ?? data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6c. GET /api/conversations/:id/members — full member list for the group info panel
export const fetchGroupMembers = createAsyncThunk(
  'messages/fetchGroupMembers',
  async (convId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}/members`, { token });
      const members = (data.members ?? []).map(normalizeGroupMember);
      return { convId, members, total: data.total ?? members.length };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6d. DELETE /api/conversations/:id/group — admin-only, removes the group for everyone
export const deleteGroup = createAsyncThunk(
  'messages/deleteGroup',
  async (convId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/conversations/${convId}/group`, { method: 'DELETE', token });
      return { convId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6e. POST /api/conversations/:id/leave — any non-admin member leaves the group
export const leaveGroup = createAsyncThunk(
  'messages/leaveGroup',
  async (convId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/conversations/${convId}/leave`, { method: 'POST', token });
      return { convId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6f. POST /api/conversations/:id/members — admin-only, add members
export const addGroupMembers = createAsyncThunk(
  'messages/addGroupMembers',
  async ({ convId, memberIds }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}/members`, { method: 'POST', token, body: { memberIds } });
      return { convId, members: (data.members ?? []).map(normalizeGroupMember), memberCount: data.memberCount };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 6g. DELETE /api/conversations/:id/members/:memberId — admin-only, remove a member
export const removeGroupMember = createAsyncThunk(
  'messages/removeGroupMember',
  async ({ convId, memberId }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}/members/${memberId}`, { method: 'DELETE', token });
      return { convId, memberId, memberCount: data?.memberCount };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 7. GET /api/conversations/:id/assets
export const fetchAssets = createAsyncThunk(
  'messages/fetchAssets',
  async ({ convId, tab = 'media', page = 1, limit = 20 }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}/assets?tab=${tab}&page=${page}&limit=${limit}`, { token });
      return { convId, tab, items: data.items ?? [], total: data.total ?? 0, storage: data.storage ?? null };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 8. POST /api/conversations/:id/assets — upload files
export const uploadAssets = createAsyncThunk(
  'messages/uploadAssets',
  async ({ convId, files }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const form = new FormData();
      Array.from(files).forEach(f => form.append('files[]', f));
      const data = await apiRequest(`/api/conversations/${convId}/assets`, { method: 'POST', token, body: form, isFormData: true });
      return { convId, uploaded: data.uploaded ?? [], storageUsedGB: data.storageUsedGB ?? 0 };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 9. POST /api/conversations/:id/block — toggle block
export const toggleBlock = createAsyncThunk(
  'messages/toggleBlock',
  async (convId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/conversations/${convId}/block`, { method: 'POST', token });
      return { convId, blocked: data.blocked ?? false };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 9b. DELETE /api/conversations/:id — soft-delete for the current user only
export const deleteConversation = createAsyncThunk(
  'messages/deleteConversation',
  async (convId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/conversations/${convId}`, { method: 'DELETE', token });
      return { convId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 10. POST /api/conversations/:id/report
export const reportConversation = createAsyncThunk(
  'messages/reportConversation',
  async ({ convId, reason }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/conversations/${convId}/report`, { method: 'POST', token, body: { reason } });
      return { convId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 12. GET /api/conversations/blocked — same shape as fetchConversations, filtered
// to conversations the current user has blocked. Reusing normalizeConversation
// means each entry's `id` is the conversation id itself, so the Blocked tab's
// unblock/delete actions can call toggleBlock/deleteConversation directly
// with no extra user→conversation lookup.
export const fetchBlockedConversations = createAsyncThunk(
  'messages/fetchBlockedConversations',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest('/api/conversations/blocked', { token });
      return {
        conversations: (data.conversations ?? []).map(normalizeConversation),
        total: data.total ?? 0,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 11. GET /api/users/online
export const fetchOnlineUsers = createAsyncThunk(
  'messages/fetchOnlineUsers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest('/api/users/online', { token });
      return (data.users ?? []).map(u => ({
        id: u.id ?? u._id ?? '',
        name: u.name ?? u.fullName ?? '',
        color: u.color ?? '#3b82f6',
        avatarUrl: u.avatarUrl?.startsWith?.('http') ? u.avatarUrl : '',
      }));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState: {
    conversations: [],
    conversationsTotal: 0,
    conversationsLoading: false,
    latestConversationsRequestId: null, // guards against an out-of-order fetchConversations response clobbering a newer tab/search switch
    activeConvId: null,    // which conversation is currently open in the UI — lets socket.js decide whether a group-membership event needs a live messages refetch
    messages: {},         // { [convId]: message[] }
    messagesLoading: false,
    messagesHasMore: {},  // { [convId]: boolean }
    sending: false,
    onlineUsers: [],
    onlineLoading: false,
    assets: {},           // { [convId]: { media|docs|links: [], storage, totals: { media, links, docs } } }
    assetsLoading: false,
    blockedConvIds: {},   // { [convId]: boolean }
    reportedConvIds: {},  // { [convId]: boolean }
    blockedUsers: [],
    blockedUsersTotal: 0,
    blockedUsersLoading: false,
    groupMembers: [],       // members of whichever group's info panel is currently open
    groupMembersTotal: 0,
    groupMembersLoading: false,
    groupMembersConvId: null, // which conversation `groupMembers` belongs to
    lastFetchParams: { tab: 'all', search: '' }, // last args passed to fetchConversations, so a resurrected conversation (see receiveMessage in socket.js) refetches under the filter the user is actually looking at
    error: null,
  },
  reducers: {
    setActiveConvId(state, action) {
      state.activeConvId = action.payload;
    },
    // Immediately clear unread badge when user opens a conversation (before API responds)
    clearUnread(state, action) {
      const { convId } = action.payload;
      const conv = state.conversations.find(c => c.id === convId);
      if (conv) conv.unreadCount = 0;
    },
    // Optimistic removal after unblocking a user / deleting their chat from the Blocked panel
    removeBlockedUser(state, action) {
      state.blockedUsers = state.blockedUsers.filter(u => u.id !== action.payload);
      state.blockedUsersTotal = Math.max(0, state.blockedUsersTotal - 1);
    },
    // Socket: push incoming message
    receiveMessage(state, action) {
      const { convId, message } = action.payload;
      const normalized = normalizeMessage(message);
      if (!state.messages[convId]) state.messages[convId] = [];
      // Normalize before dedup so both _id and id fields resolve to the same key.
      // `new_message` and `new_message_notification` can both fire for the same
      // incoming message (room-scoped vs personal-room), so `isNew` also gates
      // the unread bump below — otherwise the second event double-counts it.
      const isNew = Boolean(normalized.id) && !state.messages[convId].find(m => m.id === normalized.id);
      if (isNew) state.messages[convId].push(normalized);
      const conv = state.conversations.find(c => c.id === convId);
      if (conv) {
        const fromMe = normalized.from === 'me';
        conv.lastMessage = { text: lastMessagePreviewText({ text: normalized.text, type: normalized.type, fromMe }), time: normalized.time, fromMe };
        // Don't bump unread for a conversation the user is actively viewing —
        // `activeConvId` is reliably null whenever MessagesPage isn't mounted
        // (see its unmount cleanup), so this correctly covers "on Home/Feed" too.
        if (isNew && normalized.from !== 'me' && convId !== state.activeConvId) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1;
        }
      }
    },
    // Socket: messages read
    markMessagesRead(state, action) {
      const { convId } = action.payload;
      if (state.messages[convId]) state.messages[convId].forEach(m => { m.read = true; });
      const conv = state.conversations.find(c => c.id === convId);
      if (conv) conv.unreadCount = 0;
    },
    // Socket: user came online
    setUserOnline(state, action) {
      const { userId } = action.payload;
      state.conversations.forEach(c => { if (c.participantId === userId) c.online = true; });
      if (!state.onlineUsers.find(u => u.id === userId)) {
        state.onlineUsers.push({ id: userId, name: '', color: '#3b82f6', avatarUrl: '' });
      }
    },
    // Socket: user went offline
    setUserOffline(state, action) {
      const { userId } = action.payload;
      state.conversations.forEach(c => { if (c.participantId === userId) c.online = false; });
      state.onlineUsers = state.onlineUsers.filter(u => u.id !== userId);
    },
    // Socket: group:member_joined — someone (possibly added by an admin) joined
    groupMemberJoinedRemote(state, action) {
      const { convId, member, memberCount } = action.payload;
      const conv = state.conversations.find(c => c.id === convId);
      if (conv && typeof memberCount === 'number') conv.memberCount = memberCount;
      if (state.groupMembersConvId === convId && member?.id && !state.groupMembers.find(m => m.id === member.id)) {
        state.groupMembers.push(normalizeGroupMember(member));
        state.groupMembersTotal += 1;
      }
    },
    // Socket: group:member_left — `newAdmin` is set only when the departing
    // member WAS the admin (backend auto-promotes the earliest-joined member).
    groupMemberLeftRemote(state, action) {
      const { convId, userId, newAdmin, memberCount, myUserId } = action.payload;
      const conv = state.conversations.find(c => c.id === convId);
      if (conv) {
        if (typeof memberCount === 'number') conv.memberCount = memberCount;
        if (newAdmin?.id && newAdmin.id === myUserId) conv.myRole = 'admin';
      }
      if (state.groupMembersConvId === convId) {
        state.groupMembers = state.groupMembers.filter(m => m.id !== userId);
        if (newAdmin?.id) {
          const promoted = state.groupMembers.find(m => m.id === newAdmin.id);
          if (promoted) promoted.role = 'admin';
        }
      }
    },
    // Socket: group:member_removed — an admin kicked someone. If it's ME, this
    // is functionally identical to the group being deleted for my client.
    groupMemberRemovedRemote(state, action) {
      const { convId, userId, memberCount, myUserId } = action.payload;
      if (userId === myUserId) {
        state.conversations = state.conversations.filter(c => c.id !== convId);
        delete state.messages[convId];
        return;
      }
      const conv = state.conversations.find(c => c.id === convId);
      if (conv && typeof memberCount === 'number') conv.memberCount = memberCount;
      if (state.groupMembersConvId === convId) {
        state.groupMembers = state.groupMembers.filter(m => m.id !== userId);
        state.groupMembersTotal = Math.max(0, state.groupMembersTotal - 1);
      }
    },
    // Socket: group:deleted — every member's client drops it without a refetch
    groupDeletedRemote(state, action) {
      const { convId } = action.payload;
      state.conversations = state.conversations.filter(c => c.id !== convId);
      delete state.messages[convId];
    },
    // Socket: group:updated — name/photo/description edited by another member
    groupUpdatedRemote(state, action) {
      const { convId, name, avatarUrl, description } = action.payload;
      const conv = state.conversations.find(c => c.id === convId);
      if (!conv) return;
      if (name !== undefined) conv.name = name;
      if (avatarUrl !== undefined) conv.avatarUrl = avatarUrl;
      if (description !== undefined) conv.description = description;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchConversations.pending, (s, a) => {
        s.conversationsLoading = true;
        s.latestConversationsRequestId = a.meta.requestId;
        s.lastFetchParams = { tab: a.meta.arg?.tab ?? 'all', search: a.meta.arg?.search ?? '' };
      })
      .addCase(fetchConversations.fulfilled, (s, a) => {
        // Ignore an out-of-order response — e.g. switching All → Unread → Groups quickly can
        // let an earlier tab's slower request resolve after a later one, clobbering the tab
        // the user is actually looking at with stale data.
        if (a.meta.requestId !== s.latestConversationsRequestId) return;
        s.conversationsLoading = false;
        s.conversations = a.payload.conversations;
        s.conversationsTotal = a.payload.total;
      })
      .addCase(fetchConversations.rejected, (s, a) => {
        if (a.meta.requestId !== s.latestConversationsRequestId) return;
        s.conversationsLoading = false;
        s.error = a.payload;
      })

      .addCase(fetchMessages.pending, s => { s.messagesLoading = true; })
      .addCase(fetchMessages.fulfilled, (s, a) => {
        const { convId, messages, page, hasMore, otherUserId, otherUserLocation, isBlocked, isReported } = a.payload;
        s.messagesLoading = false;
        if (page === 1) {
          // Keep any optimistic (not-yet-confirmed) message alive across a
          // page-1 refresh — it hasn't hit the server yet, so it won't be in
          // this response, and a raw replace would make it vanish mid-send.
          const pending = (s.messages[convId] ?? []).filter(m => m.pending);
          s.messages[convId] = [...messages, ...pending];
        } else {
          s.messages[convId] = [...messages, ...(s.messages[convId] ?? [])];
        }
        s.messagesHasMore[convId] = hasMore;
        if (otherUserId) {
          const conv = s.conversations.find(c => c.id === convId);
          if (conv) {
            if (!conv.participantId) conv.participantId = otherUserId;
            if (otherUserLocation) conv.location = otherUserLocation;
          }
        }
        // Persisted truth from the server overrides whatever the client guessed
        // (or never knew) after a hard refresh.
        if (isBlocked !== null) s.blockedConvIds[convId] = isBlocked;
        if (isReported !== null) s.reportedConvIds[convId] = isReported;
      })
      .addCase(fetchMessages.rejected, s => { s.messagesLoading = false; })

      // Silent background resync (see syncMessages above) — same merge
      // strategy as fetchMessages' page-1 case, but never touches
      // messagesLoading, so it can run every few seconds with no UI flicker.
      .addCase(syncMessages.fulfilled, (s, a) => {
        const { convId, messages } = a.payload;
        const pending = (s.messages[convId] ?? []).filter(m => m.pending);
        s.messages[convId] = [...messages, ...pending];
      })

      .addCase(sendMessage.pending, (s, a) => {
        s.sending = true;
        // Optimistic: add a temp message immediately so UI feels instant. No
        // preview thumbnails yet (nothing's uploaded), just a placeholder line —
        // `media` fills in for real once sendMessage.fulfilled swaps this out.
        const { convId, text, type, file, files } = a.meta.arg;
        const tempId = `temp_${a.meta.requestId}`;
        if (!s.messages[convId]) s.messages[convId] = [];
        const msgType = type ?? 'text';
        const fileCount = files?.length ?? (file ? 1 : 0);
        const previewText = text ?? (
          msgType === 'image' ? (fileCount > 1 ? `📷 ${fileCount} Photos` : '📷 Photo')
          : msgType === 'video' ? (fileCount > 1 ? `🎥 ${fileCount} Videos` : '🎥 Video')
          : msgType === 'file' ? (fileCount > 1 ? `📎 ${fileCount} Files` : '📎 File')
          : ''
        );
        s.messages[convId].push({
          id: tempId,
          from: 'me',
          type: msgType,
          text: previewText,
          media: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          pending: true,
        });
        const conv = s.conversations.find(c => c.id === convId);
        if (conv) conv.lastMessage = { text: previewText, time: '', fromMe: true };
      })
      .addCase(sendMessage.fulfilled, (s, a) => {
        const { convId, message } = a.payload;
        const normalized = normalizeMessage({ ...message, from: 'me' });
        s.sending = false;
        if (!s.messages[convId]) s.messages[convId] = [];
        // Remove the optimistic temp message
        const tempId = `temp_${a.meta.requestId}`;
        s.messages[convId] = s.messages[convId].filter(m => m.id !== tempId);
        // Add confirmed message (dedup in case socket already pushed it)
        if (!normalized.id || !s.messages[convId].find(m => m.id === normalized.id)) {
          s.messages[convId].push(normalized);
        }
        const conv = s.conversations.find(c => c.id === convId);
        if (conv) conv.lastMessage = { text: lastMessagePreviewText({ text: normalized.text, type: normalized.type, fromMe: true }), time: normalized.time, fromMe: true };
      })
      .addCase(sendMessage.rejected, (s, a) => {
        s.sending = false;
        // Roll back optimistic message
        const { convId } = a.meta.arg;
        const tempId = `temp_${a.meta.requestId}`;
        if (s.messages[convId]) s.messages[convId] = s.messages[convId].filter(m => m.id !== tempId);
      })

      .addCase(markRead.fulfilled, (s, a) => {
        const { convId } = a.payload;
        const conv = s.conversations.find(c => c.id === convId);
        if (conv) conv.unreadCount = 0;
        if (s.messages[convId]) s.messages[convId].forEach(m => { m.read = true; });
      })

      .addCase(startDM.fulfilled, (s, a) => {
        const conv = a.payload;
        if (!s.conversations.find(c => c.id === conv.id)) s.conversations.unshift(conv);
      })

      .addCase(createGroup.fulfilled, (s, a) => { s.conversations.unshift(a.payload); })

      .addCase(updateGroup.fulfilled, (s, a) => {
        const { convId, name, avatarUrl, description } = a.payload;
        const conv = s.conversations.find(c => c.id === convId);
        if (!conv) return;
        if (name !== undefined) conv.name = name;
        if (avatarUrl !== undefined) conv.avatarUrl = avatarUrl;
        if (description !== undefined) conv.description = description;
      })

      .addCase(fetchConversationDetail.fulfilled, (s, a) => {
        const idx = s.conversations.findIndex(c => c.id === a.payload.id);
        if (idx !== -1) s.conversations[idx] = { ...s.conversations[idx], ...a.payload };
        else s.conversations.push(a.payload);
      })

      .addCase(fetchGroupMembers.pending, (s, a) => {
        s.groupMembersLoading = true;
        s.groupMembersConvId = a.meta.arg;
      })
      .addCase(fetchGroupMembers.fulfilled, (s, a) => {
        s.groupMembersLoading = false;
        s.groupMembers = a.payload.members;
        s.groupMembersTotal = a.payload.total;
        const conv = s.conversations.find(c => c.id === a.payload.convId);
        if (conv && conv.memberCount === null) conv.memberCount = a.payload.total;
      })
      .addCase(fetchGroupMembers.rejected, s => { s.groupMembersLoading = false; })

      .addCase(deleteGroup.fulfilled, (s, a) => {
        const { convId } = a.payload;
        s.conversations = s.conversations.filter(c => c.id !== convId);
        delete s.messages[convId];
      })

      .addCase(leaveGroup.fulfilled, (s, a) => {
        const { convId } = a.payload;
        s.conversations = s.conversations.filter(c => c.id !== convId);
        delete s.messages[convId];
      })

      .addCase(addGroupMembers.fulfilled, (s, a) => {
        const { convId, members, memberCount } = a.payload;
        if (s.groupMembersConvId === convId) {
          members.forEach(m => { if (!s.groupMembers.find(x => x.id === m.id)) s.groupMembers.push(m); });
          s.groupMembersTotal = typeof memberCount === 'number' ? memberCount : s.groupMembers.length;
        }
        const conv = s.conversations.find(c => c.id === convId);
        if (conv && typeof memberCount === 'number') conv.memberCount = memberCount;
      })

      .addCase(removeGroupMember.fulfilled, (s, a) => {
        const { convId, memberId, memberCount } = a.payload;
        if (s.groupMembersConvId === convId) {
          s.groupMembers = s.groupMembers.filter(m => m.id !== memberId);
          s.groupMembersTotal = typeof memberCount === 'number' ? memberCount : Math.max(0, s.groupMembersTotal - 1);
        }
        const conv = s.conversations.find(c => c.id === convId);
        if (conv && typeof memberCount === 'number') conv.memberCount = memberCount;
      })

      .addCase(fetchAssets.pending, s => { s.assetsLoading = true; })
      .addCase(fetchAssets.fulfilled, (s, a) => {
        const { convId, tab, items, total, storage } = a.payload;
        s.assetsLoading = false;
        if (!s.assets[convId]) s.assets[convId] = {};
        if (!s.assets[convId].totals) s.assets[convId].totals = {};
        s.assets[convId][tab] = items;
        s.assets[convId].totals[tab] = total;
        if (storage) s.assets[convId].storage = storage;
      })
      .addCase(fetchAssets.rejected, s => { s.assetsLoading = false; })

      .addCase(uploadAssets.fulfilled, (s, a) => {
        const { convId, storageUsedGB } = a.payload;
        if (s.assets[convId]?.storage) s.assets[convId].storage.usedGB = storageUsedGB;
      })

      .addCase(toggleBlock.fulfilled, (s, a) => {
        s.blockedConvIds[a.payload.convId] = a.payload.blocked;
      })

      .addCase(reportConversation.fulfilled, (s, a) => {
        s.reportedConvIds[a.payload.convId] = true;
      })

      .addCase(deleteConversation.fulfilled, (s, a) => {
        const { convId } = a.payload;
        s.conversations = s.conversations.filter(c => c.id !== convId);
        delete s.messages[convId];
        delete s.blockedConvIds[convId];
        delete s.reportedConvIds[convId];
        delete s.assets[convId];
      })

      .addCase(fetchOnlineUsers.pending, s => { s.onlineLoading = true; })
      .addCase(fetchOnlineUsers.fulfilled, (s, a) => {
        s.onlineLoading = false;
        s.onlineUsers = a.payload;
        // Resync conversation-list online dots against the authoritative REST snapshot
        const onlineIds = new Set(a.payload.map(u => u.id));
        s.conversations.forEach(c => { c.online = onlineIds.has(c.participantId); });
      })
      .addCase(fetchOnlineUsers.rejected, s => { s.onlineLoading = false; })

      .addCase(fetchBlockedConversations.pending, s => { s.blockedUsersLoading = true; })
      .addCase(fetchBlockedConversations.fulfilled, (s, a) => {
        s.blockedUsersLoading = false;
        s.blockedUsers = a.payload.conversations;
        s.blockedUsersTotal = a.payload.total;
        a.payload.conversations.forEach(c => { s.blockedConvIds[c.id] = true; });
      })
      .addCase(fetchBlockedConversations.rejected, s => { s.blockedUsersLoading = false; });
  },
});

export const {
  setActiveConvId, clearUnread, removeBlockedUser, receiveMessage, markMessagesRead, setUserOnline, setUserOffline,
  groupMemberJoinedRemote, groupMemberLeftRemote, groupMemberRemovedRemote, groupDeletedRemote, groupUpdatedRemote,
} = messagesSlice.actions;
export default messagesSlice.reducer;
