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
});
