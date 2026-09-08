module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          // Mirror tsconfig.json `paths`: `@/x` prefers `src/x`, falling back to
          // the project root (`db`, `assets`, `components/ui/gluestack-ui-provider`).
          extensions: ['.js', '.jsx', '.es', '.es6', '.mjs', '.ts', '.tsx'],

          alias: {
            '@/assets': './assets',
            '@': ['./src', './'],
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      'react-native-worklets/plugin',
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
