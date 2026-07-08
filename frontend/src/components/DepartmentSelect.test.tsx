import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DepartmentSelect from './DepartmentSelect';

const mockDepartments = [
  { id: '1', name: 'Computer Science', code: 'CS' },
  { id: '2', name: 'Physics', code: 'PHY' },
  { id: '3', name: 'Mathematics', code: 'MATH' }
];

describe('DepartmentSelect', () => {
  it('renders with placeholder when no value is selected', () => {
    render(
      <DepartmentSelect 
        departments={mockDepartments} 
        value="" 
        onChange={jest.fn()} 
        placeholder="Choose Dept" 
      />
    );
    expect(screen.getByText('Choose Dept')).toBeInTheDocument();
  });

  it('renders selected department name', () => {
    render(
      <DepartmentSelect 
        departments={mockDepartments} 
        value="2" 
        onChange={jest.fn()} 
      />
    );
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(
      <DepartmentSelect 
        departments={mockDepartments} 
        value="" 
        onChange={jest.fn()} 
      />
    );
    
    const selectBox = screen.getByText('Select Department *').parentElement;
    fireEvent.click(selectBox!);
    
    expect(screen.getByPlaceholderText('Search department...')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
  });

  it('filters departments based on search input', () => {
    render(
      <DepartmentSelect 
        departments={mockDepartments} 
        value="" 
        onChange={jest.fn()} 
      />
    );
    
    fireEvent.click(screen.getByText('Select Department *').parentElement!);
    
    const searchInput = screen.getByPlaceholderText('Search department...');
    fireEvent.change(searchInput, { target: { value: 'math' } });
    
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.queryByText('Physics')).not.toBeInTheDocument();
  });

  it('calls onChange when an option is clicked', () => {
    const handleChange = jest.fn();
    render(
      <DepartmentSelect 
        departments={mockDepartments} 
        value="" 
        onChange={handleChange} 
      />
    );
    
    fireEvent.click(screen.getByText('Select Department *').parentElement!);
    fireEvent.click(screen.getByText('Physics'));
    
    expect(handleChange).toHaveBeenCalledWith('2');
  });
});
