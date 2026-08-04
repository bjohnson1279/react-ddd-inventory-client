import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiSpecViewerPanel } from '../../src/components/ApiSpecViewerPanel';

describe('ApiSpecViewerPanel', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  it('renders default Express REST tab with endpoints', () => {
    render(<ApiSpecViewerPanel />);
    expect(screen.getByText('API Specifications')).toBeInTheDocument();
    expect(screen.getByText('OpenAPI Definitions')).toBeInTheDocument();
    expect(screen.getAllByText('/api/inventory').length).toBeGreaterThan(0);
    expect(screen.getByText('Express ↔ PHP')).toBeInTheDocument();
  });

  it('switches to PHP REST tab', () => {
    render(<ApiSpecViewerPanel />);
    const phpBtn = screen.getByText('PHP REST');
    fireEvent.click(phpBtn);
    expect(screen.getByText('OpenAPI Definitions')).toBeInTheDocument();
  });

  it('switches to GraphQL SDL tab and shows queries/types', () => {
    render(<ApiSpecViewerPanel />);
    const gqlBtn = screen.getByText('GraphQL SDL');
    fireEvent.click(gqlBtn);
    expect(screen.getByText('GraphQL Schema')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return content.includes('inventoryItems') && element?.tagName.toLowerCase() === 'code';
    })).toBeInTheDocument();
  });

  it('filters endpoints using search', () => {
    render(<ApiSpecViewerPanel />);
    const searchInput = screen.getByPlaceholderText('Search endpoints/types...');
    fireEvent.change(searchInput, { target: { value: 'compliance' } });

    expect(screen.getByText('/api/compliance/ledger')).toBeInTheDocument();
    expect(screen.queryByText('Remove a product')).not.toBeInTheDocument();
  });

  it('filters GraphQL queries using search', () => {
    render(<ApiSpecViewerPanel />);
    fireEvent.click(screen.getByText('GraphQL SDL'));
    const searchInput = screen.getByPlaceholderText('Search endpoints/types...');
    fireEvent.change(searchInput, { target: { value: 'compliance' } });

    expect(screen.getByText((content, element) => content.includes('complianceLedger') && element?.tagName.toLowerCase() === 'code')).toBeInTheDocument();
    expect(screen.queryByText((content, element) => content.includes('inventoryItems') && element?.tagName.toLowerCase() === 'code')).not.toBeInTheDocument();
  });

  it('copies cURL command when button is clicked', () => {
    render(<ApiSpecViewerPanel />);
    const copyBtns = screen.getAllByText('Copy cURL');
    fireEvent.click(copyBtns[0]); // first endpoint is GET /api/inventory
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('curl -X GET http://localhost:5000/api/inventory');
  });

  it('can switch back to the Express REST tab after changing tabs', () => {
    render(<ApiSpecViewerPanel />);
    const phpBtn = screen.getByText('PHP REST');
    fireEvent.click(phpBtn); // Switch to PHP
    const expressBtn = screen.getByText('Express REST');
    fireEvent.click(expressBtn); // Switch back
    expect(screen.getByText('Express ↔ PHP')).toBeInTheDocument(); // Some default content, or just knowing it didn't throw
    expect(screen.getByText('OpenAPI Definitions')).toBeInTheDocument();
  });

  it('renders endpoints with various HTTP methods correctly', () => {
    // To properly test the getMethodColor function without changing the component's internal mock data,
    // we would ideally need a way to pass in props. Since we can't, the previous version
    // wrongly modified the component to include PUT and PATCH just to hit coverage.
    // Instead we can just make sure GET, POST, DELETE are rendered.
    render(<ApiSpecViewerPanel />);
    expect(screen.getAllByText('GET')[0]).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('shows a message when no endpoints match the search query', () => {
    render(<ApiSpecViewerPanel />);
    const searchInput = screen.getByPlaceholderText('Search endpoints/types...');
    fireEvent.change(searchInput, { target: { value: 'nonexistentendpointquery123' } });
    expect(screen.getByText('No endpoints found.')).toBeInTheDocument();
  });
});
