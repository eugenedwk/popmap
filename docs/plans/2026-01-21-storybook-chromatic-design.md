# Storybook + Chromatic Implementation Design

**Date:** 2026-01-21
**Status:** Approved
**Goal:** Component documentation, visual regression testing, and isolated development workflow

---

## Overview

Implement Storybook with Chromatic for PopMap's frontend to enable:
- Living style guide for UI components
- Visual regression testing in CI/CD
- Isolated component development environment

## Scope

### Components to Cover

**UI Primitives (15 components):**
- button, input, badge, card, dialog, select, checkbox, switch, tabs, alert
- label, separator, slider, textarea, radio-group, scroll-area

**Key Feature Components (4 components):**
- EventCard
- ShareButtons
- CustomMapPin
- MobileNavigation

**Excluded (complex mocking requirements):**
- MapView, EventMap, BusinessEventsMap (MapLibre GL canvas)
- Login, Signup, AuthCallback (Cognito auth flows)
- BillingPage, SubscriptionPlans (Stripe integration)

**Estimated:** 50-60 stories total

---

## Project Structure

```
frontend/
├── .storybook/
│   ├── main.ts           # Storybook config (Vite, addons)
│   ├── preview.ts        # Global decorators, viewports, themes
│   ├── decorators.tsx    # React context providers
│   └── mocks/
│       ├── browser.ts    # MSW browser setup
│       └── handlers.ts   # API mock handlers
├── src/
│   └── components/
│       ├── ui/
│       │   ├── button.tsx
│       │   └── button.stories.tsx  # Co-located stories
│       ├── EventCard.tsx
│       └── EventCard.stories.tsx
└── package.json
```

**Decision:** Co-located stories (`*.stories.tsx` next to components) for easier maintenance.

---

## Dependencies

```bash
# Storybook core + Vite builder
@storybook/react
@storybook/react-vite
storybook

# Essential addons
@storybook/addon-essentials  # Docs, controls, actions, viewport
@storybook/addon-a11y        # Accessibility checks
@storybook/addon-interactions # Test interactions
@storybook/test              # Testing utilities

# MSW for API mocking
msw
msw-storybook-addon

# Chromatic
chromatic
```

---

## Configuration

### `.storybook/main.ts`

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    'msw-storybook-addon',
  ],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
  docs: { autodocs: true },
};

export default config;
```

### `.storybook/preview.ts`

```typescript
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from './mocks/handlers';
import { withProviders } from './decorators';
import '../src/index.css';

initialize();

export default {
  decorators: [withProviders],
  loaders: [mswLoader],
  parameters: {
    msw: { handlers },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
  },
};
```

### `.storybook/decorators.tsx`

```typescript
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

export const withProviders = (Story) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Story />
    </BrowserRouter>
  </QueryClientProvider>
);
```

---

## MSW Mocking Strategy

### `.storybook/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

const API_URL = 'https://api.popmap.co/api';

export const handlers = [
  // Events
  http.get(`${API_URL}/events/`, () => {
    return HttpResponse.json([
      { id: 1, name: 'Pop-up Market', date: '2026-02-01' },
      { id: 2, name: 'Food Festival', date: '2026-02-15' },
    ]);
  }),

  // Businesses
  http.get(`${API_URL}/businesses/:id/`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Sample Business',
      verified: true,
    });
  }),

  // RSVPs
  http.post(`${API_URL}/events/:id/rsvp/`, () => {
    return HttpResponse.json({ status: 'going' });
  }),
];
```

**Per-story override example:**

```typescript
export const LoadingError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/events/*', () => HttpResponse.error()),
      ],
    },
  },
};
```

---

## GitHub Actions Workflow

### `.github/workflows/chromatic.yml`

```yaml
name: Chromatic

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          workingDir: frontend
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true
          autoAcceptChanges: main
          exitOnceUploaded: true
```

**Key settings:**
- `onlyChanged: true` - TurboSnap, only snapshot changed components
- `autoAcceptChanges: main` - Auto-accept on main branch
- `exitOnceUploaded: true` - CI finishes faster

---

## Stories to Create

### UI Primitives

| Component | Stories |
|-----------|---------|
| button | Default, Secondary, Destructive, Outline, Ghost, Loading, Disabled |
| input | Default, With Label, Error State, Disabled |
| badge | Default, Secondary, Destructive, Outline |
| card | Default, With Header, With Footer |
| dialog | Open, With Form |
| select | Default, With Placeholder, Disabled |
| checkbox | Unchecked, Checked, Indeterminate, Disabled |
| switch | Off, On, Disabled |
| tabs | Default, With Content |
| alert | Default, Destructive |
| Others | 1-2 stories each |

### Feature Components

| Component | Stories |
|-----------|---------|
| EventCard | Default, With Image, No Image, Past Event, With CTA |
| ShareButtons | Default, Expanded |
| CustomMapPin | Food & Bev, Dessert, Arts & Crafts, Vintage, Default |
| MobileNavigation | Map Active, List Active, Cards Active, Brands Active |

---

## NPM Scripts

```json
{
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build",
  "chromatic": "chromatic --exit-zero-on-changes"
}
```

---

## Setup Requirements

1. Create Chromatic account at chromatic.com
2. Link GitHub repo to Chromatic project
3. Add `CHROMATIC_PROJECT_TOKEN` to GitHub repository secrets

---

## Cost Estimate

- **Viewports:** Mobile (375px) + Desktop (1280px)
- **Snapshots per build:** ~100-160 (50-60 stories × 2 viewports, with TurboSnap reducing by 60-80%)
- **Builds per month:** ~20-40 (PRs + main merges)
- **Monthly usage:** ~1,500-2,500 snapshots
- **Chromatic free tier:** 5,000 snapshots/month

**Result:** Comfortably within free tier.

---

## Future Enhancements

- Add map components with canvas mocking
- Add Stripe components with mock Stripe Elements
- Add interaction tests for complex flows
- Consider Storybook test runner for unit testing stories
