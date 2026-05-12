// Mock dataset of B2B venues used while the backend is not wired up.
// Images are unsplash photo URLs delivered through a CDN-friendly format.

export const CITIES = [
  'London',
  'Manchester',
  'Birmingham',
  'Edinburgh',
  'Dublin',
  'Berlin',
  'Amsterdam',
  'Paris',
  'New York',
  'San Francisco',
];

export const AMENITIES = [
  'AV',
  'WiFi',
  'Catering',
  'Parking',
  'Stage',
  'Breakout rooms',
  'Live streaming',
  'Outdoor space',
  'Whiteboards',
  'Accessible',
];

export const venues = [
  {
    id: 'v-001',
    name: 'The Shoreditch Loft',
    city: 'London',
    capacity: 80,
    price_per_day: 2400,
    amenities: ['AV', 'WiFi', 'Catering', 'Stage'],
    description:
      'Industrial-chic loft in East London with exposed brick, ideal for product launches and intimate keynotes.',
    image:
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'v-002',
    name: 'Canary Wharf Conference Center',
    city: 'London',
    capacity: 400,
    price_per_day: 6800,
    amenities: ['AV', 'WiFi', 'Catering', 'Parking', 'Breakout rooms', 'Live streaming'],
    description:
      'Modern multi-room conference venue with riverside views and full-service production support.',
    image:
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'v-010',
    name: 'Amsterdam Canal House',
    city: 'Amsterdam',
    capacity: 70,
    price_per_day: 1950,
    amenities: ['WiFi', 'Catering', 'Outdoor space'],
    description:
      'Boutique canal-side venue with a quiet courtyard. Excellent for executive offsites.',
    image:
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'v-011',
    name: 'Amsterdam Harbor Pavilion',
    city: 'Amsterdam',
    capacity: 260,
    price_per_day: 3600,
    amenities: ['AV', 'WiFi', 'Catering', 'Stage', 'Outdoor space'],
    description:
      'Waterfront pavilion with a 180° harbor view, full lighting rig, and integrated streaming.',
    image:
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'v-012',
    name: 'Le Marais Atelier',
    city: 'Paris',
    capacity: 60,
    price_per_day: 2200,
    amenities: ['WiFi', 'AV', 'Catering'],
    description:
      'Refined Parisian atelier in Le Marais — gallery-style space ideal for brand reveals.',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'v-013',
    name: 'Paris Champs Conference Hall',
    city: 'Paris',
    capacity: 350,
    price_per_day: 5800,
    amenities: ['AV', 'WiFi', 'Catering', 'Parking', 'Breakout rooms'],
    description:
      'Grand conference hall steps from the Champs-Élysées with full simultaneous interpretation.',
    image:
      'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=900&q=70',
  }
];

export default venues;
