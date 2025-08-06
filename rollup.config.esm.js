import typescript from 'rollup-plugin-typescript2';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import ts from 'typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/esm/index.js',
    format: 'esm',
    sourcemap: true,
    exports: 'named'
  },
  external: (id) => {
    // Force externalize all React modules and other dependencies
    const externals = [
      'react', 'react-dom', 'react/', 'react-dom/', 
      'antd', '@ant-design', 'hls.js', 'clsx', 'tailwind-merge'
    ];
    return externals.some(external => id === external || id.startsWith(external));
  },
  plugins: [
    peerDepsExternal({
      includeDependencies: true
    }),
    postcss({
      extract: 'styles/index.css',
      minimize: true,
      sourceMap: true
    }),
    typescript({
      tsconfig: './tsconfig.json',
      clean: true,
      typescript: ts
    })
  ]
};
