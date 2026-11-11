# VibeLock Documentation Directory

This directory contains the authoritative architecture specifications, developer guides, design system tokens, and core technical documentation for the VibeLock project.

---

## 🎨 Design System & Developer Guides

Living design system specifications and component usage rules. Follow these strictly when building UI features:

| Document | Purpose |
|---|---|
| [**`COLOR_SYSTEM_GUIDE.md`**](./COLOR_SYSTEM_GUIDE.md) | Canonical 10-step token scales (`vl-cyan`, `vl-dark`, `vl-white`), strict zero-arbitrary-hex rules, semantic color mappings. |
| [**`BADGE_USAGE_GUIDE.md`**](./BADGE_USAGE_GUIDE.md) | Badge variants catalog, e-commerce drop tags, live status indicators, pulse dots, and accessibility guidelines. |
| [**`UI_UX_Design_Brief.md`**](./UI_UX_Design_Brief.md) | Streetwear brutalist visual identity, typography scales, contrast standards, and responsive layout guidelines. |

---

## 🏗️ Core Architecture & Technical Specifications

Authoritative technical blueprints and system architecture specifications:

| Document | Purpose |
|---|---|
| [**`Architecture.md`**](./Architecture.md) | Next.js App Router, Server Actions, multi-layer service architecture, caching, and module boundaries. |
| [**`Backend_Schema.md`**](./Backend_Schema.md) | Core database models, relations, inventory ledger, and entity diagrams. |
| [**`database.md`**](./database.md) | PostgreSQL / Neon conventions, Prisma rules, migrations, connection pooling, and seed strategies. |
| [**`PRD.md`**](./PRD.md) | Product Requirements Document — customer journeys, store features, checkout, fulfillment, and business goals. |
| [**`TRD.md`**](./TRD.md) | Technical Requirements Document — non-functional requirements, latency thresholds, concurrency, and scaling. |
| [**`AppFlow.md`**](./AppFlow.md) | End-to-end customer, POS cashier, and administrative application workflows. |
| [**`security.md`**](./security.md) | Authentication boundaries, role-based access control (RBAC), webhook validation, and payment safeguards. |
| [**`error_handling.md`**](./error_handling.md) | Standardized error classes, client toast policies, server action return types, and logging conventions. |
