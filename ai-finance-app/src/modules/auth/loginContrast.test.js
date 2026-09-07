import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../styles/formal.css', import.meta.url), 'utf8');

const relativeLuminance = (hex) => {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground, background) => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

const tokenValues = (name) => [
  ...css.matchAll(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'gi'))
].map((match) => match[1]);

test('login text colors meet WCAG AA in light and dark themes', () => {
  const surfaces = tokenValues('--login-surface');
  const visualGradientStarts = tokenValues('--login-visual-gradient-start');
  const visualGradientEnds = tokenValues('--login-visual-gradient-end');
  const featureTexts = tokenValues('--login-feature-text');
  const primaryBackgrounds = tokenValues('--login-primary-background');
  const primaryTexts = tokenValues('--login-primary-text');
  const noteTexts = tokenValues('--login-note-text');
  const linkTexts = tokenValues('--login-link-text');

  assert.equal(surfaces.length, 2, 'light and dark login surfaces are required');
  assert.equal(visualGradientStarts.length, 2, 'light and dark visual gradient starts are required');
  assert.equal(visualGradientEnds.length, 2, 'light and dark visual gradient ends are required');
  assert.equal(featureTexts.length, 2, 'light and dark feature text colors are required');
  assert.equal(primaryBackgrounds.length, 2, 'light and dark primary backgrounds are required');
  assert.equal(primaryTexts.length, 2, 'light and dark primary text colors are required');
  assert.equal(noteTexts.length, 2, 'light and dark guest-note colors are required');
  assert.equal(linkTexts.length, 2, 'light and dark legal-link colors are required');

  surfaces.forEach((surface, index) => {
    assert.ok(contrastRatio(featureTexts[index], visualGradientStarts[index]) >= 4.5);
    assert.ok(contrastRatio(featureTexts[index], visualGradientEnds[index]) >= 4.5);
    assert.ok(contrastRatio(primaryTexts[index], primaryBackgrounds[index]) >= 4.5);
    assert.ok(contrastRatio(noteTexts[index], surface) >= 4.5);
    assert.ok(contrastRatio(linkTexts[index], surface) >= 4.5);
  });

  assert.match(css, /\.login-visual\s*\{[^}]*background:\s*linear-gradient\([^)]*var\(--login-visual-gradient-start\)[^)]*var\(--login-visual-gradient-end\)/s);
  assert.match(css, /\.login-feature\s*\{[^}]*color:\s*var\(--login-feature-text\)/s);
  assert.match(css, /\.login-primary\s*\{[^}]*background:\s*var\(--login-primary-background\)[^}]*color:\s*var\(--login-primary-text\)/s);
  assert.match(css, /\.login-guest-note\s*\{[^}]*color:\s*var\(--login-note-text\)/s);
  assert.match(css, /\.login-legal button\s*\{[^}]*color:\s*var\(--login-link-text\)/s);
});
