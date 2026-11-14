import type { Point } from "./canvas-document";

export type RecognizedShapeKind =
  | "line"
  | "circle"
  | "ellipse"
  | "triangle"
  | "rectangle"
  | "square";

export interface RecognizedShape {
  kind: RecognizedShapeKind;
  points: Point[];
  anchorStart?: Point;
}

const DEFAULT_PRESSURE = 0.7;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i]);
  }
  return total;
}

function pointToSegmentDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToSegmentDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function sampleSegment(a: Point, b: Point, step = 10): Point[] {
  const d = dist(a, b);
  const steps = Math.max(2, Math.ceil(d / step));
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      pressure: DEFAULT_PRESSURE,
    });
  }
  return out;
}

function buildPolygonPoints(vertices: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const seg = sampleSegment(a, b);
    // Repeat exact corner points so quadratic Bezier smoothing in drawFullStroke keeps sharp corners.
    out.push(seg[0], ...seg, seg[seg.length - 1]);
  }
  return out;
}

/** Snap endpoint to 0° / 45° / 90° / 135° / 180° when within ±5.5° of a cardinal/diagonal axis. */
export function buildSnappedLine(start: Point, rawEnd: Point): Point[] {
  const dx = rawEnd.x - start.x;
  const dy = rawEnd.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return [{ ...start, pressure: DEFAULT_PRESSURE }, { ...rawEnd, pressure: DEFAULT_PRESSURE }];

  const angle = Math.atan2(dy, dx);
  const snapStep = Math.PI / 4; // 45°
  const nearest = Math.round(angle / snapStep) * snapStep;
  const diffDeg = Math.abs((angle - nearest) * (180 / Math.PI));
  const finalAngle = diffDeg <= 5.5 ? nearest : angle;

  const snappedEnd: Point = {
    x: start.x + Math.cos(finalAngle) * len,
    y: start.y + Math.sin(finalAngle) * len,
    pressure: DEFAULT_PRESSURE,
  };
  const seg = sampleSegment({ ...start, pressure: DEFAULT_PRESSURE }, snappedEnd, 12);
  return [seg[0], ...seg, seg[seg.length - 1]];
}

function buildEllipsePoints(cx: number, cy: number, rx: number, ry: number, segments = 72): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push({
      x: cx + Math.cos(theta) * rx,
      y: cy + Math.sin(theta) * ry,
      pressure: DEFAULT_PRESSURE,
    });
  }
  return pts;
}

