

# Founder OS — CEO War Dashboard

## Overview
A premium, Apple-like SaaS dashboard for managing multiple startups at a glance. Ultra-clean, minimal, and action-oriented.

## Pages & Components

### 1. Home Dashboard (Index page)
- **Sticky Top Navbar**: "Founder OS" logo left, Focus Score (78/100) center, bell icon with badge + avatar right
- **Startup Cards Grid**: 3-col desktop, 1-col mobile. Each card shows name, status dot/border (green/yellow/red), runway, growth with trend arrow, one-line insight, and View/Fix buttons. Subtle shadow, hover elevation effect.
- **Critical Alert Strip**: Horizontal scrollable row of pill-shaped alerts at the bottom

### 2. Startup Detail Page (`/startup/:id`)
- Header with startup name, status, and key metrics
- Expanded insight section with more context
- Placeholder sections for deeper data

### 3. Fix Action Modal
- Triggered by "Fix" button on any card
- Fields: Assign person (dropdown), Add note (textarea), Set deadline (date picker)
- Clean dialog using shadcn Dialog component

### 4. Insight Tooltip
- Hover on insight text shows a tooltip with a mini spark line (CSS/SVG) and short explanation

## Design System
- **Font**: Inter (already available)
- **Theme**: Light mode default with dark mode support
- **Colors**: Neutral grays for UI, color only for status (green/yellow/red)
- **Cards**: Rounded-xl, soft shadow, hover lift animation
- **Spacing**: Generous padding, no clutter

## Mock Data
4 startups: Nasheedio (Yellow), Gurucool (Yellow), LevelUp Climate (Green), Project X (Red) — with all specified metrics and insights.

## Tech
- React Router for navigation
- shadcn/ui components (Dialog, Tooltip, Card, Badge, Popover)
- Tailwind for styling
- Lucide icons
- All data hardcoded as mock

