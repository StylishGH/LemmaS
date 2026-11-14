export type ToolType = "pen" | "highlighter" | "stroke-eraser";
export interface Point { x: number; y: number; pressure: number }
export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  baseWidth: number;
  points: Point[];
}

// Snapshots compartilham traços concluídos imutáveis; nunca copiam todos os pontos.
export interface CanvasDocument {
  strokes: Stroke[];
  past: Stroke[][];
  future: Stroke[][];
  settings: { tool: ToolType; colorIndex: number; width: number; stylusMode: boolean; zoom: number };
}

export function createCanvasDocument(strokes: Stroke[] = []): CanvasDocument {
  return { strokes: [...strokes], past: [], future: [],
    settings: { tool: "pen", colorIndex: 0, width: 2, stylusMode: false, zoom: 1 } };
}

export function commitCanvas(document: CanvasDocument, strokes: Stroke[]) {
  document.past.push(document.strokes);
  if (document.past.length > 100) document.past.shift();
  document.strokes = strokes;
  document.future = [];
}

export function undoCanvas(document: CanvasDocument) {
  const previous = document.past.pop();
  if (!previous) return false;
  document.future.push(document.strokes);
  document.strokes = previous;
  return true;
}

export function redoCanvas(document: CanvasDocument) {
  const next = document.future.pop();
  if (!next) return false;
  document.past.push(document.strokes);
  document.strokes = next;
  return true;
}

export function remapCanvasColors(document: CanvasDocument, colors: Map<string, string>) {
  const mapped = new Map<Stroke, Stroke>();
  const convert = (strokes: Stroke[]) => strokes.map(stroke => {
    if (!mapped.has(stroke)) {
      const color = colors.get(stroke.color.toUpperCase());
      mapped.set(stroke, color ? { ...stroke, color } : stroke);
    }
    return mapped.get(stroke)!;
  });
  document.strokes = convert(document.strokes);
  document.past = document.past.map(convert);
  document.future = document.future.map(convert);
}

function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = dx || dy ? Math.max(0, Math.min(1,
    ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

// Considera o caminho percorrido pela borracha, inclusive entre amostras distantes.
export function strokeIntersectsEraser(stroke: Stroke, from: Point, to: Point, radius = 16) {
  const r = radius + stroke.baseWidth / 2;
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return stroke.points.some((b, i, points) => {
    const a = points[Math.max(0, i - 1)];
    const crosses = cross(a, b, from) * cross(a, b, to) < 0 &&
      cross(from, to, a) * cross(from, to, b) < 0;
    return crosses || Math.min(distanceToSegment(from, a, b), distanceToSegment(to, a, b),
      distanceToSegment(a, from, to), distanceToSegment(b, from, to)) <= r;
  });
}

export function canvasContentSize(strokes: Stroke[]) {
  let width = 0, height = 0;
  for (const stroke of strokes) for (const point of stroke.points) {
    width = Math.max(width, point.x + stroke.baseWidth + 24);
    height = Math.max(height, point.y + stroke.baseWidth + 24);
  }
  return { width: Math.ceil(width), height: Math.ceil(height) };
}
