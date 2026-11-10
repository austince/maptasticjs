/** An `[x, y]` coordinate in pixels. */
export type Point = [number, number];

/** An element, or the ID of an element, to map. */
export type Target = string | HTMLElement;

/** The mapping of a single layer, as returned by `getLayout` and accepted by `setLayout`. */
export interface Layout {
  /** ID of the layer element. */
  id: string;
  /** Four corner points of the layer on screen. */
  targetPoints: Point[];
  /** Four corner points of the layer's original, unmapped rectangle. */
  sourcePoints: Point[];
}

export interface Config {
  /** Elements or element IDs to use as layers. */
  layers?: Target[];
  /** Called whenever the layout changes. */
  onchange?: () => void;
  /** Show crosshairs in edit mode. Default `false`. */
  crosshairs?: boolean;
  /** Show element IDs in edit mode. Default `true`. */
  labels?: boolean;
  /** Show the display bounds in edit mode. Default `false`. */
  screenbounds?: boolean;
  /** Save layer positions to local storage on change. Default `true`. */
  autoSave?: boolean;
  /** Load layer positions from local storage on creation. Default `true`. */
  autoLoad?: boolean;
}

export class Maptastic {
  constructor(config: Config, ...targets: Target[]);
  constructor(...targets: Target[]);

  /** Returns the current mapping of every layer. */
  getLayout(): Layout[];

  /** Applies a layout, adding layers for any IDs that are not mapped yet. */
  setLayout(layout: Layout[]): void;

  /** Maps a new element, optionally starting from the given corner points. */
  addLayer(target: Target, targetPoints?: Point[]): void;

  /** Stops mapping an element. The element is left in the page. */
  removeLayer(element: HTMLElement): void;

  /** Turns edit mode on or off. */
  setConfigEnabled(enabled: boolean): void;
}

export as namespace maptastic;
