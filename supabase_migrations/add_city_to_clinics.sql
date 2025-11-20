-- Adds a dedicated city column to clinics for reliable filtering
alter table public.clinics add column if not exists city text;

-- Optional but recommended for filtering performance
create index if not exists idx_clinics_city on public.clinics (city);
