# Storybook + Chromatic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Storybook with Chromatic for component documentation, visual regression testing, and isolated development.

**Architecture:** Storybook 8 with Vite builder, MSW for API mocking, co-located stories next to components, Chromatic CI integration with TurboSnap for efficient snapshot testing.

**Tech Stack:** Storybook 8, MSW 2, Chromatic, GitHub Actions, React 18, TypeScript, Tailwind CSS

---

## Task 1: Initialize Storybook

**Files:**
- Create: `frontend/.storybook/main.ts`
- Create: `frontend/.storybook/preview.ts`
- Modify: `frontend/package.json`

**Step 1: Install Storybook dependencies**

Run in `frontend/`:
```bash
npx storybook@latest init --builder vite --type react --skip-install
```

This creates `.storybook/` folder with initial config.

**Step 2: Install additional dependencies**

```bash
npm install -D @storybook/addon-a11y @storybook/addon-interactions @storybook/test chromatic msw msw-storybook-addon
```

**Step 3: Update `.storybook/main.ts`**

Replace contents with:
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
  docs: {
    autodocs: true,
  },
};

export default config;
```

**Step 4: Verify Storybook starts**

```bash
npm run storybook
```

Expected: Storybook opens at http://localhost:6006 with welcome page.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: initialize Storybook with Vite builder and addons"
```

---

## Task 2: Configure MSW and Decorators

**Files:**
- Create: `frontend/.storybook/mocks/handlers.ts`
- Create: `frontend/.storybook/decorators.tsx`
- Modify: `frontend/.storybook/preview.ts`

**Step 1: Initialize MSW**

```bash
cd frontend && npx msw init public/ --save
```

**Step 2: Create mock handlers**

Create `frontend/.storybook/mocks/handlers.ts`:
```typescript
import { http, HttpResponse } from 'msw';

const API_URL = 'https://api.popmap.co/api';

// Sample event data for stories
const mockEvents = [
  {
    id: 1,
    name: 'Pop-up Market at Downtown',
    description: 'A vibrant pop-up market featuring local vendors.',
    date: '2026-02-01',
    start_time: '10:00',
    end_time: '18:00',
    location: '123 Main St, Los Angeles, CA',
    latitude: 34.0522,
    longitude: -118.2437,
    image_url: 'https://picsum.photos/seed/event1/400/300',
    category: 'food_bev',
    business: {
      id: 1,
      name: 'Local Vendors Collective',
      verified: true,
    },
    cta_button_text: 'Get Tickets',
    cta_button_url: 'https://example.com/tickets',
  },
  {
    id: 2,
    name: 'Artisan Food Festival',
    description: 'Explore artisan food from around the city.',
    date: '2026-02-15',
    start_time: '11:00',
    end_time: '20:00',
    location: '456 Oak Ave, Los Angeles, CA',
    latitude: 34.0525,
    longitude: -118.2440,
    image_url: null,
    category: 'dessert',
    business: {
      id: 2,
      name: 'Food Lovers United',
      verified: false,
    },
    cta_button_text: null,
    cta_button_url: null,
  },
];

const mockBusiness = {
  id: 1,
  name: 'Sample Business',
  description: 'A sample business for testing.',
  verified: true,
  instagram_url: 'https://instagram.com/samplebusiness',
  website_url: 'https://samplebusiness.com',
};

export const handlers = [
  // Events list
  http.get(`${API_URL}/events/`, () => {
    return HttpResponse.json(mockEvents);
  }),

  // Single event
  http.get(`${API_URL}/events/:id/`, ({ params }) => {
    const event = mockEvents.find((e) => e.id === Number(params.id));
    if (event) {
      return HttpResponse.json(event);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Business
  http.get(`${API_URL}/businesses/:id/`, () => {
    return HttpResponse.json(mockBusiness);
  }),

  // RSVP
  http.post(`${API_URL}/events/:id/rsvp/`, () => {
    return HttpResponse.json({ status: 'going' });
  }),

  // Categories
  http.get(`${API_URL}/categories/`, () => {
    return HttpResponse.json([
      { id: 'food_bev', name: 'Food & Beverage' },
      { id: 'dessert', name: 'Dessert' },
      { id: 'arts_crafts', name: 'Arts & Crafts' },
      { id: 'vintage', name: 'Vintage' },
    ]);
  }),
];
```

