import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { updateFollowCounts } from './authSlice';

export const fetchSuggestions = createAsyncThunk(
  'users/fetchSuggestions',
  async (limit = 5, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/users/suggestions?limit=${limit}`, { token });
      return (data.suggestions ?? []).map(s => {
        // Support both flat user objects (_id) and nested ({ user: { _id } }) formats
        const uid = s._id ?? s.userId ?? s.user?._id ?? s.user?.id ?? s.id ?? '';
        return {
          ...s,
          id: uid,
          _id: uid,
          name: s.name ?? s.fullName ?? s.user?.name ?? s.user?.fullName ?? '',
          avatar: (() => { const av = s.avatar ?? s.user?.avatar ?? ''; return av?.startsWith?.('http') ? av : ''; })(),
          mutualFriends: s.mutualCount ?? s.mutualFriends ?? s.user?.mutualCount ?? 0,
        };
      });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Full user directory (not the curated/limited "suggestions" list) — powers
// "Invite More Friends", which needs to show anyone, sortable by mutual count
// and city, even when the suggestions algorithm has nothing left to offer.
export const fetchAllUsers = createAsyncThunk(
  'users/fetchAllUsers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest('/api/users/all', { token });
      const list = Array.isArray(data) ? data : (data.users ?? data.results ?? []);
      return list.map(u => {
        const uid = u.userId ?? u._id ?? u.id ?? '';
        return {
          id: uid,
          _id: uid,
          name: u.fullName ?? u.name ?? '',
          avatar: u.avatar?.startsWith?.('http') ? u.avatar : '',
          location: u.city ?? u.location ?? '',
          mutualFriends: u.mutualCount ?? u.mutualFriends ?? 0,
          friendStatus: u.friendStatus ?? 'none',
          isFollowing: !!u.isFollowing,
        };
      }).filter(u => u.id);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const followUser = createAsyncThunk(
  'users/follow',
  async (userId, { getState, dispatch, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/users/${userId}/follow`, { method: 'POST', token });
      // followingCount = my updated following count (REST is source of truth)
      if (data.followingCount !== undefined) dispatch(updateFollowCounts({ followingCount: data.followingCount }));
      return { userId };
    } catch (err) {
      return rejectWithValue({ userId, message: err.message });
    }
  }
);

export const unfollowUser = createAsyncThunk(
  'users/unfollow',
  async (userId, { getState, dispatch, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/users/${userId}/follow`, { method: 'DELETE', token });
      if (data.followingCount !== undefined) dispatch(updateFollowCounts({ followingCount: data.followingCount }));
      return { userId };
    } catch (err) {
      return rejectWithValue({ userId, message: err.message });
    }
  }
);

// ── Friend requests / connections (LinkedIn-style) ──────────────────────────────
// Send a connection request. Backend auto-accepts if the target already sent me
// one, and 409s if we're already connected — both handled in the reducer.
export const sendFriendRequest = createAsyncThunk(
  'users/sendFriendRequest',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/users/${userId}/friend-request`, { method: 'POST', token });
      const status = data.friendStatus ?? (data.accepted || data.connected ? 'connected' : 'requested');
      return { userId, status };
    } catch (err) {
      return rejectWithValue({ userId, status: err.status, message: err.message });
    }
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'users/acceptFriendRequest',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/users/${userId}/friend-request/accept`, { method: 'POST', token });
      return { userId };
    } catch (err) {
      return rejectWithValue({ userId, message: err.message });
    }
  }
);

// Reject an incoming request OR cancel one I sent (same DELETE endpoint).
export const rejectFriendRequest = createAsyncThunk(
  'users/rejectFriendRequest',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/users/${userId}/friend-request`, { method: 'DELETE', token });
      return { userId };
    } catch (err) {
      return rejectWithValue({ userId, message: err.message });
    }
  }
);

export const fetchFriendRequests = createAsyncThunk(
  'users/fetchFriendRequests',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest('/api/users/me/friend-requests', { token });
      return (data.requests ?? []).map(r => ({
        requestId: r._id,
        userId: r.fromUser?._id ?? r.fromUser?.id ?? '',
        name: r.fromUser?.name ?? r.fromUser?.fullName ?? '',
        avatar: r.fromUser?.avatar?.startsWith?.('http') ? r.fromUser.avatar : '',
        createdAt: r.createdAt,
      }));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const dismissSuggestion = createAsyncThunk(
  'users/dismiss',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      await apiRequest(`/api/users/${userId}/suggestion`, { method: 'DELETE', token });
      return { userId };
    } catch (err) {
      return rejectWithValue({ userId, message: err.message });
    }
  }
);

