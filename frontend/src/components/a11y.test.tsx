import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import StatusBadge from './StatusBadge';
import Timeline from './Timeline';

expect.extend(toHaveNoViolations);

describe('Accessibility (A11y) Testing', () => {
  it('StatusBadge should not have any accessibility violations', async () => {
    const { container } = render(<StatusBadge status="APPROVED_HOD" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Timeline should not have any accessibility violations', async () => {
    const mockSteps = [
      { label: 'Step 1', icon: 'check', status: 'completed' as const },
    ];
    const { container } = render(<Timeline steps={mockSteps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
