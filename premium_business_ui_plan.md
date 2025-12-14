# Premium, Business Features & UI Enhancements Plan for Personal Financial Tracker

## Executive Summary
This plan outlines comprehensive UI modernizations using Tailwind CSS, enhanced responsiveness, animations, and new premium/business features. Builds on existing tier system (Free/Premium/Business), groups, and components. Supersedes prior specs.

## Current State Analysis
- **UI**: [`App.tsx`](frontend/src/App.tsx) uses basic CSS grid for dashboard components. Modern login/Settings with cards. Lucide icons, dark theme via [`ThemeContext.tsx`](frontend/src/contexts/ThemeContext.tsx).
- **Tiers**: User.tier: \"FREE\". Subscription.tier: \"PREMIUM\"|\"BUSINESS\". Gated features e.g. yearly/custom reports.
- **Features**: Expenses/budgets/groups/Plaid/bank sync/feedback advanced. Reports tiered.
- **Styling**: Existing specs in [`ui_ux_design.md`](ui_ux_design.md), [`app_styling_design_spec.md`](app_styling_design_spec.md).

## UI Enhancements Spec
### 1. Tailwind CSS Integration (Modern, Utility-First)
- Responsive by default (sm/md/lg/xl).
- Custom config: Extend colors from existing palette (greens/reds/blues).
- Animations: Tailwind transitions + Framer Motion for complex (e.g. page fades).

### 2. Dashboard Redesign
- Hero metrics row: Balance, Expenses, Savings Rate, AI Alert.
- Grid: Charts left, recent expenses right (desktop); stacked mobile.
- Animations: Staggered card entrances, hover lifts.

**Text Wireframe - Dashboard (Desktop)**:
```
+---------------------------+ +---------------------------+
| [Balance: $5,230] [Grn]   | | [Expenses: $1,420] [Red]  |
| Progress: 92% to goal     | | Overspend: Food +15%      |
+---------------------------+ +---------------------------+
|                           SpendingCharts (AIInsights overlay)                  |
|                           [Pie/Line Charts with hover tooltips]                |
+---------------------------+ +---------------------------+
| Recent Expenses           | | Quick Actions             |
| - Grocery -$45 [Today]    | | [+ Add Expense]           |
| - Salary +$2k [2d ago]    | | [Scan Receipt]            |
+---------------------------+ | [Set Budget]              |
                              +---------------------------+
```

**Mobile**:
```
[Metrics Cards Stack]
[SpendingCharts Full Width]
[Recent List Horizontal Scroll]
[Quick Actions Row]
```

### 3. Themes & Animations
- Extend: light/dark/high-contrast.
- Global transitions: `transition-all duration-300`.

### 4. Navigation
- Sidebar desktop, bottom tabs mobile.
- Active states with glow.

## Subscription Tiers
```mermaid
graph TD
    FREE[Free/Basic<br/>Core features<br/>Basic AI<br/>Monthly reports] -->|Upgrade $4.99/mo| PRO[Pro/Premium<br/>+ PDF Export<br/>+ Custom Reports<br/>+ Advanced AI<br/>+ Priority Bank Sync<br/>+ Multi-user (small teams)]
    PRO -->|Upgrade $19.99/mo| BUS[Business<br/>+ Team Accounts (Groups)<br/>+ Invoicing<br/>+ Tax Reports<br/>+ QuickBooks/Stripe Integrations<br/>Unlimited everything]
    style FREE fill:#e1f5fe
    style PRO fill:#e8f5e8
    style BUS fill:#fff3e0
```

**Subscription Page Wireframe**:
```
+---------------------------+
| Plans                     |
+---------------------------+
| Free     Pro     Business |
| [Select] [Select*] [Sel*] |
| Features list w/ locks    |
| [Current Tier Badge]      |
| [Upgrade CTA Button]      |
+---------------------------+
```

## Premium Features
- **Tiered Subs**: Update [`Subscription.tsx`](frontend/src/components/Subscription.tsx) with pricing table, Stripe/Ko-fi integration.
- **Advanced AI**: Tiered prompts in [`AIInsights.tsx`](frontend/src/components/AIInsights.tsx) e.g. Pro: predictive forecasts.
- **PDF Export**: jsPDF in reports; backend for Business.
- **Multi-user**: Group sharing for Pro (limit 3), unlimited Business.
- **Bank Sync Priority**: Backend queue; Pro first.
- **Custom Reports**: Enhance [`CustomDateRangeReport.tsx`](frontend/src/components/CustomDateRangeReport.tsx).

## Business Features
- **Team Accounts**: Enhance Settings groups tab; shared dashboards.
- **Invoicing**: New model/component: Invoice list/create/send.
- **Tax Reports**: Categorize/tag expenses; generate IRS-style summary PDF.
- **Integrations**: OAuth UI for QuickBooks/Stripe; sync invoices/payments.

**Business Dashboard Wireframe**:
```
[Team Metrics] [Invoices Due] [Tax Summary]
[Shared Expenses Grid] [Integration Status]
```

## Backend Changes
- Prisma: Add `Invoice`, `TaxReport`, `Integration` models.
- Endpoints: `/invoices`, `/tax-reports/generate`, `/integrations/connect`.
- Stripe Webhooks for subs.
- Queue (BullMQ?) for sync priority.

## File Changes & New Files
**Frontend**:
- [`package.json`](frontend/package.json): + tailwindcss, postcss, autoprefixer, framer-motion, jspdf.
- New: `tailwind.config.js`, update `src/index.css`.
- [`App.tsx`](frontend/src/App.tsx): Tailwind refactor, new layout.
- [`Subscription.tsx`](frontend/src/components/Subscription.tsx): Tier UI.
- New: `DashboardMetrics.tsx`, `Invoicing.tsx`, `TaxReports.tsx`, `Integrations.tsx`.
- Update all components: Tailwind classes.

**Backend**:
- [`schema.prisma`](backend/prisma/schema.prisma): New models.
- [`server.ts`](backend/src/server.ts): New routes.
- New: `invoiceService.ts`, etc.

**Deployment**: Netlify/Heroku env vars for Stripe keys.

## Implementation Roadmap (Todos)
```
[x] Analyze current UI and codebase structure
[ ] Integrate Tailwind CSS into frontend for modern, responsive styling
[ ] Redesign App.tsx dashboard layout with card-based components, animations, and improved navigation
[ ] Enhance theme system with additional options (e.g., high-contrast mode) and smooth transitions
[ ] Implement tiered subscription UI in Subscription.tsx (Free/Pro/Business displays and gates)
[ ] Add premium features: PDF report export, advanced AI insights (deeper analysis), custom reports UI
[ ] Implement priority bank sync queue for premium users in bank-related components
[ ] Enhance business features: Improved group management UI, invoicing module, tax report generator
[ ] Add integrations setup UI for QuickBooks/Stripe (OAuth flows) for business tier
[ ] Create/update wireframes and specs in new/enhanced MD files
[ ] Backend: Add new Prisma models for Invoices, TaxReports, Integrations
[ ] Backend: New endpoints for premium/business features
[ ] Test responsiveness and animations across devices
[ ] Update documentation with new features and UI specs
```

## Next Steps
Switch to `code` mode to implement.