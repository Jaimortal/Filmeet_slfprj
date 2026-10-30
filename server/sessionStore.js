const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Ensure sessions folder exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

class SessionStore {
  constructor() {
    this.activeSessions = new Map();
  }

  getFilePath(roomId) {
    // Sanitize roomId to avoid path traversal
    const safeRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(SESSIONS_DIR, `room_${safeRoomId}.json`);
  }

  createSession(roomId, mode, participants) {
    const sessionData = {
      roomId,
      mode, // 'pair' or 'squad'
      createdAt: new Date().toISOString(),
      participants: participants.map(p => ({
        id: p.id,
        username: p.username || `User_${p.id.slice(0, 4)}`,
        joinedAt: new Date().toISOString()
      })),
      messages: [],
      status: 'active'
    };

    this.activeSessions.set(roomId, sessionData);
    this.persistToFile(roomId);
    console.log(`[SessionStore] Created ephemeral session for room: ${roomId}`);
    return sessionData;
  }

  addMessage(roomId, message) {
    const session = this.activeSessions.get(roomId);
    if (!session) return null;

    const msgObj = {
      id: crypto.randomUUID(),
      senderId: message.senderId,
      senderName: message.senderName || 'Anonymous',
      text: message.text,
      timestamp: new Date().toISOString()
    };

    session.messages.push(msgObj);
    this.persistToFile(roomId);
    return msgObj;
  }

  removeParticipant(roomId, socketId) {
    const session = this.activeSessions.get(roomId);
    if (!session) return null;

    session.participants = session.participants.filter(p => p.id !== socketId);
    if (session.participants.length === 0) {
      // All left, shred session
      this.destroySession(roomId, 'all_participants_left');
      return null;
    } else {
      this.persistToFile(roomId);
      return session;
    }
  }

  persistToFile(roomId) {
    const session = this.activeSessions.get(roomId);
    if (!session) return;

    try {
      const filePath = this.getFilePath(roomId);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    } catch (err) {
      console.error(`[SessionStore] Error writing session file for ${roomId}:`, err);
    }
  }

  destroySession(roomId, reason = 'skip') {
    const filePath = this.getFilePath(roomId);
    console.log(`[SessionStore] Shredding session for room: ${roomId} (Reason: ${reason})`);

    // 1. Remove from memory
    this.activeSessions.delete(roomId);

    // 2. Cryptographically overwrite / shred file if it exists, then unlink
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const randomGarbage = crypto.randomBytes(stats.size || 512);
        fs.writeFileSync(filePath, randomGarbage); // Overwrite with noise
        fs.unlinkSync(filePath); // Delete permanently
        console.log(`[SessionStore] Successfully wiped and unlinked ${filePath}`);
      }
    } catch (err) {
      console.error(`[SessionStore] Error shredding file for ${roomId}:`, err);
    }
  }
}

module.exports = new SessionStore();
