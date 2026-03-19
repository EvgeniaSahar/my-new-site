export type Listing = {
  id: string;
  title: string;
  price: number;
  lat: number;
  lng: number;
  rating: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getMockListings(count = 28): Listing[] {
  const rand = mulberry32(1337);
  const adjectives = [
    "Sunny",
    "Cozy",
    "Modern",
    "Quiet",
    "Chic",
    "Spacious",
    "Minimal",
    "Bright",
    "Central",
    "Stylish",
  ];
  const nouns = [
    "Studio",
    "Loft",
    "Townhouse",
    "Apartment",
    "Bungalow",
    "Suite",
    "Cottage",
    "Flat",
    "Retreat",
    "Hideaway",
  ];
  const areas = ["Downtown", "Riverside", "Uptown", "Harbor", "Midtown"];

  const listings: Listing[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = `p${String(i + 1).padStart(2, "0")}`;
    const area = areas[Math.floor(rand() * areas.length)];
    const title = `${adjectives[Math.floor(rand() * adjectives.length)]} ${
      nouns[Math.floor(rand() * nouns.length)]
    } — ${area}`;

    const priceBase = 60 + Math.floor(rand() * 160);
    const price = clamp(priceBase + (rand() < 0.2 ? -25 : 0), 45, 240);
    const rating = clamp(Math.round((3.6 + rand() * 1.3) * 10) / 10, 3.6, 4.9);

    // Fake but stable coordinates within a metro-ish box
    const lat = 37.70 + rand() * 0.18;
    const lng = -122.52 + rand() * 0.20;

    listings.push({ id, title, price, lat, lng, rating });
  }

  return listings;
}

