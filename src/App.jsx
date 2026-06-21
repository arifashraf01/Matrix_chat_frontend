import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import ChatWindow from "./components/ChatWindow";
import ImageModal from "./components/ImageModal";
import Sidebar from "./components/Sidebar";
import ProfileDrawer from "./components/ProfileDrawer";
import NewChatModal from "./components/NewChatModal";
import Toasts from "./components/Toasts";
import {
  buildReceiptStatusMap,
  clearSession,
  createMatrixClient,
  extractRoomMessages,
  getRoomDisplayName,
  getRoomPresenceSummary,
  getPresenceLabel,
  formatLastSeen,
  getTypingUsers,
  loadSession,
  isTextMessageEvent,
  markRoomAsRead,
  loginWithPassword,
  normalizeMessage,
  normalizePresenceSnapshot,
  restoreSession,
  saveSession,
  waitForSyncPrepared,
} from "./services/matrixClient";

const DEFAULT_BASE_URL = import.meta.env.VITE_MATRIX_BASE_URL || "https://matrix.org";
const DEFAULT_USERNAME = import.meta.env.VITE_MATRIX_USER || "arifashraf01";
const DEFAULT_PASSWORD = import.meta.env.VITE_MATRIX_PASSWORD || "SVkry::B-qe3Yfp";
const TYPING_DEBOUNCE_MS = 2000;
const TYPING_NOTIFICATION_TIMEOUT_MS = 5000;
const TYPING_UI_EXPIRY_MS = 4000;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function App() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [client, setClient] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [presenceMap, setPresenceMap] = useState({});
  const [receiptMap, setReceiptMap] = useState({});
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "light";
    } catch {
      return "light";
    }
  });
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const selectedRoomIdRef = useRef(null);
  const currentUserIdRef = useRef("");
  const presenceMapRef = useRef({});
  const typingTimeoutRef = useRef(null);
  const typingExpiryRef = useRef(null);
  const typingActiveRef = useRef(false);
  const typingRoomIdRef = useRef(null);

  const sortRoomsByRecent = (roomsList) => {
    if (!Array.isArray(roomsList)) return [];
    const getLastTs = (room) => {
      try {
        const msgs = extractRoomMessages(room) || [];
        if (msgs.length === 0) return 0;
        const last = msgs[msgs.length - 1];
        return Number(last?.ts) || 0;
      } catch {
        return 0;
      }
    };

    return [...roomsList].sort((a, b) => getLastTs(b) - getLastTs(a));
  };

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoom?.roomId ?? null;
  }, [selectedRoom]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    presenceMapRef.current = presenceMap;
  }, [presenceMap]);

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    const handleTimeline = (event, room) => {
      if (!room || room.roomId !== selectedRoomIdRef.current) {
        setRooms((currentRooms) => sortRoomsByRecent(currentRooms));
        return;
      }

      setRooms((currentRooms) => sortRoomsByRecent(currentRooms));

      if (!isTextMessageEvent(event)) {
        return;
      }

      const normalizedMessage = normalizeMessage(event);

      setMessages((currentMessages) => {
        if (currentMessages.some((message) => message.id === normalizedMessage.id)) {
          return currentMessages;
        }

        return [...currentMessages, normalizedMessage].sort((left, right) => left.ts - right.ts);
      });

      setReceiptMap(buildReceiptStatusMap(room, currentUserIdRef.current));
    };

    client.on("Room.timeline", handleTimeline);

    return () => {
      client.removeListener("Room.timeline", handleTimeline);
    };
  }, [client]);

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    const handleReceipt = (_event, room) => {
      if (!room || room.roomId !== selectedRoomIdRef.current) {
        setRooms((currentRooms) => sortRoomsByRecent(currentRooms));
        return;
      }

      setReceiptMap(buildReceiptStatusMap(room, currentUserIdRef.current));
      setRooms((currentRooms) => sortRoomsByRecent(currentRooms));
    };

    client.on("Room.receipt", handleReceipt);

    return () => {
      client.removeListener("Room.receipt", handleReceipt);
    };
  }, [client]);

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    const upsertPresence = (_event, user) => {
      const snapshot = normalizePresenceSnapshot(user);

      if (!snapshot) {
        return;
      }

      setPresenceMap((currentPresenceMap) => {
        const previous = currentPresenceMap[snapshot.userId];
        const hasChanged =
          !previous ||
          previous.presence !== snapshot.presence ||
          previous.currentlyActive !== snapshot.currentlyActive ||
          previous.lastActiveAgo !== snapshot.lastActiveAgo ||
          previous.lastPresenceTs !== snapshot.lastPresenceTs ||
          previous.presenceStatusMsg !== snapshot.presenceStatusMsg ||
          previous.displayName !== snapshot.displayName ||
          previous.lastSeenTs !== snapshot.lastSeenTs;

        if (!hasChanged) {
          return currentPresenceMap;
        }

        return {
          ...currentPresenceMap,
          [snapshot.userId]: snapshot,
        };
      });
    };

    client.on("User.presence", upsertPresence);
    client.on("User.currentlyActive", upsertPresence);
    client.on("User.lastPresenceTs", upsertPresence);

    return () => {
      client.removeListener("User.presence", upsertPresence);
      client.removeListener("User.currentlyActive", upsertPresence);
      client.removeListener("User.lastPresenceTs", upsertPresence);
    };
  }, [client]);

  useEffect(() => {
    return () => {
      client?.stopClient?.();
    };
  }, [client]);

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
      localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const addToast = (type, message, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [...t, { id, type, message, duration }]);
    return id;
  };

  const dismissToast = (id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  const openNewChat = () => setNewChatOpen(true);
  const closeNewChat = () => setNewChatOpen(false);

  const handleInviteUserToRoom = async (roomId, userId) => {
    if (!client) throw new Error("Not connected");
    try {
      await client.invite(roomId, userId);
      addToast("success", `Invited ${userId} to the room`);

      const nextRooms = client.getRooms?.() ?? [];
      setRooms(sortRoomsByRecent(nextRooms));
      const updated = client.getRoom?.(roomId) || nextRooms.find((r) => r.roomId === roomId) || null;
      if (updated) {
        setSelectedRoom(updated);
        setMessages(extractRoomMessages(updated));
        setReceiptMap(buildReceiptStatusMap(updated, currentUserId));
      }
    } catch (err) {
      addToast("error", `Invite failed: ${err?.message || String(err)}`);
      throw err;
    }
  };

  const handleLeaveRoom = async (roomId) => {
    if (!client) throw new Error("Not connected");
    try {
      await client.leave(roomId);
      addToast("success", "You left the room");

      setRooms((prev) => sortRoomsByRecent(prev.filter((r) => r.roomId !== roomId)));

      // pick another room to navigate to
      const remaining = (client.getRooms?.() ?? []).filter((r) => r.roomId !== roomId);
      const next = remaining[0] || null;
      setSelectedRoom(next);
      setMessages(next ? extractRoomMessages(next) : []);
      setReceiptMap(next ? buildReceiptStatusMap(next, currentUserId) : {});
    } catch (err) {
      addToast("error", `Failed to leave room: ${err?.message || String(err)}`);
      throw err;
    }
  };

  const createOrOpenDM = async (userId) => {
    if (!client) {
      throw new Error("Not connected to Matrix server");
    }

    // Check for existing one-to-one room
    const roomsList = client.getRooms?.() ?? [];
    for (const r of roomsList) {
      try {
        if (r.getMyMembership?.() !== "join") continue;
        const joined = r.getJoinedMembers?.() ?? [];
        const hasTarget = joined.some((m) => m?.userId === userId);
        if (!hasTarget) continue;
        // consider one-to-one if only two joined members
        if (joined.length === 2) {
          setSelectedRoom(r);
          setMessages(extractRoomMessages(r));
          setReceiptMap(buildReceiptStatusMap(r, currentUserIdRef.current));
          closeNewChat();
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    // Create new direct room and invite user
    try {
      const createResp = await client.createRoom({
        invite: [userId],
        is_direct: true,
        preset: "private_chat",
        visibility: "private",
      });

      const roomId = createResp?.room_id || createResp?.roomId || null;
      if (!roomId) {
        throw new Error("Server did not return a room id");
      }

      // Refresh rooms and select created room
      const nextRooms = sortRoomsByRecent(client.getRooms());
      setRooms(nextRooms);
      const newRoom = client.getRoom?.(roomId) || nextRooms.find((x) => x.roomId === roomId) || null;

      if (newRoom) {
        setSelectedRoom(newRoom);
        setMessages(extractRoomMessages(newRoom));
        setReceiptMap(buildReceiptStatusMap(newRoom, currentUserIdRef.current));
      }

      closeNewChat();
      return;
    } catch (err) {
      // Bubble up error message
      throw new Error(err?.message || "Failed to create direct message");
    }
  };

  const clearTypingTimer = useCallback(() => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const clearTypingExpiry = useCallback(() => {
    if (typingExpiryRef.current) {
      window.clearTimeout(typingExpiryRef.current);
      typingExpiryRef.current = null;
    }
  }, []);

  const stopTyping = useCallback(
    async (roomId = typingRoomIdRef.current) => {
      clearTypingTimer();
      clearTypingExpiry();

      if (!client || !roomId || !typingActiveRef.current) {
        typingActiveRef.current = false;
        typingRoomIdRef.current = null;
        return;
      }

      typingActiveRef.current = false;
      typingRoomIdRef.current = null;

      try {
        await client.sendTyping(roomId, false, 0);
      } catch {
        // Typing indicators are best-effort.
      }
    },
    [client, clearTypingExpiry, clearTypingTimer],
  );

  const startTyping = useCallback(
    async (roomId) => {
      if (!client || !roomId) {
        return;
      }

      if (!typingActiveRef.current || typingRoomIdRef.current !== roomId) {
        typingActiveRef.current = true;
        typingRoomIdRef.current = roomId;

        try {
          await client.sendTyping(roomId, true, TYPING_NOTIFICATION_TIMEOUT_MS);
        } catch {
          // Typing indicators are best-effort.
        }
      }

      clearTypingTimer();
      typingTimeoutRef.current = window.setTimeout(() => {
        void stopTyping(roomId);
      }, TYPING_DEBOUNCE_MS);
    },
    [client, clearTypingTimer, stopTyping],
  );

  useEffect(() => {
    let cancelled = false;
    let bootClient = null;

    const bootstrapSession = async () => {
      const storedSession = loadSession();

      if (!storedSession) {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
        return;
      }

      setBaseUrl(storedSession.baseUrl);
      const restoredClient = restoreSession(storedSession);

      if (!restoredClient) {
        clearSession();
        if (!cancelled) {
          setStatus("idle");
          setError("");
          setIsBootstrapping(false);
        }
        return;
      }

      bootClient = restoredClient;
      setStatus("restoring");

      const preparedPromise = waitForSyncPrepared(restoredClient);

      try {
        await restoredClient.startClient({ initialSyncLimit: 20 });
        await preparedPromise;

        if (cancelled) {
          restoredClient.stopClient?.();
          return;
        }

        const nextRooms = sortRoomsByRecent(restoredClient.getRooms());
        const firstRoom = nextRooms[0] ?? null;

        setClient(restoredClient);
        setCurrentUserId(restoredClient.getUserId() ?? storedSession.userId);
        setPresenceMap({});
        setRooms(nextRooms);
        setSelectedRoom(firstRoom);
        setMessages(extractRoomMessages(firstRoom));
        setReceiptMap(buildReceiptStatusMap(firstRoom, storedSession.userId));
        setTypingUsers([]);
        clearTypingExpiry();
        setDraft("");
        setError("");
        setStatus("ready");
      } catch (restoreError) {
        restoredClient.stopClient?.();
        clearSession();

        if (cancelled) {
          return;
        }

        setClient(null);
        setRooms([]);
        setSelectedRoom(null);
        setMessages([]);
        setPresenceMap({});
        setReceiptMap({});
        setTypingUsers([]);
        clearTypingExpiry();
        setCurrentUserId("");
        setDraft("");
        setStatus("idle");
        setError(
          restoreError instanceof Error
            ? "Saved session is no longer valid. Please log in again."
            : "Saved session is no longer valid. Please log in again.",
        );
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
      bootClient?.stopClient?.();
    };
  }, [clearTypingExpiry]);

  useEffect(() => {
    if (!client || !selectedRoom) {
      return undefined;
    }

    let cancelled = false;
    const members = (selectedRoom.getJoinedMembers?.() ?? []).filter(
      (member) => member?.userId && member.userId !== currentUserIdRef.current,
    );

    const seedPresenceForRoom = async () => {
      for (const member of members) {
        if (cancelled) {
          return;
        }

        if (presenceMapRef.current[member.userId]) {
          continue;
        }

        const knownUser = client.getUser(member.userId);
        if (knownUser?.presence) {
          setPresenceMap((currentPresenceMap) => {
            if (currentPresenceMap[member.userId]) {
              return currentPresenceMap;
            }

            const snapshot = normalizePresenceSnapshot(knownUser, member.userId);
            if (!snapshot) {
              return currentPresenceMap;
            }

            return {
              ...currentPresenceMap,
              [member.userId]: snapshot,
            };
          });
          continue;
        }

        try {
          const presence = await client.getPresence(member.userId);
          if (cancelled) {
            return;
          }

          const snapshot = normalizePresenceSnapshot(
            {
              userId: member.userId,
              displayName: knownUser?.displayName || knownUser?.rawDisplayName || member.name || member.userId,
              ...presence,
            },
            member.userId,
          );

          if (!snapshot) {
            continue;
          }

          setPresenceMap((currentPresenceMap) => {
            if (currentPresenceMap[member.userId]) {
              return currentPresenceMap;
            }

            return {
              ...currentPresenceMap,
              [member.userId]: snapshot,
            };
          });
        } catch {
          // Presence is best-effort.
        }
      }
    };

    void seedPresenceForRoom();

    return () => {
      cancelled = true;
    };
  }, [client, selectedRoom]);

  useEffect(() => {
    if (!client || !selectedRoom) {
      return undefined;
    }

    void markRoomAsRead(client, selectedRoom);
  }, [client, selectedRoom]);

  useEffect(() => {
    if (!client || !selectedRoom) {
      void stopTyping();
      return undefined;
    }

    const updateTypingUsers = () => {
      const nextTypingUsers = getTypingUsers(selectedRoom, currentUserIdRef.current);
      setTypingUsers(nextTypingUsers);
      clearTypingExpiry();

      if (nextTypingUsers.length > 0) {
        typingExpiryRef.current = window.setTimeout(() => {
          setTypingUsers([]);
          typingExpiryRef.current = null;
        }, TYPING_UI_EXPIRY_MS);
      }
    };

    const handleTyping = (_event, member) => {
      if (member?.roomId !== selectedRoom.roomId) {
        return;
      }

      updateTypingUsers();
    };

    updateTypingUsers();
    client.on("RoomMember.typing", handleTyping);

    return () => {
      client.removeListener("RoomMember.typing", handleTyping);
      void stopTyping(selectedRoom.roomId);
    };
  }, [client, selectedRoom, clearTypingExpiry, stopTyping]);

  const selectRoom = (room) => {
    clearTypingExpiry();
    setSelectedRoom(room);
    setMessages(extractRoomMessages(room));
    setReceiptMap(buildReceiptStatusMap(room, currentUserIdRef.current));
    setTypingUsers([]);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setStatus("logging-in");
    setRooms([]);
    setSelectedRoom(null);
    setMessages([]);

    const nextClient = createMatrixClient({ baseUrl });
    const preparedPromise = waitForSyncPrepared(nextClient);

    try {
      const loginResponse = await loginWithPassword(nextClient, { username, password });
      saveSession({
        accessToken: loginResponse.access_token,
        userId: loginResponse.user_id,
        deviceId: loginResponse.device_id,
        baseUrl,
      });
      await nextClient.startClient({ initialSyncLimit: 20 });
      await preparedPromise;

      const nextRooms = sortRoomsByRecent(nextClient.getRooms());
      const firstRoom = nextRooms[0] ?? null;

      setClient(nextClient);
      setCurrentUserId(nextClient.getUserId() ?? username);
      setRooms(nextRooms);
      setSelectedRoom(firstRoom);
      setMessages(extractRoomMessages(firstRoom));
      setReceiptMap(buildReceiptStatusMap(firstRoom, loginResponse.user_id));
      setTypingUsers([]);
      setDraft("");
      setStatus("ready");
    } catch (loginError) {
      nextClient.stopClient?.();
      setClient(null);
      setStatus("error");
      setError(loginError instanceof Error ? loginError.message : "Matrix login failed");
    }
  };

  const handleSelectRoom = (room) => {
    selectRoom(room);
    setIsProfileDrawerOpen(false);
  };

  const handleLogout = () => {
    void stopTyping();
    clearTypingExpiry();
    client?.stopClient?.();
    clearSession();
    setClient(null);
    setRooms([]);
    setSelectedRoom(null);
    setMessages([]);
    setPresenceMap({});
    setReceiptMap({});
    setTypingUsers([]);
    setIsProfileDrawerOpen(false);
    setCurrentUserId("");
    setDraft("");
    setStatus("idle");
    setError("");
  };

  const handleSendMessage = async (messageText) => {
    const text = messageText.trim();

    if (!client || !selectedRoom || !text) {
      return;
    }

    try {
      setError("");
      await stopTyping(selectedRoom.roomId);

      const sendPromise = client.sendTextMessage(selectedRoom.roomId, text);
      setDraft("");
      setMessages(extractRoomMessages(selectedRoom));

      await sendPromise;
      setMessages(extractRoomMessages(selectedRoom));
      setReceiptMap(buildReceiptStatusMap(selectedRoom, currentUserIdRef.current));
    } catch (sendError) {
      setMessages(extractRoomMessages(selectedRoom));
      setReceiptMap(buildReceiptStatusMap(selectedRoom, currentUserIdRef.current));
      setError(sendError instanceof Error ? sendError.message : "Message send failed");
    }
  };

  const handleAttachImage = async (file) => {
    if (!client || !selectedRoom || !file || isImageUploading) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setUploadError("Please choose a JPG, PNG, WEBP, or GIF image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError("Image is too large. Please choose a file under 10 MB.");
      return;
    }

    setUploadError("");
    setError("");
    setIsImageUploading(true);

    try {
      await stopTyping(selectedRoom.roomId);

      const uploadResponse = await client.uploadContent(file, { includeFilename: true });
      const mxcUrl = uploadResponse?.content_uri ?? uploadResponse?.contentUri ?? uploadResponse?.uri ?? "";

      if (!mxcUrl) {
        throw new Error("Matrix upload did not return a media URL.");
      }

      const imageInfo = {
        mimetype: file.type,
        size: file.size,
      };

      await client.sendImageMessage(selectedRoom.roomId, null, mxcUrl, imageInfo, file.name || "Image");

      setMessages(extractRoomMessages(selectedRoom));
      setReceiptMap(buildReceiptStatusMap(selectedRoom, currentUserIdRef.current));
    } catch (uploadErr) {
      setUploadError(
        uploadErr instanceof Error ? uploadErr.message : "Image upload failed. Please try again.",
      );
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleOpenImagePreview = (image) => {
    if (!image?.src) {
      return;
    }

    setImagePreview(image);
  };

  const handleCloseImagePreview = () => {
    setImagePreview(null);
  };

  const handleDraftChange = (nextValue) => {
    setDraft(nextValue);

    if (!client || !selectedRoom) {
      return;
    }

    if (!nextValue.trim()) {
      void stopTyping(selectedRoom.roomId);
      return;
    }

    void startTyping(selectedRoom.roomId);
  };

  const handleTypingStop = () => {
    void stopTyping(selectedRoom?.roomId);
  };

  const handleOpenProfileDrawer = () => {
    if (selectedRoom) {
      setIsProfileDrawerOpen(true);
    }
  };

  const handleCloseProfileDrawer = () => {
    setIsProfileDrawerOpen(false);
  };

  const selectedRoomTitle = selectedRoom ? getRoomDisplayName(selectedRoom) : "Select a room";
  const selectedRoomPresence = selectedRoom
    ? getRoomPresenceSummary(selectedRoom, currentUserId, presenceMap)
    : null;
  const selectedProfileMember = selectedRoom
    ? (selectedRoom.getJoinedMembers?.() ?? []).find(
        (member) => member?.userId && member.userId !== currentUserId,
      ) ?? null
    : null;
  const selectedProfilePresence = selectedProfileMember
    ? presenceMap[selectedProfileMember.userId] ??
      normalizePresenceSnapshot(selectedProfileMember.user ?? selectedProfileMember, selectedProfileMember.userId)
    : null;
  const selectedProfile = selectedProfileMember
    ? {
        displayName:
          selectedProfileMember.name ||
          selectedProfileMember.rawDisplayName ||
          selectedProfileMember.userId,
        userId: selectedProfileMember.userId,
        roomName: selectedRoomTitle,
        avatarUrl: selectedProfileMember.getAvatarUrl?.(baseUrl, 128, 128, "crop") ?? null,
        avatarInitial: (selectedProfileMember.name || selectedProfileMember.rawDisplayName || selectedProfileMember.userId)
          .trim()
          .charAt(0)
          .toUpperCase(),
        presenceLabel: getPresenceLabel(selectedProfilePresence),
        lastActiveLabel:
          selectedProfilePresence?.lastSeenTs ? formatLastSeen(selectedProfilePresence.lastSeenTs) : "",
        presenceTone: selectedProfilePresence ? selectedProfilePresence.presence : "offline",
      }
    : null;

  if (isBootstrapping) {
    return (
      <main className="app-shell app-shell--login">
        <section className="login-card">
          <p className="eyebrow">Matrix MVP</p>
          <h1>Restoring your session</h1>
          <p className="login-card__copy">Checking local session data and reconnecting to Matrix.</p>
        </section>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="app-shell app-shell--login">
        <section className="login-card">
          <p className="eyebrow">Matrix MVP</p>
          <h1>Sign in to your rooms</h1>
          <p className="login-card__copy">
            Connect to Matrix, load your room list, and start chatting from the React UI.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Homeserver URL</span>
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                type="text"
                autoComplete="off"
                placeholder="https://matrix.org"
              />
            </label>

            <label className="field">
              <span>Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                type="text"
                autoComplete="username"
                placeholder="@user:matrix.org"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Password"
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="primary-button" type="submit" disabled={status === "logging-in"}>
              {status === "logging-in" ? "Connecting..." : "Login"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar
        rooms={rooms}
        selectedRoomId={selectedRoom?.roomId ?? null}
        onSelectRoom={handleSelectRoom}
        onLogout={handleLogout}
        currentUserId={currentUserId}
        status={status}
        theme={theme}
        onThemeChange={setTheme}
        onOpenNewChat={openNewChat}
      />

      <ChatWindow
        room={selectedRoom}
        roomTitle={selectedRoomTitle}
        client={client}
        messages={messages}
        currentUserId={currentUserId}
        presenceSummary={selectedRoomPresence}
        typingUsers={typingUsers}
        receiptMap={receiptMap}
        profileTarget={selectedProfile}
        onOpenProfile={handleOpenProfileDrawer}
        onOpenImagePreview={handleOpenImagePreview}
        onInviteUser={handleInviteUserToRoom}
        onLeaveRoom={handleLeaveRoom}
        draft={draft}
        onDraftChange={handleDraftChange}
        onTypingStop={handleTypingStop}
        onSendMessage={handleSendMessage}
        onAttachImage={handleAttachImage}
        isImageUploading={isImageUploading}
        uploadError={uploadError}
      />

      <ProfileDrawer
        open={isProfileDrawerOpen}
        profile={selectedProfile}
        roomName={selectedRoomTitle}
        onClose={handleCloseProfileDrawer}
      />

      <ImageModal open={Boolean(imagePreview)} image={imagePreview} onClose={handleCloseImagePreview} />
      <NewChatModal open={newChatOpen} onClose={closeNewChat} onCreateOrOpen={createOrOpenDM} />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

export default App;
