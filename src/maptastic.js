import solve from './solve';

/**
 * @typedef {Object} Config
 * @property {boolean} labels
 * @property {boolean} crosshairs
 * @property {boolean} screenbounds
 * @property {boolean} autoSave
 * @property {Layout[]} layers
 * @property {function(): void} onchange
 */

/**
 * @typedef {(string|HTMLElement)} Target
 */

/**
 * @typedef {[number, number]} Point
 */

/**
 * @typedef {Object} Layout
 * @property {string} id - ID of the layer element
 * @property {Point[]} targetPoints
 * @property {Point[]} sourcePoints
 */

/**
 * @typedef {Object} Layer
 * @property {Point[]} targetPoints
 * @property {Point[]} sourcePoints
 * @property {boolean} visible
 * @property {HTMLElement} element
 * @property {number} width
 * @property {number} height 
 */

const has = Object.prototype.hasOwnProperty;

/**
 * Get an object's property or a default if not defined.
 *
 * @template T
 * @param {*} obj 
 * @param {string} key 
 * @param {T} defaultVal 
 * @returns {T | *} either the default value or the object's property
 */
function getProp(obj, key, defaultVal) {
  if (obj && has.call(obj, key) && (obj[key] !== null)) {
    return obj[key];
  } else {
    return defaultVal;
  }
}


/**
 * Compute linear distance.
 *
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
function distanceTo(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Determine whether a {@link Point} falls within a triangle.
 * 
 * @param {Point} point 
 * @param {Point} a 
 * @param {Point} b 
 * @param {Point} c
 * @returns {boolean} 
 */
function pointInTriangle(point, a, b, c) {
  let s = a[1] * c[0] - a[0] * c[1] + (c[1] - a[1]) * point[0] + (a[0] - c[0]) * point[1];
  let t = a[0] * b[1] - a[1] * b[0] + (a[1] - b[1]) * point[0] + (b[0] - a[0]) * point[1];

  if ((s < 0) != (t < 0)) {
    return false;
  }

  let A = -b[1] * c[0] + a[1] * (c[0] - b[0]) + a[0] * (b[1] - c[1]) + b[0] * c[1];
  if (A < 0.0) {
    s = -s;
    t = -t;
    A = -A;
  }

  return s > 0 && t > 0 && (s + t) < A;
}

/**
 * Swap two points in a given list of points. Mutates `layerPoints`.
 *
 * @param {Point[]} layerPoints 
 * @param {number} index1 
 * @param {number} index2 
 */
function swapLayerPoints(layerPoints, index1, index2) {
  const tx = layerPoints[index1][0];
  const ty = layerPoints[index1][1];
  layerPoints[index1][0] = layerPoints[index2][0];
  layerPoints[index1][1] = layerPoints[index2][1];
  layerPoints[index2][0] = tx;
  layerPoints[index2][1] = ty;
}

/**
 * Determine if a point is inside a layer quad.
 * 
 * @param {Point} point 
 * @param {Layer} layer 
 */
function pointInLayer(point, layer) {
  const a = pointInTriangle(point, layer.targetPoints[0], layer.targetPoints[1], layer.targetPoints[2]);
  const b = pointInTriangle(point, layer.targetPoints[3], layer.targetPoints[0], layer.targetPoints[2]);
  return a || b;
}

/**
 * Rotate a {@link Layout}. Mutates `layer`.
 *
 * @param {Layer} layer 
 * @param {number} angle 
 */
function rotateLayer(layer, angle) {
  const s = Math.sin(angle);
  const c = Math.cos(angle);

  const centerPoint = [0, 0];
  for (let p = 0; p < layer.targetPoints.length; p++) {
    centerPoint[0] += layer.targetPoints[p][0];
    centerPoint[1] += layer.targetPoints[p][1];
  }

  centerPoint[0] /= 4;
  centerPoint[1] /= 4;

  for (let p = 0; p < layer.targetPoints.length; p++) {
    const px = layer.targetPoints[p][0] - centerPoint[0];
    const py = layer.targetPoints[p][1] - centerPoint[1];

    layer.targetPoints[p][0] = (px * c) - (py * s) + centerPoint[0];
    layer.targetPoints[p][1] = (px * s) + (py * c) + centerPoint[1];
  }
}

