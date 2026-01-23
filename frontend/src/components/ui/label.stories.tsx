import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';

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
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">
        Email address <span className="text-destructive">*</span>
      </Label>
      <Input type="email" id="email" placeholder="Enter your email" />
    </div>
  ),
};
