import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from './Input';

describe('Input Component', () => {
  it('renders correctly with label', () => {
    render(<Input label="Email Address" />);
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('renders with an icon if provided', () => {
    render(<Input label="Search" icon="search" />);
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('search')).toHaveClass('material-symbols-rounded');
  });

  it('shows error message if error prop is provided', () => {
    render(<Input label="Name" error="Name is required" />);
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('toggles password visibility when type is password', () => {
    render(<Input label="Password" type="password" />);
    
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(input).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('applies correct border color when error is present', () => {
    render(<Input label="Username" error="Invalid" />);
    const input = screen.getByPlaceholderText('Username');
    expect(input).toHaveClass('border-error');
  });
});