/**
 * Scale a {@link Layer}. Mutates `layer`.
 * 
 * @param {Layer} layer 
 * @param {number} scale 
 */
function scaleLayer(layer, scale) {
  const centerPoint = [0, 0];
  for (let p = 0; p < layer.targetPoints.length; p++) {
    centerPoint[0] += layer.targetPoints[p][0];
    centerPoint[1] += layer.targetPoints[p][1];
  }

  centerPoint[0] /= 4;
  centerPoint[1] /= 4;

  for (let p = 0; p < layer.targetPoints.length; p++) {
    let px = layer.targetPoints[p][0] - centerPoint[0];
    let py = layer.targetPoints[p][1] - centerPoint[1];

    layer.targetPoints[p][0] = (px * scale) + centerPoint[0];
    layer.targetPoints[p][1] = (py * scale) + centerPoint[1];
  }
}

/**
 * Clone a list of points.
 * 
 * @param {Point[]} points 
 * @returns {Point[]} a new list.
 */
function clonePoints(points) {
  const clone = [];
  for (let p = 0; p < points.length; p++) {
    clone.push(points[p].slice(0, 2));
  }
  return clone;
}

class Maptastic {
  /**
   * @param {Config|Target} configOrTarget
   * @param {...Target} [targets]
   */
  constructor(configOrTarget, ...targets) {
    /** @type {HTMLCanvasElement} */
    this.canvas = null;
    /** @type {CanvasRenderingContext2D} */
    this.context = null;

    /** @type {Layer[]} */
    this.layers = [];

    this.configActive = false;

    this.dragging = false;
    /** @type {Point} */
    this.dragOffset = [0, 0];

    this.selectedLayer = null;
    this.selectedPoint = null;
    this.selectionRadius = 20;
    this.hoveringPoint = null;
    this.hoveringLayer = null;
    this.dragOperation = 'move';
    this.isLayerSoloed = false;

    /** @type {Point} */
    this.mousePosition = [0, 0];
    /** @type {Point} */
    this.mouseDelta = [0, 0];
    /** @type {Point} */
    this.mouseDownPoint = [];

    this.showLayerNames = getProp(configOrTarget, 'labels', true);
    this.showCrosshairs = getProp(configOrTarget, 'crosshairs', false);
    this.showScreenBounds = getProp(configOrTarget, 'screenbounds', false);
    this.autoSave = getProp(configOrTarget, 'autoSave', true);
    this.layoutChangeListener = getProp(configOrTarget, 'onchange', () => { });
    this.localStorageKey = 'maptastic.layers';

    const layerList = getProp(configOrTarget, 'layers', []);
    // if the config was just an element or string, interpret it as a layer to add.
    const potentialLayerTargets = layerList.concat(targets, [configOrTarget]);

    for (var i = 0; i < potentialLayerTargets.length; i++) {
      if ((potentialLayerTargets[i] instanceof HTMLElement) || (typeof (potentialLayerTargets[i]) === 'string')) {
        this.addLayer(potentialLayerTargets[i]);
      }
    }

    const autoLoad = getProp(configOrTarget, 'autoLoad', true);
    if (autoLoad) {
      this.loadSettings();
    }

    this.init();
  }

  /**
   * Set up event listeners, canvas, and context.
   * 
   * @private
   */
  init() {
    const canvas = document.createElement('canvas');

    canvas.style.display = 'none';
    canvas.style.position = 'fixed';
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    canvas.style.zIndex = '1000000';
    this.canvas = canvas;

    this.context = canvas.getContext('2d');

    document.body.appendChild(canvas);

    window.addEventListener('resize', (event) => this.resize());

    // UI events
    window.addEventListener('mousemove', (event) => this.mouseMove(event));
    window.addEventListener('mouseup', (event) => this.mouseUp(event));
    window.addEventListener('mousedown', (event) => this.mouseDown(event));
    window.addEventListener('keydown', (event) => this.keyDown(event));

    this.resize();
  }

  /**
   * @private
   */
  notifyChangeListener() {
    this.layoutChangeListener();
  }

  /**
   * @private
   */
  resize() {
    const { innerWidth, innerHeight } = window;
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;

    this.draw();
  }

