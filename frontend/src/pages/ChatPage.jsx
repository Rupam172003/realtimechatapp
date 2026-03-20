import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';

function Avatar({ user, size = 42 }) {
  if (user?.profilePic) {
    return <img className="avatar-img" src={user.profilePic} alt={user.name} style={{ width: size, height: size }} />;
  }
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {(user?.name || '?')[0]}
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
}

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState({});
  const messagesEndRef = useRef(null);
  const sseRef = useRef(null);

  // Load users
  useEffect(() => {
    api.getUsers().then(d => setUsers(d.users)).catch(console.error);
  }, []);

  // SSE connection for real-time messages
  useEffect(() => {
    if (!token) return;
    const url = `/api/messages/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      setMessages(prev => {
        const exists = prev.some(m => m.id === msg.id || m.id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
      // Track unread from others
      setSelectedUser(sel => {
        if (!sel || (msg.senderId !== sel.id && msg.senderId !== sel._id)) {
          const senderId = msg.senderId?.toString?.() || msg.senderId;
          if (senderId !== user.id) {
            setUnread(u => ({ ...u, [senderId]: (u[senderId] || 0) + 1 }));
          }
        }
        return sel;
      });
    });

    return () => es.close();
  }, [token, user?.id]);

  // Load conversation when user selected
  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);
    setUnread(u => ({ ...u, [selectedUser.id]: 0 }));
    api.getConversation(selectedUser.id)
      .then(d => setMessages(d.messages))
      .catch(console.error);
  }, [selectedUser]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedUser || sending) return;
    const trimmed = text.trim();
    setText('');
    setSending(true);
    try {
      await api.sendMessage(selectedUser.id, trimmed);
    } catch (err) {
      console.error(err);
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = formatDate(msg.createdAt);
    if (!acc.length || acc[acc.length - 1].date !== date) {
      acc.push({ date, msgs: [msg] });
    } else {
      acc[acc.length - 1].msgs.push(msg);
    }
    return acc;
  }, []);

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-sm">💬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="app-name">ChatterBox</div>
            <div className="user-name">{user?.name}</div>
          </div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>

        <div className="sidebar-search">
          <input
            id="search-users"
            type="text"
            placeholder="🔍  Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="users-list">
          {filteredUsers.length === 0 && (
            <div className="empty-state">No users found</div>
          )}
          {filteredUsers.map(u => (
            <div
              key={u.id}
              className={`user-item${selectedUser?.id === u.id ? ' active' : ''}`}
              onClick={() => setSelectedUser(u)}
              id={`user-${u.id}`}
            >
              <Avatar user={u} size={42} />
              <div className="user-info">
                <div className="name">{u.name}</div>
                <div className="email">{u.email}</div>
              </div>
              {unread[u.id] > 0 && (
                <div className="unread-badge">{unread[u.id]}</div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Panel */}
      <main className="chat-panel">
        {!selectedUser ? (
          <div className="chat-empty">
            <div className="empty-icon">💬</div>
            <h2>Welcome, {user?.name}!</h2>
            <p>Select a user from the left to start chatting</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <Avatar user={selectedUser} size={40} />
              <div>
                <div className="name">{selectedUser.name}</div>
                <div className="status">Online</div>
              </div>
            </div>

            <div className="messages-area">
              {groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="date-divider"><span>{group.date}</span></div>
                  {group.msgs.map((msg) => {
                    const isSent = msg.senderId === user.id || msg.senderId?.toString?.() === user.id;
                    return (
                      <div key={msg.id || msg._id} className={`message-wrapper ${isSent ? 'sent' : 'recv'}`}>
                        {!isSent && <Avatar user={selectedUser} size={28} />}
                        <div className="message-bubble">{msg.text}</div>
                        <div className="message-time">{formatTime(msg.createdAt)}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
              <input
                id="msg-input"
                type="text"
                placeholder={`Message ${selectedUser.name}…`}
                value={text}
                onChange={e => setText(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              <button id="send-btn" className="btn-send" type="submit" disabled={sending || !text.trim()}>
                ➤
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
