// 简单的内存 session 管理（不需要 Redis）
const sessions = new Map();

class SessionManager {
  getSession(sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        messages: [],
        filters: {},
        listings: [],
        step: 'greeting'
      });
    }
    return sessions.get(sessionId);
  }

  saveSession(sessionId, session) {
    sessions.set(sessionId, session);
  }

  clearSession(sessionId) {
    sessions.delete(sessionId);
  }
}

module.exports = new SessionManager();