  /**
   * @private
   */
  draw() {
    if (!this.configActive) {
      return;
    }

    this.context.strokeStyle = 'red';
    this.context.lineWidth = 2;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.layers.length; i++) {

      if (this.layers[i].visible) {
        this.layers[i].element.style.visibility = 'visible';

        // Draw layer rectangles.
        this.context.beginPath();
        if (this.layers[i] === this.hoveringLayer) {
          this.context.strokeStyle = 'red';
        } else if (this.layers[i] === this.selectedLayer) {
          this.context.strokeStyle = 'red';
        } else {
          this.context.strokeStyle = 'white';
        }
        this.context.moveTo(this.layers[i].targetPoints[0][0], this.layers[i].targetPoints[0][1]);
        for (let p = 0; p < this.layers[i].targetPoints.length; p++) {
          this.context.lineTo(this.layers[i].targetPoints[p][0], this.layers[i].targetPoints[p][1]);
        }
        this.context.lineTo(this.layers[i].targetPoints[3][0], this.layers[i].targetPoints[3][1]);
        this.context.closePath();
        this.context.stroke();

        // Draw corner points.
        const centerPoint = [0, 0];
        for (let p = 0; p < this.layers[i].targetPoints.length; p++) {

          if (this.layers[i].targetPoints[p] === this.hoveringPoint) {
            this.context.strokeStyle = 'red';
          } else if (this.layers[i].targetPoints[p] === this.selectedPoint) {
            this.context.strokeStyle = 'red';
          } else {
            this.context.strokeStyle = 'white';
          }

          centerPoint[0] += this.layers[i].targetPoints[p][0];
          centerPoint[1] += this.layers[i].targetPoints[p][1];

          this.context.beginPath();
          this.context.arc(
            this.layers[i].targetPoints[p][0],
            this.layers[i].targetPoints[p][1],
            this.selectionRadius / 2,
            0,
            2 * Math.PI,
            false
          );
          this.context.stroke();
        }

        // Find the average of the corner locations for an approximate center.
        centerPoint[0] /= 4;
        centerPoint[1] /= 4;

        if (this.showLayerNames) {
          // Draw the element ID in the center of the quad for reference.
          const label = this.layers[i].element.id.toUpperCase();
          this.context.font = '16px sans-serif';
          this.context.textAlign = 'center';
          const metrics = this.context.measureText(label);
          const size = [metrics.width + 8, 16 + 16];
          this.context.fillStyle = 'white';
          this.context.fillRect(centerPoint[0] - size[0] / 2, centerPoint[1] - size[1] + 8, size[0], size[1]);
          this.context.fillStyle = 'black';
          this.context.fillText(label, centerPoint[0], centerPoint[1]);
        }
      } else {
        this.layers[i].element.style.visibility = 'hidden';
      }
    }

    // Draw mouse crosshairs
    if (this.showCrosshairs) {
      this.context.strokeStyle = 'yellow';
      this.context.lineWidth = 1;

      this.context.beginPath();

      this.context.moveTo(this.mousePosition[0], 0);
      this.context.lineTo(this.mousePosition[0], this.canvas.height);

      this.context.moveTo(0, this.mousePosition[1]);
      this.context.lineTo(this.canvas.width, this.mousePosition[1]);

      this.context.stroke();
    }

    if (this.showScreenBounds) {

      this.context.fillStyle = 'black';
      this.context.lineWidth = 4;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.context.strokeStyle = '#909090';
      this.context.beginPath();
      const stepX = this.canvas.width / 10;
      const stepY = this.canvas.height / 10;

      for (let i = 0; i < 10; i++) {
        this.context.moveTo(i * stepX, 0);
        this.context.lineTo(i * stepX, this.canvas.height);

        this.context.moveTo(0, i * stepY);
        this.context.lineTo(this.canvas.width, i * stepY);
      }
      this.context.stroke();

      this.context.strokeStyle = 'white';
      this.context.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);

