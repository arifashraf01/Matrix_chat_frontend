import * as sdk from "matrix-js-sdk";

const DEFAULT_BASE_URL = import.meta.env.VITE_MATRIX_BASE_URL || "https://matrix.org";
const SESSION_STORAGE_KEY = "matrix-chat-session";

export function createMatrixClient({ baseUrl = DEFAULT_BASE_URL, accessToken, userId, deviceId } = {}) {
  return sdk.createClient({
    baseUrl,
    accessToken,
    userId,
    deviceId,
    timelineSupport: true,
  });
}

export async function loginWithPassword(client, { username, password }) {
  return client.login("m.login.password", {
    identifier: {
      type: "m.id.user",
      user: username,
    },
    password,
  });
}

export function waitForSyncPrepared(client) {
  return new Promise((resolve, reject) => {
    const handleSync = (state) => {
      if (state === "PREPARED") {
        cleanup();
        resolve();
        return;
      }

      if (state === "ERROR") {
        cleanup();
        reject(new Error("Matrix sync entered an error state"));
        return;
      }

      if (state === "STOPPED") {
        cleanup();
        reject(new Error("Matrix sync stopped before becoming ready"));
      }
    };

    const cleanup = () => {
      client.removeListener("sync", handleSync);
    };

    client.on("sync", handleSync);
  });
}

export function saveSession({ accessToken, userId, deviceId, baseUrl }) {
  if (!accessToken || !userId || !deviceId || !baseUrl) {
    return;
  }

  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken,
      userId,
      deviceId,
      baseUrl,
    }),
  );
}

export function loadSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    const session = JSON.parse(rawSession);

    if (!session?.accessToken || !session?.userId || !session?.deviceId || !session?.baseUrl) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function restoreSession(session) {
  if (!session?.accessToken || !session?.userId || !session?.deviceId || !session?.baseUrl) {
    return null;
  }

  return createMatrixClient(session);
}

export function getRoomDisplayName(room) {
  if (!room) {
    return "No room selected";
  }

  return room.name?.trim() || room.getCanonicalAlias?.() || room.roomId || "Unnamed room";
}

export function isTextMessageEvent(event) {
  if (!event || event.getType?.() !== "m.room.message") {
    return false;
  }

  const content = event.getContent?.() ?? {};

  return ["m.text", "m.notice", "m.emote"].includes(content.msgtype);
}

export function normalizeMessage(messageLike) {
  if (!messageLike) {
    return null;
  }

  if (typeof messageLike.getType === "function") {
    const content = messageLike.getContent?.() ?? {};
    const eventId = messageLike.getId?.() ?? null;
    const txnId = messageLike.getTxnId?.() ?? null;
    const status = messageLike.getAssociatedStatus?.() ?? messageLike.status ?? null;

    return {
      id: eventId ?? txnId ?? `${messageLike.getTs?.() ?? Date.now()}-${messageLike.getSender?.() ?? "unknown"}`,
      eventId,
      txnId,
      status,
      sender: messageLike.getSender?.() || "Unknown sender",
      body: content.body ?? "",
      ts: messageLike.getTs?.() ?? Date.now(),
    };
  }

  return {
    id: messageLike.id ?? `${messageLike.ts ?? Date.now()}-${messageLike.sender ?? "local"}`,
    eventId: messageLike.eventId ?? null,
    txnId: messageLike.txnId ?? null,
    status: messageLike.status ?? null,
    sender: messageLike.sender ?? "Unknown sender",
    body: messageLike.body ?? "",
    ts: messageLike.ts ?? Date.now(),
  };
}

export function extractRoomMessages(room) {
  const timeline = room?.timeline ?? [];

  return timeline
    .filter(isTextMessageEvent)
    .map(normalizeMessage)
    .filter(Boolean)
    .sort((left, right) => left.ts - right.ts);
}

export function getTypingUsers(room, currentUserId) {
  if (!room) {
    return [];
  }

  return (room.getJoinedMembers?.() ?? [])
    .filter((member) => member?.typing && member.userId !== currentUserId)
    .map((member) => member.name || member.rawDisplayName || member.userId)
    .filter(Boolean);
}

export function getRoomUnreadCount(room) {
  if (!room) {
    return 0;
  }

  return room.getUnreadNotificationCount?.() ?? 0;
}

