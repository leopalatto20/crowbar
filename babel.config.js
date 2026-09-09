module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          // Mirror tsconfig.json `paths`: `@/x` resolves only within `src/x`.
          extensions: ['.js', '.jsx', '.es', '.es6', '.mjs', '.ts', '.tsx'],

          alias: {
            '@': './src',
          },
        },
      ],
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
