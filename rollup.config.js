import { readFileSync } from 'fs';
import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';
import commonjs from 'rollup-plugin-commonjs';

const pkg = JSON.parse(readFileSync('./package.json').toString());

export default {
  input: 'src/maptastic.js',
  external: [],
  output: {
    name: pkg.name,
    sourcemap: true,
    banner: `/* ${pkg.name} ${(new Date().toISOString())} */`,
    format: 'umd'
    ,
  },
  plugins: [
    commonjs(),
    babel({
      exclude: 'node_modules/**',
    }),
    uglify({
      compress: {
        pure_getters: true,
        unsafe_comps: true,
      }
    }),
  ],
};
