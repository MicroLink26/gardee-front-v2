const AVATARS = [
  '/img/default-avatar.png',
  '/img/default-avatar2.png',
  '/img/default-avatar3.png',
  '/img/default-avatar4.png',
];

const COLORS = [
  '#A8C47A', // Gardee green
  '#6B8A3A', // Dark green
  '#C8D9A6', // Light green
  '#515F37', // Medium green
  '#3A5020', // Deep green
];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % 997;
  }
  return hash;
}

export function getAvatar(id: string, imageUrl?: string): string {
  if (imageUrl) return imageUrl;
  if (!id) return AVATARS[0];
  return AVATARS[hashId(id) % 4];
}

export function getInitialAvatar(prenom: string, nom: string, id: string): string {
  const initials = `${prenom?.[0] ?? '?'}${nom?.[0] ?? '?'}`.toUpperCase();
  const colorIdx = hashId(id) % COLORS.length;
  const color = COLORS[colorIdx];

  // Generate SVG data URI for initial avatar
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" fill="${color}"/>
    <text x="100" y="115" font-size="80" font-weight="700" font-family="system-ui, sans-serif"
          fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
