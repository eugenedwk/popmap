import type { Meta, StoryObj } from '@storybook/react-vite';
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
        <Story />
      </div>
    ),
  ],
  argTypes: {
    currentView: {
      control: 'select',
      options: ['map', 'list', 'cards', 'brands'],
      description: 'The currently active view',
    },
    onViewChange: {
      action: 'viewChanged',
      description: 'Callback when a view is selected',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MobileNavigation>;

export const MapActive: Story = {
  args: {
    currentView: 'map',
  },
};

export const ListActive: Story = {
  args: {
    currentView: 'list',
  },
};

export const CardsActive: Story = {
  args: {
    currentView: 'cards',
  },
};

export const BrandsActive: Story = {
  args: {
    currentView: 'brands',
  },
};
