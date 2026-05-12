// Production-shaped API layer. The backend is not built yet, so each method
// resolves with mocked data after a small delay. Replacing a method with a
// real axios call should be a one-line change.

import axios from 'axios';
import { venues as MOCK_VENUES } from '../mock/venues.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCKS = true;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function filterVenues(list, params = {}) {
  const { city, minCapacity, maxPrice, query } = params;
  return list.filter((venue) => {
    if (city && venue.city !== city) return false;
    if (minCapacity && venue.capacity < Number(minCapacity)) return false;
    if (maxPrice && venue.price_per_day > Number(maxPrice)) return false;
    if (query) {
      const needle = query.toLowerCase().trim();
      const haystack = `${venue.name} ${venue.city} ${venue.description} ${venue.amenities.join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export async function getVenues(params = {}) {
  if (!USE_MOCKS) {
    const { data } = await apiClient.get('/venues', { params });
    return data;
  }
  await delay(450);
  return { venues: filterVenues(MOCK_VENUES, params) };
}

// AI search: POST returns a job_id. Caller then polls getSearchResults until status === 'completed'.
const aiJobs = new Map();

export async function aiSearch({ prompt }) {
  if (!USE_MOCKS) {
    const { data } = await apiClient.post('/ai/search', { prompt });
    return data;
  }
  await delay(350);
  const job_id = `job_${Math.random().toString(36).slice(2, 9)}`;
  const startedAt = Date.now();
  const completeAfterMs = 5200 + Math.random() * 1800;
  aiJobs.set(job_id, { prompt, startedAt, completeAfterMs });
  return { job_id };
}

function buildAIRecommendations(prompt) {
  const lower = prompt.toLowerCase();
  // Naive keyword matching to produce realistic-looking recommendations.
  const scored = MOCK_VENUES.map((v) => {
    let score = 0;
    if (lower.includes(v.city.toLowerCase())) score += 4;
    v.amenities.forEach((a) => {
      if (lower.includes(a.toLowerCase())) score += 2;
    });
    const capMatch = lower.match(/(\d{2,4})[\s-]*(?:person|people|guests|pax|attendees)/);
    if (capMatch) {
      const wanted = Number(capMatch[1]);
      if (v.capacity >= wanted && v.capacity <= wanted * 2.2) score += 3;
    }
    if (lower.includes('modern') && /modern|loft|studio|pavilion|tech/i.test(v.description)) score += 1;
    if (lower.includes('central') && /Mitte|Soho|Marais|Midtown|SoMa|Shoreditch/i.test(v.name)) score += 2;
    return { venue: v, score };
  });
  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.venue);
  return top.length ? top : MOCK_VENUES.slice(0, 4);
}

export async function getSearchResults(job_id) {
  if (!USE_MOCKS) {
    const { data } = await apiClient.get(`/ai/search/${job_id}`);
    return data;
  }
  const job = aiJobs.get(job_id);
  if (!job) {
    return { status: 'error', error: 'Unknown job_id' };
  }
  const elapsed = Date.now() - job.startedAt;
  if (elapsed < job.completeAfterMs) {
    return { status: 'pending', progress: Math.min(0.95, elapsed / job.completeAfterMs) };
  }
  const venues = buildAIRecommendations(job.prompt);
  return {
    status: 'completed',
    explanation: `Based on your brief, here are ${venues.length} venues that closely match your capacity, location and amenity needs. They were ranked by fit to your prompt: “${job.prompt.trim()}”.`,
    venues,
  };
}

// Shortlist methods kept here so the UI can later swap to a real backend
// without touching the context layer. The local context remains the source of
// truth in this mock build.
export async function toggleShortlist({ venueId, shortlisted }) {
  if (!USE_MOCKS) {
    const { data } = await apiClient.post('/shortlist/toggle', { venueId, shortlisted });
    return data;
  }
  await delay(120);
  return { venueId, shortlisted };
}

export default {
  getVenues,
  aiSearch,
  getSearchResults,
  toggleShortlist,
};
