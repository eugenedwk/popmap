import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@chromatic-com/storybook',
    'msw-storybook-addon',
  ],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
  docs: {
    autodocs: true,
  },
  viteFinal: async (config) => {
    // Remove PWA plugin for Storybook builds (causes file size issues with large Storybook bundles)
    config.plugins = config.plugins?.filter((plugin) => {
      // Handle both single plugins and plugin arrays
      if (Array.isArray(plugin)) {
        return !plugin.some(
          (p) => p && typeof p === 'object' && 'name' in p && p.name?.includes('vite-plugin-pwa')
        );
      }
      return !(
        plugin &&
        typeof plugin === 'object' &&
        'name' in plugin &&
        (plugin.name === 'vite-plugin-pwa' || plugin.name?.includes('pwa'))
      );
    });
    return config;
  },
};

export default config;
