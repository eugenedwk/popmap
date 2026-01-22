import type { Meta, StoryObj } from '@storybook/react-vite';
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
  argTypes: {
    onClick: { action: 'clicked' },
    isSelected: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof EventCard>;

// Base event object with mock data
const baseEvent = {
  id: 1,
  title: 'Artisan Coffee Tasting',
  business_name: 'The Coffee Collective',
  description: 'Join us for an exclusive coffee tasting event featuring single-origin beans from around the world.',
  address: '123 Main Street, Los Angeles, CA 90012',
  latitude: '34.0522',
  longitude: '-118.2437',
  start_datetime: '2025-02-15T10:00:00Z',
  end_datetime: '2025-02-15T14:00:00Z',
  image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
  status: 'approved' as const,
  require_login_for_rsvp: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  businesses: [{ id: 1, name: 'The Coffee Collective', categories: [] }],
  business_names: 'The Coffee Collective',
  categories: ['food-bev'],
};

export const Default: Story = {
  args: {
    event: baseEvent,
  },
};

export const WithCTA: Story = {
  args: {
    event: {
      ...baseEvent,
      id: 2,
      title: 'Exclusive Wine & Cheese Night',
      business_name: 'Vineyard Delights',
      cta_button_text: 'Reserve Your Spot',
      cta_button_url: 'https://example.com/reserve',
    },
  },
};

export const NoImage: Story = {
  args: {
    event: {
      ...baseEvent,
      id: 3,
      title: 'Community Meetup',
      business_name: 'Local Hangout',
      image: undefined,
    },
  },
};

// Past event (date in the past)
export const PastEvent: Story = {
  args: {
    event: {
      ...baseEvent,
      id: 4,
      title: 'Holiday Market 2024',
      business_name: 'Downtown Collective',
      start_datetime: '2024-12-20T09:00:00Z',
      end_datetime: '2024-12-20T17:00:00Z',
    },
  },
};

export const DessertCategory: Story = {
  args: {
    event: {
      ...baseEvent,
      id: 5,
      title: 'Cupcake Decorating Workshop',
      business_name: 'Sweet Treats Bakery',
      categories: ['dessert'],
      image: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400',
    },
  },
};

export const ArtsCraftsCategory: Story = {
  args: {
    event: {
      ...baseEvent,
      id: 6,
      title: 'Pottery & Ceramics Class',
      business_name: 'The Clay Studio',
      categories: ['arts-crafts'],
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400',
    },
  },
};

export const VintageCategory: Story = {
  args: {
    event: {
      ...baseEvent,
      id: 7,
      title: 'Vintage Vinyl Record Fair',
      business_name: 'Retro Records',
      categories: ['vintage'],
      image: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400',
    },
  },
};

export const Selected: Story = {
  args: {
    event: baseEvent,
    isSelected: true,
  },
};
