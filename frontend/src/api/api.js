const BASE = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  signup: (name, email, password) =>
    fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${BASE}/auth/me`, { headers: authHeaders() }).then(handleResponse),

  getUsers: () =>
    fetch(`${BASE}/users`, { headers: authHeaders() }).then(handleResponse),

  getConversation: (userId) =>
    fetch(`${BASE}/messages/${userId}`, { headers: authHeaders() }).then(handleResponse),

  sendMessage: (userId, text) =>
    fetch(`${BASE}/messages/${userId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text }),
    }).then(handleResponse),
};
