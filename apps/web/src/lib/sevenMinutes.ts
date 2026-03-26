export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = input.charCodeAt(index) + ((hash << 5) - hash);
  }
  return hash;
}

export function colorFromString(input: string, saturation = 88, lightness = 62) {
  const hue = Math.abs(hashString(input)) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function smoothPath(points: Array<[number, number]>) {
  if (points.length < 2) return '';

  const command = [`M ${points[0][0]} ${points[0][1]}`];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const midpointX = (current[0] + next[0]) / 2;
    const midpointY = (current[1] + next[1]) / 2;
    command.push(`Q ${current[0]} ${current[1]} ${midpointX} ${midpointY}`);
  }
  command.push('Z');
  return command.join(' ');
}

export function buildOrganicPath(options: {
  seed: string;
  radiusX: number;
  radiusY: number;
  phase: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  wobble?: number;
  points?: number;
}) {
  const { seed, radiusX, radiusY, phase, sentiment, wobble = 0.22, points = 18 } = options;
  const hash = hashString(seed);
  const polarity = sentiment === 'negative' ? 1.25 : sentiment === 'positive' ? 0.7 : 1;
  const vertices: Array<[number, number]> = [];

  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const wave =
      Math.sin(angle * 3 + hash * 0.003 + phase) * 0.45 +
      Math.cos(angle * 5 - hash * 0.002 + phase * 1.3) * 0.3 +
      Math.sin(angle * 7 + phase * 0.4) * 0.12;
    const stretch = 1 + wave * wobble * polarity;
    vertices.push([
      Math.cos(angle) * radiusX * stretch,
      Math.sin(angle) * radiusY * stretch,
    ]);
  }

  return smoothPath(vertices);
}

export function buildConnectionPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  bend: number,
) {
  const controlX = lerp(from.x, to.x, 0.5) + bend;
  const controlY = lerp(from.y, to.y, 0.5) - Math.abs(bend) * 0.22;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

export function sentimentIntensity(sentiment: 'positive' | 'negative' | 'neutral') {
  if (sentiment === 'negative') return -1;
  if (sentiment === 'positive') return 1;
  return 0;
}

export function messageAgeProgress(createdAt: string, expiresAt: string, now: number) {
  const start = new Date(createdAt).getTime();
  const end = new Date(expiresAt).getTime();
  return clamp((now - start) / Math.max(1, end - start), 0, 1);
}
