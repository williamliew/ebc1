# Theming (accessibility themes)

The app uses **CSS theme variables** so the Default, High contrast, and Alternative themes apply everywhere. New pages and components **must use these theme tokens** instead of hardcoded colours (e.g. zinc).

## Theme variables (use these)

| Use case                                  | Tailwind class                                                                                       | CSS variable                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Page background                           | `bg-background`                                                                                      | `--background`                      |
| Body text                                 | `text-foreground`                                                                                    | `--foreground`                      |
| Secondary/muted text                      | `text-muted`                                                                                         | `--muted`                           |
| Primary buttons, links                    | `bg-primary text-primary-foreground`                                                                 | `--primary`, `--primary-foreground` |
| Primary button hover                      | `hover:bg-[var(--primary-hover)]`                                                                    | `--primary-hover`                   |
| Cards, panels, inputs                     | `bg-surface`                                                                                         | `--surface`                         |
| Card/row hover                            | `hover:bg-[var(--surface-hover)]`                                                                    | `--surface-hover`                   |
| Borders                                   | `border-border` or `border-[var(--border)]`                                                          | `--border`                          |
| Focus ring                                | `focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]` | —                                   |
| Placeholder / empty areas (e.g. no image) | `bg-[var(--border)]`                                                                                 | `--border`                          |

## Do not use

- `bg-zinc-*`, `text-zinc-*`, `border-zinc-*` (or other hardcoded neutrals) for page layout, text, cards, or buttons. Use the theme tokens above so all three themes (Default, High contrast, Alternative) look correct.
- `dark:` variants for layout/colour — themes are controlled by the accessibility switcher; there is no separate system dark mode.

## Semantic colours

Keep **red** for errors and **green** for success (e.g. `text-red-600`, `text-green-600`) so meaning is clear in every theme.

## New pages checklist

When adding a new route or shared component:

1. Page wrapper: `bg-background text-foreground`
2. Headers / cards: `bg-surface border-border`
3. Buttons (primary): `bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]` + focus ring
4. Buttons (secondary/outline): `border-border text-foreground hover:bg-[var(--surface-hover)]`
5. Inputs: `border-border bg-surface` and `focus:ring-[var(--primary)]`
6. Muted text: `text-muted`

This keeps the app consistent and ensures the accessibility theme switcher (top-right) affects every page.

## Reminder for new pages

The project has a **`.cursorrules`** file that instructs the editor to use theme variables for any new route or component. When adding a new page, refer to this doc and the checklist above so new UI follows the same pattern.
