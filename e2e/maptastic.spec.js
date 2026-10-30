const path = require('node:path');
const { test, expect } = require('@playwright/test');

const BUNDLE = path.join(__dirname, '..', 'dist', 'maptastic.js');

// Two 200x100 boxes; #b sits on top of #a where they overlap.
const PAGE = `<!doctype html>
<style>
  body { margin: 0; }
  #a, #b { width: 200px; height: 100px; }
  #a { background: red; }
  #b { background: blue; }
</style>
<div id="a"></div><div id="b"></div>`;

/**
 * Load the bundle into a blank page and map #a and #b with the given corner points.
 */
async function setup(page, points) {
  await page.setContent(PAGE);
  await page.addScriptTag({ path: BUNDLE });
  await page.evaluate((points) => {
    window.maptastic = new window.maptastic.Maptastic({ autoLoad: false, autoSave: false });
    window.maptastic.addLayer('a', points.a);
    window.maptastic.addLayer('b', points.b);
  }, points);
}

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** Viewport position of each corner of an element after its CSS transform. */
async function corners(page, id) {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    const { a, b, c, d, e, f, m14, m24, m41, m42, m44 } = new DOMMatrix(getComputedStyle(el).transform);
    const project = (x, y) => {
      const w = m14 * x + m24 * y + m44;
      return [(a * x + c * y + m41) / w, (b * x + d * y + m42) / w];
    };
    const { offsetWidth: width, offsetHeight: height } = el;
    return [project(0, 0), project(width, 0), project(width, height), project(0, height)];
  }, id);
}

function expectCorners(actual, expected) {
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i][0]).toBeCloseTo(expected[i][0], 0);
    expect(actual[i][1]).toBeCloseTo(expected[i][1], 0);
  }
}

test('corner-pins elements to their target points', async ({ page }) => {
  const skewed = [[100, 50], [400, 80], [380, 300], [120, 260]];
  await setup(page, { a: skewed, b: rect(500, 400, 200, 100) });

  expectCorners(await corners(page, 'a'), skewed);
  expectCorners(await corners(page, 'b'), rect(500, 400, 200, 100));
});

test('shift+space shows and hides the config canvas', async ({ page }) => {
  await setup(page, { a: rect(0, 0, 200, 100), b: rect(300, 0, 200, 100) });
  const canvas = page.locator('canvas');

  await expect(canvas).toBeHidden();
  await page.keyboard.press('Shift+Space');
  await expect(canvas).toBeVisible();
  await page.keyboard.press('Shift+Space');
  await expect(canvas).toBeHidden();
});

test('dragging a corner moves only that corner', async ({ page }) => {
  await setup(page, { a: rect(100, 100, 200, 100), b: rect(500, 400, 200, 100) });
  await page.keyboard.press('Shift+Space');

  await page.mouse.move(300, 200); // bottom-right corner of #a
  await page.mouse.down();
  await page.mouse.move(350, 260, { steps: 5 });
  await page.mouse.up();

  expectCorners(await corners(page, 'a'), [[100, 100], [300, 100], [350, 260], [100, 200]]);
});

test('dragging inside overlapping layers moves the topmost one', async ({ page }) => {
  await setup(page, { a: rect(100, 100, 200, 100), b: rect(150, 120, 200, 100) });
  await page.keyboard.press('Shift+Space');

  // inside both, away from any corner and off the quads' diagonals (which count as outside)
  await page.mouse.move(260, 160);
  await page.mouse.down();
  await page.mouse.move(260, 260, { steps: 5 });
  await page.mouse.up();

  expectCorners(await corners(page, 'a'), rect(100, 100, 200, 100));
  expectCorners(await corners(page, 'b'), rect(150, 220, 200, 100));
});

test('arrow keys nudge the selected layer', async ({ page }) => {
  await setup(page, { a: rect(100, 100, 200, 100), b: rect(500, 400, 200, 100) });
  await page.keyboard.press('Shift+Space');

  await page.mouse.move(180, 160); // select #a
  await page.mouse.down();
  await page.mouse.up();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');

  expectCorners(await corners(page, 'a'), rect(101, 110, 200, 100));
});