**Step 3: Create decorators**

Create `frontend/.storybook/decorators.tsx`:
```typescript
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Decorator } from '@storybook/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

export const withProviders: Decorator = (Story) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Story />
    </BrowserRouter>
  </QueryClientProvider>
);
```

**Step 4: Update preview.ts**

Replace `frontend/.storybook/preview.ts`:
```typescript
import type { Preview } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from './mocks/handlers';
import { withProviders } from './decorators';
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
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
      },
    },
  },
};

export default preview;
```

**Step 5: Verify MSW loads**

```bash
npm run storybook
```

Expected: Console shows "MSW started" message. No network errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: configure MSW mocking and React context decorators"
```

---

## Task 3: Create Button Stories

**Files:**
- Create: `frontend/src/components/ui/button.stories.tsx`

**Step 1: Create button stories**

Create `frontend/src/components/ui/button.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading...',
    disabled: true,
  },
};
```

**Step 2: Verify stories render**

```bash
npm run storybook
```

Expected: UI/Button appears in sidebar with all variants.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Button component stories"
```

---

## Task 4: Create Input and Form Element Stories

**Files:**
- Create: `frontend/src/components/ui/input.stories.tsx`
- Create: `frontend/src/components/ui/textarea.stories.tsx`
- Create: `frontend/src/components/ui/checkbox.stories.tsx`
- Create: `frontend/src/components/ui/switch.stories.tsx`
- Create: `frontend/src/components/ui/select.stories.tsx`

**Step 1: Create input stories**

Create `frontend/src/components/ui/input.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    value: 'Pre-filled value',
    readOnly: true,
  },
};
```

**Step 2: Create textarea stories**

Create `frontend/src/components/ui/textarea.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full gap-1.5">
      <Label htmlFor="message">Your message</Label>
      <Textarea id="message" placeholder="Type your message here..." />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
};
```

**Step 3: Create checkbox stories**

Create `frontend/src/components/ui/checkbox.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};
```

**Step 4: Create switch stories**

Create `frontend/src/components/ui/switch.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';
import { Label } from './label';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
```

**Step 5: Create select stories**

Create `frontend/src/components/ui/select.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="banana">
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Disabled" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
      </SelectContent>
    </Select>
  ),
};
```

**Step 6: Verify all form stories render**

```bash
npm run storybook
```

Expected: UI/Input, UI/Textarea, UI/Checkbox, UI/Switch, UI/Select all appear with variants.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add form element stories (input, textarea, checkbox, switch, select)"
```

---

## Task 5: Create Card, Badge, and Alert Stories

**Files:**
- Create: `frontend/src/components/ui/card.stories.tsx`
- Create: `frontend/src/components/ui/badge.stories.tsx`
- Create: `frontend/src/components/ui/alert.stories.tsx`

**Step 1: Create card stories**

Create `frontend/src/components/ui/card.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Your project will be created with default settings.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent className="pt-6">
        <p>A simple card with just content.</p>
      </CardContent>
    </Card>
  ),
};
```

**Step 2: Create badge stories**

Create `frontend/src/components/ui/badge.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};
```

**Step 3: Create alert stories**

Create `frontend/src/components/ui/alert.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert className="border-green-500 text-green-700">
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>Success!</AlertTitle>
      <AlertDescription>
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
};
```

**Step 4: Verify stories render**

```bash
npm run storybook
```

Expected: UI/Card, UI/Badge, UI/Alert appear with all variants.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Card, Badge, and Alert component stories"
```

