/** WCAG 2.x contrast helpers (used by tests to keep every theme readable). */

function parse(color: string): [number, number, number, number] {
  if (color.startsWith('#')) {
    const h = color.slice(1);
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ];
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`Unsupported colour: ${color}`);
  const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}

/** Composites a (possibly translucent) colour over an opaque background. */
export function blend(fg: string, bg: string): [number, number, number] {
  const [r, g, b, a] = parse(fg);
  const [br, bgG, bb] = parse(bg);
  return [r * a + br * (1 - a), g * a + bgG * (1 - a), b * a + bb * (1 - a)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio of `fg` drawn on `bg` (translucent colours are blended first). */
export function contrast(fg: string, bg: string, base = bg): number {
  const background = blend(bg, base);
  const backgroundHex = `rgb(${background.join(',')})`;
  const l1 = luminance(blend(fg, backgroundHex));
  const l2 = luminance(background);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
