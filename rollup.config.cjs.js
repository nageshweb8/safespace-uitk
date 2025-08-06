import typescript from 'rollup-plugin-typescript2';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/cjs/index.js',
    format: 'cjs',
    sourcemap: true,
    exports: 'named'
  },
  external: (id) => {
    // Exclude all React-related modules
    return id === 'react' || 
           id === 'react-dom' || 
           id.startsWith('react/') || 
           id.startsWith('react-dom/') ||
           id === 'antd' ||
           id.startsWith('@ant-design/') ||
           id === 'hls.js' ||
           id === 'clsx' ||
           id === 'tailwind-merge';
  },
  plugins: [
    peerDepsExternal(),
    postcss({
      extract: false, // Don't extract CSS for CJS build
      inject: true
    }),
    typescript({
      tsconfig: './tsconfig.json',
      rollupCommonJSResolveHack: true,
      clean: true
    })
  ]
};
