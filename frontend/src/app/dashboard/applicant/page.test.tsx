import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApplicantDashboard from './page';
import api from '@/lib/axios';

// Mock dependencies
jest.mock('@/lib/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', firstName: 'John', lastName: 'Doe', email: 'john@gmail.com' }
  }),
}));

jest.mock('@/components/Toast', () => ({
  useToastStore: () => ({ showToast: jest.fn() }),
}));

describe('Applicant Dashboard - Form Submission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('renders without crashing and shows "New Application" button', async () => {
    render(<ApplicantDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('New Application')).toBeInTheDocument();
    });
  });

  it('opens the application form when "New Application" is clicked', async () => {
    render(<ApplicantDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('New Application')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Application'));

    // Should render the category selection screen
    expect(screen.getByText('Choose Application Category')).toBeInTheDocument();
  });
});
