# Customer Dashboard Portal

A modern, responsive customer dashboard built with Next.js 14 and shadcn/ui components.

## Features

- **Dashboard**: Overview of customer activity with key metrics (total spent, orders, cart items, saved items)
- **Orders**: Complete order history with status tracking and filtering
- **Shop**: Product catalog with search, category filters, and sorting options
- **Cart**: Shopping cart with quantity management and order summary
- **Support**: Help center with FAQ, contact information, and support ticket system
- **Settings**: Account management with tabs for personal info, notifications, addresses, and payment methods

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui (based on Radix UI)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

The application will automatically redirect from the home page to the dashboard.

## Project Structure

```
dtg-portal/
├── app/
│   ├── dashboard/          # Dashboard page with metrics and charts
│   ├── orders/             # Order history and tracking
│   ├── shop/               # Product catalog
│   ├── cart/               # Shopping cart
│   ├── support/            # Support and help center
│   ├── settings/           # Account settings
│   ├── layout.tsx          # Root layout with sidebar
│   └── page.tsx            # Home page (redirects to dashboard)
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── app-sidebar.tsx     # Main navigation sidebar
│   └── [other components]  # Page-specific components
└── lib/
    └── utils.ts            # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Customization

### Adding New Components

Use the shadcn/ui CLI to add new components:

```bash
npx shadcn@latest add [component-name]
```

### Modifying Navigation

Edit the sidebar navigation in `components/app-sidebar.tsx`:

```typescript
navMain: [
  {
    title: "Page Name",
    url: "/page-route",
    icon: IconComponent,
  },
]
```

### Styling

The project uses Tailwind CSS with custom theme variables defined in:
- `tailwind.config.ts` - Tailwind configuration
- `app/globals.css` - Global styles and CSS variables

## License

This project is private and proprietary.