export const fetchGroups = createAsyncThunk(
  'users/fetchGroups',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest('/api/groups/my', { token });
      return data.groups ?? [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// User-level block (distinct from messagesSlice's toggleBlock, which blocks a
// CONVERSATION id) — blocking a user here also makes the backend exclude
// their posts from GET /api/posts and 403 their profile/posts going forward.
export const blockUser = createAsyncThunk(
  'users/blockUser',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/users/${userId}/block`, { method: 'POST', token });
      return { userId, isBlocked: data.isBlocked ?? data.blocked ?? true };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const unblockUser = createAsyncThunk(
  'users/unblockUser',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/user/${userId}/unblock`, { method: 'POST', token });
      return { userId, isBlocked: data.isBlocked ?? data.blocked ?? false };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBlockStatus = createAsyncThunk(
  'users/fetchBlockStatus',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest(`/api/user/${userId}/blocked`, { token });
      return { userId, isBlocked: !!(data.isBlocked ?? data.blocked) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// The full list of everyone the current user has blocked (vs
// fetchBlockStatus above, which checks one specific userId) — powers the
// "Blocked" tab in Connections.
export const fetchBlockedUsers = createAsyncThunk(
  'users/fetchBlockedUsers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const data = await apiRequest('/api/users/me/blocked', { token });
      const list = Array.isArray(data) ? data : (data.blockedUsers ?? data.users ?? data.data ?? []);
      return list.map(u => {
        const uid = u.id ?? u._id ?? u.userId ?? '';
        return {
          id: uid,
          name: u.name ?? u.fullName ?? '',
          avatar: u.avatar?.startsWith?.('http') ? u.avatar : '',
          role: u.role ?? '',
          location: u.location ?? u.city ?? '',
        };
      }).filter(u => u.id);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    suggestions: [],
    suggestionsLoading: false,
    allUsers: [],
    allUsersLoading: false,
    followingIds: [],
    dismissedIds: [],
    // Optimistic relationship overrides keyed by userId. Any surface reads
    // friendStatusMap[id] ?? user.friendStatus ?? 'none' so a click reflects
    // instantly everywhere (suggestions, profile, connections).
    friendStatusMap: {},
    friendRequests: [],          // incoming pending, for the accept/reject UI
    friendRequestsLoading: false,
    groups: [],
    groupsLoading: false,
    blockedUserIds: [],
    blockingId: null, // userId currently mid-block/unblock request
    blockedUsersList: [],        // full profiles, for the "Blocked" tab in Connections
    blockedUsersListLoading: false,
    error: null,
  },
  reducers: {
    // Driven by socket events (friend_request / friend_request_accepted).
    setFriendStatus(state, action) {
      const { userId, status } = action.payload;
      if (userId) state.friendStatusMap[userId] = status;
    },
    addIncomingRequest(state, action) {
      const req = action.payload;
      if (!req?.userId) return;
      if (!state.friendRequests.some(r => r.userId === req.userId)) {
        state.friendRequests.unshift(req);
      }
      state.friendStatusMap[req.userId] = 'incoming';
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Suggestions ───────────────────────
      .addCase(fetchSuggestions.pending, (state) => {
        state.suggestionsLoading = true;
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestionsLoading = false;
        state.suggestions = action.payload;
      })
      .addCase(fetchSuggestions.rejected, (state, action) => {
        state.suggestionsLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchAllUsers.pending, (state) => {
        state.allUsersLoading = true;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.allUsersLoading = false;
        state.allUsers = action.payload;
        // Seed followingIds/friendStatusMap so Follow/Add Friend reflect the server's
        // view for people not already known from other fetches (suggestions, profile).
        action.payload.forEach(u => {
          if (u.isFollowing && !state.followingIds.includes(u.id)) state.followingIds.push(u.id);
          if (state.friendStatusMap[u.id] === undefined) state.friendStatusMap[u.id] = u.friendStatus;
        });
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.allUsersLoading = false;
        state.error = action.payload;
      })

      // ── Follow ────────────────────────────
      .addCase(followUser.pending, (state, action) => {
        const userId = action.meta.arg;
        if (!state.followingIds.includes(userId)) {
          state.followingIds.push(userId);
        }
      })
      .addCase(followUser.rejected, (state, action) => {
        const msg = action.payload?.message ?? '';
        if (!/user not found|cannot follow yourself/i.test(msg)) {
          const userId = action.meta.arg;
          state.followingIds = state.followingIds.filter(id => id !== userId);
        }
      })

      // ── Unfollow ──────────────────────────────
      .addCase(unfollowUser.pending, (state, action) => {
        state.followingIds = state.followingIds.filter(id => id !== action.meta.arg);
      })
      .addCase(unfollowUser.rejected, (state, action) => {
        const msg = action.payload?.message ?? '';
        if (!/you are not following|user not found/i.test(msg)) {
          if (!state.followingIds.includes(action.meta.arg)) state.followingIds.push(action.meta.arg);
        }
      })

      // ── Send friend request ───────────────
      .addCase(sendFriendRequest.pending, (state, action) => {
        state.friendStatusMap[action.meta.arg] = 'requested';
      })
      .addCase(sendFriendRequest.fulfilled, (state, action) => {
        const { userId, status } = action.payload;
        state.friendStatusMap[userId] = status;
        // Auto-accept case (reciprocal request) → connected implies following.
        if (status === 'connected' && !state.followingIds.includes(userId)) {
          state.followingIds.push(userId);
        }
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        const { userId, status } = action.payload ?? {};
        // 409 = already connected; otherwise roll back to none.
        state.friendStatusMap[userId] = status === 409 ? 'connected' : 'none';
      })

      // ── Accept incoming request (auto-follows both ways) ──
      .addCase(acceptFriendRequest.pending, (state, action) => {
        const userId = action.meta.arg;
        state.friendStatusMap[userId] = 'connected';
        state.friendRequests = state.friendRequests.filter(r => r.userId !== userId);
        if (!state.followingIds.includes(userId)) state.followingIds.push(userId);
      })
      .addCase(acceptFriendRequest.rejected, (state, action) => {
        state.friendStatusMap[action.meta.arg] = 'incoming';
      })

      // ── Reject / cancel request ───────────
      .addCase(rejectFriendRequest.pending, (state, action) => {
        const userId = action.meta.arg;
        state.friendStatusMap[userId] = 'none';
        state.friendRequests = state.friendRequests.filter(r => r.userId !== userId);
      })

      // ── Fetch incoming requests ───────────
      .addCase(fetchFriendRequests.pending, (state) => { state.friendRequestsLoading = true; })
      .addCase(fetchFriendRequests.fulfilled, (state, action) => {
        state.friendRequestsLoading = false;
        state.friendRequests = action.payload;
        action.payload.forEach(r => { if (!state.friendStatusMap[r.userId]) state.friendStatusMap[r.userId] = 'incoming'; });
      })
      .addCase(fetchFriendRequests.rejected, (state) => { state.friendRequestsLoading = false; })

      // ── Dismiss ───────────────────────────
      .addCase(dismissSuggestion.pending, (state, action) => {
        if (!state.dismissedIds.includes(action.meta.arg)) {
          state.dismissedIds.push(action.meta.arg);
        }
      })
      .addCase(dismissSuggestion.rejected, (state, action) => {
        const userId = action.meta.arg;
        state.dismissedIds = state.dismissedIds.filter(id => id !== userId);
      })

      // ── Groups ────────────────────────────
      .addCase(fetchGroups.pending, (state) => {
        state.groupsLoading = true;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groupsLoading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.groupsLoading = false;
        state.error = action.payload;
      })

      // ── Block / Unblock a user ────────────
      .addCase(blockUser.pending, (state, action) => { state.blockingId = action.meta.arg; })
      .addCase(blockUser.fulfilled, (state, action) => {
        state.blockingId = null;
        if (action.payload.isBlocked && !state.blockedUserIds.includes(action.payload.userId)) {
          state.blockedUserIds.push(action.payload.userId);
        }
      })
      .addCase(blockUser.rejected, (state) => { state.blockingId = null; })

      .addCase(unblockUser.pending, (state, action) => { state.blockingId = action.meta.arg; })
      .addCase(unblockUser.fulfilled, (state, action) => {
        state.blockingId = null;
        state.blockedUserIds = state.blockedUserIds.filter(id => id !== action.payload.userId);
        state.blockedUsersList = state.blockedUsersList.filter(u => u.id !== action.payload.userId);
      })
      .addCase(unblockUser.rejected, (state) => { state.blockingId = null; })

      .addCase(fetchBlockStatus.fulfilled, (state, action) => {
        const { userId, isBlocked } = action.payload;
        const already = state.blockedUserIds.includes(userId);
        if (isBlocked && !already) state.blockedUserIds.push(userId);
        if (!isBlocked && already) state.blockedUserIds = state.blockedUserIds.filter(id => id !== userId);
      })

      .addCase(fetchBlockedUsers.pending, (state) => { state.blockedUsersListLoading = true; })
      .addCase(fetchBlockedUsers.fulfilled, (state, action) => {
        state.blockedUsersListLoading = false;
        state.blockedUsersList = action.payload;
        state.blockedUserIds = action.payload.map(u => u.id);
      })
      .addCase(fetchBlockedUsers.rejected, (state, action) => {
        state.blockedUsersListLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setFriendStatus, addIncomingRequest } = usersSlice.actions;
export default usersSlice.reducer;
