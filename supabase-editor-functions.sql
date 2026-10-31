-- Secure editor functions for the no-login MVP.
-- These functions validate the private edit token before returning/updating a guide.

create or replace function public.get_guide_for_editor(p_edit_token text)
returns public.guides
language sql
security definer
set search_path = public
as $$
  select g.*
  from public.guides g
  where g.edit_token = p_edit_token
  limit 1;
$$;

revoke all on function public.get_guide_for_editor(text) from public;
grant execute on function public.get_guide_for_editor(text) to anon, authenticated;

create or replace function public.update_guide_by_token(p_edit_token text, p_changes jsonb)
returns public.guides
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.guides;
begin
  update public.guides
  set
    property_name = case when p_changes ? 'property_name' then nullif(p_changes->>'property_name','') else property_name end,
    welcome_title = case when p_changes ? 'welcome_title' then nullif(p_changes->>'welcome_title','') else welcome_title end,
    welcome_message = case when p_changes ? 'welcome_message' then nullif(p_changes->>'welcome_message','') else welcome_message end,
    address = case when p_changes ? 'address' then nullif(p_changes->>'address','') else address end,
    check_in = case when p_changes ? 'check_in' then nullif(p_changes->>'check_in','') else check_in end,
    check_out = case when p_changes ? 'check_out' then nullif(p_changes->>'check_out','') else check_out end,
    wifi_name = case when p_changes ? 'wifi_name' then nullif(p_changes->>'wifi_name','') else wifi_name end,
    wifi_password = case when p_changes ? 'wifi_password' then nullif(p_changes->>'wifi_password','') else wifi_password end,
    google_maps_url = case when p_changes ? 'google_maps_url' then nullif(p_changes->>'google_maps_url','') else google_maps_url end,
    host_name = case when p_changes ? 'host_name' then nullif(p_changes->>'host_name','') else host_name end,
    host_phone = case when p_changes ? 'host_phone' then nullif(p_changes->>'host_phone','') else host_phone end,
    updated_at = now()
  where edit_token = p_edit_token
  returning * into updated;

  if updated.id is null then
    raise exception 'Invalid editor token';
  end if;

  return updated;
end;
$$;

revoke all on function public.update_guide_by_token(text, jsonb) from public;
grant execute on function public.update_guide_by_token(text, jsonb) to anon, authenticated;
