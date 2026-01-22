import type { Meta, StoryObj } from '@storybook/react';
import { CustomMapPin } from './CustomMapPin';

const meta: Meta<typeof CustomMapPin> = {
  title: 'Components/CustomMapPin',
  component: CustomMapPin,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: '#e5e7eb', padding: '2rem', display: 'inline-block' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    categories: {
      control: 'object',
      description: 'Array of category strings that determine the pin icon and color',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CustomMapPin>;

export const FoodAndBeverage: Story = {
  args: {
    categories: ['food&bev'],
  },
};

export const Dessert: Story = {
  args: {
    categories: ['dessert'],
  },
};

export const ArtsCrafts: Story = {
  args: {
    categories: ['arts+crafts'],
  },
};

export const Vintage: Story = {
  args: {
    categories: ['vintage'],
  },
};

export const DefaultCategory: Story = {
  args: {
    categories: ['unknown-category'],
  },
};

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
      <div style={{ textAlign: 'center' }}>
        <CustomMapPin categories={['food&bev']} />
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#374151' }}>food&bev</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CustomMapPin categories={['dessert']} />
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#374151' }}>dessert</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CustomMapPin categories={['arts+crafts']} />
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#374151' }}>arts+crafts</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CustomMapPin categories={['vintage']} />
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#374151' }}>vintage</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CustomMapPin categories={['default']} />
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#374151' }}>default</div>
      </div>
    </div>
  ),
};
