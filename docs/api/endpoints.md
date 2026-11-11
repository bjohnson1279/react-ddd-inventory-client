# REST API Reference & Specifications

This reference documents core REST endpoints utilized by the React DDD Inventory Client across backend adapters (Express, Laravel, and Python).

---

## 📦 Inventory Endpoints

### 1. `GET /api/inventory`

Lists current inventory stock records across locations.

- **HTTP Method**: `GET`
- **Route Path**: `/api/inventory`
- **Parameters**:
  - `tenantId` (*Query, Optional*): Filter records for a specific tenant ID.
  - `locationId` (*Query, Optional*): Filter records by storage location ID.
  - `sku` (*Query, Optional*): Filter by specific item SKU.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of inventory items.
    ```json
    [
      {
        "id": "inv_12345",
        "sku": "WIDGET-BLK-M",
        "quantity": 150,
        "locationId": "loc_bay_01",
        "version": 3
      }
    ]
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by the Operations Dashboard, WMS Heat Map, and Inventory Aging views to render real-time bin and stock levels.

---

### 2. `POST /api/inventory`

Creates or updates an inventory stock level entry.

- **HTTP Method**: `POST`
- **Route Path**: `/api/inventory`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "sku": "string (Required)",
    "locationId": "string (Required)",
    "quantity": "number (Required)",
    "tenantId": "string (Optional)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`:
    ```json
    {
      "id": "inv_12345",
      "sku": "WIDGET-BLK-M",
      "locationId": "loc_bay_01",
      "quantity": 150,
      "updatedAt": "2026-11-02T12:00:00Z"
    }
    ```
  - `400 Bad Request`: Missing mandatory fields (`sku`, `locationId`, or `quantity`).
  - `401 Unauthorized`: Missing or invalid authentication credentials.
- **Workflow Context**:
  Invoked when performing manual adjustments, receiving goods, or processing physical cycle count adjustments.

---

## 📜 Compliance & Audit Endpoints

### 3. `GET /api/compliance/ledger`

Retrieves immutable compliance ledger audit events with cryptographic sequencing.

- **HTTP Method**: `GET`
- **Route Path**: `/api/compliance/ledger`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token.
- **Request Body**: None.
- **Responses**:
  - `200 OK`:
    ```json
    [
      {
        "sequenceNumber": 1042,
        "tenantId": "tenant_default",
        "eventType": "STOCK_ADJUSTMENT",
        "payloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "previousHash": "d41d8cd98f00b204e9800998ecf8427e",
        "timestamp": "2026-11-02T10:15:30Z"
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` query parameter.
  - `401 Unauthorized`: Unauthenticated request.
- **Workflow Context**:
  Powers the Financial & Compliance Ledger panel to verify chain-of-custody integrity and point-in-time state reconstruction.

---

## 🏷️ Catalog & Product Endpoints

### 4. `DELETE /api/products/{id}`

Removes or archives a product and its associated variants from the catalog.

- **HTTP Method**: `DELETE`
- **Route Path**: `/api/products/{id}`
- **Parameters**:
  - `id` (*Path, Required*): The unique identifier of the product to delete.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token.
- **Request Body**: None.
- **Responses**:
  - `200 OK` or `204 No Content`:
    ```json
    {
      "success": true,
      "deletedId": "prod_987"
    }
    ```
  - `400 Bad Request`: Invalid product ID format.
  - `404 Not Found`: Product ID does not exist.
  - `409 Conflict`: Product has active stock on hand across locations and cannot be purged.
- **Workflow Context**:
  Used by catalog administrators in the Products panel when decommissioning obsolete items.

---

## 📊 Valuation & Reporting Endpoints

### 5. `GET /api/reports/valuation`

Generates inventory valuation analysis broken down by costing methodologies (FIFO, LIFO, WAC).

- **HTTP Method**: `GET`
- **Route Path**: `/api/reports/valuation`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `locationId` (*Query, Optional*): Filter valuation to a specific warehouse facility.
  - `method` (*Query, Optional*): Valuation costing method (`FIFO`, `LIFO`, `WAC`). Defaults to `FIFO`.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token.
