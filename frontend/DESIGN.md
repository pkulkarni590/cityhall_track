# CityHall Track - Design System

## Overview
CityHall Track uses a professional civic-themed design system tailored for government project management. The design emphasizes authority, clarity, and accessibility.

## Color Palette

### Primary Colors (Civic)
- **Civic Navy** (`civic-600`): `#1e3a8a` - Primary action, trust, authority
- **Civic Dark** (`civic-700`): `#172554` - Hover states, deeper interactions
- **Civic Light** (`civic-100`): `#f0f5fc` - Backgrounds, subtle elements

### Accent Colors (Gold)
- **Accent Gold** (`accent-500`): `#d97706` - Highlights, secondary actions
- **Accent Amber** (`accent-400`): `#f59e0b` - Lighter accents, warnings
- **Accent Dark** (`accent-600`): `#b45309` - Hover states

### Semantic Colors
- **Success**: Green (`#10b981`)
- **Warning**: Amber (`#f59e0b`)
- **Error**: Red (`#ef4444`)

## Typography

### Fonts
- **Body (Sans)**: Poppins
  - Regular: 400
  - Medium: 500
  - Semibold: 600
  - Bold: 700

- **Display (Serif)**: Merriweather
  - Regular: 300
  - Normal: 400
  - Bold: 700

### Font Sizes
- **Headings**: h1-h6 use Merriweather serif for authority
- **Body**: Poppins sans-serif for readability
- **Small text**: Consistent scales for UI labels and descriptions

## Components

### Buttons
- **Primary**: Civic gradient with shadow
- **Secondary**: Outlined with civic border
- **Accent**: Gold background for secondary actions
- **Danger**: Red for destructive actions

### Cards
- Standard: `card` class with subtle shadow
- Elevated: `card-elevated` with enhanced shadow for importance

### Badges
- `badge-civic`: Navy background for primary info
- `badge-success`: Green for completed/success states
- `badge-warning`: Amber for caution/in-progress
- `badge-error`: Red for errors/blocked states

## Shadows
- `shadow-sm`: Light shadows for subtle elevation
- `shadow-civic`: Civic-branded shadow (4px 12px rgba(30, 58, 138, 0.15))

## Usage

All styles are defined in:
- `tailwind.config.js` - Theme configuration
- `src/index.css` - Component utilities and base styles
- Component-level Tailwind classes

For new components, follow these patterns:
```jsx
// Button
<button className="btn-primary">Action</button>

// Card
<div className="card p-6">Content</div>

// Badge
<span className="badge-civic">Label</span>
```

## Dark Mode
All components support dark mode with `dark:` prefixes. Test dark mode with the theme toggle in the navbar.

## Accessibility
- All buttons have proper focus states (`focus:ring-2`)
- Color contrast meets WCAG AA standards
- Semantic HTML for screen readers
