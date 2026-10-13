import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShopifyPanel } from "../../src/components/Panels";

describe("ShopifyPanel", () => {
  const defaultProps = {
    newShopifyId: "",
    setNewShopifyId: vi.fn(),
    newShopifyDomain: "",
    setNewShopifyDomain: vi.fn(),
    newShopifyToken: "",
    setNewShopifyToken: vi.fn(),
    handleConnectShopify: vi.fn((e) => e.preventDefault()),
    shopifyConns: [],
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with default empty props", () => {
    render(<ShopifyPanel {...defaultProps} />);

    expect(
      screen.getByText("Configure Shopify Connection"),
    ).toBeInTheDocument();
    expect(screen.getByText("Connected Storefronts")).toBeInTheDocument();
    expect(screen.getByLabelText(/Connection Name \/ ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Store Domain/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Shopify API Access Token/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No active store connections."),
    ).toBeInTheDocument();
  });

  it("renders input values passed via props", () => {
    render(
      <ShopifyPanel
        {...defaultProps}
        newShopifyId="store-id-123"
        newShopifyDomain="my-shop.myshopify.com"
        newShopifyToken="shpat_12345"
      />,
    );

    expect(screen.getByLabelText(/Connection Name \/ ID/i)).toHaveValue(
      "store-id-123",
    );
    expect(screen.getByLabelText(/Store Domain/i)).toHaveValue(
      "my-shop.myshopify.com",
    );
    expect(screen.getByLabelText(/Shopify API Access Token/i)).toHaveValue(
      "shpat_12345",
    );
  });

  it("triggers change handlers when form fields are edited", () => {
    render(<ShopifyPanel {...defaultProps} />);

    const idInput = screen.getByLabelText(/Connection Name \/ ID/i);
    fireEvent.change(idInput, { target: { value: "new-store-id" } });
    expect(defaultProps.setNewShopifyId).toHaveBeenCalledWith("new-store-id");

    const domainInput = screen.getByLabelText(/Store Domain/i);
    fireEvent.change(domainInput, {
      target: { value: "test-store.myshopify.com" },
    });
    expect(defaultProps.setNewShopifyDomain).toHaveBeenCalledWith(
      "test-store.myshopify.com",
    );

    const tokenInput = screen.getByLabelText(/Shopify API Access Token/i);
    fireEvent.change(tokenInput, { target: { value: "shpat_secret" } });
    expect(defaultProps.setNewShopifyToken).toHaveBeenCalledWith(
      "shpat_secret",
    );
  });

  it("calls handleConnectShopify on form submission", () => {
    render(<ShopifyPanel {...defaultProps} />);

    const submitBtn = screen.getByRole("button", { name: /Connect Store/i });
    const form = submitBtn.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(defaultProps.handleConnectShopify).toHaveBeenCalledTimes(1);
  });

  it("renders list of connected store connections with active and inactive statuses", () => {
    const shopifyConns = [
      {
        id: "conn-1",
        storeDomain: "store1.myshopify.com",
        platform: "shopify",
        isActive: true,
      },
      {
        id: "conn-2",
        storeDomain: "store2.myshopify.com",
        platform: "shopify",
        isActive: false,
      },
    ];

    render(<ShopifyPanel {...defaultProps} shopifyConns={shopifyConns} />);

    expect(screen.getByText("store1.myshopify.com")).toBeInTheDocument();
    expect(screen.getByText("store2.myshopify.com")).toBeInTheDocument();
    expect(screen.getAllByText("SHOPIFY")).toHaveLength(2);
    expect(screen.getByText("Connected")).toHaveClass("badge-success");
    expect(screen.getByText("Inactive")).toHaveClass("badge-error");
  });

  it("disables submit button and displays spinner when loading is true", () => {
    const { container } = render(
      <ShopifyPanel {...defaultProps} loading={true} />,
    );

    const submitBtn = screen.getByRole("button");
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Connect Store")).not.toBeInTheDocument();
    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });
});