---

## Task 6: Create Dialog and Tabs Stories

**Files:**
- Create: `frontend/src/components/ui/dialog.stories.tsx`
- Create: `frontend/src/components/ui/tabs.stories.tsx`

**Step 1: Create dialog stories**

Create `frontend/src/components/ui/dialog.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input id="username" defaultValue="@peduarte" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Simple: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Show Info</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Information</DialogTitle>
          <DialogDescription>
            This is a simple informational dialog.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};
```

**Step 2: Create tabs stories**

Create `frontend/src/components/ui/tabs.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Account settings content goes here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Password settings content goes here.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const ThreeTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview content</TabsContent>
      <TabsContent value="analytics">Analytics content</TabsContent>
      <TabsContent value="reports">Reports content</TabsContent>
    </Tabs>
  ),
};
```

**Step 3: Verify stories render**

```bash
npm run storybook
```

Expected: UI/Dialog and UI/Tabs appear. Dialog opens when triggered.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Dialog and Tabs component stories"
```

---

## Task 7: Create Remaining UI Primitive Stories

**Files:**
- Create: `frontend/src/components/ui/label.stories.tsx`
- Create: `frontend/src/components/ui/separator.stories.tsx`
- Create: `frontend/src/components/ui/slider.stories.tsx`
- Create: `frontend/src/components/ui/radio-group.stories.tsx`

**Step 1: Create label stories**

Create `frontend/src/components/ui/label.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: {
    children: 'Email address',
  },
};

export const Required: Story = {
  render: () => (
    <Label>
      Email address <span className="text-red-500">*</span>
    </Label>
  ),
};
```

**Step 2: Create separator stories**

Create `frontend/src/components/ui/separator.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Radix Primitives</h4>
        <p className="text-sm text-muted-foreground">
          An open-source UI component library.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center space-x-4 text-sm">
      <div>Blog</div>
      <Separator orientation="vertical" />
      <div>Docs</div>
      <Separator orientation="vertical" />
      <div>Source</div>
    </div>
  ),
};
```

**Step 3: Create slider stories**

Create `frontend/src/components/ui/slider.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    className: 'w-[200px]',
  },
};

export const Range: Story = {
  args: {
    defaultValue: [25, 75],
    max: 100,
    step: 1,
    className: 'w-[200px]',
  },
};

export const WithSteps: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 10,
    className: 'w-[200px]',
  },
};
```

**Step 4: Create radio-group stories**

Create `frontend/src/components/ui/radio-group.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta: Meta<typeof RadioGroup> = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Option Two</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="option-three" />
        <Label htmlFor="option-three">Option Three</Label>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one" className="flex space-x-4">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="h-option-one" />
        <Label htmlFor="h-option-one">One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="h-option-two" />
        <Label htmlFor="h-option-two">Two</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="h-option-three" />
        <Label htmlFor="h-option-three">Three</Label>
      </div>
    </RadioGroup>
  ),
};
```

**Step 5: Verify stories render**

```bash
npm run storybook
```

Expected: UI/Label, UI/Separator, UI/Slider, UI/RadioGroup all appear.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Label, Separator, Slider, RadioGroup stories"
```

---

## Task 8: Create EventCard Stories

**Files:**
- Create: `frontend/src/components/EventCard.stories.tsx`

**Step 1: Read EventCard to understand props**

Check the component interface to create accurate stories.

**Step 2: Create EventCard stories**

