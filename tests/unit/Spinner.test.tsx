import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { Spinner } from '../../src/components/Panels';

describe('Spinner', () => {
  it('renders correctly with expected structure and classes', () => {
    const { container } = render(<Spinner />);

    // Find the svg element
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('spinner');
    expect(svgElement).toHaveAttribute('viewBox', '0 0 24 24');

    // Find the circle track element
    const circleElement = container.querySelector('circle');
    expect(circleElement).toBeInTheDocument();
    expect(circleElement).toHaveClass('spinner-track');
    expect(circleElement).toHaveAttribute('cx', '12');
    expect(circleElement).toHaveAttribute('cy', '12');
    expect(circleElement).toHaveAttribute('r', '10');

    // Find the path head element
    const pathElement = container.querySelector('path');
    expect(pathElement).toBeInTheDocument();
    expect(pathElement).toHaveClass('spinner-head');
  });
});