export function getRoomLastMessagePreview(room, currentUserId) {
  const messages = extractRoomMessages(room);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return "";
  }

  const member = room?.getMember?.(lastMessage.sender);
  const senderName = lastMessage.sender === currentUserId ? "You" : member?.name || member?.rawDisplayName || lastMessage.sender;

  return `${senderName}: ${lastMessage.body}`;
}

export function getRoomLastMessageMeta(room, currentUserId) {
  const messages = extractRoomMessages(room);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return {
      preview: "",
      ts: null,
    };
  }

  const member = room?.getMember?.(lastMessage.sender);
  const senderName = lastMessage.sender === currentUserId ? "You" : member?.name || member?.rawDisplayName || lastMessage.sender;

  return {
    preview: `${senderName}: ${lastMessage.body}`,
    ts: lastMessage.ts ?? null,
  };
}

export function getRoomInitial(roomName) {
  const firstChar = (roomName || "?").trim().charAt(0);
  return firstChar ? firstChar.toUpperCase() : "?";
}

export async function markRoomAsRead(client, room) {
  if (!client || !room) {
    return;
  }

  const liveEvents = room.getLiveTimeline?.().getEvents?.() ?? [];

  for (let index = liveEvents.length - 1; index >= 0; index -= 1) {
    const event = liveEvents[index];
    const eventId = event?.getId?.();
    const eventStatus = event?.getAssociatedStatus?.() ?? event?.status ?? null;

    if (!eventId) {
      continue;
    }

    if (eventStatus === "sending" || eventStatus === "queued" || eventStatus === "encrypting") {
      continue;
    }

    try {
      await client.sendReadReceipt(event);
    } catch {
      // Read receipts are best-effort.
    }

    return;
  }
}

export function buildReceiptStatusMap(room, currentUserId) {
  if (!room || !currentUserId) {
    return {};
  }

  const statuses = {};
  const messages = extractRoomMessages(room).filter(
    (message) => message.sender === currentUserId && message.eventId,
  );

  for (const message of messages) {
    statuses[message.eventId] = getOutgoingMessageReceiptStatus(room, message, currentUserId);
  }

  return statuses;
}

export function getOutgoingMessageReceiptStatus(room, message, currentUserId) {
  if (!room || !message || message.sender !== currentUserId) {
    return null;
  }

  if (!message.eventId) {
    return "sent";
  }

  const status = message.status;
  if (status === "sending" || status === "queued" || status === "encrypting") {
    return "sent";
  }

  const recipients = (room.getJoinedMembers?.() ?? []).filter(
    (member) => member?.userId && member.userId !== currentUserId,
  );

  const seenBySomeone = recipients.some((member) => room.hasUserReadEvent(member.userId, message.eventId));
  if (seenBySomeone) {
    return "seen";
  }

  return status === "sent" || status == null ? "delivered" : "sent";
}

export function getReceiptGlyph(receiptStatus) {
  if (receiptStatus === "sent") {
    return "✓";
  }

  if (receiptStatus === "delivered" || receiptStatus === "seen") {
    return "✓✓";
  }

  return "";
}

export function getReceiptGlyphAscii(receiptStatus) {
  if (receiptStatus === "sent") {
    return "\u2713";
  }

  if (receiptStatus === "delivered" || receiptStatus === "seen") {
    return "\u2713\u2713";
  }

  return "";
}

