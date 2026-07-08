import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('renders with outlined variant', () => {
    render(<Button variant="outlined">Outlined</Button>);
    const button = screen.getByRole('button', { name: /outlined/i });
    expect(button).toHaveClass('border-2');
    expect(button).toHaveClass('border-primary');
  });

  it('shows loading spinner when loading is true', () => {
    render(<Button loading>Submit</Button>);
    const spinner = screen.getByText('progress_activity');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders an icon if icon prop is provided and not loading', () => {
    render(<Button icon="check_circle">Done</Button>);
    const icon = screen.getByText('check_circle');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('material-symbols-rounded');
  });

  it('disables the button when disabled prop is passed', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });
});
