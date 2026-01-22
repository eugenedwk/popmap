# Storybook & Chromatic Guide

This document covers the setup, usage, and workflows for Storybook and Chromatic visual testing in the PopMap frontend.

## Overview

- **Storybook**: Component development environment for building and testing UI components in isolation
- **Chromatic**: Visual regression testing service that integrates with Storybook

## Available Scripts

Run these commands from the `frontend/` directory:

```bash
# Start Storybook development server on port 6006
npm run storybook

# Build static Storybook for deployment
npm run build-storybook

# Run Chromatic visual tests
npm run chromatic
```

## Local Development

### Starting Storybook

```bash
cd frontend
npm run storybook
```

This starts the Storybook server at http://localhost:6006. The server supports hot reloading, so changes to stories or components will automatically refresh.

### Writing Stories

Stories are co-located with their components using the naming convention `ComponentName.stories.tsx`.

Example story structure:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Click me',
  },
};
```

### Story Organization

Stories are organized by category:
- `Components/` - Reusable UI components (Button, Card, Input, etc.)
- `Features/` - Feature-specific components
- `Pages/` - Full page compositions

## Visual Testing with Chromatic

### Running Chromatic Locally

```bash
cd frontend
npm run chromatic
```

The `--exit-zero-on-changes` flag ensures the command succeeds even when visual changes are detected, which is useful for CI pipelines.

### CI Integration

Chromatic runs automatically on pull requests via GitHub Actions. The workflow:
1. Builds Storybook
2. Uploads to Chromatic
3. Compares snapshots against the baseline
4. Reports visual changes for review

### Reviewing Changes

When Chromatic detects visual changes:
1. Check the Chromatic build link in the PR
2. Review each changed component
3. Accept intentional changes to update the baseline
4. Deny unintentional changes (indicates a bug)

## API Mocking with MSW

Stories use Mock Service Worker (MSW) to mock API responses, ensuring consistent data across stories.

The MSW setup is configured in `.storybook/preview.ts` and handlers are defined in `src/mocks/`.

## Accessibility Testing

The `@storybook/addon-a11y` addon provides accessibility checks for each story. View the "Accessibility" tab in Storybook to see violations and recommendations.

## Configuration Files

- `.storybook/main.ts` - Storybook configuration (addons, framework, etc.)
- `.storybook/preview.ts` - Global decorators, parameters, and MSW setup
- `chromatic.config.json` - Chromatic project configuration (if present)

## Best Practices

1. **Write stories for all UI components** - Even simple components benefit from visual documentation
2. **Use args for props** - Makes stories interactive and generates controls automatically
3. **Include edge cases** - Empty states, loading states, error states, long text, etc.
4. **Test responsive behavior** - Use Storybook's viewport addon to test different screen sizes
5. **Document with MDX** - Add documentation pages for complex components or patterns
6. **Keep stories focused** - One story per meaningful state or variant

## Troubleshooting

### Storybook fails to start
- Ensure all dependencies are installed: `npm install`
- Clear Storybook cache: `rm -rf node_modules/.cache/storybook`

### MSW not intercepting requests
- Verify the service worker is registered in `public/mockServiceWorker.js`
- Check browser DevTools Network tab for unhandled requests

### Chromatic builds fail
- Ensure `CHROMATIC_PROJECT_TOKEN` is set in CI environment
- Check for JavaScript errors in the Storybook build
