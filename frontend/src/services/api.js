const API_BASE = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Backend server is not reachable. Ensure the FastAPI server is running on port 8000.');
    }
    throw error;
  }
}

export async function getStatus() {
  const res = await request('/api/status');
  return res.json();
}

export async function getLatestTelemetry() {
  const res = await request('/api/telemetry/latest');
  return res.json();
}

export async function getEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  const qs = query.toString();
  const res = await request(`/api/events${qs ? `?${qs}` : ''}`);
  return res.json();
}

export async function getEventStats() {
  const res = await request('/api/events/stats');
  return res.json();
}

export async function exportEventsCSV() {
  const res = await request('/api/events/export/csv');
  return res.blob();
}

export async function getSettings() {
  const res = await request('/api/settings');
  return res.json();
}

export async function updateSettings(settings) {
  const res = await request('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function getSensors() {
  const res = await request('/api/sensors');
  return res.json();
}

export async function toggleDemoMode() {
  const res = await request('/api/demo/toggle', { method: 'POST' });
  return res.json();
}

export function getCameraStreamUrl() {
  return `${API_BASE}/api/stream/camera`;
}

export { API_BASE };

