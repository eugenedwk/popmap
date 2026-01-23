import { http, HttpResponse } from 'msw';

const API_URL = 'https://api.popmap.co/api';

// Sample event data for stories
const mockEvents = [
  {
    id: 1,
    title: 'Pop-up Market at Downtown',
    description: 'A vibrant pop-up market featuring local vendors.',
    address: '123 Main St, Los Angeles, CA',
    latitude: '34.0522',
    longitude: '-118.2437',
    start_datetime: '2026-02-01T10:00:00Z',
    end_datetime: '2026-02-01T18:00:00Z',
    image: 'https://picsum.photos/seed/event1/400/300',
    status: 'approved' as const,
    require_login_for_rsvp: false,
    cta_button_text: 'Get Tickets',
    cta_button_url: 'https://example.com/tickets',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    businesses: [
      {
        id: 1,
        name: 'Local Vendors Collective',
        logo: undefined,
        categories: [{ id: 1, name: 'Food & Beverage', slug: 'food_bev' }],
      },
    ],
    business_names: 'Local Vendors Collective',
    categories: ['food_bev'],
    user_rsvp_status: null,
    rsvp_counts: {
      interested: 25,
      going: 12,
    },
  },
  {
    id: 2,
    title: 'Artisan Food Festival',
    description: 'Explore artisan food from around the city.',
    address: '456 Oak Ave, Los Angeles, CA',
    latitude: '34.0525',
    longitude: '-118.2440',
    start_datetime: '2026-02-15T11:00:00Z',
    end_datetime: '2026-02-15T20:00:00Z',
    image: null,
    status: 'approved' as const,
    require_login_for_rsvp: true,
    cta_button_text: null,
    cta_button_url: null,
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
    businesses: [
      {
        id: 2,
        name: 'Food Lovers United',
        logo: undefined,
        categories: [{ id: 2, name: 'Dessert', slug: 'dessert' }],
      },
    ],
    business_names: 'Food Lovers United',
    categories: ['dessert'],
    user_rsvp_status: null,
    rsvp_counts: {
      interested: 50,
      going: 30,
    },
  },
  {
    id: 3,
    title: 'Vintage Market Weekend',
    description: 'Browse unique vintage finds from local collectors.',
    address: '789 Elm St, Los Angeles, CA',
    latitude: '34.0530',
    longitude: '-118.2445',
    start_datetime: '2026-02-22T09:00:00Z',
    end_datetime: '2026-02-22T17:00:00Z',
    image: 'https://picsum.photos/seed/event3/400/300',
    status: 'approved' as const,
    require_login_for_rsvp: false,
    cta_button_text: 'Learn More',
    cta_button_url: 'https://example.com/vintage',
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-12T10:00:00Z',
    businesses: [
      {
        id: 3,
        name: 'Vintage Collectors Guild',
        logo: undefined,
        categories: [{ id: 4, name: 'Vintage', slug: 'vintage' }],
      },
    ],
    business_names: 'Vintage Collectors Guild',
    categories: ['vintage'],
    user_rsvp_status: 'interested' as const,
    rsvp_counts: {
      interested: 100,
      going: 45,
    },
  },
];

const mockBusiness = {
  id: 1,
  name: 'Sample Business',
  description: 'A sample business for testing Storybook components.',
  contact_email: 'contact@samplebusiness.com',
  contact_phone: '+1 (555) 123-4567',
  website: 'https://samplebusiness.com',
  instagram_url: 'https://instagram.com/samplebusiness',
  tiktok_url: 'https://tiktok.com/@samplebusiness',
  available_for_hire: true,
  logo: undefined,
  categories: [
    { id: 1, name: 'Food & Beverage', slug: 'food_bev' },
    { id: 3, name: 'Arts & Crafts', slug: 'arts_crafts' },
  ],
  custom_subdomain: null,
  can_use_custom_subdomain: false,
  can_use_premium_customization: false,
  can_use_form_builder: false,
  subdomain_url: null,
  active_form_template: null,
  active_form_template_id: null,
  is_verified: true,
  created_at: '2025-01-01T00:00:00Z',
};

const mockCategories = [
  { id: 1, name: 'Food & Beverage', slug: 'food_bev' },
  { id: 2, name: 'Dessert', slug: 'dessert' },
  { id: 3, name: 'Arts & Crafts', slug: 'arts_crafts' },
  { id: 4, name: 'Vintage', slug: 'vintage' },
];

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

  // Business list
  http.get(`${API_URL}/businesses/`, () => {
    return HttpResponse.json([mockBusiness]);
  }),

  // Single business
  http.get(`${API_URL}/businesses/:id/`, ({ params }) => {
    if (Number(params.id) === 1) {
      return HttpResponse.json(mockBusiness);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // RSVP - POST
  http.post(`${API_URL}/events/:id/rsvp/`, async ({ request }) => {
    const body = (await request.json()) as { status: string };
    return HttpResponse.json({
      id: 1,
      event: Number(request.url.split('/').slice(-2, -1)[0]),
      status: body.status || 'going',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  // RSVP - DELETE
  http.delete(`${API_URL}/events/:id/rsvp/`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Categories
  http.get(`${API_URL}/categories/`, () => {
    return HttpResponse.json(mockCategories);
  }),
];

// Export mock data for use in individual stories
export { mockEvents, mockBusiness, mockCategories };
