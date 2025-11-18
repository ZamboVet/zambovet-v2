# Landing Page CMS Setup Instructions

## Quick Setup (5 minutes)

### Step 1: Run SQL Migration in Supabase

1. Go to your **Supabase Dashboard**
2. Click on **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `supabase_landing_page_cms.sql`
5. Paste it into the SQL editor
6. Click **Run** button

This will:
- ✅ Create the `landing_page_settings` table
- ✅ Enable Row Level Security (RLS)
- ✅ Set up policies for public read + authenticated write
- ✅ Insert default settings

### Step 2: Test the CMS

1. Go to your app at `http://localhost:3000/admin/settings`
2. You should see the Landing Page CMS form with:
   - Brand & Colors section
   - Landing Page section
3. Edit any field (e.g., change "ZamboVet" to "My Clinic")
4. Click **Save Changes**
5. You should see a success notification
6. Go to the landing page (`http://localhost:3000`) to see changes reflected

## How It Works

### Admin CMS Page (`/admin/settings`)
- Loads current settings from Supabase on page load
- Allows editing all landing page content and colors
- Saves changes directly to the database
- Shows success/error notifications

### Landing Page (`/`)
- Automatically loads settings from `landing_page_settings` table
- Displays all customizable content dynamically
- Updates in real-time when admin saves changes

## Database Structure

**Table:** `landing_page_settings`
```
id (integer, PRIMARY KEY, always = 1)
settings (jsonb, contains all customizable fields)
created_at (timestamp)
updated_at (timestamp)
created_by (uuid, user who created)
updated_by (uuid, user who last updated)
```

## Customizable Fields

The CMS allows editing:

### Brand & Colors
- Company Name
- Primary Color
- Secondary Color
- Accent Color

### Landing Page Content
- Hero Title
- Hero Subtitle
- Hero Button Text
- Services Title & Subtitle
- About Title & Subtitle
- Contact Title, Subtitle, Phone, Email, Address

## Troubleshooting

### "Failed to save settings" Error
**Solution:** Make sure you ran the SQL migration. The table must exist with proper RLS policies.

### Changes not appearing on landing page
**Solution:** 
1. Hard refresh the landing page (Ctrl+Shift+R or Cmd+Shift+R)
2. Check browser console for errors
3. Verify settings were saved (check admin page again)

### Permission denied error
**Solution:** Make sure you're logged in as an authenticated user (admin). The RLS policy requires `auth.role() = 'authenticated'`.

## Files Involved

- `/lib/settings.ts` - Settings management library
- `/app/admin/settings/page.tsx` - Admin CMS interface
- `/app/components/LandingPage.tsx` - Landing page component
- `supabase_landing_page_cms.sql` - Database setup script

## Next Steps

After setup, you can:
1. Customize the CMS form to add more fields
2. Add image upload for hero section
3. Add SEO metadata editing
4. Add multi-language support
5. Add version history/rollback functionality