Create `frontend/src/components/EventCard.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import EventCard from './EventCard';

const meta: Meta<typeof EventCard> = {
  title: 'Components/EventCard',
  component: EventCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EventCard>;

const baseEvent = {
  id: 1,
  name: 'Pop-up Market at Downtown',
  description: 'A vibrant pop-up market featuring local vendors, artisan goods, and delicious food.',
  date: '2026-02-01',
  start_time: '10:00',
  end_time: '18:00',
  location: '123 Main St, Los Angeles, CA',
  latitude: 34.0522,
  longitude: -118.2437,
  category: 'food_bev',
  business: {
    id: 1,
    name: 'Local Vendors Collective',
    verified: true,
  },
};

export const Default: Story = {
  args: {
    event: {
      ...baseEvent,
      image_url: 'https://picsum.photos/seed/event1/400/300',
    },
  },
};

export const WithCTA: Story = {
  args: {
    event: {
      ...baseEvent,
      image_url: 'https://picsum.photos/seed/event2/400/300',
      cta_button_text: 'Get Tickets',
      cta_button_url: 'https://example.com/tickets',
    },
  },
};

export const NoImage: Story = {
  args: {
    event: {
      ...baseEvent,
      image_url: null,
    },
  },
};

export const PastEvent: Story = {
  args: {
    event: {
      ...baseEvent,
      date: '2025-01-01',
      image_url: 'https://picsum.photos/seed/event3/400/300',
    },
  },
};

export const DessertCategory: Story = {
  args: {
    event: {
      ...baseEvent,
      name: 'Sweet Treats Festival',
      category: 'dessert',
      image_url: 'https://picsum.photos/seed/dessert/400/300',
    },
  },
};

export const ArtsCraftsCategory: Story = {
  args: {
    event: {
      ...baseEvent,
      name: 'Handmade Crafts Market',
      category: 'arts_crafts',
      image_url: 'https://picsum.photos/seed/crafts/400/300',
    },
  },
};

export const VintageCategory: Story = {
  args: {
    event: {
      ...baseEvent,
      name: 'Vintage Flea Market',
      category: 'vintage',
      image_url: 'https://picsum.photos/seed/vintage/400/300',
    },
  },
};
```

**Step 3: Verify EventCard stories render**

```bash
npm run storybook
```

Expected: Components/EventCard appears with all variants.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add EventCard component stories"
```

---

## Task 9: Create ShareButtons and CustomMapPin Stories

**Files:**
- Create: `frontend/src/components/ShareButtons.stories.tsx`
- Create: `frontend/src/components/CustomMapPin.stories.tsx`

**Step 1: Create ShareButtons stories**

Create `frontend/src/components/ShareButtons.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import ShareButtons from './ShareButtons';

const meta: Meta<typeof ShareButtons> = {
  title: 'Components/ShareButtons',
  component: ShareButtons,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ShareButtons>;

export const Default: Story = {
  args: {
    url: 'https://popmap.co/events/1',
    title: 'Pop-up Market at Downtown',
  },
};

export const LongTitle: Story = {
  args: {
    url: 'https://popmap.co/events/2',
    title: 'The Ultimate Weekend Food Festival Featuring Local Artisans and Craft Vendors',
  },
};
```

**Step 2: Create CustomMapPin stories**

Create `frontend/src/components/CustomMapPin.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import CustomMapPin from './CustomMapPin';

const meta: Meta<typeof CustomMapPin> = {
  title: 'Components/CustomMapPin',
  component: CustomMapPin,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-8 bg-gray-100">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CustomMapPin>;

export const FoodAndBeverage: Story = {
  args: {
    category: 'food_bev',
  },
};

export const Dessert: Story = {
  args: {
    category: 'dessert',
  },
};

export const ArtsCrafts: Story = {
  args: {
    category: 'arts_crafts',
  },
};

export const Vintage: Story = {
  args: {
    category: 'vintage',
  },
};

export const DefaultCategory: Story = {
  args: {
    category: 'other',
  },
};

export const AllCategories: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="text-center">
        <CustomMapPin category="food_bev" />
        <p className="text-xs mt-2">Food & Bev</p>
      </div>
      <div className="text-center">
        <CustomMapPin category="dessert" />
        <p className="text-xs mt-2">Dessert</p>
      </div>
      <div className="text-center">
        <CustomMapPin category="arts_crafts" />
        <p className="text-xs mt-2">Arts & Crafts</p>
      </div>
      <div className="text-center">
        <CustomMapPin category="vintage" />
        <p className="text-xs mt-2">Vintage</p>
      </div>
      <div className="text-center">
        <CustomMapPin category="other" />
        <p className="text-xs mt-2">Other</p>
      </div>
    </div>
  ),
};
```

**Step 3: Verify stories render**

```bash
npm run storybook
```

Expected: Components/ShareButtons and Components/CustomMapPin appear.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ShareButtons and CustomMapPin stories"
```

