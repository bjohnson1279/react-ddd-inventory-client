# React Domain-Driven Design (DDD) Inventory Client

A modern, high-performance web client for multi-tenant inventory control and operations. Built with React 19, TypeScript, Vite, and designed with Domain-Driven Design (DDD) principles.

This control center interacts seamlessly across multiple backend API node implementations (GraphQL, Express, Laravel, Python) to manage real-time stock levels, double-entry general ledger, order routing, warehouse layouts, demand forecasting, RFID ingestion, and automated compliance auditing.

---

## 🚀 Key Features

- **Multi-Backend API Interchangeability**: Switch dynamically between GraphQL (Port 4000), Express REST (Port 5000), Laravel REST (Port 8000), and Python REST (Port 8001) backends with automatic health monitoring and latency checks.
- **Operations Dashboard**: Real-time stock level monitoring, low-stock alerts, and double-entry general ledger summaries.
- **Barcode & RFID Workflows**: Live barcode scanning simulator, offline PWA queueing with IndexedDB auto-sync, and RFID bulk tag ingestion.
- **Warehouse Management (WMS)**: Interactive 2D bin capacity heat maps, pick path sequencing, putaway suggestions, and AI-driven slotting optimization.
- **Financial & Compliance Ledger**: Double-entry journal posting, FIFO/LIFO/WAC valuation breakdown, and cryptographic compliance ledger with point-in-time state reconstruction.
- **Demand Forecasting & Procurement**: Sales velocity calculation (7d/30d/90d), Reorder Point (ROP) safety stock evaluation, and purchase order workflow (Draft → Approve → Send → Receive).
- **Enterprise Features**: Intercompany transfers, legal entity management, approval workflows, role-based access control (RBAC), and API usage metering.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **pnpm** (recommended) or **npm**
- **Docker & Docker Compose** (optional, for containerized deployments)

---

## 🛠️ Environment Variables Configuration

Create a `.env` file in the root directory or configure environment variables in your environment:

```env
# GraphQL API Backend Endpoint
VITE_GRAPHQL_HTTP_URL=http://localhost:4000/graphql

# Express REST API Endpoint
VITE_EXPRESS_API_URL=http://localhost:5000

# Laravel REST API Endpoint
VITE_LARAVEL_API_URL=http://localhost:8000

# Python REST API Endpoint
VITE_PYTHON_API_URL=http://localhost:8001
```

Default fallback URLs will be used automatically if environment variables are omitted.

---

## 💻 Local Development Setup

1. **Install Dependencies**:

   ```bash
   pnpm install
   ```

   _(or `npm install`)_

2. **Start Development Server**:

   ```bash
   pnpm dev
   ```

   _(or `npm run dev`)_

   The application will be accessible at `http://localhost:5173`.

3. **Build for Production**:

   ```bash
   pnpm run build
   ```

4. **Preview Production Build**:
   ```bash
   pnpm run preview
   ```

---

## 🧪 Testing & Verification

- **Type Checking**:

  ```bash
  npx -p typescript tsc --noEmit
  ```

- **Unit Tests**:

  ```bash
  pnpm run test:unit
  ```

  _(Runs Vitest test suite across component and API adapter unit tests)_

- **End-to-End (E2E) Tests**:
  ```bash
  pnpm run test:e2e
  ```
  _(Runs Playwright E2E browser tests)_

---

## 🐳 Docker Deployment

To build and run the client as a containerized Nginx service:

```bash
docker-compose up --build
```

The containerized web app will run on port `3005` (`http://localhost:3005`).

---

## 🏛️ Project Structure

```
.
├── src/
│   ├── api/             # API client interfaces, adapters (GraphQL, Express, Laravel, Python) & offline queue
│   ├── components/      # Domain panels, dashboards & UI components
│   ├── panels/          # Advanced enterprise panels (Intercompany, API Usage)
│   ├── App.tsx          # Main control center application layout & state
│   └── main.tsx         # Application entry point & provider wrapper
├── tests/               # End-to-end (E2E) and integration tests
├── Dockerfile           # Multi-stage Docker build config with Nginx
├── docker-compose.yml   # Docker Compose orchestration
└── vite.config.ts       # Vite bundler configuration
```

---

## 📄 License

Private repository - All Rights Reserved.
