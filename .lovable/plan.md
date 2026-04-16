

## Plan: Add "Manage Startups" to Profile Dropdown

**What changes:**

1. **`src/components/Navbar.tsx`** — Add a "Manage Startups" menu item in the profile dropdown (visible only for Founder/MFO roles). Clicking it opens a dialog with the startup management panel.
   - Import `Building2` icon from lucide-react, `useState`, and the `StartupManagementPanel` from `StartupManagement.tsx`
   - Add state `const [manageOpen, setManageOpen] = boolean`
   - Add a `DropdownMenuItem` with `Building2` icon and "Manage Startups" label (conditionally rendered for founder/mfo roles) that sets `manageOpen = true`
   - Render a `Dialog` outside the dropdown that contains `StartupManagementPanel`

2. **`src/pages/Index.tsx`** (optional cleanup) — Remove the inline `StartupManagementPanel` from the Founder dashboard since it will now be accessible globally from the navbar dropdown.

**Technical notes:**
- The dropdown menu item will only show for `founder` and `mfo` roles using the existing `useAuth` hook
- Uses the existing `StartupManagementPanel` component as-is inside a Dialog

