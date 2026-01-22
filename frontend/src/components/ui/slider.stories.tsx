import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
  },
};

export const Range: Story = {
  args: {
    defaultValue: [25, 75],
    max: 100,
    step: 1,
  },
};

export const WithSteps: Story = {
  render: () => (
    <div className="space-y-4">
      <Slider defaultValue={[50]} max={100} step={10} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>10</span>
        <span>20</span>
        <span>30</span>
        <span>40</span>
        <span>50</span>
        <span>60</span>
        <span>70</span>
        <span>80</span>
        <span>90</span>
        <span>100</span>
      </div>
    </div>
  ),
};
