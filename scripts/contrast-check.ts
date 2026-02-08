/**
 * WCAG contrast ratio check for the alternative theme (#91d8c5).
 * Run: npx tsx scripts/contrast-check.ts
 *
 * WCAG AA: normal text ≥ 4.5:1, large text ≥ 3:1.
 * WCAG AAA: normal text ≥ 7:1, large text ≥ 4.5:1.
 */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => srgbToLinear(c));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const [light, dark] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (light + 0.05) / (dark + 0.05);
}

function passFail(ratio: number, aa: number, aaa: number): string {
  if (ratio >= aaa) return `✓ ${ratio.toFixed(1)}:1 (AAA)`;
  if (ratio >= aa) return `✓ ${ratio.toFixed(1)}:1 (AA)`;
  return `✗ ${ratio.toFixed(1)}:1 (fails AA)`;
}

// Alternative theme pairs
const pairs: [string, string, string][] = [
  ['Primary (button bg)', '#91d8c5', '#1a1a1a'],
  ['Primary hover', '#7bc9b5', '#1a1a1a'],
  ['Foreground on background', '#1a1a1a', '#f5fbf9'],
  ['Muted on background', '#525252', '#f5fbf9'],
];

console.log('Alternative theme contrast (base #91d8c5)\n');
console.log('WCAG AA: normal text ≥ 4.5:1, large ≥ 3:1');
console.log('WCAG AAA: normal text ≥ 7:1, large ≥ 4.5:1\n');

for (const [label, fg, bg] of pairs) {
  const ratio = contrastRatio(fg, bg);
  const normal = passFail(ratio, 4.5, 7);
  const large = passFail(ratio, 3, 4.5);
  console.log(`${label}: ${ratio.toFixed(2)}:1`);
  console.log(`  Normal text: ${normal}`);
  console.log(`  Large text:  ${passFail(ratio, 3, 4.5)}\n`);
}
