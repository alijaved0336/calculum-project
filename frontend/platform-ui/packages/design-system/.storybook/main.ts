import type { StorybookConfig } from '@storybook/vue3-vite';
import vue from '@vitejs/plugin-vue';
import { mergeConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  staticDirs: ['../public'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [vue()],
      resolve: {
        alias: {
          '@ada/design-system': path.resolve(dirname, '../src'),
          '@ds-storybook/argTypes': path.resolve(dirname, 'argTypes.ts'),
          '~inter-ui': path.resolve(dirname, '../node_modules/inter-ui'),
        },
      },
    }),
};

export default config;
