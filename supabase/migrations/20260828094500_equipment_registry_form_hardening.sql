-- Keep the equipment audit foreign keys efficient as the registry grows.
create index if not exists equipment_created_by_idx
  on public.equipment (created_by);

create index if not exists equipment_updated_by_idx
  on public.equipment (updated_by);
