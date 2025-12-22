/**
 * Generates a simple SVG data URI for a default avatar placeholder
 * This avoids external requests and network errors
 */
export function getAvatarPlaceholder(size: number = 40): string {
  // Create a simple SVG with a user icon silhouette
  // Using URL encoding instead of base64 for better compatibility
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#e5e7eb"/><circle cx="${size / 2}" cy="${size / 3}" r="${size / 6}" fill="#9ca3af"/><ellipse cx="${size / 2}" cy="${size * 0.7}" rx="${size / 3}" ry="${size / 4}" fill="#9ca3af"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

