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
