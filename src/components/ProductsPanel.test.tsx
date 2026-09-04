import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsPanel } from './Panels';

// Mock the Spinner component to avoid testing its internal implementation
vi.mock('./Panels', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    Spinner: () => <div data-testid="spinner">Loading...</div>
  };
});

describe('ProductsPanel', () => {
  const defaultProps = {
    newProdId: '',
    setNewProdId: vi.fn(),
    newProdName: '',
    setNewProdName: vi.fn(),
    handleCreateProduct: vi.fn((e: any) => e.preventDefault()),
    selectedProduct: null,
    setSelectedProduct: vi.fn(),
    handleAddVariant: vi.fn((e: any) => e.preventDefault()),
    newVarSku: '',
    setNewVarSku: vi.fn(),
    newVarTracking: 'quantity' as const,
    setNewVarTracking: vi.fn(),
    newVarAttrJSON: '',
    setNewVarAttrJSON: vi.fn(),
    products: [],
    handleAssignBarcode: vi.fn((e: any) => e.preventDefault()),
    assignSku: '',
    setAssignSku: vi.fn(),
    assignVal: '',
    setAssignVal: vi.fn(),
    assignSymbology: 'upc_a',
    setAssignSymbology: vi.fn(),
    assignSource: 'manufacturer',
    setAssignSource: vi.fn(),
    assignIsPrimary: false,
    setAssignIsPrimary: vi.fn(),
    handleGenerateBarcode: vi.fn(),
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard forms and handles empty product list', () => {
    render(<ProductsPanel {...defaultProps} />);
    expect(screen.getByText('Add Catalog Product')).toBeInTheDocument();
    expect(screen.getByText('Product Registry & Barcode Mapping')).toBeInTheDocument();
    expect(screen.getByText('No products registered in catalog.')).toBeInTheDocument();
  });

  it('handles product creation input', async () => {
    const user = userEvent.setup();
    render(<ProductsPanel {...defaultProps} />);

    const prodIdInput = screen.getByPlaceholderText('e.g. prod-123');
    await user.type(prodIdInput, 'prod-123');
    expect(defaultProps.setNewProdId).toHaveBeenCalled();

    const nameInput = screen.getByPlaceholderText('e.g. Wireless Charger');
    await user.type(nameInput, 'Wireless Charger');
    expect(defaultProps.setNewProdName).toHaveBeenCalled();

        const form = document.querySelectorAll('form')[0];
    fireEvent.submit(form);
    expect(defaultProps.handleCreateProduct).toHaveBeenCalled();
  });

  it('displays products and allows selection', async () => {
    const user = userEvent.setup();
    const propsWithProducts = {
      ...defaultProps,
      products: [
        { id: 'p1', name: 'Product 1', variants: [] },
        { id: 'p2', name: 'Product 2', variants: [{ id: 'v1', sku: 'SKU-1', trackingMode: 'quantity', barcodes: [] }] }
      ]
    };
    render(<ProductsPanel {...propsWithProducts} />);

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('SKU-1')).toBeInTheDocument();

    await user.click(screen.getByText('Product 1'));
    expect(defaultProps.setSelectedProduct).toHaveBeenCalledWith(propsWithProducts.products[0]);
  });

  it('renders add variant form when product is selected', async () => {
    const user = userEvent.setup();
    const selectedProduct = { id: 'p1', name: 'Test Product', variants: [] };
    render(<ProductsPanel {...defaultProps} selectedProduct={selectedProduct} />);

    expect(screen.getByText('Add Variant to Test Product')).toBeInTheDocument();

    const skuInputs = screen.getAllByPlaceholderText('e.g. CHARGER-WRLS-BLK');
    const skuInput = skuInputs[0];
    await user.type(skuInput, 'TEST-SKU');
    expect(defaultProps.setNewVarSku).toHaveBeenCalled();

        const form = document.querySelectorAll('form')[1];
    fireEvent.submit(form);
    expect(defaultProps.handleAddVariant).toHaveBeenCalled();
  });

  it('handles manual barcode assignment form', async () => {
    const user = userEvent.setup();
    render(<ProductsPanel {...defaultProps} />);

    const inputs = screen.getAllByRole('textbox');
    // 0: prod ref id, 1: display name, 2: barcode sku, 3: barcode val
    const skuInput = inputs[2];
    const valInput = inputs[3];

    await user.type(skuInput, 'SKU-123');
    expect(defaultProps.setAssignSku).toHaveBeenCalled();

    await user.type(valInput, '1234567890');
    expect(defaultProps.setAssignVal).toHaveBeenCalled();

    const selects = screen.getAllByRole('combobox');
    // index 0: symbology, 1: source
    const symbologySelect = selects[0];
    const sourceSelect = selects[1];

    await user.selectOptions(symbologySelect, 'ean_13');
    expect(defaultProps.setAssignSymbology).toHaveBeenCalledWith('ean_13');

    await user.selectOptions(sourceSelect, 'internal');
    expect(defaultProps.setAssignSource).toHaveBeenCalledWith('internal');

    const isPrimaryCheckbox = screen.getByRole('checkbox');
    await user.click(isPrimaryCheckbox);
    expect(defaultProps.setAssignIsPrimary).toHaveBeenCalledWith(true);

    // Since we mock state setters as vi.fn() without implementation, inputs remain empty causing native HTML5 validation (required) to block the submit event on button click.
    // We can simulate the form submission directly.
    const forms = document.querySelectorAll('form');
    const manualForm = forms[forms.length - 1];
        fireEvent.submit(manualForm);
    expect(defaultProps.handleAssignBarcode).toHaveBeenCalled();
  });

  it('handles generate internal barcode button', async () => {
    const user = userEvent.setup();
    const propsWithVariants = {
      ...defaultProps,
      products: [
        { id: 'p2', name: 'Product 2', variants: [{ id: 'v1', sku: 'SKU-1', trackingMode: 'quantity', barcodes: [] }] }
      ]
    };
    render(<ProductsPanel {...propsWithVariants} />);

    const generateBtn = screen.getByRole('button', { name: 'Generate Internal Barcode' });
    await user.click(generateBtn);

    expect(defaultProps.handleGenerateBarcode).toHaveBeenCalledWith('SKU-1');
  });

  it('disables buttons when loading', () => {
    render(<ProductsPanel {...defaultProps} loading={true} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');
    });
  });
});