export function normalizePresenceSnapshot(userOrPresence, fallbackUserId = "") {
  if (!userOrPresence) {
    return null;
  }

  const userId = userOrPresence.userId ?? fallbackUserId;

  if (!userId) {
    return null;
  }

  const hasPresenceData =
    userOrPresence.presence !== undefined ||
    userOrPresence.currentlyActive !== undefined ||
    userOrPresence.currently_active !== undefined ||
    userOrPresence.lastActiveAgo !== undefined ||
    userOrPresence.last_active_ago !== undefined ||
    userOrPresence.lastPresenceTs !== undefined ||
    userOrPresence.last_presence_ts !== undefined;

  if (!hasPresenceData) {
    return null;
  }

  const presence = userOrPresence.presence ?? "offline";
  const currentlyActive = Boolean(userOrPresence.currentlyActive ?? userOrPresence.currently_active);
  const lastActiveAgo =
    typeof userOrPresence.lastActiveAgo === "number"
      ? userOrPresence.lastActiveAgo
      : typeof userOrPresence.last_active_ago === "number"
        ? userOrPresence.last_active_ago
        : null;
  const lastPresenceTs =
    typeof userOrPresence.lastPresenceTs === "number"
      ? userOrPresence.lastPresenceTs
      : typeof userOrPresence.last_presence_ts === "number"
        ? userOrPresence.last_presence_ts
        : null;
  const lastSeenTs =
    currentlyActive || presence === "online"
      ? Date.now()
      : lastActiveAgo != null && lastPresenceTs != null
        ? lastPresenceTs - lastActiveAgo
        : lastPresenceTs ?? null;

  return {
    userId,
    displayName: userOrPresence.displayName || userOrPresence.rawDisplayName || userOrPresence.name || userId,
    presence,
    presenceStatusMsg: userOrPresence.presenceStatusMsg ?? userOrPresence.status_msg ?? "",
    currentlyActive,
    lastActiveAgo,
    lastPresenceTs,
    lastSeenTs,
  };
}

export function formatLastSeen(lastSeenTs) {
  if (!lastSeenTs) {
    return "Last seen unknown";
  }

  const diffMs = Math.max(0, Date.now() - lastSeenTs);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (diffMs < 60_000) {
    return "Last seen just now";
  }

  if (minutes < 60) {
    return `Last seen ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `Last seen ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return `Last seen ${days} day${days === 1 ? "" : "s"} ago`;
}

export function getPresenceTone(snapshot) {
  if (!snapshot) {
    return "unknown";
  }

  if (snapshot.currentlyActive || snapshot.presence === "online") {
    return "online";
  }

  if (snapshot.presence === "unavailable") {
    return "away";
  }

  if (snapshot.presence === "offline") {
    return "offline";
  }

  return "unknown";
}

export function getPresenceLabel(snapshot) {
  const tone = getPresenceTone(snapshot);

  if (tone === "online") {
    return "Online";
  }

  if (tone === "away") {
    return "Away";
  }

  if (tone === "offline") {
    return snapshot?.lastSeenTs ? formatLastSeen(snapshot.lastSeenTs) : "Offline";
  }

  return "Unknown";
}

export function getRoomPresenceSummary(room, currentUserId, presenceMap = {}) {
  const members = (room?.getJoinedMembers?.() ?? []).filter((member) => member?.userId && member.userId !== currentUserId);

  if (members.length === 0) {
    return {
      tone: "unknown",
      label: "Unknown",
      count: 0,
      lastSeenTs: null,
    };
  }

  const snapshots = members
    .map((member) => {
      const cachedSnapshot = presenceMap[member.userId];

      if (cachedSnapshot) {
        return cachedSnapshot;
      }

      if (member.user) {
        return normalizePresenceSnapshot(member.user, member.userId);
      }

      return null;
    })
    .filter(Boolean);

  if (snapshots.length === 0) {
    return {
      tone: "unknown",
      label: "Unknown",
      count: members.length,
      lastSeenTs: null,
    };
  }

  const online = snapshots.filter((snapshot) => getPresenceTone(snapshot) === "online");
  if (online.length > 0) {
    return {
      tone: "online",
      label: online.length === 1 ? "Online" : `${online.length} online`,
      count: online.length,
      lastSeenTs: null,
    };
  }

  const away = snapshots.filter((snapshot) => getPresenceTone(snapshot) === "away");
  if (away.length > 0) {
    return {
      tone: "away",
      label: away.length === 1 ? "Away" : `${away.length} away`,
      count: away.length,
      lastSeenTs: null,
    };
  }

  const offline = snapshots.filter((snapshot) => getPresenceTone(snapshot) === "offline");
  if (offline.length > 0) {
    const mostRecentSeen = offline
      .map((snapshot) => snapshot.lastSeenTs)
      .filter((value) => typeof value === "number")
      .sort((left, right) => right - left)[0];

    return {
      tone: "offline",
      label: mostRecentSeen ? formatLastSeen(mostRecentSeen) : "Offline",
      count: offline.length,
      lastSeenTs: mostRecentSeen ?? null,
    };
  }

  return {
    tone: "unknown",
    label: "Unknown",
    count: snapshots.length,
    lastSeenTs: null,
  };
}
