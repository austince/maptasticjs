const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

// Tests run against the published bundle (built by `pretest`).
const { Maptastic } = require('../dist/maptastic.js');

const GLOBALS = ['window', 'document', 'HTMLElement', 'localStorage'];

/** @type {JSDOM} */
let dom;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><body><div id="a"></div><div id="b"></div></body>', {
    url: 'https://example.test/',
  });
  // jsdom has no canvas: hand back a context that accepts any drawing call
  dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
    get: (target, prop) => (prop in target ? target[prop] : () => ({ width: 0 })),
  });
  for (const name of GLOBALS) {
    globalThis[name] = dom.window[name];
  }
});

const square = (x, y, size) => [[x, y], [x + size, y], [x + size, y + size], [x, y + size]];

function keyDown(options) {
  dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', options));
}

function mouseMove(x, y) {
  dom.window.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: x, clientY: y }));
}

test('constructor maps elements given by id', () => {
  const maptastic = new Maptastic('a', 'b');
  assert.deepEqual(maptastic.getLayout().map((layer) => layer.id).sort(), ['a', 'b']);
});

test('constructor throws for an unknown id', () => {
  assert.throws(() => new Maptastic('missing'), /No element found with id: missing/);
});

test('addLayer throws when the element is already mapped', () => {
  const maptastic = new Maptastic('a');
  assert.throws(() => maptastic.addLayer('a'), /Layer already added: a/);
});

test('removeLayer stops mapping the element', () => {
  const maptastic = new Maptastic('a', 'b');
  maptastic.removeLayer(document.getElementById('a'));
  assert.deepEqual(maptastic.getLayout().map((layer) => layer.id), ['b']);
});

test('setLayout applies the target points from getLayout', () => {
  const maptastic = new Maptastic({ autoLoad: false, autoSave: false }, 'a');
  const layout = maptastic.getLayout();
  layout[0].targetPoints = square(10, 20, 100);

  maptastic.setLayout(layout);

  assert.deepEqual(maptastic.getLayout()[0].targetPoints, square(10, 20, 100));
});

test('saved layout is restored on load', () => {
  const first = new Maptastic('a');
  first.addLayer('b', square(5, 5, 50));
  first.saveSettings();

  const second = new Maptastic('b');
  assert.deepEqual(second.getLayout()[0].targetPoints, square(5, 5, 50));
});

test('shift+space toggles configuration mode', () => {
  const maptastic = new Maptastic('a');
  keyDown({ keyCode: 32, shiftKey: true });
  assert.equal(maptastic.configActive, true);
  keyDown({ keyCode: 32, shiftKey: true });
  assert.equal(maptastic.configActive, false);
});

test('Cmd/Ctrl shortcuts are left to the page', () => {
  const maptastic = new Maptastic({ crosshairs: false }, 'a');
  keyDown({ keyCode: 32, shiftKey: true });

  keyDown({ keyCode: 67, metaKey: true }); // Cmd+C
  keyDown({ keyCode: 67, ctrlKey: true }); // Ctrl+C
  assert.equal(maptastic.showCrosshairs, false);

  keyDown({ keyCode: 67 }); // c
  assert.equal(maptastic.showCrosshairs, true);
});

test('hovering overlapping layers picks the topmost one', () => {
  const maptastic = new Maptastic({ autoLoad: false, autoSave: false });
  maptastic.addLayer('a', square(0, 0, 200));
  maptastic.addLayer('b', square(50, 50, 200));
  keyDown({ keyCode: 32, shiftKey: true });

  mouseMove(150, 120); // inside both; off the quads' diagonals, which count as outside

  assert.equal(maptastic.hoveringLayer.element.id, 'b');
});
