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
        <Label htmlFor="option-one">Interested</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Going</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="option-three" />
        <Label htmlFor="option-three">Not attending</Label>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="map" className="flex flex-row gap-4">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="map" id="map" />
        <Label htmlFor="map">Map</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="list" id="list" />
        <Label htmlFor="list">List</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="cards" id="cards" />
        <Label htmlFor="cards">Cards</Label>
      </div>
    </RadioGroup>
  ),
};
