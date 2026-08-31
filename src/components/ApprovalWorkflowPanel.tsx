import React, { useState, useEffect } from "react";

interface Workflow {
  id: string;
  triggerEvent: string;
  isActive: boolean;
  steps: { roleId: string; minApprovals: number; timeoutHours: number }[];
}

interface ApprovalWorkflowPanelProps {
  api?: any;
}

export const ApprovalWorkflowPanel: React.FC<ApprovalWorkflowPanelProps> = ({
  api,
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    const activeToken = localStorage.getItem("auth_token") || "";
    try {
      if (api && api.getApprovalWorkflows) {
        const data = await api.getApprovalWorkflows();
        setWorkflows(data);
      } else {
        const response = await fetch("/api/approval/workflows", {
          headers: {
            ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          },
        });
        const data = await response.json();
        setWorkflows(data.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch workflows");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    const activeToken = localStorage.getItem("auth_token") || "";
    try {
      if (api && api.toggleApprovalWorkflow) {
        await api.toggleApprovalWorkflow(id);
      } else {
        await fetch(`/api/approval/workflows/${id}/toggle`, {
          method: "POST",
          headers: {
            ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          },
        });
      }
      fetchWorkflows();
    } catch (err: any) {
      setError(err.message || "Failed to toggle workflow");
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
          Approval Workflow Configuration
        </h2>
        <p style={{ color: "#94a3b8", marginTop: "4px", fontSize: "14px" }}>
          Define multi-step approval chains for sensitive domain actions like
          Purchase Order placement or Inventory write-offs.
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
            alignItems: "center"
          }}
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      )}

      {loading && workflows.length === 0 ? (
        <p>Loading workflows...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {workflows.map((wf) => (
            <div
              key={wf.id}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "18px", color: "#e2e8f0" }}>
                  {wf.triggerEvent}
                </h3>
                <button
                  onClick={() => handleToggle(wf.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "bold",
                    background: wf.isActive ? "#065f46" : "#475569",
                    color: wf.isActive ? "#34d399" : "#cbd5e1",
                  }}
                >
                  {wf.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              <div style={{ marginTop: "12px" }}>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    color: "#94a3b8",
                  }}
                >
                  Approval Steps
                </h4>
                {wf.steps.length > 0 ? (
                  <ol
                    style={{ paddingLeft: "20px", margin: 0, color: "#cbd5e1" }}
                  >
                    {wf.steps.map((step, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>
                        Role: <strong>{step.roleId}</strong> | Requires:{" "}
                        {step.minApprovals} approval(s)
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                    No steps configured.
                  </p>
                )}
              </div>
            </div>
          ))}

          {workflows.length === 0 && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#94a3b8",
                background: "#1e293b",
                borderRadius: "8px",
                border: "1px dashed #334155",
              }}
            >
              No approval workflows configured yet.
              <br />
              <button
                style={{
                  marginTop: "12px",
                  padding: "8px 16px",
                  background: "#38bdf8",
                  color: "#0f172a",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Create New Workflow
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
