import React from "react";
import type { BackendType } from "../api/client";
import { Spinner } from "./Panels";

export interface AuthViewProps {
  backendType: BackendType;
  setBackendType: (type: BackendType) => void;
  loginTenant: string;
  setLoginTenant: (tenant: string) => void;
  loginActor: string;
  setLoginActor: (actor: string) => void;
  loginRole: string;
  setLoginRole: (role: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  loading: boolean;
  message: {
    type: "success" | "error";
    text: string;
  } | null;
}

export const AuthView: React.FC<AuthViewProps> = ({
  backendType,
  setBackendType,
  loginTenant,
  setLoginTenant,
  loginActor,
  setLoginActor,
  loginRole,
  setLoginRole,
  loginPassword,
  setLoginPassword,
  handleLogin,
  loading,
  message,
}) => {
  return (
    <div
      className="flex-center"
      style={{ minHeight: "100vh", padding: "2rem" }}
    >
      <div className="glass-panel" style={{ maxWidth: "480px", width: "100%" }}>
        <div
          className="brand-section"
          style={{ justifyContent: "center", marginBottom: "2rem" }}
        >
          <div className="brand-icon">📦</div>
          <div className="brand-name">INVENTORY CLIENT</div>
        </div>

        <div
          className="control-item"
          style={{ marginBottom: "1.5rem", justifyContent: "center" }}
        >
          <label htmlFor="backend-api-node">Backend API Node:</label>
          <select
            id="backend-api-node"
            value={backendType}
            onChange={(e) => setBackendType(e.target.value as BackendType)}
            style={{ padding: "0.4rem 1rem", marginLeft: "0.5rem" }}
          >
            <option value="graphql">GraphQL API (Port 4000)</option>
            <option value="express">Express REST API (Port 5000)</option>
            <option value="laravel">Laravel REST API (Port 8000)</option>
            <option value="python">Python REST API (Port 8001)</option>
          </select>
        </div>

        <h2 className="form-section-title" style={{ textAlign: "center" }}>
          System Authentication
        </h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login-tenant-id">Tenant ID</label>
            <input
              id="login-tenant-id"
              type="text"
              value={loginTenant}
              onChange={(e) => setLoginTenant(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-actor-id">Actor ID / Email</label>
            <input
              id="login-actor-id"
              type="text"
              value={loginActor}
              onChange={(e) => setLoginActor(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-role">Assigned Role</label>
            <select
              id="login-role"
              value={loginRole}
              onChange={(e) => setLoginRole(e.target.value)}
            >
              <option value="admin">Administrator</option>
              <option value="warehouse_operator">Warehouse Operator</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">System Observer</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Secure Key / Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <Spinner /> : "Authenticate Credentials"}
          </button>
        </form>

        {message && (
          <div
            role="alert"
            aria-live="assertive"
            className={`alert-box alert-${message.type}`}
            style={{ textAlign: "center" }}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};
