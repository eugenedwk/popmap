import type { Meta, StoryObj } from '@storybook/react';
import { ShareButtons } from './ShareButtons';

const meta: Meta<typeof ShareButtons> = {
  title: 'Components/ShareButtons',
  component: ShareButtons,
  tags: ['autodocs'],
  argTypes: {
    url: {
      control: 'text',
      description: 'The URL to share',
    },
    title: {
      control: 'text',
      description: 'The title of the content being shared',
    },
    description: {
      control: 'text',
      description: 'Optional description for the share',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ShareButtons>;

export const Default: Story = {
  args: {
    url: 'https://popmap.co/events/sample-event',
    title: 'Summer Music Festival',
  },
};

export const LongTitle: Story = {
  args: {
    url: 'https://popmap.co/events/long-event-name',
    title: 'Annual Downtown Arts & Crafts Festival featuring Local Artisans and Food Vendors',
    description: 'Join us for a weekend of creativity and community!',
  },
};
