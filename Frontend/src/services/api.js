// Central API layer. All HTTP calls live here so screens stay clean.
// Real endpoints use `apiClient` (configured with VITE_API_BASE_URL).
// AI search is still mocked while its backend is being built.

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_STORAGE_KEY = 'vf_auth_token';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// On expired/invalid token the backend returns 401 or 404. Clear the token
// and bounce the user to the login screen.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/');
    const hadToken = Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));

    if (!isAuthEndpoint && hadToken && (status === 401 || status === 404)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.setItem('vf_session_expired', '1');
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login({ username, password }) {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  const { data } = await apiClient.post('/api/auth/token/', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data; // { token: '...' }
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

function normalizeVenue(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    price_per_day:
      raw.price_per_day != null ? Number(raw.price_per_day) : null,
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    image: raw.image_url || raw.image,
  };
}

export async function getVenues(params = {}) {
  const query = {};
  if (params.city) query.city = params.city;
  if (params.minCapacity) query.min_capacity = Number(params.minCapacity);
  if (params.maxCapacity) query.max_capacity = Number(params.maxCapacity);
  if (params.maxPrice) query.max_price = Number(params.maxPrice);

  const { data } = await apiClient.get('/api/venues/', { params: query });
  const list = Array.isArray(data?.results) ? data.results : [];
  return {
    venues: list.map(normalizeVenue),
    count: data?.count ?? list.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };
}

export async function getVenueById(id) {
  const { data } = await apiClient.get(`/api/venues/${id}/`);
  return normalizeVenue(data);
}

// ---------------------------------------------------------------------------
// AI search
// ---------------------------------------------------------------------------

export async function aiSearch({ prompt }) {
  const { data } = await apiClient.post(
    '/api/venues/search/',
    { query: prompt },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data; // { job_id }
}

function mapAIStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'success' || s === 'complete' || s === 'completed') return 'completed';
  if (s === 'failure' || s === 'error' || s === 'failed') return 'error';
  return 'pending';
}

export async function getSearchResults(job_id) {
  const { data } = await apiClient.get(`/api/venues/search/${job_id}/`);
  const status = mapAIStatus(data?.status);

  if (status !== 'completed') {
    return {
      status,
      error: status === 'error' ? data?.error || data?.detail || 'AI search failed.' : undefined,
    };
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  const venues = results
    .map((item) => {
      const v = item?.venue ? normalizeVenue(item.venue) : null;
      if (!v) return null;
      return { ...v, aiExplanation: item.explanation || '' };
    })
    .filter(Boolean);

  return {
    status: 'completed',
    explanation:
      data?.explanation ||
      `Found ${venues.length} venue${venues.length === 1 ? '' : 's'} matching your brief.`,
    venues,
  };
}

// ---------------------------------------------------------------------------
// Shortlist
// ---------------------------------------------------------------------------

export async function getShortlist() {
  const { data } = await apiClient.get('/api/shortlist/');
  const list = Array.isArray(data) ? data : data?.results || [];
  // Each item is { id, venue: {...}, created_at }. Flatten to venue + entryId.
  return list
    .map((item) => {
      if (!item?.venue) return null;
      return {
        ...normalizeVenue(item.venue),
        shortlistEntryId: item.id,
        shortlistedAt: item.created_at,
      };
    })
    .filter(Boolean);
}

export async function addToShortlist(venueId) {
  const { data } = await apiClient.post(`/api/venues/${venueId}/shortlist/`);
  return data; // { detail, id }
}

export async function removeFromShortlist(venueId) {
  const { data } = await apiClient.delete(`/api/venues/${venueId}/shortlist/`);
  return data;
}

export default {
  login,
  saveToken,
  getToken,
  clearToken,
  getVenues,
  getVenueById,
  aiSearch,
  getSearchResults,
  getShortlist,
  addToShortlist,
  removeFromShortlist,
};
