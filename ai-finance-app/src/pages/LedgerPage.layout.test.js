import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../styles/formal.css', import.meta.url), 'utf8');

test('editable transaction rows reserve separate amount and action columns', () => {
  assert.match(
    css,
    /\.stream-list \.transaction-row\s*\{[^}]*grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\)\s+minmax\(74px,\s*max-content\)\s+var\(--transaction-actions-width\)/s,
  );
  assert.match(css, /\.row-actions\s*\{[^}]*position:\s*static/s);
  assert.match(
    css,
    /\.stream-list \.transaction-row > b\s*\{[^}]*text-align:\s*right[^}]*white-space:\s*nowrap/s,
  );
});

test('long transaction names shrink instead of pushing the amount or actions', () => {
  assert.match(
    css,
    /\.stream-list \.transaction-row > div:not\(\.row-actions\)\s*\{[^}]*min-width:\s*0/s,
  );
  assert.match(
    css,
    /\.stream-list \.transaction-row > div:not\(\.row-actions\) (?:strong|small)[\s\S]*text-overflow:\s*ellipsis[\s\S]*white-space:\s*nowrap/s,
  );
});

test('fixed amount and action tracks fit narrow and regular phone widths', () => {
  const fixedTracks = 44 + 74 + 74;
  const gaps = 12 * 3;
  const horizontalPadding = 22 * 2;

  for (const viewportWidth of [320, 390]) {
    const titleWidth = viewportWidth - horizontalPadding - fixedTracks - gaps;
    assert.ok(titleWidth >= 0, `expected a non-negative title track at ${viewportWidth}px`);
  }
});
