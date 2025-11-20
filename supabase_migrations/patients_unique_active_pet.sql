-- Enforce unique active pet per owner by (owner_id, lower(name), lower(species))
-- Safe to run multiple times
CREATE UNIQUE INDEX IF NOT EXISTS patients_owner_name_species_active_uniq
ON public.patients (owner_id, lower(name), lower(species))
WHERE is_active = true;
