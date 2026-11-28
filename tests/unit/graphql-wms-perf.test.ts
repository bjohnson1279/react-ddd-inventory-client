import { describe, it, expect, beforeEach } from "vitest";
import { GraphQLAdapter } from "../../src/api/graphql";

describe("GraphQLAdapter Warehouse Locations Performance & Functional Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should correctly handle full CRUD lifecycle of warehouse locations", async () => {
    const adapter = new GraphQLAdapter(
      "http://localhost:4000/graphql",
      "token",
    );
    const tenantId = "tenant-crud";

    // Defaults
    const defaults = await adapter.getWarehouseLocations(tenantId);
    expect(defaults).toHaveLength(2);
    expect(defaults[0].id).toBe("LOC-CENTRAL");

    // Add new location
    await adapter.saveWarehouseLocation(tenantId, {
      id: "LOC-TEST",
      warehouseId: "WH-TEST",
      zone: "Z-1",
      maxWeightGrams: 10000,
      maxVolumeCubicMeters: 5,
    });

    let current = await adapter.getWarehouseLocations(tenantId);
    expect(current).toHaveLength(3);
    expect(current.find((l) => l.id === "LOC-TEST")?.zone).toBe("Z-1");

    // Update existing location
    await adapter.saveWarehouseLocation(tenantId, {
      id: "LOC-TEST",
      warehouseId: "WH-TEST",
      zone: "Z-1-UPDATED",
      maxWeightGrams: 12000,
      maxVolumeCubicMeters: 6,
    });

    current = await adapter.getWarehouseLocations(tenantId);
    expect(current).toHaveLength(3);
    expect(current.find((l) => l.id === "LOC-TEST")?.zone).toBe("Z-1-UPDATED");

    // Delete location
    await adapter.deleteWarehouseLocation(tenantId, "LOC-TEST");
    current = await adapter.getWarehouseLocations(tenantId);
    expect(current).toHaveLength(2);
    expect(current.find((l) => l.id === "LOC-TEST")).toBeUndefined();
  });

  it("should benchmark efficient saveWarehouseLocation with cached locations list", async () => {
    const adapter = new GraphQLAdapter(
      "http://localhost:4000/graphql",
      "token",
    );
    const tenantId = "tenant-perf";

    const initialLocations = [];
    for (let i = 0; i < 2000; i++) {
      initialLocations.push({
        id: `LOC-${i}`,
        warehouseId: `WH-${i % 10}`,
        zone: `Z-${i % 5}`,
        maxWeightGrams: 50000,
        maxVolumeCubicMeters: 10,
      });
    }
    localStorage.setItem(
      `gql_wms_locations_${tenantId}`,
      JSON.stringify(initialLocations),
    );

    // Warm up the cache
    await adapter.getWarehouseLocations(tenantId);

    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      await adapter.saveWarehouseLocation(tenantId, {
        id: `LOC-${i}`,
        warehouseId: `WH-${i % 10}`,
        zone: `Z-${i % 5}-MODIFIED`,
        maxWeightGrams: 55000,
        maxVolumeCubicMeters: 12,
      });
    }
    const duration = performance.now() - start;
    console.log(
      `[saveWarehouseLocation Benchmark] Saved 200 updates across 2,000 locations in ${duration.toFixed(2)}ms`,
    );

    expect(duration).toBeLessThan(400);

    const updatedLocations = await adapter.getWarehouseLocations(tenantId);
    expect(updatedLocations).toHaveLength(2000);
    expect(updatedLocations[0].zone).toBe("Z-0-MODIFIED");
  });
});
