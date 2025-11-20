-- View exposing vets visible to pet owners: available vets whose profiles are approved and active
create or replace view public.owner_visible_vets as
select
  v.id,
  v.user_id,
  v.clinic_id,
  v.full_name
from public.veterinarians v
join public.profiles p on p.id = v.user_id
where coalesce(v.is_available, false) = true
  and p.verification_status = 'approved'
  and coalesce(p.is_active, true) = true;

-- Optional: allow authenticated to select from the view (RLS checked on base tables)
grant select on public.owner_visible_vets to authenticated;
