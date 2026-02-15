# Vault-CRM Style Guide

## Design System Overview
Vault-CRM uses **Tailwind CSS** as its primary styling framework, ensuring a utility-first approach to UI development.

## Typography
- **Primary Font**: `Inter` (system-ui fallbacks).
- **Configuration**: Set in `src/index.css` via `:root`.

## Icons
- **Icon Library**: `lucide-react`
- Use Lucide icons for consistent visual language across the application (e.g., in dashboards, navigation, buttons).

## Component Architecture
- **Common Components**: Reusable UI elements should be placed in `src/components/common`.
- **Feature Components**: Components specific to a feature (e.g., `src/components/dashboard`, `src/components/forms`) should be kept within their respective directories.

## Styling Patterns
- **Global Styles**: Defined in `src/index.css` (e.g., base styles, resets).
- **Utility Classes**: Prefer standard Tailwind utility classes over custom CSS.
- **Responsiveness**: Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) to build mobile-first layouts.

## Dependencies
- `tailwindcss`: ^3.4.17
- `postcss`: ^8.5.6
- `autoprefixer`: ^10.4.23
