import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import RegisterPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock the api
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

const messages = {
  auth: {
    register: 'Register',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    companyName: 'Company Name',
    country: 'Country',
  },
  common: {
    loading: 'Loading...',
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {component}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render registration form', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
  });

  it('should allow user to fill registration form', () => {
    renderWithProviders(<RegisterPage />);

    const companyInput = screen.getByLabelText(/company/i);
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(companyInput, { target: { value: 'Test Company' } });
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securepassword123' } });

    expect(companyInput).toHaveValue('Test Company');
    expect(nameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john@example.com');
    expect(passwordInput).toHaveValue('securepassword123');
  });

  it('should display country selector with options', () => {
    renderWithProviders(<RegisterPage />);

    const countrySelect = screen.getByLabelText(/country/i);
    expect(countrySelect).toBeInTheDocument();

    // Should have multiple country options
    const options = countrySelect.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(1);
  });
});
