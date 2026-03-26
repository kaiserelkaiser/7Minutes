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

function circularHueDistance(a: number, b: number) {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

export function resolveDistinctRoomColors(
  users: Array<{ id: string; username: string; color?: string }>,
) {
  const orderedUsers = [...users].sort((left, right) =>
    hashString(`${left.id}:${left.username}`) - hashString(`${right.id}:${right.username}`),
  );
  const usedHues: number[] = [];
  const colorMap: Record<string, string> = {};

  orderedUsers.forEach((user, index) => {
    const baseHue = Math.abs(hashString(`${user.username}:${user.id}`)) % 360;
    let chosenHue = baseHue;
    let bestCandidate = chosenHue;
    let bestDistance = -1;

    for (let attempt = 0; attempt < 36; attempt += 1) {
      const candidate = (baseHue + attempt * 29 + index * 11) % 360;
      const nearestDistance =
        usedHues.length === 0
          ? 360
          : Math.min(...usedHues.map((existingHue) => circularHueDistance(existingHue, candidate)));

      if (nearestDistance > bestDistance) {
        bestCandidate = candidate;
        bestDistance = nearestDistance;
      }

      if (nearestDistance >= 42) {
        chosenHue = candidate;
        break;
      }

      chosenHue = bestCandidate;
    }

    usedHues.push(chosenHue);

    const saturation = 76 + (Math.abs(hashString(user.id)) % 14);
    const lightness = 58 + ((index % 3) * 6 - 6);
    colorMap[user.id] = `hsl(${Math.round(chosenHue)}, ${saturation}%, ${clamp(lightness, 50, 68)}%)`;
  });

  return colorMap;
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

export interface OrganicNodeLayoutInput {
  id: string;
  seed: string;
  width: number;
  height: number;
  age: number;
  pinned?: { x: number; y: number } | null;
}

export function layoutOrganicNodes(options: {
  center: { x: number; y: number };
  bounds: { width: number; height: number };
  nodes: OrganicNodeLayoutInput[];
  radius?: number;
  iterations?: number;
}) {
  const { center, bounds, nodes, radius = 168, iterations = 72 } = options;
  const positions = nodes.map((node, index) => {
    const hash = Math.abs(hashString(node.seed));
    const angle = ((hash % 360) * Math.PI) / 180 + index * 0.54;
    const ring = radius + (index % 5) * 42 + node.age * 44;

    return {
      id: node.id,
      width: node.width,
      height: node.height,
      pinned: Boolean(node.pinned),
      targetX: center.x + Math.cos(angle) * ring,
      targetY: center.y + Math.sin(angle * 1.18) * ring * 0.56,
      x: node.pinned?.x ?? center.x + Math.cos(angle) * ring,
      y: node.pinned?.y ?? center.y + Math.sin(angle * 1.18) * ring * 0.56,
    };
  });

  for (let step = 0; step < iterations; step += 1) {
    for (let index = 0; index < positions.length; index += 1) {
      const current = positions[index];

      for (let otherIndex = index + 1; otherIndex < positions.length; otherIndex += 1) {
        const other = positions[otherIndex];
        const deltaX = other.x - current.x || 0.001;
        const deltaY = other.y - current.y || 0.001;
        const minimumX = (current.width + other.width) / 2 + 24;
        const minimumY = (current.height + other.height) / 2 + 18;
        const overlapX = minimumX - Math.abs(deltaX);
        const overlapY = minimumY - Math.abs(deltaY);

        if (overlapX <= 0 || overlapY <= 0) continue;

        const directionX = deltaX / Math.abs(deltaX);
        const directionY = deltaY / Math.abs(deltaY);
        const pushX = overlapX * 0.085 * directionX;
        const pushY = overlapY * 0.1 * directionY;

        if (!current.pinned) {
          current.x -= pushX;
          current.y -= pushY;
        }

        if (!other.pinned) {
          other.x += pushX;
          other.y += pushY;
        }
      }
    }

    positions.forEach((node) => {
      const horizontalMargin = node.width / 2 + 20;
      const verticalMargin = node.height / 2 + 24;

      if (!node.pinned) {
        node.x += (node.targetX - node.x) * 0.032;
        node.y += (node.targetY - node.y) * 0.032;
      }

      node.x = clamp(node.x, horizontalMargin, bounds.width - horizontalMargin);
      node.y = clamp(node.y, verticalMargin, bounds.height - verticalMargin);
    });
  }

  return positions.reduce<Record<string, { x: number; y: number }>>((result, node) => {
    result[node.id] = { x: node.x, y: node.y };
    return result;
  }, {});
}