- **Request Body**: None.
- **Responses**:
  - `200 OK`:
    ```json
    [
      {
        "sku": "WIDGET-BLK-M",
        "name": "Widget Black Medium",
        "totalQuantity": 150,
        "unitCostCents": 1250,
        "totalValueCents": 187500,
        "costingMethod": "FIFO"
      }
    ]
    ```
  - `400 Bad Request`: Invalid costing method or missing `tenantId`.
  - `401 Unauthorized`: Lacking financial permissions.
- **Workflow Context**:
  Used by general ledger accounting and CFO reporting dashboards to analyze asset value and inventory turnover.

---

## 🛒 Procurement Endpoints

### 6. `POST /api/purchase-orders`

Creates a new purchase order draft for replenishing stock from suppliers.

- **HTTP Method**: `POST`
- **Route Path**: `/api/purchase-orders`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token.
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "supplier": "string (Required)",
    "items": [
      {
        "sku": "string (Required)",
        "quantity": "number (Required)",
        "unitCostCents": "number (Optional)"
      }
    ]
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": "po_90210",
      "status": "DRAFT",
      "supplier": "Acme Supplies Co.",
      "itemsCount": 1,
      "createdAt": "2026-11-02T12:30:00Z"
    }
    ```
  - `400 Bad Request`: Missing supplier, tenantId, or empty line items.
  - `401 Unauthorized`: Unauthenticated request.
- **Workflow Context**:
  Initiates the procurement replenishment cycle (Draft → Approve → Send → Receive) triggered either manually in the Procurement Panel or automatically via ROP safety stock evaluation.

---

## 🪝 Webhook Endpoints

### 7. `GET /api/webhooks`

Lists active outbound webhook subscriptions configured for a tenant.

- **HTTP Method**: `GET`
- **Route Path**: `/api/webhooks`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of webhook subscriptions.
    ```json
    [
      {
        "id": "wh_01h9x",
        "tenantId": "tenant_default",
        "url": "https://api.thirdparty.com/webhook",
        "eventTypes": [
          "StockReceived",
          "LowStockDetected"
        ]
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by the Webhooks Panel to display all registered outbound event subscription URLs and their subscribed event topics.

---

### 8. `POST /api/webhooks`

Registers a new outbound webhook subscription for inventory events.

- **HTTP Method**: `POST`
- **Route Path**: `/api/webhooks`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "url": "string (Required)",
    "eventTypes": "string[] (Required)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`:
    ```json
    {
      "id": "wh_01h9x",
      "tenantId": "tenant_default",
      "url": "https://api.thirdparty.com/webhook",
      "eventTypes": [
        "StockReceived",
        "LowStockDetected"
      ]
    }
    ```
  - `400 Bad Request`: Missing or invalid `url`, `tenantId`, or `eventTypes` array.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Invoked when an administrator registers an external endpoint in the Webhooks Panel to receive real-time inventory notifications.

---

### 9. `DELETE /api/webhooks/{id}`

Removes an existing outbound webhook subscription.

- **HTTP Method**: `DELETE`
- **Route Path**: `/api/webhooks/{id}`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the webhook subscription to remove.
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK` or `204 No Content`:
    ```json
    {
      "success": true,
      "deletedId": "wh_01h9x"
    }
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Webhook subscription with specified ID does not exist.
- **Workflow Context**:
  Used in the Webhooks Panel when revoking or unsubscribing an external webhook endpoint.

---

### 10. `GET /api/webhooks/deliveries`

Retrieves audit and retry logs for recent outbound webhook deliveries.

- **HTTP Method**: `GET`
- **Route Path**: `/api/webhooks/deliveries`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of webhook delivery log entries.
    ```json
    [
      {
        "id": "del_01h9y",
        "subscriptionId": "wh_01h9x",
        "eventName": "StockReceived",
        "status": "Success",
        "statusCode": 200,
        "occurredOn": "2026-11-02T14:00:00Z"
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Powers the Webhook Delivery Retry Logs table in the Webhooks Panel for inspecting delivery health and HTTP response statuses.

---

## 🏭 Warehouse Management (WMS) Endpoints

### 11. `GET /api/warehouse-locations`

Lists physical warehouse bin locations and storage capacities for a tenant.

- **HTTP Method**: `GET`
- **Route Path**: `/api/warehouse-locations`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of warehouse location objects.
    ```json
    [
      {
        "id": "loc_bay_01",
        "warehouseId": "wh_main",
        "zone": "A",
        "maxWeightGrams": 500000,
        "maxVolumeCubicMeters": 2.5
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` query parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by the Warehouse Management panel and 2D bin capacity heat maps to visualize storage layouts, zone utilization, and spatial constraints.

---

### 12. `POST /api/warehouse-locations`

Creates or updates a warehouse storage bin configuration.

- **HTTP Method**: `POST`
- **Route Path**: `/api/warehouse-locations`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "id": "string (Required)",
    "warehouseId": "string (Required)",
    "zone": "string (Required)",
    "maxWeightGrams": "number (Required)",
    "maxVolumeCubicMeters": "number (Required)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`:
    ```json
    {
      "id": "loc_bay_01",
      "warehouseId": "wh_main",
      "zone": "A",
      "maxWeightGrams": 500000,
      "maxVolumeCubicMeters": 2.5
    }
    ```
  - `400 Bad Request`: Missing required parameters or negative capacity limits.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by warehouse administrators to register new bins, aisles, and storage zones or update physical capacity thresholds.

---

### 13. `DELETE /api/warehouse-locations/{id}`

Removes a warehouse bin location from the facility layout.

- **HTTP Method**: `DELETE`
- **Route Path**: `/api/warehouse-locations/{id}`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the warehouse location to delete.
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK` or `204 No Content`:
    ```json
    {
      "success": true,
      "deletedId": "loc_bay_01"
    }
    ```
  - `400 Bad Request`: Missing `tenantId` parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Location ID not found.
  - `409 Conflict`: Location contains active inventory stock and cannot be removed.
- **Workflow Context**:
  Invoked in the Warehouse Panel when decommissioning or re-architecting physical warehouse zones.

---

### 14. `POST /api/warehouse-locations/putaway-suggestions`

Generates rule-based bin putaway recommendations for inbound stock based on weight, volume, and affinity.

- **HTTP Method**: `POST`
- **Route Path**: `/api/warehouse-locations/putaway-suggestions`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "sku": "string (Required)",
    "quantity": "number (Required)"
  }
  ```
- **Responses**:
  - `200 OK`: Array of putaway suggestions.
    ```json
    [
      {
        "locationId": "loc_bay_01",
        "sku": "WIDGET-BLK-M",
        "suggestedQuantity": 50
      }
    ]
    ```
  - `400 Bad Request`: Missing `sku`, `tenantId`, or invalid `quantity`.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Assists warehouse receiving operators during inbound shipments to direct goods into bins with adequate volume and weight capacity.

---

### 15. `POST /api/warehouse-locations/optimize-pick-route`

Calculates a sequenced pick route across warehouse aisles to minimize travel distance.

- **HTTP Method**: `POST`
- **Route Path**: `/api/warehouse-locations/optimize-pick-route`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "skus": "string[] (Required)"
  }
  ```
- **Responses**:
  - `200 OK`: Array of sequenced location pick steps.
    ```json
    [
      {
        "locationId": "loc_bay_01",
        "aisle": "A1",
        "rack": "R2",
        "shelf": "S3",
        "items": [
          {
            "sku": "WIDGET-BLK-M",
            "locationId": "loc_bay_01",
            "aisle": "A1",
            "rack": "R2",
            "shelf": "S3"
          }
        ]
      }
    ]
    ```
  - `400 Bad Request`: Missing `skus` array or `tenantId`.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by pick-pack-ship workflows and handheld picking devices to guide operators along the shortest path through the warehouse.

---

### 16. `GET /api/warehouse-locations/slotting-suggestions`

Generates AI-driven slotting optimization recommendations to move high-velocity items closer to dispatch areas.

- **HTTP Method**: `GET`
- **Route Path**: `/api/warehouse-locations/slotting-suggestions`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of slotting suggestions with velocity and distance metrics.
    ```json
    [
      {
        "sku": "WIDGET-BLK-M",
        "currentLocationId": "loc_back_99",
        "currentDistance": 85.5,
        "currentVelocity": 42.0,
        "recommendedLocationId": "loc_front_02",
        "recommendedDistance": 12.0,
        "potentialSwapSku": "SLOW-BOLT-X",
        "estimatedSavings": 73.5
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Powers the Warehouse Slotting Optimization view, identifying ergonomic improvements and travel-time reductions by reallocating fast-moving items to front-row bins.

---

## 🌐 Intercompany & Multi-Entity Endpoints

### 17. `GET /api/intercompany/entities`

Lists legal business entities configured for multi-entity tenant accounting and intercompany transactions.

- **HTTP Method**: `GET`
- **Route Path**: `/api/intercompany/entities`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of legal entities.
    ```json
    [
      {
        "id": "entity-1",
        "tenantId": "tenant_default",
        "name": "US Subsidiary Corp",
        "baseCurrency": "USD",
        "taxIdentifier": "US-EIN-123456789",
        "createdAt": "2026-11-02T10:00:00Z"
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Populates the Legal Entities table and source/destination dropdown selectors in the Intercompany Panel.

---

### 18. `POST /api/intercompany/entities`

Registers a new legal business entity or operational subsidiary for a tenant.

- **HTTP Method**: `POST`
- **Route Path**: `/api/intercompany/entities`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "name": "string (Required)",
    "baseCurrency": "string (Required)",
    "taxIdentifier": "string (Optional)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`:
    ```json
    {
      "id": "entity-2",
      "tenantId": "tenant_default",
      "name": "UK Operations Ltd",
      "baseCurrency": "GBP",
      "taxIdentifier": "GB-VAT-987654321",
      "createdAt": "2026-11-02T10:30:00Z"
    }
    ```
  - `400 Bad Request`: Missing required entity parameters (`tenantId`, `name`, `baseCurrency`).
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by enterprise administrators in the Intercompany Panel to establish subsidiaries and distinct legal entities.

---

### 19. `GET /api/intercompany/transfers`

Lists intercompany transfer records and settlement statuses across legal entities for a tenant.

- **HTTP Method**: `GET`
- **Route Path**: `/api/intercompany/transfers`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of intercompany transfer records.
    ```json
    [
      {
        "id": "transfer-101",
        "tenantId": "tenant_default",
        "fromEntityId": "entity-1",
        "toEntityId": "entity-2",
        "sku": "WIDGET-BLK-M",
        "quantity": 100,
        "unitCostCents": 1250,
        "markupPercentage": 8.5,
        "dutyCents": 500,
        "totalAmountCents": 140625,
        "status": "COMPLETED",
        "createdAt": "2026-11-02T11:15:00Z"
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Powers the Transfer History table in the Intercompany Panel to audit cross-entity movements, transfer pricing, and fulfillment status.

---

### 20. `POST /api/intercompany/transfers`

Executes an intercompany stock transfer between two legal entities, applying transfer pricing markups and customs duties.

- **HTTP Method**: `POST`
- **Route Path**: `/api/intercompany/transfers`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "fromEntityId": "string (Required)",
    "toEntityId": "string (Required)",
    "sku": "string (Required)",
    "quantity": "number (Required)",
    "unitCostCents": "number (Required)",
    "markupPercentage": "number (Required)",
    "dutyCents": "number (Optional)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`:
    ```json
    {
      "id": "transfer-101",
      "tenantId": "tenant_default",
      "fromEntityId": "entity-1",
      "toEntityId": "entity-2",
      "sku": "WIDGET-BLK-M",
      "quantity": 100,
      "unitCostCents": 1250,
      "markupPercentage": 8.5,
      "dutyCents": 500,
      "totalAmountCents": 140625,
      "status": "COMPLETED",
      "createdAt": "2026-11-02T11:15:00Z"
    }
    ```
  - `400 Bad Request`: Validation failure (e.g. source and destination entities identical, invalid quantity, or missing required attributes).
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Source entity, target entity, or SKU does not exist.
- **Workflow Context**:
  Invoked when submitting the Execute Transfer form in the Intercompany Panel to initiate inventory rebalancing and general ledger transfer postings between entities.

---

## 📈 API Usage & Metering Endpoints

### 21. `GET /api/usage`

Retrieves aggregated daily API usage metrics, call volumes, error counts, and average latency benchmarks for a tenant.

- **HTTP Method**: `GET`
- **Route Path**: `/api/usage`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of API usage metric breakdown items.
    ```json
    [
      {
        "date": "2026-11-02",
        "endpoint": "/api/inventory",
        "calls": 1250,
        "errors": 3,
        "averageLatencyMs": 42.5
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` query parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Powers the API Usage Dashboard panel (`ApiUsageDashboardPanel`), enabling operations and engineering teams to monitor endpoint throughput, identify high-latency requests, track error rates, and meter tenant utilization.

---

## 🤝 Approval Workflow Endpoints

### 22. `GET /api/approvals/workflows`

Lists all configured multi-tier approval workflow rules and required steps.

- **HTTP Method**: `GET`
- **Route Path**: `/api/approvals/workflows`
- **Parameters**:
  - `tenantId` (*Query, Optional*): Filter workflows by specific tenant ID.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of approval workflow definitions.
    ```json
    [
      {
        "id": "wf-1",
        "triggerEvent": "HIGH_VALUE_TRANSFER",
        "isActive": true,
        "steps": [
          {
            "roleId": "role_warehouse_manager",
            "minApprovals": 1,
            "timeoutHours": 24
          }
        ]
      }
    ]
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by the Approval Workflow Configuration panel (`ApprovalWorkflowPanel`) to display active and inactive operational approval triggers (e.g., purchase orders exceeding limits, intercompany stock transfers).

---

### 23. `POST /api/approvals/workflows/{id}/toggle`

Toggles the active/inactive state of a configured approval workflow.

- **HTTP Method**: `POST`
- **Route Path**: `/api/approvals/workflows/{id}/toggle`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the approval workflow to toggle.
  - `tenantId` (*Query, Optional*): Specific tenant ID.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Updated workflow definition.
    ```json
    {
      "id": "wf-1",
      "isActive": false
    }
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Workflow with the specified ID does not exist.
- **Workflow Context**:
  Triggered when an administrator toggles an approval workflow rule switch in the Approval Workflow panel to activate or bypass step verification.

---

### 24. `GET /api/approvals/pending`

Retrieves pending approval requests awaiting operational or managerial decision.

- **HTTP Method**: `GET`
- **Route Path**: `/api/approvals/pending`
- **Parameters**:
  - `tenantId` (*Query, Optional*): Filter pending requests by specific tenant ID.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of pending approval requests.
    ```json
    [
      {
        "id": "req-1",
        "triggerEvent": "HIGH_VALUE_TRANSFER",
        "status": "PENDING",
        "requesterId": "usr_99",
        "createdAt": "2026-11-02T14:30:00Z",
        "payload": {
          "sku": "WIDGET-BLK-M",
          "quantity": 500,
          "estimatedValueCents": 1500000
        }
      }
    ]
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Powers the Approval Inbox (`ApprovalInboxPanel`), allowing managers and supervisors to view queued actions requiring sign-off.

---

### 25. `POST /api/approvals/{id}/decide`

Submits an approval decision (e.g., `APPROVED` or `REJECTED`) with optional reviewer notes.

- **HTTP Method**: `POST`
- **Route Path**: `/api/approvals/{id}/decide`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the approval request.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "decision": "string (Required, e.g. APPROVED or REJECTED)",
    "notes": "string (Optional)"
  }
  ```
- **Responses**:
  - `200 OK`: Resulting state of the decision.
    ```json
    {
      "id": "req-1",
      "status": "APPROVED",
      "decision": "APPROVED",
      "notes": "Approved for transfer",
      "decidedAt": "2026-11-02T15:00:00Z"
    }
    ```
  - `400 Bad Request`: Invalid decision state or payload structure.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Approval request with the specified ID does not exist.
- **Workflow Context**:
  Invoked from the Approval Inbox panel when an authorized user clicks "Approve" or "Reject" on a pending inventory operation.

---

### 26. `GET /api/approvals/{requestId}`

Retrieves the complete audit trail and decision history for a specific approval request.

- **HTTP Method**: `GET`
- **Route Path**: `/api/approvals/{requestId}`
- **Parameters**:
  - `requestId` (*Path, Required*): Unique identifier of the approval request.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Decision history details.
    ```json
    {
      "requestId": "req-1",
      "decisions": [
        {
          "id": "dec-1",
          "stepIndex": 0,
          "deciderId": "usr_mgr_42",
          "decision": "APPROVED",
          "notes": "All clear",
          "decidedAt": "2026-11-02T15:00:00Z"
        }
      ]
    }
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Request ID not found.
- **Workflow Context**:
  Used by the Approval History Timeline component (`ApprovalHistoryTimeline`) to display a visual audit log of multi-step sign-offs, timestamps, and reviewer notes.

---

## 🔐 Role-Based Access Control (RBAC) & User Management Endpoints

### 27. `GET /api/roles`

Lists all user roles configured for a tenant, including custom and system roles with their assigned permission sets.

- **HTTP Method**: `GET`
- **Route Path**: `/api/roles`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of role definitions.
    ```json
    [
      {
        "id": "role_warehouse_manager",
        "name": "Warehouse Manager",
        "description": "Full access to inventory, locations, and cycle counts",
        "isCustom": false,
        "tenantId": "tenant_default",
        "permissions": [
          {
            "id": "perm_inv_read",
            "resource": "inventory",
            "action": "read",
            "description": "View inventory stock levels"
          },
          {
            "id": "perm_inv_write",
            "resource": "inventory",
            "action": "write",
            "description": "Adjust inventory stock levels"
          }
        ]
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` query parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by the Role Management panel (`RoleManagementPanel`) to render the role inventory and display assigned access controls.

---

### 28. `GET /api/roles/permissions`

Retrieves all available system permission definitions that can be granted to roles.

- **HTTP Method**: `GET`
- **Route Path**: `/api/roles/permissions`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of system permissions.
    ```json
    [
      {
        "id": "perm_inv_read",
        "resource": "inventory",
        "action": "read",
        "description": "View inventory stock levels"
      },
      {
        "id": "perm_inv_write",
        "resource": "inventory",
        "action": "write",
        "description": "Adjust inventory stock levels"
      }
    ]
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Populates the permission selection checklist in the Role Management panel when administrators create or modify roles.

---

### 29. `POST /api/roles`

Creates a new custom role with a set of assigned permission IDs.

- **HTTP Method**: `POST`
- **Route Path**: `/api/roles`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "name": "string (Required)",
    "description": "string (Optional)",
    "permissionIds": "string[] (Required)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`: Created role object.
    ```json
    {
      "id": "role_custom_auditor",
      "name": "Inventory Auditor",
      "description": "Read-only access to inventory and ledger entries",
      "isCustom": true,
      "tenantId": "tenant_default",
      "permissions": [
        {
          "id": "perm_inv_read",
          "resource": "inventory",
          "action": "read"
        }
      ]
    }
    ```
  - `400 Bad Request`: Missing mandatory fields (`tenantId`, `name`, or `permissionIds`).
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `409 Conflict`: Role name already exists for the tenant.
- **Workflow Context**:
  Invoked from the Create Role form in `RoleManagementPanel` to define custom operational access profiles.

---

### 30. `PUT /api/roles/{id}/permissions`

Updates the permission set assigned to an existing custom role.

- **HTTP Method**: `PUT`
- **Route Path**: `/api/roles/{id}/permissions`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the role to update.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "permissionIds": "string[] (Required)"
  }
  ```
- **Responses**:
  - `200 OK`: Updated role permissions confirmation.
    ```json
    {
      "success": true,
      "roleId": "role_custom_auditor",
      "permissionIds": ["perm_inv_read", "perm_ledger_read"]
    }
    ```
  - `400 Bad Request`: Missing or invalid `permissionIds` array.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Cannot modify permissions of built-in system roles.
  - `404 Not Found`: Role ID not found.
- **Workflow Context**:
  Triggered when saving updated permission checkboxes for a role in the Role Management panel.

---

### 31. `DELETE /api/roles/{id}`

Deletes a custom role from the tenant.

- **HTTP Method**: `DELETE`
- **Route Path**: `/api/roles/{id}`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the role to delete.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK` or `204 No Content`:
    ```json
    {
      "success": true,
      "deletedRoleId": "role_custom_auditor"
    }
    ```
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Built-in system roles cannot be deleted.
  - `404 Not Found`: Role ID not found.
  - `409 Conflict`: Role is currently assigned to active users.
- **Workflow Context**:
  Used in `RoleManagementPanel` to purge obsolete custom roles that are no longer assigned to personnel.

---

### 32. `GET /api/users`

Lists all user accounts registered for a tenant along with their assigned roles.

- **HTTP Method**: `GET`
- **Route Path**: `/api/users`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "users": [
        {
          "id": "usr_101",
          "email": "operator@warehouse.example.com",
          "name": "Jane Operator",
          "role": "role_warehouse_manager"
        }
      ]
    }
    ```
  - `400 Bad Request`: Missing `tenantId` query parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Populates the User Management table in the Admin Portal to inspect active personnel accounts and security roles.

---

### 33. `POST /api/users`

Invites and provisions a new user account with an assigned initial role.

- **HTTP Method**: `POST`
- **Route Path**: `/api/users`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "email": "string (Required)",
    "role": "string (Required)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`:
    ```json
    {
      "userId": "usr_102",
      "temporaryPassword": "temp_secret_password_123"
    }
    ```
  - `400 Bad Request`: Missing mandatory parameters (`tenantId`, `email`, or `role`).
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `409 Conflict`: User email already registered for this tenant.
- **Workflow Context**:
  Used in the Admin Portal when adding new staff members and issuing initial credentials.

---

### 34. `PATCH /api/users/{id}/role`

Updates the assigned operational security role of an existing user account.

- **HTTP Method**: `PATCH`
- **Route Path**: `/api/users/{id}/role`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the user to update.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "role": "string (Required)"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "userId": "usr_101",
      "role": "role_warehouse_supervisor"
    }
    ```
  - `400 Bad Request`: Missing `tenantId` or `role` in payload.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: User ID not found.
- **Workflow Context**:
  Invoked from the User Management interface when elevating or reassigning staff responsibilities.

---

## 🔄 Cycle Counting & Inventory Verification Endpoints

### 35. `POST /api/cycle-count/start`

Initiates a new inventory physical cycle count audit for a warehouse zone or ABC inventory classification.

- **HTTP Method**: `POST`
- **Route Path**: `/api/cycle-count/start`
- **Parameters**:
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "name": "string (Required)",
    "isBlindCount": "boolean (Required)",
    "abcClass": "string (Optional, e.g. A, B, or C)",
    "zone": "string (Optional)"
  }
  ```
- **Responses**:
  - `201 Created` or `200 OK`:
    ```json
    {
      "id": "cc-100",
      "tenantId": "tenant_default",
      "name": "Q1 Zone A Audit",
      "status": "STARTED",
      "isBlindCount": true,
      "abcClass": "A",
      "zone": "ZONE-NORTH",
      "createdAt": "2026-11-02T16:00:00Z"
    }
    ```
  - `400 Bad Request`: Missing mandatory parameters (`tenantId`, `name`, or `isBlindCount`).
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Triggered when warehouse managers click "Start Count" in the Cycle Counting Dashboard (`CycleCountDashboardPanel`) to initiate physical bin audits.

---

### 36. `POST /api/cycle-count/{id}/submit`

Submits physical count line item quantities for reconciliation against recorded book quantities.

- **HTTP Method**: `POST`
- **Route Path**: `/api/cycle-count/{id}/submit`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the cycle count.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "countedLines": [
      {
        "sku": "string (Required)",
        "count": "number (Required)",
        "locationId": "string (Optional)"
      }
    ]
  }
  ```
- **Responses**:
  - `200 OK`: Confirmation of submitted count lines and resulting completion status.
    ```json
    {
      "id": "cc-100",
      "status": "COMPLETED",
      "discrepanciesCount": 0,
      "submittedAt": "2026-11-02T16:30:00Z"
    }
    ```
  - `400 Bad Request`: Missing or malformed `countedLines` array.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Cycle count ID not found.
- **Workflow Context**:
  Invoked when an inventory auditor finishes physical stock counting in the Cycle Counting Dashboard (`CycleCountDashboardPanel`) and submits counts for discrepancy detection.

---

### 37. `GET /api/cycle-count`

Lists active and past inventory cycle count audits for a tenant.

- **HTTP Method**: `GET`
- **Route Path**: `/api/cycle-count`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of cycle count audit records.
    ```json
    [
      {
        "id": "cc-100",
        "tenantId": "tenant_default",
        "name": "Q1 Zone A Audit",
        "status": "PENDING",
        "isBlindCount": true,
        "createdAt": "2026-11-02T16:00:00Z"
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` query parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Used by the Cycle Counting Dashboard (`CycleCountDashboardPanel`) to fetch and display ongoing counts and their reconciliation statuses.

---

## 🛒 Purchase Order Lifecycle & Fulfillment Endpoints

### 38. `GET /api/purchase-orders`

Retrieves purchase order records for a tenant, optionally filtered by specific purchase order IDs.

- **HTTP Method**: `GET`
- **Route Path**: `/api/purchase-orders`
- **Parameters**:
  - `tenantId` (*Query, Required*): Unique identifier of the tenant.
  - `ids` (*Query, Optional*): Comma-separated list of purchase order IDs to retrieve in bulk.
  - `limit` (*Query, Optional*): Maximum number of purchase orders to return (used by Python REST adapter).
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
- **Request Body**: None.
- **Responses**:
  - `200 OK`: Array of purchase order objects or envelope containing purchase order records.
    ```json
    [
      {
        "id": "po_90210",
        "tenantId": "tenant_default",
        "supplier": "Acme Supplies Co.",
        "status": "DRAFT",
        "createdAt": "2026-11-02T12:30:00Z",
        "items": [
          {
            "sku": "WIDGET-BLK-M",
            "quantity": 100,
            "unitCostCents": 1250
          }
        ]
      }
    ]
    ```
  - `400 Bad Request`: Missing `tenantId` query parameter.
  - `401 Unauthorized`: Missing or invalid authentication token.
- **Workflow Context**:
  Powers the purchase order listing in the Procurement Panel (`ProcurementPanel`), allowing operators to view order statuses, items, and supplier details across backends.

---

### 39. `POST /api/purchase-orders/{id}/approve`

Approves a draft purchase order, moving it to `APPROVED` status in the procurement replenishment workflow.

- **HTTP Method**: `POST`
- **Route Path**: `/api/purchase-orders/{id}/approve`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the purchase order to approve.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "mutationId": "string (Optional, idempotency UUID for Python adapter)"
  }
  ```
- **Responses**:
  - `200 OK`: Purchase order approved successfully.
    ```json
    {
      "success": true,
      "id": "po_90210",
      "status": "APPROVED"
    }
    ```
  - `400 Bad Request`: Missing `tenantId` in request body.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Purchase order with the specified ID does not exist.
- **Workflow Context**:
  Invoked from the Procurement Panel when a purchasing supervisor or authorized manager clicks "Approve" on a draft purchase order.

---

### 40. `POST /api/purchase-orders/{id}/send`

Dispatches an approved purchase order to the external supplier, advancing its status to `SENT`.

- **HTTP Method**: `POST`
- **Route Path**: `/api/purchase-orders/{id}/send`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the purchase order to transmit.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "mutationId": "string (Optional, idempotency UUID for Python adapter)"
  }
  ```
- **Responses**:
  - `200 OK`: Purchase order dispatched successfully.
    ```json
    {
      "success": true,
      "id": "po_90210",
      "status": "SENT"
    }
    ```
  - `400 Bad Request`: Missing `tenantId` in request body.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Purchase order with the specified ID does not exist.
- **Workflow Context**:
  Triggered when an operator clicks "Send" in the Procurement Panel to formally issue the order to the supplier via EDI, email, or integration portal.

---

### 41. `POST /api/purchase-orders/{id}/receive`

Records receipt of line item quantities against an active purchase order, incrementing inventory stock levels.

- **HTTP Method**: `POST`
- **Route Path**: `/api/purchase-orders/{id}/receive`
- **Parameters**:
  - `id` (*Path, Required*): Unique identifier of the purchase order being received.
  - `Authorization` (*Header, Optional*): Bearer JWT authentication token (`Bearer <token>`).
  - `Content-Type` (*Header, Required*): `application/json`
- **Request Body**:
  ```json
  {
    "tenantId": "string (Required)",
    "items": [
      {
        "sku": "string (Required)",
        "quantity": "number (Required)"
      }
    ],
    "receiptId": "string (Optional, idempotency UUID for Python adapter)"
  }
  ```
- **Responses**:
  - `200 OK`: Goods received confirmation and updated purchase order status.
    ```json
    {
      "success": true,
      "id": "po_90210",
      "status": "RECEIVED",
      "receivedItems": [
        {
          "sku": "WIDGET-BLK-M",
          "quantity": 100
        }
      ]
    }
    ```
  - `400 Bad Request`: Missing `tenantId`, empty `items` array, or invalid received quantity.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `404 Not Found`: Purchase order with the specified ID does not exist.
- **Workflow Context**:
  Executed in warehouse receiving or the Procurement Panel when physical goods arrive at the dock and are checked in against the purchase order.
