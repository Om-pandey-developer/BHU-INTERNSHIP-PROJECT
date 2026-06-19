import React from 'react';
import { render, screen } from '@testing-library/react';
import StatsCard from './StatsCard';

describe('StatsCard Component', () => {
  it('renders the label and value correctly', () => {
    render(<StatsCard label="Total Users" value="1,200" icon="group" />);
    
    expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
  });

  it('renders a subtitle when provided', () => {
    render(
      <StatsCard 
        label="Revenue" 
        value="$5,000" 
        icon="payments" 
        subtitle="This month" 
      />
    );
    
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('renders trend indicators when provided', () => {
    render(
      <StatsCard 
        label="Growth" 
        value="15%" 
        icon="show_chart" 
        trend="up"
        trendValue="+5%"
      />
    );
    
    expect(screen.getByText('+5%')).toBeInTheDocument();
    expect(screen.getByText('trending_up')).toBeInTheDocument(); // The material symbol text
  });
});
