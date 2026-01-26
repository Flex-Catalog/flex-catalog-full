import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductsPage from './page';
import { useTranslations } from 'next-intl';

jest.mock('next-intl', () => ({
  useTranslations: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockUseTranslations = useTranslations as jest.Mock;

describe('ProductsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUseTranslations.mockReturnValue((key: string) => key);
  });

  it('renders loading state', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('renders products list', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            id: '1',
            name: 'Test Product',
            priceCents: 10000,
            isActive: true,
          },
        ],
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProductsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  it('renders empty state when no products', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: { data: [] },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProductsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('products.noProducts')).toBeInTheDocument();
    });
  });
});
