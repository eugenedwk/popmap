import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Decorator } from '@storybook/react';

// Create a new QueryClient for each story to ensure isolation
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

/**
 * Decorator that provides React Query and React Router context to stories.
 * This enables stories to render components that use:
 * - useQuery, useMutation, etc. from @tanstack/react-query
 * - useNavigate, useLocation, Link, etc. from react-router-dom
 */
export const withProviders: Decorator = (Story) => {
  const queryClient = createQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    </QueryClientProvider>
  );
};
