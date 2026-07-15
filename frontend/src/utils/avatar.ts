/**
 * Generates an SVG string of an avatar with initials and returns it as a Data URL.
 */
export function generateAvatar(name: string): string {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  // Array of visually pleasing background colors
  const colors = [
    '#e04612', '#3224f2', '#488b37', '#66de26', '#e30851',
    '#8842cf', '#0f172a', '#1e1b4b', '#172554', '#7F67BE'
  ];

  // Hash the name to pick a consistent color
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const bgColor = colors[colorIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" fill="${bgColor}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="80" font-weight="600" fill="#ffffff">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(svg) : Buffer.from(svg).toString('base64')}`;
}
