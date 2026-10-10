import React, { useState, useEffect } from "react";

interface ApprovalRequest {
  id: string;
  triggerEvent: string;
  status: string;
  requesterId: string;
  createdAt: string;
  payload: any;
}

import { InventoryClient } from "../api/client";

interface ApprovalInboxPanelProps {
  api: InventoryClient;
  tenantId: string;
}

export const ApprovalInboxPanel: React.FC<ApprovalInboxPanelProps> = ({
  api,
  tenantId,
}) => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const activeToken = localStorage.getItem("auth_token") || "";
    try {
      if (api && api.getPendingApprovals) {
        const data = await api.getPendingApprovals();
        setRequests(data);
      } else {
        const response = await fetch("/api/approval/pending", {
          headers: {
            ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          },
        });
        const data = await response.json();
        setRequests(data.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (
    id: string,
    decision: "APPROVED" | "REJECTED",
  ) => {
    const activeToken = localStorage.getItem("auth_token") || "";
    try {
      if (api && api.submitApprovalDecision) {
        await api.submitApprovalDecision(id, decision, "Reviewed via UI");
      } else {
        await fetch(`/api/approval/requests/${id}/decision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          },
          body: JSON.stringify({ decision, notes: "Reviewed via UI" }),
        });
      }
      fetchRequests();
    } catch (err: any) {
      setError(err.message || `Failed to submit decision: ${decision}`);
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#0f172a",
        color: "#f8fafc",
        borderRadius: "12px",
        minHeight: "600px",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #334155",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#38bdf8",
            margin: 0,
          }}
        >
          Approval Inbox
          {requests.length > 0 && (
            <span
              style={{
                marginLeft: "12px",
                background: "#e11d48",
                color: "white",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "14px",
                verticalAlign: "middle",
              }}
            >
              {requests.length}
            </span>
          )}
        </h2>
        <p style={{ color: "#94a3b8", marginTop: "4px", fontSize: "14px" }}>
          Review and approve or reject intercepted domain actions that require
          your authorization.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            background: "#7f1d1d",
            color: "#fca5a5",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            title="Dismiss error"
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {loading && requests.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg
            className="animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: "20px", height: "20px" }}
          >
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          Loading inbox...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {requests.map((req) => (
            <div
              key={req.id}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "18px",
                    color: "#e2e8f0",
                  }}
                >
                  {req.triggerEvent}
                </h3>
                <p
                  style={{
                    margin: "0 0 4px 0",
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  Requested By:{" "}
                  <span style={{ color: "#cbd5e1" }}>{req.requesterId}</span>
                </p>
                <p
                  style={{
                    margin: "0 0 8px 0",
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  Date:{" "}
                  <span style={{ color: "#cbd5e1" }}>
                    {new Date(req.createdAt).toLocaleString()}
                  </span>
                </p>
                <pre
                  style={{
                    background: "#0f172a",
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#34d399",
                    margin: 0,
                    overflowX: "auto",
                    maxWidth: "400px",
                  }}
                >
                  {JSON.stringify(req.payload, null, 2)}
                </pre>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  justifyContent: "center",
                }}
              >
                <button
                  disabled={loading}
                  aria-busy={loading}
                  onClick={() => handleDecision(req.id, "APPROVED")}
                  aria-label={`Approve request ${req.id}`}
                  style={{
                    padding: "10px 16px",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Approve
                </button>
                <button
                  disabled={loading}
                  aria-busy={loading}
                  onClick={() => handleDecision(req.id, "REJECTED")}
                  aria-label={`Reject request ${req.id}`}
                  style={{
                    padding: "10px 16px",
                    background: "transparent",
                    color: "#f87171",
                    border: "1px solid #7f1d1d",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "#94a3b8",
                background: "#1e293b",
                borderRadius: "8px",
                border: "1px dashed #334155",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", color: "#cbd5e1" }}>
                You're all caught up!
              </h3>
              <p style={{ margin: 0 }}>
                No pending approvals require your attention.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
