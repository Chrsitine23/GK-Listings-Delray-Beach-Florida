-- Run this only after supabase-editor-functions.sql.
-- Creates one test guide from your current template's general content.

insert into public.guides (
  public_id,
  edit_token,
  property_name,
  welcome_title,
  welcome_message,
  address,
  check_in,
  check_out,
  wifi_name,
  wifi_password,
  google_maps_url,
  host_name,
  host_phone,
  published
)
values (
  'demo-' || substr(md5(random()::text), 1, 8),
  'edit-' || replace(gen_random_uuid()::text, '-', ''),
  '8 Newtown Boulevard',
  'Welcome! 👋',
  'Welcome to your stay. Everything you need for a comfortable visit is available in this guide.',
  'Mactan Newtown, Lapu-Lapu City',
  '2:00 PM',
  '11:00 AM',
  'YOUR WIFI NAME',
  'YOUR WIFI PASSWORD',
  null,
  'Your Host',
  'Your Contact Number',
  true
)
returning public_id, edit_token;