function boundingBox(points: Point[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

function tryStraightLine(points: Point[], totalLen: number): RecognizedShape | null {
  const start = points[0];
  const end = points[points.length - 1];
  const direct = dist(start, end);
  if (direct < 24 || direct / totalLen < 0.88) return null;

  let maxDev = 0;
  for (const p of points) {
    maxDev = Math.max(maxDev, pointToSegmentDist(p, start, end));
  }
  if (maxDev > Math.max(12, direct * 0.08)) return null;

  return {
    kind: "line",
    points: buildSnappedLine(start, end),
    anchorStart: { ...start, pressure: DEFAULT_PRESSURE },
  };
}

function tryCircleOrEllipse(points: Point[], box: ReturnType<typeof boundingBox>): RecognizedShape | null {
  const rx = box.width / 2;
  const ry = box.height / 2;
  if (rx < 14 || ry < 14) return null;

  const cx = box.minX + rx;
  const cy = box.minY + ry;
  const normalizedRadii = points.map((p) => Math.hypot((p.x - cx) / rx, (p.y - cy) / ry));
  const mean = normalizedRadii.reduce((acc, v) => acc + v, 0) / normalizedRadii.length;
  const maxErr = Math.max(...normalizedRadii.map((r) => Math.abs(r - 1)));
  if (mean < 0.82 || mean > 1.18 || maxErr > 0.28) return null;

  const aspect = Math.max(rx, ry) / Math.min(rx, ry);
  if (aspect <= 1.22) {
    const r = (rx + ry) / 2;
    return { kind: "circle", points: buildEllipsePoints(cx, cy, r, r) };
  }
  return { kind: "ellipse", points: buildEllipsePoints(cx, cy, rx, ry) };
}

function cornerAnglesOk(vertices: Point[], minCosAbs: number): boolean {
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    if (m1 < 12 || m2 < 12) return false;
    const cos = Math.abs((v1x * v2x + v1y * v2y) / (m1 * m2));
    if (cos > minCosAbs) return false;
  }
  return true;
}

function tryPolygon(points: Point[], box: ReturnType<typeof boundingBox>): RecognizedShape | null {
  const diag = Math.hypot(box.width, box.height);
  if (diag < 32) return null;

  // Deduplicate close closing endpoint before simplification
  const closed = [...points];
  const simplified = rdpSimplify(closed, Math.max(8, diag * 0.05));
  if (simplified.length >= 2 && dist(simplified[0], simplified[simplified.length - 1]) < Math.max(20, diag * 0.22)) {
    simplified.pop();
  }

  if (simplified.length === 3) {
    // Ensure triangle encloses meaningful area rather than a folded back-and-forth line
    const [a, b, c] = simplified;
    const area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
    if (area < diag * diag * 0.08) return null;
    return { kind: "triangle", points: buildPolygonPoints(simplified) };
  }

  if (simplified.length === 4 && cornerAnglesOk(simplified, 0.35)) {
    // Snap near-axis rectangles cleanly to axis-aligned box when edges are close to horizontal/vertical
    const axisAligned = [
      { x: box.minX, y: box.minY, pressure: DEFAULT_PRESSURE },
      { x: box.maxX, y: box.minY, pressure: DEFAULT_PRESSURE },
      { x: box.maxX, y: box.maxY, pressure: DEFAULT_PRESSURE },
      { x: box.minX, y: box.maxY, pressure: DEFAULT_PRESSURE },
    ];
    const rotated = Math.min(
      ...simplified.map((v) =>
        Math.min(...axisAligned.map((aa) => dist(v, aa))),
      ),
    ) > Math.max(18, diag * 0.14);

    if (!rotated) {
      const isSquare = Math.abs(box.width - box.height) <= Math.max(box.width, box.height) * 0.15;
      if (isSquare) {
        const side = (box.width + box.height) / 2;
        const cx = (box.minX + box.maxX) / 2;
        const cy = (box.minY + box.maxY) / 2;
        const half = side / 2;
        return {
          kind: "square",
          points: buildPolygonPoints([
            { x: cx - half, y: cy - half, pressure: DEFAULT_PRESSURE },
            { x: cx + half, y: cy - half, pressure: DEFAULT_PRESSURE },
            { x: cx + half, y: cy + half, pressure: DEFAULT_PRESSURE },
            { x: cx - half, y: cy + half, pressure: DEFAULT_PRESSURE },
          ]),
        };
      }
      return { kind: "rectangle", points: buildPolygonPoints(axisAligned) };
    }

    return { kind: "rectangle", points: buildPolygonPoints(simplified) };
  }

  return null;
}

/**
 * Recognizes geometric intent from a freehand stroke once the user pauses/holds at the end.
 * Returns null for handwriting, scribbles, or strokes too short to disambiguate.
 */
export function recognizeAndSnapShape(points: Point[]): RecognizedShape | null {
  if (points.length < 4) return null;
  const totalLen = polylineLength(points);
  if (totalLen < 24) return null;

  const line = tryStraightLine(points, totalLen);
  if (line) return line;

  const box = boundingBox(points);
  const diag = Math.hypot(box.width, box.height);
  if (diag < 28) return null;

  const endGap = dist(points[0], points[points.length - 1]);
  const isClosed = endGap <= Math.max(36, diag * 0.35);
  if (!isClosed) return null;

  // Prefer polygon if sharp corners clearly fit 3 or 4 vertices; otherwise check circle/ellipse.
  const poly = tryPolygon(points, box);
  if (poly) return poly;

  return tryCircleOrEllipse(points, box);
}
