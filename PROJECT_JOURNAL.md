# Project Journal & Architecture Documentation
## CFO Intelligence Platform (Virtual-CFO)

This document chronicles the start-to-finish initialization, architectural design decisions, and folder setups for the Virtual-CFO platform. It acts as the core guide for onboarding developers and scaling the application.

---

## 1. Project Initialization & Bootstrap
We initialized the base workspace under `d:\Virtual-CFO` utilizing **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

### Subdirectory Workaround
During initial bootstrapping via `create-next-app@latest`, we encountered package naming conflicts because the workspace root folder was named `Virtual-CFO` (which contains uppercase letters violating npm conventions).
* **Action**: Scaffolded the temporary folder `virtual-cfo` in lowercase.
* **Resolution**: Moved all generated files (like `package.json`, `tsconfig.json`, and `src/`) to the workspace root `d:\Virtual-CFO` and cleaned up the temporary directory.

---

## 2. Dev Tooling & Formatting Pipeline
To enforce consistent enterprise coding conventions and keep commit logs clean, we installed and configured formatting pipelines:
1. **Prettier (`.prettierrc`)**: Configured automatic semi-colons, single quotes, double spaces, and Unix-style line endings.
2. **EditorConfig (`.editorconfig`)**: Enforced standard indentation rules across different IDEs (VS Code, Cursor, etc.).
3. **Husky & Lint Staged**: Created a manual hook definition inside `.husky/pre-commit` to execute `lint-staged`. Staged code is formatted with Prettier and scrutinized by ESLint automatically before any commit.

---

## 3. Styling & Tailwind CSS v4 Design Tokens
Tailwind CSS v4 introduces a CSS-first configuration model, deprecating the traditional `tailwind.config.js` file. We declared our custom design tokens directly inside [src/app/globals.css](file:///d:/Virtual-CFO/src/app/globals.css):
* **Theme Variables**: Declared standard HSL variables inside `:root` and `.dark` blocks for background shades, card components, borders, and input focus rings.
* **Financial Status Indicators**: Set up semantic classes for finance dashboard alerts:
  * **Success**: Growth, positive cash flows (Emerald Green HSL).
  * **Warning**: Approaching tax thresholds, late payments (Amber HSL).
  * **Error**: Critical overdraft risks, failed API synchronizations (Crimson HSL).
  * **Info**: System notifications, sync audits (Sky Blue HSL).
* **Scrollbars**: Overrode default browser scrollbars with custom slender scroll indicators to suit scrollable financial ledger tables.

---

## 4. State Management Architecture
We set up a separate store architecture using **Zustand** inside `src/store/` to prevent memory leaks and redundant renders:
* **Theme Store** (`theme-store.ts`): Tracks `light` | `dark` | `system` themes and persists choice via `localStorage`.
* **Sidebar Store** (`sidebar-store.ts`): Controls collapsible layouts and mobile overlay toggles.
* **Organization Store** (`organization-store.ts`): Tracks active corporate accounts and status listings for connectors (Xero, Stripe, Amazon, Shopify, QuickBooks, WooCommerce).
* **Dashboard Store** (`dashboard-store.ts`): Manages custom panel coordinates for editable grids.
* **Filter Store** (`filter-store.ts`): Holds global dashboard filters like active date ranges, base currency (USD/EUR), and active connector channels.
* **User Store** (`user-store.ts`): Persists session logs and active role permissions.
* **Notification Store** (`notification-store.ts`): Manages threshold alert banners and toast indicators.
* **Preference Store** (`preference-store.ts`): Configures comfort vs compact view densities, date formats, and defaults.

---

## 5. API Client & Decoupled Data Layer
Financial software requires strict, error-resistant API mapping. We decoupled HTTP queries from React rendering pages inside `src/api/`:
* **Axios Instance** (`src/api/clients/api-client.ts`):
  * **Automatic Retry Policy**: Configured to intercept failed GET/HEAD requests and retry up to 3 times with exponential backoff (2s, 4s, 8s) to mitigate network drops.
  * **JWT Token Interceptor**: Automatically appends Bearer tokens from localStorage on requests.
  * **Unified Error Serialization**: Converts Axios errors into structured `ApiError` objects containing standard status codes and validation logs.
* **Domain Adapters** (`src/adapters/`): Created mapper utilities like `StripeAdapter` and `XeroAdapter` to map incoming cents-based or line-item JSON models to internal standard models.
* **Repositories** (`src/repositories/`): Formulated base repositories (`base-repository.ts`, `transaction-repository.ts`) to fetch raw data using `apiClient` and adapt it automatically.

---

## 6. Access Control & Permission Guards
Created a robust Role-Based Access Control (RBAC) matrix in [src/auth/permissions.ts](file:///d:/Virtual-CFO/src/auth/permissions.ts):
* **Roles**: Owner, Admin, CFO, Accountant, Viewer.
* **Actions**: Mapped standard granular permissions (`view:financials`, `sync:connectors`, `trigger:automations`, `manage:users`).
* **Guard UI Wrapper** (`src/components/common/guard.tsx`): Wraps protected dashboard grids to check role permissions client-side.

---

## 7. Base Component Layout Wrappers
Scaffolded 30+ reusable, strictly-typed UI components inside `src/components/`:
* **`TableWrapper`** (`src/components/tables/table-wrapper.tsx`): Integrates **AG Grid Enterprise** with automatic theme synchronizers and dynamic license registrations.
* **`ChartWrapper`** (`src/components/charts/chart-wrapper.tsx`): Houses **Apache ECharts** with sidebar resize hooks.
* **`CommandPalette`** (`src/components/common/command-palette.tsx`): A search menu utility accessible globally via `⌘K` or `Ctrl + K`.
* **Overlays**: Accessible Radix overlays (`ModalWrapper`, `DrawerWrapper`, `ConfirmationDialog`).
* **Layouts**: Integrates sidebar menus, workspaces, breadcrumbs, and user profiles.

---

## 8. Routing Group Structuring
Configured a Next.js `(dashboard)` route group layout file so all sub-pages automatically inherit sidebar layouts. Scaffolded clean, placeholder page files for:
* Core (Overview, Cash Flow, Forecast)
* Sales (Sales, Revenue, Customers, Invoices, Products)
* Operations (Data Sources, Organizations, Automations)
* Intelligence (AI Insights, Alerts, Reports)
* Configuration (Settings)

---

## 9. Verification & Build Auditing
We ran a test compile via `npm run build` to verify configuration integrity.
* **Result**: Compiles cleanly with zero errors, generating static prerendered files for all 19 app router routes.
