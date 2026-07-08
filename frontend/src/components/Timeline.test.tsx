import React from 'react';
import { render, screen } from '@testing-library/react';
import Timeline from './Timeline';

const mockSteps = [
  { label: 'Step 1', icon: 'check', status: 'completed' as const },
  { label: 'Step 2', icon: 'hourglass', status: 'active' as const },
  { label: 'Step 3', icon: 'pending', status: 'pending' as const },
  { label: 'Step 4', icon: 'error', status: 'error' as const },
];

describe('Timeline', () => {
  it('renders all steps with their labels', () => {
    render(<Timeline steps={mockSteps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('Step 4')).toBeInTheDocument();
  });

  it('applies correct styles for completed status', () => {
    render(<Timeline steps={mockSteps} />);
    const completedStep = screen.getByText('Step 1').closest('div')?.parentElement;
    expect(completedStep?.querySelector('.bg-success')).toBeInTheDocument();
  });

  it('applies correct styles for active status', () => {
    render(<Timeline steps={mockSteps} />);
    const activeStep = screen.getByText('Step 2').closest('div')?.parentElement;
    expect(activeStep?.querySelector('.animate-pulse-dot')).toBeInTheDocument();
  });
});
