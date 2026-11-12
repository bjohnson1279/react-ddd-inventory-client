import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuthView, AuthViewProps } from "../../src/components/AuthView";
import "@testing-library/jest-dom";

describe("AuthView Component", () => {
  const defaultProps: AuthViewProps = {
    backendType: "express",
    setBackendType: vi.fn(),
    loginTenant: "tenant-1",
    setLoginTenant: vi.fn(),
    loginActor: "admin-user",
    setLoginActor: vi.fn(),
    loginRole: "admin",
    setLoginRole: vi.fn(),
    loginPassword: "",
    setLoginPassword: vi.fn(),
    handleLogin: vi.fn((e) => e.preventDefault()),
    loading: false,
    message: null,
  };

  it("renders authentication layout, branding, and input controls", () => {
    render(<AuthView {...defaultProps} />);

    expect(screen.getByText("INVENTORY CLIENT")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "System Authentication" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Backend API Node:")).toHaveValue("express");
    expect(screen.getByLabelText("Tenant ID")).toHaveValue("tenant-1");
    expect(screen.getByLabelText("Actor ID / Email")).toHaveValue("admin-user");
    expect(screen.getByLabelText("Assigned Role")).toHaveValue("admin");
    expect(screen.getByLabelText("Secure Key / Password")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Authenticate Credentials" }),
    ).toBeInTheDocument();
  });

  it("triggers setBackendType when backend selector is changed", () => {
    const setBackendType = vi.fn();
    render(<AuthView {...defaultProps} setBackendType={setBackendType} />);

    const select = screen.getByLabelText("Backend API Node:");
    fireEvent.change(select, { target: { value: "python" } });

    expect(setBackendType).toHaveBeenCalledWith("python");
  });

  it("triggers input change handlers for login fields", () => {
    const setLoginTenant = vi.fn();
    const setLoginActor = vi.fn();
    const setLoginRole = vi.fn();
    const setLoginPassword = vi.fn();

    render(
      <AuthView
        {...defaultProps}
        setLoginTenant={setLoginTenant}
        setLoginActor={setLoginActor}
        setLoginRole={setLoginRole}
        setLoginPassword={setLoginPassword}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tenant ID"), {
      target: { value: "tenant-2" },
    });
    expect(setLoginTenant).toHaveBeenCalledWith("tenant-2");

    fireEvent.change(screen.getByLabelText("Actor ID / Email"), {
      target: { value: "operator-1" },
    });
    expect(setLoginActor).toHaveBeenCalledWith("operator-1");

    fireEvent.change(screen.getByLabelText("Assigned Role"), {
      target: { value: "warehouse_operator" },
    });
    expect(setLoginRole).toHaveBeenCalledWith("warehouse_operator");

    fireEvent.change(screen.getByLabelText("Secure Key / Password"), {
      target: { value: "secret123" },
    });
    expect(setLoginPassword).toHaveBeenCalledWith("secret123");
  });

  it("submits the form when submit button is pressed", () => {
    const handleLogin = vi.fn((e) => e.preventDefault());
    render(<AuthView {...defaultProps} handleLogin={handleLogin} />);

    fireEvent.submit(
      screen.getByRole("button", { name: "Authenticate Credentials" }),
    );
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  it("displays spinner and aria-busy when loading", () => {
    render(<AuthView {...defaultProps} loading={true} />);

    const submitBtn = screen.getByRole("button");
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");
    expect(submitBtn.querySelector(".spinner")).toBeInTheDocument();
  });

  it("displays success and error alert messages", () => {
    const { rerender } = render(
      <AuthView
        {...defaultProps}
        message={{ type: "error", text: "Invalid credentials provided." }}
      />,
    );

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveClass("alert-error");
    expect(errorAlert).toHaveTextContent("Invalid credentials provided.");

    rerender(
      <AuthView
        {...defaultProps}
        message={{ type: "success", text: "Login successful!" }}
      />,
    );

    const successAlert = screen.getByRole("alert");
    expect(successAlert).toHaveClass("alert-success");
    expect(successAlert).toHaveTextContent("Login successful!");
  });
});