---

## Task 10: Create MobileNavigation Stories

**Files:**
- Create: `frontend/src/components/MobileNavigation.stories.tsx`

**Step 1: Create MobileNavigation stories**

Create `frontend/src/components/MobileNavigation.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import MobileNavigation from './MobileNavigation';

const meta: Meta<typeof MobileNavigation> = {
  title: 'Components/MobileNavigation',
  component: MobileNavigation,
  tags: ['autodocs'],
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="relative h-[667px] bg-gray-50">
        <div className="p-4">
          <p>Page content goes here</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MobileNavigation>;

export const MapActive: Story = {
  args: {
    activeView: 'map',
    onViewChange: () => {},
  },
};

export const ListActive: Story = {
  args: {
    activeView: 'list',
    onViewChange: () => {},
  },
};

export const CardsActive: Story = {
  args: {
    activeView: 'cards',
    onViewChange: () => {},
  },
};

export const BrandsActive: Story = {
  args: {
    activeView: 'brands',
    onViewChange: () => {},
  },
};
```

**Step 2: Verify stories render**

```bash
npm run storybook
```

Expected: Components/MobileNavigation appears with mobile viewport.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add MobileNavigation stories"
```

---

## Task 11: Add GitHub Actions Workflow for Chromatic

**Files:**
- Create: `frontend/../.github/workflows/chromatic.yml`

**Step 1: Create Chromatic workflow**

Create `.github/workflows/chromatic.yml`:
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
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
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

**Step 2: Commit**

```bash
git add -A
git commit -m "ci: add Chromatic GitHub Actions workflow"
```

---

## Task 12: Update package.json Scripts and Documentation

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/README.md` (if exists, otherwise create)

**Step 1: Verify package.json has Storybook scripts**

Check that `storybook` and `build-storybook` scripts exist (should be added by Storybook init).

**Step 2: Add chromatic script**

Add to `frontend/package.json` scripts:
```json
{
  "scripts": {
    "chromatic": "chromatic --exit-zero-on-changes"
  }
}
```

**Step 3: Add Storybook section to README or create docs**

Add documentation for running Storybook locally and Chromatic setup.

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: add Storybook usage documentation"
```

---

## Task 13: Final Verification and Cleanup

**Step 1: Run Storybook and verify all stories**

```bash
cd frontend && npm run storybook
```

Expected: All 50+ stories render correctly at http://localhost:6006

**Step 2: Build Storybook to verify production build**

```bash
npm run build-storybook
```

Expected: Static Storybook built to `storybook-static/` folder.

**Step 3: Delete any auto-generated example stories**

Remove `src/stories/` folder if Storybook init created example stories.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup and verify Storybook build"
```

---

## Post-Implementation Checklist

- [ ] All UI primitive stories render correctly
- [ ] All feature component stories render correctly
- [ ] MSW mocking works (no network errors in console)
- [ ] Storybook builds successfully
- [ ] Chromatic workflow file committed
- [ ] Create Chromatic account at chromatic.com
- [ ] Link GitHub repo to Chromatic
- [ ] Add `CHROMATIC_PROJECT_TOKEN` to GitHub secrets
- [ ] Merge PR and verify Chromatic runs on main

---

## Cleanup

After implementation is complete and merged, use `superpowers:finishing-a-development-branch` to clean up the worktree.