      const fontSize = Math.round(stepY * 0.6);
      this.context.font = fontSize + 'px mono,sans-serif';
      this.context.fillRect(stepX * 2 + 2, stepY * 3 + 2, this.canvas.width - stepX * 4 - 4, this.canvas.height - stepY * 6 - 4);
      this.context.fillStyle = 'white';
      this.context.fontSize = 20;
      this.context.fillText(this.canvas.width + ' x ' + this.canvas.height, this.canvas.width / 2, this.canvas.height / 2 + (fontSize * 0.75));
      this.context.fillText('display size', this.canvas.width / 2, this.canvas.height / 2 - (fontSize * 0.75));
    }
  }

  updateTransform() {
    // TODO: no reduce
    const transform = ['', '-webkit-', '-moz-', '-ms-', '-o-'].reduce((p, v) => {
      return v + 'transform' in document.body.style ? v : p;
    }) + 'transform';
    for (let l = 0; l < this.layers.length; l++) {

      let a = [];
      let b = [];
      for (let i = 0, n = this.layers[l].sourcePoints.length; i < n; ++i) {
        const s = this.layers[l].sourcePoints[i], t = this.layers[l].targetPoints[i];
        a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]), b.push(t[0]);
        a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]), b.push(t[1]);
      }

      // TODO: remove dependency on numeric
      const X = solve(a, b, true);
      const matrix = [
        X[0], X[3], 0, X[6],
        X[1], X[4], 0, X[7],
        0, 0, 1, 0,
        X[2], X[5], 0, 1
      ];

      this.layers[l].element.style[transform] = 'matrix3d(' + matrix.join(',') + ')';
      this.layers[l].element.style[transform + '-origin'] = '0px 0px 0px';
    }
  }

  /**
   * @private
   * @param {KeyboardEvent} event 
   */
  keyDown(event) {
    if (!this.configActive) {
      if (event.keyCode == 32 && event.shiftKey) {
        this.setConfigEnabled(true);
        return;
      } else {
        return;
      }
    }

    const key = event.keyCode;

    const increment = event.shiftKey ? 10 : 1;
    let dirty = false;
    const delta = [0, 0];

    switch (key) {

      case 32: // spacebar
        if (event.shiftKey) {
          this.setConfigEnabled(false);
          return;
        }
        break;

      case 37: // left arrow
        delta[0] -= increment;
        break;

      case 38: // up arrow
        delta[1] -= increment;
        break;

      case 39: // right arrow
        delta[0] += increment;
        break;

      case 40: // down arrow
        delta[1] += increment;
        break;

      case 67: // c key, toggle crosshairs
        this.showCrosshairs = !this.showCrosshairs;
        dirty = true;
        break;

      case 83: // s key, solo/unsolo quads
        if (!this.isLayerSoloed) {

          if (this.selectedLayer != null) {
            for (let i = 0; i < this.layers.length; i++) {
              this.layers[i].visible = false;
            }
            this.selectedLayer.visible = true;
            dirty = true;
            this.isLayerSoloed = true;
          }
        } else {
          for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].visible = true;
          }
          this.isLayerSoloed = false;
          dirty = true;

        }
        break;

      case 66: // b key, toggle projector bounds rectangle.
        this.showScreenBounds = !this.showScreenBounds;
        this.draw();
        break;

      case 72: // h key, flip horizontal.
        if (this.selectedLayer) {
          swapLayerPoints(this.selectedLayer.sourcePoints, 0, 1);
          swapLayerPoints(this.selectedLayer.sourcePoints, 3, 2);
          this.updateTransform();
          this.draw();
        }
        break;

      case 86: // v key, flip vertical.
        if (this.selectedLayer) {
          swapLayerPoints(this.selectedLayer.sourcePoints, 0, 3);
          swapLayerPoints(this.selectedLayer.sourcePoints, 1, 2);
          this.updateTransform();
          this.draw();
        }
        break;

      case 82: // r key, rotate 90 degrees.
        if (this.selectedLayer) {
          rotateLayer(this.selectedLayer, Math.PI / 2);
          //rotateLayer(selectedLayer, 0.002);
          this.updateTransform();
          this.draw();
        }
        break;
    }

    // if a layer or point is selected, add the delta amounts (set above via arrow keys)
    if (!this.showScreenBounds) {
      if (this.selectedPoint) {
        this.selectedPoint[0] += delta[0];
        this.selectedPoint[1] += delta[1];
        dirty = true;
      } else if (this.selectedLayer) {
        if (event.altKey == true) {
          rotateLayer(this.selectedLayer, delta[0] * 0.01);
          scaleLayer(this.selectedLayer, (delta[1] * -0.005) + 1.0);
        } else {
          for (let i = 0; i < this.selectedLayer.targetPoints.length; i++) {
            this.selectedLayer.targetPoints[i][0] += delta[0];
            this.selectedLayer.targetPoints[i][1] += delta[1];
          }
        }
        dirty = true;
      }
    }

    // update the transform and redraw if needed
    if (dirty) {
      this.updateTransform();
      this.draw();
      if (this.autoSave) {
        this.saveSettings();
      }
      this.notifyChangeListener();
    }
  }

  /**
   * @private
   * @param {MouseEvent} event
   */
  mouseMove(event) {
    if (!this.configActive) {
      return;
    }

    event.preventDefault();

    this.mouseDelta[0] = event.clientX - this.mousePosition[0];
    this.mouseDelta[1] = event.clientY - this.mousePosition[1];

    this.mousePosition[0] = event.clientX;
    this.mousePosition[1] = event.clientY;

    if (this.dragging) {

      const scale = event.shiftKey ? 0.1 : 1;

      if (this.selectedPoint) {
        this.selectedPoint[0] += this.mouseDelta[0] * scale;
        this.selectedPoint[1] += this.mouseDelta[1] * scale;
      } else if (this.selectedLayer) {

        // Alt-drag to rotate and scale
        if (event.altKey == true) {
          rotateLayer(this.selectedLayer, this.mouseDelta[0] * (0.01 * scale));
          scaleLayer(this.selectedLayer, (this.mouseDelta[1] * (-0.005 * scale)) + 1.0);
        } else {
          for (let i = 0; i < this.selectedLayer.targetPoints.length; i++) {
            this.selectedLayer.targetPoints[i][0] += this.mouseDelta[0] * scale;
            this.selectedLayer.targetPoints[i][1] += this.mouseDelta[1] * scale;
          }
        }
      }

      this.updateTransform();
      if (this.autoSave) {
        this.saveSettings();
      }
      this.draw();
      this.notifyChangeListener();
    } else {
      let dirty = false;

      this.canvas.style.cursor = 'default';
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const previousState = (this.hoveringPoint != null);
      const previousLayer = (this.hoveringLayer != null);

      this.hoveringPoint = null;

      for (let i = 0; i < this.layers.length; i++) {
        let layer = this.layers[i];
        if (layer.visible) {
          for (let p = 0; p < layer.targetPoints.length; p++) {
            let point = layer.targetPoints[p];
            if (distanceTo(point[0], point[1], mouseX, mouseY) < this.selectionRadius) {
              this.canvas.style.cursor = 'pointer';
              this.hoveringPoint = point;
              break;
            }
          }
        }
      }

      this.hoveringLayer = null;
      for (let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].visible && pointInLayer(this.mousePosition, this.layers[i])) {
          this.hoveringLayer = this.layers[i];
          break;
        }
      }

      if (this.showCrosshairs ||
        (previousState != (this.hoveringPoint != null)) ||
        (previousLayer != (this.hoveringLayer != null))
      ) {
        this.draw();
      }
    }
  }

  /**
   * @private
   * @param {MouseEvent} event 
   */
  mouseUp(event) {
    if (!this.configActive) {
      return;
    }
    event.preventDefault();

    this.dragging = false;
  }

  /**
   * @private
   * @param {MouseEvent} event 
   */
  mouseDown(event) {
    if (!this.configActive || this.showScreenBounds) {
      return;
    }
    event.preventDefault();

    this.hoveringPoint = null;

    if (this.hoveringLayer) {
      this.selectedLayer = this.hoveringLayer;
      this.dragging = true;
    } else {
      this.selectedLayer = null;
    }

    this.selectedPoint = null;

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    this.mouseDownPoint[0] = mouseX;
    this.mouseDownPoint[1] = mouseY;

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      for (let p = 0; p < layer.targetPoints.length; p++) {
        const point = layer.targetPoints[p];
        if (distanceTo(point[0], point[1], mouseX, mouseY) < this.selectionRadius) {
          this.selectedLayer = layer;
          this.selectedPoint = point;
          this.dragging = true;
          this.dragOffset[0] = event.clientX - point[0];
          this.dragOffset[1] = event.clientY - point[1];
          //this.draw();
          break;
        }
      }
    }
    this.draw();
    return false;
  }

  /**
   * Add a {@link Layer} to an HTMLElement, either by id or by reference.
   *
   * @private
   * @param {string|HTMLElement} target 
   * @param {Point[]} [targetPoints] initial points for the layer
   */
  addLayer(target, targetPoints) {
    /** @type {HTMLElement} */
    let element;
    if (typeof (target) == 'string') {
      element = document.getElementById(target);
      if (!element) {
        throw new Error('Maptastic: No element found with id: ' + target);
      }
    } else if (target instanceof HTMLElement) {
      element = target;
    }

    let exists = false;
    for (var n = 0; n < this.layers.length; n++) {
      if (this.layers[n].element.id == element.id) {
        this.layers[n].targetPoints = clonePoints(layout[i].targetPoints);
        exists = true;
      }
    }

    const offsetX = element.offsetLeft;
    const offsetY = element.offsetTop;

    element.style.position = 'fixed';
    element.style.display = 'block';
    element.style.top = '0px';
    element.style.left = '0px';
    element.style.padding = '0px';
    element.style.margin = '0px';

    const layer = {
      'visible': true,
      'element': element,
      'width': element.clientWidth,
      'height': element.clientHeight,
      'sourcePoints': [],
      'targetPoints': []
    };
    layer.sourcePoints.push([0, 0], [layer.width, 0], [layer.width, layer.height], [0, layer.height]);

    if (targetPoints) {
      layer.targetPoints = clonePoints(targetPoints);
    } else {
      layer.targetPoints.push([0, 0], [layer.width, 0], [layer.width, layer.height], [0, layer.height]);
      for (var i = 0; i < layer.targetPoints.length; i++) {
        layer.targetPoints[i][0] += offsetX;
        layer.targetPoints[i][1] += offsetY;
      }
    }

    this.layers.push(layer);

    this.updateTransform();
  }

  // Settings
  /**
   * Save current layout settings to local storage.
   * 
   * @private
   */
  saveSettings() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.getLayout()));
  }

  /**
   * Load layout settings from local storage.
   * 
   * @private
   */
  loadSettings() {
    if (!localStorage.getItem(this.localStorageKey)) {
      return;
    }
    const data = JSON.parse(localStorage.getItem(this.localStorageKey));

    for (let i = 0; i < data.length; i++) {
      for (let n = 0; n < this.layers.length; n++) {
        if (this.layers[n].element.id == data[i].id) {
          this.layers[n].targetPoints = clonePoints(data[i].targetPoints);
          this.layers[n].sourcePoints = clonePoints(data[i].sourcePoints);
        }
      }
    }
    this.updateTransform();
  }

  /**
   * @private
   * @param {boolean} enabled
   */
  setConfigEnabled(enabled) {
    this.configActive = enabled;
    this.canvas.style.display = enabled ? 'block' : 'none';

    if (!enabled) {
      this.selectedPoint = null;
      this.selectedLayer = null;
      this.dragging = false;
      this.showScreenBounds = false;
    } else {
      this.draw();
    }
  }

  /**
   * @public
   * @returns {Layout}
   */
  getLayout() {
    const layout = []; // TODO: change to a map()
    for (let i = 0; i < this.layers.length; i++) {
      layout.push({
        'id': this.layers[i].element.id,
        'targetPoints': clonePoints(this.layers[i].targetPoints),
        'sourcePoints': clonePoints(this.layers[i].sourcePoints)
      });
    }
    return layout;
  }

  /**
   * @public
   * @param {*} layout 
   */
  setLayout(layout) {
    for (let i = 0; i < layout.length; i++) {
      let exists = false;
      for (let n = 0; n < this.layers.length; n++) {
        if (this.layers[n].element.id == layout[i].id) {
          console.log('Setting points.');
          this.layers[n].targetPoints = clonePoints(layout[i].targetPoints);
          this.layers[n].sourcePoints = clonePoints(layout[i].sourcePoints);
          exists = true;
        }
      }

      if (!exists) {
        const element = document.getElementById(layout[i].id);
        if (element) {
          this.addLayer(element, layout[i].targetPoints);
        } else {
          console.log('Maptastic: Can\'t find element: ' + layout[i].id);
        }
      } else {
        console.log('Maptastic: Element \'' + layout[i].id + '\' is already mapped.');
      }
    }
    this.updateTransform();
    this.draw();
  }
}

export { Maptastic };
