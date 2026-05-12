# VenueFinder

A modern B2B venue discovery frontend. Businesses can search and shortlist venues
for conferences, product launches, workshops and corporate events.

> Frontend-only build. All data is mocked via `src/mock/venues.js` and an Axios
> service layer (`src/services/api.js`) that mirrors the future REST contract.

## Stack

- React 18 + Vite
- Tailwind CSS (with a small custom theme and `dark` mode wired up)
- React Router v6
- Axios (used by the API service abstraction)
- Context API for shortlist and toast state

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on http://localhost:3000.

## Scripts

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start the Vite dev server         |
| `npm run build`   | Production build to `dist/`       |
| `npm run preview` | Preview the production build      |

## Folder structure

```
src/
├── components/
│   ├── common/    Button, Input, Select, Spinner, Badge, SkeletonCard, EmptyState, ToastViewport
│   ├── layout/    Navbar, Sidebar
│   ├── venue/     VenueCard, VenueGrid, FilterBar
│   └── ai/        AISearch, AIResultCard
├── pages/         Home, Shortlist
├── services/      api.js (Axios + mock fallbacks)
├── hooks/         useAISearch, useDebounce
├── context/       ShortlistContext, ToastContext
├── mock/          venues.js
├── utils/         format.js
├── App.jsx
└── main.jsx
```

## Routes

| Path         | Page              |
| ------------ | ----------------- |
| `/`          | Venue listing     |
| `/shortlist` | Saved venues page |

## AI search flow

The `AISearch` component uses the `useAISearch` hook, which:

1. Calls `aiSearch({ prompt })` (mocked POST → returns `{ job_id }`).
2. Polls `getSearchResults(job_id)` every 2 seconds via `setInterval`.
3. Stops polling and renders results when status becomes `completed`.
4. Has a 30s timeout and cleans up timers on unmount or new search.

To swap the mocks for a real backend, flip `USE_MOCKS` in `src/services/api.js`
to `false` and set `VITE_API_BASE_URL` in your environment.
