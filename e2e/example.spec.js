const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

// The demo that is published to GitHub Pages. It loads ../dist/maptastic.js, so run a build first
// (`npm run test:browser` does).
const EXAMPLE = pathToFileURL(path.join(__dirname, '..', 'example', 'index.html')).href;

const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.beforeEach(async ({ page }) => {
  await page.goto(EXAMPLE);
});

test('demo: the instruction box and the mapped content do not overlap', async ({ page }) => {
  const controls = await page.locator('#controls').boundingBox();
  const content = await page.locator('#canvas-test').boundingBox();

  expect(controls).not.toBeNull();
  expect(content).not.toBeNull();
  expect(overlaps(controls, content)).toBe(false);
});

test('demo: dragging the instruction box moves it and leaves the content in place', async ({ page }) => {
  await page.keyboard.press('Shift+Space');

  const controlsBefore = await page.locator('#controls').boundingBox();
  const contentBefore = await page.locator('#canvas-test').boundingBox();

  // Grab the box near its left edge, away from the corner points and the diagonals' crossing.
  const start = { x: controlsBefore.x + 100, y: controlsBefore.y + controlsBefore.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y, { steps: 5 });
  await page.mouse.up();

  const controlsAfter = await page.locator('#controls').boundingBox();
  const contentAfter = await page.locator('#canvas-test').boundingBox();

  expect(controlsAfter.x).toBeCloseTo(controlsBefore.x + 60, 0);
  expect(controlsAfter.y).toBeCloseTo(controlsBefore.y, 0);
  expect(contentAfter).toEqual(contentBefore);
});

test('demo: dragging the mapped content moves it and leaves the instruction box in place', async ({ page }) => {
  await page.keyboard.press('Shift+Space');

  const controlsBefore = await page.locator('#controls').boundingBox();
  const contentBefore = await page.locator('#canvas-test').boundingBox();

  const start = { x: contentBefore.x + 100, y: contentBefore.y + contentBefore.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y, { steps: 5 });
  await page.mouse.up();

  const controlsAfter = await page.locator('#controls').boundingBox();
  const contentAfter = await page.locator('#canvas-test').boundingBox();

  expect(contentAfter.x).toBeCloseTo(contentBefore.x + 60, 0);
  expect(contentAfter.y).toBeCloseTo(contentBefore.y, 0);
  expect(controlsAfter).toEqual(controlsBefore);
});
