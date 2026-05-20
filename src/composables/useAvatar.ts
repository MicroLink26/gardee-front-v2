const AVATARS = [
  '/default-avatar.png',
  '/default-avatar2.png',
  '/default-avatar3.png',
  '/default-avatar4.png',
];

export function getAvatar(id: string, imageUrl?: string): string {
  if (imageUrl) return imageUrl;
  if (!id) return AVATARS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % 997;
  }
  return AVATARS[hash % 4];
}
