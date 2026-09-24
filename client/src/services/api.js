const API_BASE = import.meta.env.VITE_API_URL || '';

export async function api(path, options = {}) {
  const token = localStorage.getItem('smart-hostel-token');
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
  } catch {
    throw new Error('Cannot connect to backend server. Please ensure the server is running on port 5000.');
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => {
    if (response.status >= 500) {
      return { message: 'Backend server is unavailable or restarting. Please try again in a moment.' };
    }
    return { message: 'The server returned an unexpected response.' };
  });

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const get = (path) => api(path);
export const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) });
export const put = (path, data) => api(path, { method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) });
export const del = (path) => api(path, { method: 'DELETE' });
