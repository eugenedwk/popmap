import type { Preview } from '@storybook/react-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from './mocks/handlers';
import { withProviders } from './decorators';

// Import global styles
import '../src/index.css';

// Initialize MSW
initialize();

const preview: Preview = {
  decorators: [withProviders],
  loaders: [mswLoader],
  parameters: {
    msw: { handlers },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
      },
    },
  },
};

export default preview;
