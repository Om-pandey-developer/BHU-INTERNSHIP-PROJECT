import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders correctly with a known status', () => {
    render(<StatusBadge status="APPROVED_HOD" />);
    const badge = screen.getByText('APPROVED HOD');
    expect(badge).toBeInTheDocument();
    
    // Check if parent container has the correct color classes
    const container = badge.closest('span');
    expect(container).toHaveClass('text-primary');
    expect(container).toHaveClass('bg-primary-container');
  });

  it('renders correctly with an unknown status', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    const badge = screen.getByText('UNKNOWN STATUS');
    expect(badge).toBeInTheDocument();
    
    // Check fallback classes
    const container = badge.closest('span');
    expect(container).toHaveClass('text-outline');
    expect(container).toHaveClass('bg-surface-variant');
  });

  it('applies the small size classes when size="sm"', () => {
    render(<StatusBadge status="DRAFT" size="sm" />);
    const badge = screen.getByText('DRAFT');
    const container = badge.closest('span');
    expect(container).toHaveClass('px-2');
    expect(container).toHaveClass('text-xs');
  });

  it('formats status text by replacing underscores with spaces', () => {
    render(<StatusBadge status="FAILED_PROVISIONING" />);
    expect(screen.getByText('FAILED PROVISIONING')).toBeInTheDocument();
  });
});
