# Welcome Guide Online Editor — MVP

This version keeps the original welcome-guide design and adds a cloud-backed client editor.

## What works in this MVP

- Guest URL: `/g/PUBLIC_ID`
- Client editor URL: `/edit/EDIT_TOKEN`
- Client edits content inside the app UI
- Saves guide fields to Supabase through secure RPC functions
- Guest view only loads published guides
- Guest UI has no editor controls
- Copy Guest Link and Preview Guest buttons

## 1. Add Supabase keys

Open `supabase-config.js` and replace:

- `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`
- `PASTE_YOUR_SUPABASE_ANON_KEY_HERE`

Find these in Supabase → Project Settings → API.

Never put the Supabase service-role key in this file.

## 2. Run the additional SQL

The existing tables/RLS you created are preserved. You now need the secure editor RPC functions. Open Supabase SQL Editor and run `supabase-editor-functions.sql`.

## 3. Create a test guide

Run the test-guide SQL in `supabase-test-guide.sql`. It creates one guide and prints the public ID and editor token.

Then open:

`https://YOUR-NETLIFY-SITE.netlify.app/edit/YOUR_EDITOR_TOKEN`

Guest view:

`https://YOUR-NETLIFY-SITE.netlify.app/g/YOUR_PUBLIC_ID`

## 4. Deploy

Upload this folder to Netlify. `netlify.toml` makes `/edit/...` and `/g/...` routes load `index.html`.

## Security note

The editor uses a secret edit token and Supabase SECURITY DEFINER functions. Anyone who possesses an editor token can edit that guide, so treat editor links as private. Guests only receive the `/g/...` link.

## Current scope

This first build focuses on the core proof: editing Welcome/Stay/Contact information inside the UI and saving it to the cloud. Photo uploads, amenity CRUD, activity CRUD, tutorial/video replacement, publishing controls, and automated Raket PH delivery should be added next.
