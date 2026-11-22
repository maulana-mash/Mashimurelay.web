/**
 * Mashimurelay Manhattan Orthogonal Wire Router
 * Based on Gemini 4 Argon Computational Discrete Geometry Architecture
 */

const GRID_SIZE = 30;

function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function normalizeRotation(rawRot) {
  let r = parseInt(rawRot || 0, 10);
  if (isNaN(r)) return 0;
  if (Math.abs(r) >= 4) {
    r = Math.round(r / 90);
  }
  return ((r % 4) + 4) % 4;
}

/**
 * Returns normal vector for a terminal direction index:
 * 0: North (up: {x: 0, y: -1})
 * 1: East (right: {x: 1, y: 0})
 * 2: South (down: {x: 0, y: 1})
 * 3: West (left: {x: -1, y: 0})
 */
function getDirectionVector(dirIndex, rotation = 0) {
  const normRot = normalizeRotation(rotation);
  const effectiveDir = ((parseInt(dirIndex || 0, 10) + normRot) % 4 + 4) % 4;
  switch (effectiveDir) {
    case 0: return { x: 0, y: -1 };
    case 1: return { x: 1, y: 0 };
    case 2: return { x: 0, y: 1 };
    case 3: return { x: -1, y: 0 };
    default: return { x: 0, y: -1 };
  }
}

/**
 * Calculates world coordinates of a terminal pin given an element and its node index.
 */
function getTerminalWorldPos(element, nodeIndex) {
  const compDef = COMPONENTS_DATA[element.svgData];
  if (!compDef || !compDef.nodes || nodeIndex >= compDef.nodes.length) {
    return { x: element.position.x, y: element.position.y, dir: { x: 0, y: -1 }, node: null };
  }
  const node = compDef.nodes[nodeIndex];
  const dx = parseFloat(node.dx || 0);
  const dy = parseFloat(node.dy || 0);
  const rot = normalizeRotation(element.rotation);

  let rx = dx;
  let ry = dy;
  if (rot === 1) {
    rx = -dy;
    ry = dx;
  } else if (rot === 2) {
    rx = -dx;
    ry = -dy;
  } else if (rot === 3) {
    rx = dy;
    ry = -dx;
  }

  const px = snapToGrid(element.position.x + rx);
  const py = snapToGrid(element.position.y + ry);
  const dir = getDirectionVector(parseInt(node.direction || 0), rot);

  return { x: px, y: py, dir, node };
}

/**
 * Routes orthogonal Manhattan wire between terminal A and terminal B
 * Supports margins: { start, center, end }
 */
function routeWirePoints(pA, dirA, pB, dirB, margins = { start: 0, center: 0, end: 0 }) {
  const p0 = { x: snapToGrid(pA.x), y: snapToGrid(pA.y) };
  const p5 = { x: snapToGrid(pB.x), y: snapToGrid(pB.y) };

  // If start and end are exactly on the same coordinate
  if (p0.x === p5.x && p0.y === p5.y) {
    return [p0, p5];
  }

  const mStart = (margins && typeof margins.start === 'number') ? margins.start : 0;
  const mEnd = (margins && typeof margins.end === 'number') ? margins.end : 0;
  const mCenter = (margins && typeof margins.center === 'number') ? margins.center : 0;

  const dStart = Math.max(GRID_SIZE, GRID_SIZE + snapToGrid(mStart));
  const dEnd = Math.max(GRID_SIZE, GRID_SIZE + snapToGrid(mEnd));
  const dCenter = snapToGrid(mCenter);

  // If endpoints form a straight line directly matching their normal directions:
  if (p0.x === p5.x && (dirA.y !== 0 && dirB.y !== 0) && mCenter === 0) {
    return [p0, p5];
  }
  if (p0.y === p5.y && (dirA.x !== 0 && dirB.x !== 0) && mCenter === 0) {
    return [p0, p5];
  }

  // Stubs extending outwards from terminals
  const p1 = { x: p0.x + dirA.x * dStart, y: p0.y + dirA.y * dStart };
  const p4 = { x: p5.x + dirB.x * dEnd,   y: p5.y + dirB.y * dEnd };

  let p2 = { x: p1.x, y: p1.y };
  let p3 = { x: p4.x, y: p4.y };

  const isAVertical = dirA.y !== 0;
  const isBVertical = dirB.y !== 0;

  if (isAVertical && isBVertical) {
    // Both terminals point vertically (up/down) -> Bridge via horizontal segment
    const midY = snapToGrid((p1.y + p4.y) / 2) + dCenter;
    p2 = { x: p1.x, y: midY };
    p3 = { x: p4.x, y: midY };
  } else if (!isAVertical && !isBVertical) {
    // Both terminals point horizontally (left/right) -> Bridge via vertical segment
    const midX = snapToGrid((p1.x + p4.x) / 2) + dCenter;
    p2 = { x: midX, y: p1.y };
    p3 = { x: midX, y: p4.y };
  } else if (isAVertical && !isBVertical) {
    // Vertical -> Horizontal
    const bendY = p4.y + dCenter;
    p2 = { x: p1.x, y: bendY };
    p3 = { x: p4.x, y: bendY };
  } else {
    // Horizontal -> Vertical
    const bendX = p4.x + dCenter;
    p2 = { x: bendX, y: p1.y };
    p3 = { x: bendX, y: p4.y };
  }

  const raw = [p0, p1, p2, p3, p4, p5];
  const clean = [];

  for (const pt of raw) {
    if (clean.length > 0) {
      const last = clean[clean.length - 1];
      if (last.x === pt.x && last.y === pt.y) continue;
    }
    clean.push(pt);
    // Collinear pruning
    while (clean.length >= 3) {
      const a = clean[clean.length - 3];
      const b = clean[clean.length - 2];
      const c = clean[clean.length - 1];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (cross === 0) {
        clean.splice(clean.length - 2, 1);
      } else {
        break;
      }
    }
  }

  return clean;
}

/**
 * Formats points into SVG path 'd' attribute
 */
function pointsToSvgPath(points) {
  if (!points || points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

if (typeof globalThis !== 'undefined') { globalThis.routeWirePoints = routeWirePoints; globalThis.getTerminalWorldPos = getTerminalWorldPos; }
