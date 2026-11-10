import { Maptastic, Config, Layout, Point } from '../maptastic';

const el = document.createElement('div');

// constructor forms
new Maptastic('a');
new Maptastic('a', el);
new Maptastic({ autoSave: false, autoLoad: false, layers: ['a', el], onchange: () => {} });
new Maptastic({ labels: true, crosshairs: false, screenbounds: false }, 'a', el);

const config: Config = {};
const map = new Maptastic(config);

// methods
const layout: Layout[] = map.getLayout();
const points: Point[] = layout[0].targetPoints;
map.setLayout(layout);
map.addLayer('a');
map.addLayer(el, points);
map.removeLayer(el);
map.setConfigEnabled(true);

// invalid usage
// @ts-expect-error autoSave must be a boolean
new Maptastic({ autoSave: 'yes' });
// @ts-expect-error numbers are not valid targets
new Maptastic(1);
// @ts-expect-error points have exactly two coordinates
map.addLayer('a', [[0, 0, 0]]);
// @ts-expect-error a layout needs an id
map.setLayout([{ targetPoints: [], sourcePoints: [] }]);
// @ts-expect-error removeLayer takes an element, not an id
map.removeLayer('a');
