import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import {
  buildReceiptStatusMap,
  clearSession,
  createMatrixClient,
  extractRoomMessages,
  getRoomDisplayName,
  getRoomPresenceSummary,
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
        setRooms((currentRooms) => [...currentRooms]);
        return;
      }

      setRooms((currentRooms) => [...currentRooms]);

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
        setRooms((currentRooms) => [...currentRooms]);
        return;
      }

      setReceiptMap(buildReceiptStatusMap(room, currentUserIdRef.current));
      setRooms((currentRooms) => [...currentRooms]);
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

        const nextRooms = restoredClient.getRooms();
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

      const nextRooms = nextClient.getRooms();
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

  const selectedRoomTitle = selectedRoom ? getRoomDisplayName(selectedRoom) : "Select a room";
  const selectedRoomPresence = selectedRoom
    ? getRoomPresenceSummary(selectedRoom, currentUserId, presenceMap)
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
      />

      <ChatWindow
        room={selectedRoom}
        roomTitle={selectedRoomTitle}
        messages={messages}
        currentUserId={currentUserId}
        presenceSummary={selectedRoomPresence}
        typingUsers={typingUsers}
        receiptMap={receiptMap}
        draft={draft}
        onDraftChange={handleDraftChange}
        onTypingStop={handleTypingStop}
        onSendMessage={handleSendMessage}
      />
    </main>
  );
}

export default App;
