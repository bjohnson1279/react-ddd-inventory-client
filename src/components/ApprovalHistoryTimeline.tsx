import React from 'react';

export interface ApprovalHistoryTimelineProps {
  decisions: Array<{
    id: string;
    stepIndex: number;
    deciderId: string;
    decision: 'APPROVED' | 'REJECTED';
    notes?: string;
    decidedAt: string;
  }>;
}

export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({ decisions }) => {
  if (!decisions || decisions.length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '16px', padding: '16px', background: '#0f172a', borderRadius: '8px' }}>
        No decisions recorded yet.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#e2e8f0', fontSize: '16px' }}>Approval History</h4>
      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        {/* Vertical timeline line */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '7px',
          width: '2px',
          background: '#334155',
          zIndex: 0
        }} />

        {decisions.map((dec, index) => {
          const isApproved = dec.decision === 'APPROVED';
          const dotColor = isApproved ? '#10b981' : '#ef4444';

          return (
            <div key={dec.id} style={{ position: 'relative', marginBottom: index === decisions.length - 1 ? 0 : '24px', zIndex: 1 }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute',
                left: '-24px',
                top: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#1e293b',
                border: `2px solid ${dotColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }} />
              </div>

              {/* Content box */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(4px)',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: '#0f172a',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#cbd5e1'
                    }}>
                      Step {dec.stepIndex + 1}
                    </span>
                    <span style={{ color: '#f8fafc', fontWeight: 500, fontSize: '14px' }}>
                      {dec.deciderId}
                    </span>
                  </div>
                  <span style={{
                    color: dotColor,
                    fontWeight: 600,
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>
                    {dec.decision}
                  </span>
                </div>

                {dec.notes && (
                  <p style={{ margin: '0 0 8px 0', color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic' }}>
                    "{dec.notes}"
                  </p>
                )}

                <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                  {new Date(dec.decidedAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
