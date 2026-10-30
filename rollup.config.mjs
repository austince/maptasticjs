import { readFileSync } from 'fs';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

const pkg = JSON.parse(readFileSync('./package.json').toString());

export default {
  input: 'src/maptastic.js',
  external: [],
  output: {
    file: pkg.main,
    name: pkg.name,
    sourcemap: true,
    banner: `/* ${pkg.name} ${pkg.version} */`,
    format: 'umd',
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe_comps: true,
      },
    }),
  ],
};
