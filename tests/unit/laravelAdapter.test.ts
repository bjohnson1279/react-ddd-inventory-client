import { describe, it, expect, vi, beforeEach } from "vitest";
import { LaravelRESTAdapter } from "../../src/api/laravel";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("LaravelRESTAdapter Comprehensive Suite", () => {
  let adapter: LaravelRESTAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    adapter = new LaravelRESTAdapter();
  });

  describe("Quarantined Items & Resolutions", () => {
    it("should fetch quarantined items and normalize missing fields with defaults", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "q-1",
            sku: "SKU-DEFECT",
            locationId: "LOC-QA",
            quantity: 5,
            reason: "Damaged in transit",
            status: "Quarantined",
            createdAt: "2026-03-01T10:00:00Z",
          },
          {
            id: "q-2",
            variantId: "SKU-FALLBACK",
            // missing locationId, quantity, reason, status, createdAt
          },
        ],
      });
      global.fetch = mockFetch;

      const items = await adapter.getQuarantinedItems("tenant-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/returns/quarantine?tenantId=tenant-1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(items).toHaveLength(2);
      expect(items[0].sku).toBe("SKU-DEFECT");
      expect(items[0].quantity).toBe(5);
      expect(items[0].status).toBe("Quarantined");

      expect(items[1].sku).toBe("SKU-FALLBACK");
      expect(items[1].locationId).toBe("");
      expect(items[1].quantity).toBe(0);
      expect(items[1].reason).toBe("");
      expect(items[1].status).toBe("Quarantined");
      expect(typeof items[1].createdAt).toBe("string");
    });

    it("should return an empty array if getQuarantinedItems throws a network or server error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network failure"));
      global.fetch = mockFetch;

      const items = await adapter.getQuarantinedItems("tenant-1");
      expect(items).toEqual([]);
      errorSpy.mockRestore();
    });

    it("should resolve quarantine item with resolution and tenantId", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.resolveQuarantine("tenant-1", "q-10", "RESTOCKED");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/returns/quarantine/q-10/resolve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-1",
            resolution: "RESTOCKED",
          }),
        }),
      );
    });
  });

  describe("Compliance Ledger, Verification, State Reconstruction & Audit Replay", () => {
    it("should retrieve compliance ledger entries", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            sequenceNumber: 1,
            eventType: "StockAdded",
            timestamp: "2026-01-01",
          },
        ],
      });
      global.fetch = mockFetch;

      const ledger = await adapter.getComplianceLedger("tenant-ledger");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/compliance/ledger?tenantId=tenant-ledger",
        expect.objectContaining({ method: "GET" }),
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0].sequenceNumber).toBe(1);
    });

    it("should verify compliance ledger validity", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      });
      global.fetch = mockFetch;

      const result = await adapter.verifyComplianceLedger("tenant-verify");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/compliance/verify?tenantId=tenant-verify",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.isValid).toBe(true);
    });

    it("should reconstruct state with and without optional timestamp", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: "reconstructed-data" }),
      });
      global.fetch = mockFetch;

      const snapshotWithoutTime =
        await adapter.reconstructState("tenant-recon");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/compliance/reconstruct?tenantId=tenant-recon",
        expect.objectContaining({ method: "GET" }),
      );
      expect(snapshotWithoutTime.snapshot).toBe("reconstructed-data");

      const snapshotWithTime = await adapter.reconstructState(
        "tenant-recon",
        "2026-03-01T12:00:00Z",
      );
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/compliance/reconstruct?tenantId=tenant-recon&timestamp=2026-03-01T12%3A00%3A00Z",
        expect.objectContaining({ method: "GET" }),
      );
      expect(snapshotWithTime.snapshot).toBe("reconstructed-data");
    });

    it("should replay audit events with and without upToTimestamp", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ sequenceNumber: 1, eventType: "CountCompleted" }],
      });
      global.fetch = mockFetch;

      const replayAll = await adapter.replayAudit("tenant-audit");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/compliance/replay?tenantId=tenant-audit",
        expect.objectContaining({ method: "GET" }),
      );
      expect(replayAll).toHaveLength(1);

      const replayTimed = await adapter.replayAudit(
        "tenant-audit",
        "2026-03-01T15:30:00Z",
      );
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/compliance/replay?tenantId=tenant-audit&timestamp=2026-03-01T15%3A30%3A00Z",
        expect.objectContaining({ method: "GET" }),
      );
      expect(replayTimed).toHaveLength(1);
    });
  });

  describe("Cache Management", () => {
    it("should retrieve admin cache statistics", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hits: 150,
          misses: 25,
          hitRatio: 0.857,
          invalidations: 4,
          activeKeysCount: 88,
        }),
      });
      global.fetch = mockFetch;

      const stats = await adapter.getCacheStats();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/admin/cache/stats",
        expect.objectContaining({ method: "GET" }),
      );
      expect(stats.hits).toBe(150);
      expect(stats.hitRatio).toBe(0.857);
    });

    it("should clear cache with and without tenantId parameter", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, clearedKeysCount: 12 }),
      });
      global.fetch = mockFetch;

      const clearTenant = await adapter.clearCache("tenant-clear");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/admin/cache/clear?tenantId=tenant-clear",
        expect.objectContaining({ method: "POST" }),
      );
      expect(clearTenant.success).toBe(true);

      const clearAll = await adapter.clearCache();
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/admin/cache/clear",
        expect.objectContaining({ method: "POST" }),
      );
      expect(clearAll.clearedKeysCount).toBe(12);
    });
  });

  describe("RFID Tags and Simulation", () => {
    it("should retrieve rfid tags and handle response with or without tags key", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: [{ epc: "E28011", sku: "SKU-RFID-1" }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
      global.fetch = mockFetch;

      const tags = await adapter.getRfidTags("tenant-rfid");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/rfid/tags?tenantId=tenant-rfid",
        expect.objectContaining({ method: "GET" }),
      );
      expect(tags).toEqual([{ epc: "E28011", sku: "SKU-RFID-1" }]);

      const emptyTags = await adapter.getRfidTags("tenant-rfid");
      expect(emptyTags).toEqual([]);
    });

    it("should assign RFID tag to sku and serial number", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.assignRfidTag("tenant-rfid", "EPC123", "SKU-1", "SN-999");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/rfid/assign?tenantId=tenant-rfid",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            epc: "EPC123",
            sku: "SKU-1",
            serialNumber: "SN-999",
          }),
        }),
      );
    });

    it("should simulate RFID bulk scan", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.simulateRfidScan("tenant-rfid", "LOC-GATEWAY", [
        "EPC1",
        "EPC2",
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/rfid/simulate-scan?tenantId=tenant-rfid",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            locationId: "LOC-GATEWAY",
            tags: ["EPC1", "EPC2"],
          }),
        }),
      );
    });
  });

  describe("Anomaly Detection and Rebalance Matrix", () => {
    it("should analyze inventory anomalies with optional date filters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          alerts: [{ id: "alt-1", severity: "HIGH" }],
          totalCritical: 0,
          totalHigh: 1,
        }),
      });
      global.fetch = mockFetch;

      const withoutDates =
        await adapter.analyzeInventoryAnomalies("tenant-anomaly");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/anomaly-detection/analyze?tenantId=tenant-anomaly",
        expect.objectContaining({ method: "GET" }),
      );
      expect(withoutDates.totalHigh).toBe(1);

      const withDates = await adapter.analyzeInventoryAnomalies(
        "tenant-anomaly",
        "2026-01-01",
        "2026-01-31",
      );
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/anomaly-detection/analyze?tenantId=tenant-anomaly&startDate=2026-01-01&endDate=2026-01-31",
        expect.objectContaining({ method: "GET" }),
      );
      expect(withDates.alerts).toHaveLength(1);
    });

    it("should get inventory rebalance matrix", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recommendations: [{ sku: "SKU-BAL", transferQty: 20 }],
          summary: "Rebalance planned",
        }),
      });
      global.fetch = mockFetch;

      const matrix = await adapter.getRebalanceMatrix("tenant-matrix");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/rebalance/matrix?tenantId=tenant-matrix",
        expect.objectContaining({ method: "GET" }),
      );
      expect(matrix.summary).toBe("Rebalance planned");
      expect(matrix.recommendations).toHaveLength(1);
    });
  });

  describe("Approval Workflows and Decisions", () => {
    it("should fetch approval workflows and toggle workflow state", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "wf-1", name: "High Value PO", active: true },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "wf-1", active: false }),
        });
      global.fetch = mockFetch;

      const workflows = await adapter.getApprovalWorkflows();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/approvals/workflows",
        expect.objectContaining({ method: "GET" }),
      );
      expect(workflows).toHaveLength(1);

      const toggled = await adapter.toggleApprovalWorkflow("wf-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/approvals/workflows/wf-1/toggle",
        expect.objectContaining({ method: "POST" }),
      );
      expect(toggled.active).toBe(false);
    });

    it("should get pending approvals and submit decision with notes", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "req-10", type: "PO_APPROVAL" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "req-10", status: "APPROVED" }),
        });
      global.fetch = mockFetch;

      const pending = await adapter.getPendingApprovals();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/approvals/pending",
        expect.objectContaining({ method: "GET" }),
      );
      expect(pending).toHaveLength(1);

      const decision = await adapter.submitApprovalDecision(
        "req-10",
        "APPROVED",
        "Approved within budget",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/approvals/req-10/decide",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            decision: "APPROVED",
            notes: "Approved within budget",
          }),
        }),
      );
      expect(decision.status).toBe("APPROVED");
    });

    it("should get approval history and handle fallback when decisions key is missing", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            decisions: [{ id: "dec-1", decision: "APPROVED" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
      global.fetch = mockFetch;

      const history = await adapter.getApprovalHistory("req-10");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/approvals/req-10",
        expect.objectContaining({ method: "GET" }),
      );
      expect(history).toHaveLength(1);

      const emptyHistory = await adapter.getApprovalHistory("req-10");
      expect(emptyHistory).toEqual([]);
    });
  });

  describe("Reporting, Analytics and Dashboard Widgets", () => {
    it("should fetch and create report definitions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "rep-1", name: "Aging Stock Report" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "rep-2", name: "Deadstock Report" }),
        });
      global.fetch = mockFetch;

      const reports = await adapter.getReportDefinitions("tenant-rep");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/reports?tenantId=tenant-rep",
        expect.objectContaining({ method: "GET" }),
      );
      expect(reports).toHaveLength(1);

      const payload = { name: "Deadstock Report", type: "CUSTOM" };
      const created = await adapter.createReportDefinition(
        "tenant-rep",
        payload,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/reports",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ ...payload, tenantId: "tenant-rep" }),
        }),
      );
      expect(created.id).toBe("rep-2");
    });

    it("should schedule and execute reports", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ scheduled: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ executionId: "exec-99" }),
        });
      global.fetch = mockFetch;

      await adapter.scheduleReport("tenant-rep", "rep-1", "0 6 * * 1", "EMAIL");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/reports/rep-1/schedule",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-rep",
            cronExpression: "0 6 * * 1",
            deliveryMethod: "EMAIL",
          }),
        }),
      );

      const exec = await adapter.executeReport("tenant-rep", "rep-1", "PDF");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/reports/rep-1/execute",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-rep",
            format: "PDF",
          }),
        }),
      );
      expect(exec.executionId).toBe("exec-99");
    });

    it("should get and save dashboard widgets", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "wid-1", title: "Stock Turnover" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "wid-2", title: "Aging Distribution" }),
        });
      global.fetch = mockFetch;

      const widgets = await adapter.getDashboardWidgets("tenant-rep");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/widgets?tenantId=tenant-rep",
        expect.objectContaining({ method: "GET" }),
      );
      expect(widgets).toHaveLength(1);

      const saved = await adapter.saveDashboardWidget("tenant-rep", {
        title: "Aging Distribution",
        type: "BAR_CHART",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/widgets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Aging Distribution",
            type: "BAR_CHART",
            tenantId: "tenant-rep",
          }),
        }),
      );
      expect(saved.id).toBe("wid-2");
    });
  });

  describe("Operational Depth: Cycle Counts, ASNs & Notifications", () => {
    it("should start cycle count with optional abcClass and zone", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "cc-100", status: "STARTED" }),
      });
      global.fetch = mockFetch;

      const result = await adapter.startCycleCount(
        "tenant-ops",
        "Quarterly Count",
        true,
        "A",
        "ZONE-NORTH",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/cycle-count/start",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-ops",
            name: "Quarterly Count",
            isBlindCount: true,
            abcClass: "A",
            zone: "ZONE-NORTH",
          }),
        }),
      );
      expect(result.id).toBe("cc-100");
    });

    it("should submit cycle count and list cycle counts", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "cc-100", status: "COMPLETED" }],
        });
      global.fetch = mockFetch;

      await adapter.submitCycleCount("cc-100", [{ sku: "SKU-1", count: 42 }]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/cycle-count/cc-100/submit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            countedLines: [{ sku: "SKU-1", count: 42 }],
          }),
        }),
      );

      const counts = await adapter.getCycleCounts("tenant-ops");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/cycle-count?tenantId=tenant-ops",
        expect.objectContaining({ method: "GET" }),
      );
      expect(counts).toHaveLength(1);
    });

    it("should submit ASN and get ASNs for supplier", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "asn-5", status: "PENDING" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "asn-5", supplierId: "sup-1" }],
        });
      global.fetch = mockFetch;

      const lines = [{ sku: "SKU-1", quantity: 100 }];
      const asn = await adapter.submitASN(
        "tenant-ops",
        "po-55",
        "sup-1",
        "2026-04-01",
        lines,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/supplier/asn",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-ops",
            poId: "po-55",
            supplierId: "sup-1",
            expectedArrivalDate: "2026-04-01",
            lines,
          }),
        }),
      );
      expect(asn.id).toBe("asn-5");

      const asns = await adapter.getASNs("tenant-ops", "sup-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/supplier/asn?tenantId=tenant-ops&supplierId=sup-1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(asns).toHaveLength(1);
    });

    it("should get notifications, mark notification as read, and generate aging report", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "notif-1", read: false }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ summary: { totalAgingItems: 5 } }),
        });
      global.fetch = mockFetch;

      const notifs = await adapter.getNotifications("tenant-ops", "user-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/notifications?tenantId=tenant-ops&userId=user-123",
        expect.objectContaining({ method: "GET" }),
      );
      expect(notifs).toHaveLength(1);

      await adapter.markNotificationRead("notif-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/notifications/notif-1/read",
        expect.objectContaining({ method: "POST" }),
      );

      const agingReport = await adapter.generateAgingReport("tenant-ops");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/aging/report?tenantId=tenant-ops",
        expect.objectContaining({ method: "GET" }),
      );
      expect(agingReport.summary.totalAgingItems).toBe(5);
    });
  });

  describe("Multi-Entity & Intercompany Transfers", () => {
    it("should create legal entity with optional tax identifier and get legal entities", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "entity-1", name: "Global Logistics Ltd" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "entity-1", name: "Global Logistics Ltd" }],
        });
      global.fetch = mockFetch;

      const created = await adapter.createLegalEntity(
        "tenant-multi",
        "Global Logistics Ltd",
        "USD",
        "US-EIN-12345",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/intercompany/entities",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-multi",
            name: "Global Logistics Ltd",
            baseCurrency: "USD",
            taxIdentifier: "US-EIN-12345",
          }),
        }),
      );
      expect(created.id).toBe("entity-1");

      const entities = await adapter.getLegalEntities("tenant-multi");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/intercompany/entities?tenantId=tenant-multi",
        expect.objectContaining({ method: "GET" }),
      );
      expect(entities).toHaveLength(1);
    });

    it("should execute intercompany transfer and get intercompany transfers", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "transfer-10", status: "COMPLETED" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "transfer-10", status: "COMPLETED" }],
        });
      global.fetch = mockFetch;

      const transferDto = {
        tenantId: "tenant-multi",
        fromEntityId: "ent-a",
        toEntityId: "ent-b",
        sku: "SKU-INTER",
        quantity: 50,
        unitCostCents: 1500,
        markupPercentage: 10,
        dutyCents: 150,
      };

      const result = await adapter.executeIntercompanyTransfer(transferDto);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/intercompany/transfers",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(transferDto),
        }),
      );
      expect(result.id).toBe("transfer-10");

      const transfers = await adapter.getIntercompanyTransfers("tenant-multi");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/intercompany/transfers?tenantId=tenant-multi",
        expect.objectContaining({ method: "GET" }),
      );
      expect(transfers).toHaveLength(1);
    });
  });

  describe("API Usage Metrics & Error Handling", () => {
    it("should get API usage metrics", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { endpoint: "/api/products", requests: 1200, avgLatencyMs: 45 },
        ],
      });
      global.fetch = mockFetch;

      const metrics = await adapter.getApiUsageMetrics("tenant-metrics");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/usage?tenantId=tenant-metrics",
        expect.objectContaining({ method: "GET" }),
      );
      expect(metrics).toHaveLength(1);
      expect(metrics[0].requests).toBe(1200);
    });

    it("should parse and throw JSON error when API response is not ok", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({ error: "Invalid transfer request parameters" }),
      });
      global.fetch = mockFetch;

      await expect(adapter.getApiUsageMetrics("tenant-err")).rejects.toThrow(
        "Invalid transfer request parameters",
      );
      errorSpy.mockRestore();
    });

    it("should parse and throw raw text error when API response is not valid JSON", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => "Bad Gateway Error from proxy",
      });
      global.fetch = mockFetch;

      await expect(adapter.getApiUsageMetrics("tenant-err")).rejects.toThrow(
        "Bad Gateway Error from proxy",
      );
      errorSpy.mockRestore();
    });
  });

  describe("Valuation Report & Costing Methods", () => {
    it("should calculate valuation report with attribute formatting and costing method normalization", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/reports/valuation")) {
          return {
            ok: true,
            json: async () => ({ totalValue: 5000 }),
          };
        }
        if (url.includes("/api/catalog/products")) {
          return {
            ok: true,
            json: async () => ({
              products: [
                {
                  id: "prod-1",
                  name: "Industrial Widget",
                  variants: [
                    {
                      id: "v-1",
                      sku: "SKU-WIDGET-BLK",
                      attributes: [
                        { name: "Color", value: "Black" },
                        { name: "Size", value: "Large" },
                      ],
                    },
                    {
                      id: "v-2",
                      sku: "SKU-WIDGET-RED",
                      attributes: [],
                    },
                    {
                      id: "v-3",
                      sku: "SKU-WIDGET-ZERO",
                      attributes: [{ name: "Color", value: "Clear" }],
                    },
                  ],
                },
              ],
            }),
          };
        }
        if (url.includes("/api/inventory/stock")) {
          return {
            ok: true,
            json: async () => [
              { sku: "SKU-WIDGET-BLK", available_quantity: 10 },
              { sku: "SKU-WIDGET-RED", available_quantity: 2 },
              { sku: "SKU-WIDGET-ZERO", available_quantity: 0 },
            ],
          };
        }
        return { ok: true, json: async () => ({}) };
      });
      global.fetch = mockFetch;

      const report = await adapter.getValuationReport(
        "tenant-val",
        "loc-1",
        "lifo",
      );
      expect(report).toHaveLength(3);

      const stockedVariantWithAttrs = report.find(
        (r) => r.sku === "SKU-WIDGET-BLK",
      );
      expect(stockedVariantWithAttrs).toBeDefined();
      expect(stockedVariantWithAttrs?.name).toBe(
        "Industrial Widget (Black, Large)",
      );
      expect(stockedVariantWithAttrs?.costingMethod).toBe("LIFO");
      expect(stockedVariantWithAttrs?.totalQuantity).toBe(10);
      expect(stockedVariantWithAttrs?.unitCostCents).toBe(1000);
      expect(stockedVariantWithAttrs?.totalValueCents).toBe(10000);

      const stockedVariantNoAttrs = report.find(
        (r) => r.sku === "SKU-WIDGET-RED",
      );
      expect(stockedVariantNoAttrs).toBeDefined();
      expect(stockedVariantNoAttrs?.name).toBe("Industrial Widget");
      expect(stockedVariantNoAttrs?.totalQuantity).toBe(2);
      expect(stockedVariantNoAttrs?.totalValueCents).toBe(2000);

      const zeroStockVariant = report.find((r) => r.sku === "SKU-WIDGET-ZERO");
      expect(zeroStockVariant).toBeDefined();
      expect(zeroStockVariant?.name).toBe("Industrial Widget");
      expect(zeroStockVariant?.totalQuantity).toBe(0);
      expect(zeroStockVariant?.totalValueCents).toBe(0);
      expect(zeroStockVariant?.unitCostCents).toBe(0);
    });

    it("should default costing method to FIFO when method is not supplied", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/reports/valuation")) {
          return { ok: true, json: async () => ({}) };
        }
        if (url.includes("/api/catalog/products")) {
          return {
            ok: true,
            json: async () => ({
              products: [
                {
                  id: "prod-2",
                  name: "Simple Item",
                  variants: [{ id: "v-single", sku: "SKU-SINGLE" }],
                },
              ],
            }),
          };
        }
        if (url.includes("/api/inventory/items")) {
          return {
            ok: true,
            json: async () => [{ sku: "SKU-SINGLE", quantity: 1 }],
          };
        }
        return { ok: true, json: async () => ({}) };
      });
      global.fetch = mockFetch;

      const report = await adapter.getValuationReport("tenant-fifo");
      expect(report).toHaveLength(1);
      expect(report[0].costingMethod).toBe("FIFO");
    });

    it("should return empty array if getValuationReport encounters any network failure", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error("Valuation service unavailable"));
      global.fetch = mockFetch;

      const report = await adapter.getValuationReport("tenant-fail");
      expect(report).toEqual([]);
      errorSpy.mockRestore();
    });
  });

  describe("Kit Assembly & Disassembly", () => {
    it("should assemble kit with required parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.assembleKit(
        "tenant-kit",
        "loc-assembly",
        "KIT-BUNDLE-01",
        15,
        "operator-12",
        "ref-asm-999",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/kits/assemble",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-kit",
            locationId: "loc-assembly",
            kitSku: "KIT-BUNDLE-01",
            quantity: 15,
            actorId: "operator-12",
            referenceId: "ref-asm-999",
          }),
        }),
      );
    });

    it("should disassemble kit with required parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.disassembleKit(
        "tenant-kit",
        "loc-teardown",
        "KIT-BUNDLE-02",
        5,
        "operator-34",
        "ref-dis-888",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/kits/disassemble",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-kit",
            locationId: "loc-teardown",
            kitSku: "KIT-BUNDLE-02",
            quantity: 5,
            actorId: "operator-34",
            referenceId: "ref-dis-888",
          }),
        }),
      );
    });
  });

  describe("Role & Permission Management", () => {
    it("should create role with permissions and return created role", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "role-101",
          name: "Inventory Manager",
          description: "Full stock control",
          permissions: ["PERM_READ", "PERM_WRITE"],
        }),
      });
      global.fetch = mockFetch;

      const role = await adapter.createRole(
        "tenant-roles",
        "Inventory Manager",
        "Full stock control",
        ["PERM_READ", "PERM_WRITE"],
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/roles",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-roles",
            name: "Inventory Manager",
            description: "Full stock control",
            permissionIds: ["PERM_READ", "PERM_WRITE"],
          }),
        }),
      );
      expect(role.id).toBe("role-101");
      expect(role.name).toBe("Inventory Manager");
    });

    it("should update role permissions with properly encoded roleId", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.updateRolePermissions("role:warehouse/supervisor", [
        "PERM_SCAN",
        "PERM_TRANSFER",
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/roles/role%3Awarehouse%2Fsupervisor/permissions",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            permissionIds: ["PERM_SCAN", "PERM_TRANSFER"],
          }),
        }),
      );
    });

    it("should delete role with properly encoded roleId", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.deleteRole("role#qa-temp");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/roles/role%23qa-temp",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("Auditing & Discrepancies", () => {
    it("should run audit for tenant", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ auditId: "aud-77", status: "IN_PROGRESS" }),
      });
      global.fetch = mockFetch;

      const res = await adapter.runAudit("tenant-audit-run");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/audit/run",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-audit-run" }),
        }),
      );
      expect(res.auditId).toBe("aud-77");
    });

    it("should get discrepancies and handle fallback to empty array if response is falsy", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "disc-1", sku: "SKU-MISMATCH", discrepancy: -2 },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null,
        });
      global.fetch = mockFetch;

      const discrepancies = await adapter.getDiscrepancies("tenant-audit-disc");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/audit/discrepancies?tenantId=tenant-audit-disc",
        expect.objectContaining({ method: "GET" }),
      );
      expect(discrepancies).toHaveLength(1);

      const empty = await adapter.getDiscrepancies("tenant-audit-disc");
      expect(empty).toEqual([]);
    });

    it("should resolve discrepancy with encoded id and notes", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.resolveDiscrepancy(
        "tenant-disc",
        "disc/zone-A/01",
        "Reconciled after physical recount",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/audit/discrepancies/disc%2Fzone-A%2F01/resolve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-disc",
            notes: "Reconciled after physical recount",
          }),
        }),
      );
    });
  });

  describe("Outbox Events & Dead Letter Queue", () => {
    it("should retrieve outbox stats with default zero fallback values on error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pending: 4, published: 12, failed: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockRejectedValueOnce(new Error("Stats endpoint down"));
      global.fetch = mockFetch;

      const stats1 = await adapter.getOutboxStats();
      expect(stats1).toEqual({
        pendingCount: 4,
        publishedCount: 12,
        failedCount: 1,
      });

      const statsEmpty = await adapter.getOutboxStats();
      expect(statsEmpty).toEqual({
        pendingCount: 0,
        publishedCount: 0,
        failedCount: 0,
      });

      const statsErr = await adapter.getOutboxStats();
      expect(statsErr).toEqual({
        pendingCount: 0,
        publishedCount: 0,
        failedCount: 0,
      });
      errorSpy.mockRestore();
    });

    it("should fetch dead letter events and map normalized fields with limit query param", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "dl-1",
              eventType: "OrderCancelled",
              payload: { orderId: "ord-99" },
              error: "Consumer timeout",
              status: "DeadLetter",
              occurredAt: "2026-03-01T08:00:00Z",
            },
            {
              id: "dl-2",
              type: "PaymentFailed",
              payload: '{"raw":true}',
              errorMessage: "Card declined",
              createdAt: "2026-03-01T09:00:00Z",
            },
            {
              id: "dl-3",
              // tests all default fallbacks
            },
          ],
        })
        .mockRejectedValueOnce(new Error("DLQ unavailable"));
      global.fetch = mockFetch;

      const eventsWithLimit = await adapter.getDeadLetterEvents(50);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/outbox/dead-letter?limit=50",
        expect.objectContaining({ method: "GET" }),
      );
      expect(eventsWithLimit).toHaveLength(3);

      expect(eventsWithLimit[0]).toEqual({
        id: "dl-1",
        eventType: "OrderCancelled",
        payload: JSON.stringify({ orderId: "ord-99" }),
        error: "Consumer timeout",
        status: "DeadLetter",
        occurredAt: "2026-03-01T08:00:00Z",
      });

      expect(eventsWithLimit[1]).toEqual({
        id: "dl-2",
        eventType: "PaymentFailed",
        payload: '{"raw":true}',
        error: "Card declined",
        status: "Failed",
        occurredAt: "2026-03-01T09:00:00Z",
      });

      expect(eventsWithLimit[2].eventType).toBe("UnknownEvent");
      expect(eventsWithLimit[2].error).toBe("");
      expect(eventsWithLimit[2].status).toBe("Failed");
      expect(typeof eventsWithLimit[2].occurredAt).toBe("string");

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const eventsOnError = await adapter.getDeadLetterEvents();
      expect(eventsOnError).toEqual([]);
      errorSpy.mockRestore();
    });

    it("should retry outbox event with encoded event id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.retryOutboxEvent("event/uuid-999");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/outbox/event%2Fuuid-999/retry",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("Tenant Configuration & LocalStorage Persistence", () => {
    it("should return default tenant config when none exists in localStorage", async () => {
      const config = await adapter.getTenantConfig("tenant-default-cfg");
      expect(config).toEqual({
        tenantId: "tenant-default-cfg",
        accountingMethod: "ACCRUAL",
        costingMethod: "FIFO",
        currencyCode: "USD",
        fiscalYearStart: "01-01",
      });
    });

    it("should save and retrieve tenant config from localStorage", async () => {
      await adapter.saveTenantConfig("tenant-custom-cfg", {
        accountingMethod: "CASH",
        costingMethod: "AVERAGE",
      });

      const saved = await adapter.getTenantConfig("tenant-custom-cfg");
      expect(saved).toEqual({
        tenantId: "tenant-custom-cfg",
        accountingMethod: "CASH",
        costingMethod: "AVERAGE",
        currencyCode: "USD",
        fiscalYearStart: "01-01",
      });
    });
  });

  describe("Server-Sent Events: subscribeRfidScans", () => {
    it("should parse SSE stream events, handle string and object messages, and support unsubscribe", async () => {
      const ssePayload1 = {
        type: "rfid_scan_processed",
        message: JSON.stringify({
          id: "scan-evt-1",
          tenantId: "tenant-sse",
          locationId: "LOC-DOCK",
          totalCount: 10,
          matchedCount: 8,
          unmatchedCount: 2,
          unmatchedEpcs: ["EPC-UNMATCHED-1", "EPC-UNMATCHED-2"],
        }),
      };

      const ssePayload2 = {
        type: "rfid_scan_processed",
        id: "scan-evt-2",
        tenantId: "tenant-sse",
        locationId: "LOC-AISLE",
        totalCount: 5,
        matchedCount: 5,
        unmatchedCount: 0,
        unmatchedEpcs: [],
      };

      const streamChunks = [
        `data: ${JSON.stringify(ssePayload1)}\n\n`,
        `data: ${JSON.stringify(ssePayload2)}\n\n`,
      ];

      let chunkIdx = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(async () => {
          if (chunkIdx < streamChunks.length) {
            const encoder = new TextEncoder();
            const chunk = encoder.encode(streamChunks[chunkIdx++]);
            return { done: false, value: chunk };
          }
          return { done: true, value: undefined };
        }),
      };

      localStorage.setItem("auth_token", "test-sse-jwt-token");
      const mockFetch = vi.fn().mockResolvedValue({
        body: {
          getReader: () => mockReader,
        },
      });
      global.fetch = mockFetch;

      const receivedEvents: any[] = [];
      const unsubscribe = adapter.subscribeRfidScans("tenant-sse", (evt) => {
        receivedEvents.push(evt);
      });

      expect(typeof unsubscribe).toBe("function");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/notifications/subscribe",
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "text/event-stream",
            Authorization: "Bearer test-sse-jwt-token",
          }),
        }),
      );

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].id).toBe("scan-evt-1");
      expect(receivedEvents[0].matchedCount).toBe(8);
      expect(receivedEvents[1].id).toBe("scan-evt-2");
      expect(receivedEvents[1].matchedCount).toBe(5);

      unsubscribe();
    });

    it("should handle SSE stream parse errors and missing reader without throwing", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const streamChunks = ["data: invalid-json-line\n\n"];
      let chunkIdx = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(async () => {
          if (chunkIdx < streamChunks.length) {
            const encoder = new TextEncoder();
            const chunk = encoder.encode(streamChunks[chunkIdx++]);
            return { done: false, value: chunk };
          }
          return { done: true, value: undefined };
        }),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        body: {
          getReader: () => mockReader,
        },
      });
      global.fetch = mockFetch;

      const callback = vi.fn();
      adapter.subscribeRfidScans("tenant-err", callback);

      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(callback).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
