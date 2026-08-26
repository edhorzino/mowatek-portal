-- Reserve document codes in the database so uploads from different devices
-- cannot receive the same code.
create schema if not exists private;

create table if not exists private.document_code_sequences (
  category text not null,
  document_year integer not null,
  last_serial integer not null default 0 check (last_serial >= 0),
  updated_at timestamptz not null default now(),
  primary key (category, document_year),
  check (category ~ '^[A-Z0-9]{2,12}$'),
  check (document_year between 2000 and 2100)
);

alter table private.document_code_sequences enable row level security;

-- Seed the counter from all historical codebook entries. This deliberately
-- parses the code itself rather than relying on the legacy serial_number field.
with parsed_codes as (
  select regexp_match(
    coalesce(doc_number, document_code),
    '^MWT-([A-Z0-9]{2,12})-([0-9]{4})-([0-9]+)$'
  ) as parts
  from public.documents
)
insert into private.document_code_sequences (category, document_year, last_serial)
select parts[1], parts[2]::integer, max(parts[3]::integer)
from parsed_codes
where parts is not null
group by parts[1], parts[2]::integer
on conflict (category, document_year) do update
set last_serial = greatest(
  private.document_code_sequences.last_serial,
  excluded.last_serial
),
updated_at = now();

-- Repair the missing legacy serial values that caused the original collision.
with parsed_codes as (
  select
    id,
    regexp_match(
      coalesce(doc_number, document_code),
      '^MWT-([A-Z0-9]{2,12})-([0-9]{4})-([0-9]+)$'
    ) as parts
  from public.documents
)
update public.documents as document_row
set serial_number = lpad(parts[3]::integer::text, 3, '0')
from parsed_codes
where document_row.id = parsed_codes.id
  and document_row.serial_number is null
  and parts is not null;

create or replace function public.reserve_document_code(
  p_category text,
  p_document_year integer
)
returns table (document_code text, serial_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_category text;
  next_serial integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required to reserve a document code';
  end if;

  normalized_category := upper(trim(p_category));

  if normalized_category !~ '^[A-Z0-9]{2,12}$' then
    raise exception 'A valid document category code is required';
  end if;

  if p_document_year not between 2000 and 2100 then
    raise exception 'A valid document year is required';
  end if;

  insert into private.document_code_sequences as sequence_row (
    category,
    document_year,
    last_serial
  )
  values (normalized_category, p_document_year, 1)
  on conflict (category, document_year) do update
  set last_serial = sequence_row.last_serial + 1,
      updated_at = now()
  returning last_serial into next_serial;

  return query
  select
    format('MWT-%s-%s-%s', normalized_category, p_document_year, lpad(next_serial::text, 3, '0')),
    lpad(next_serial::text, 3, '0');
end;
$$;

revoke all on function public.reserve_document_code(text, integer) from public;
revoke all on function public.reserve_document_code(text, integer) from anon;
grant execute on function public.reserve_document_code(text, integer) to authenticated;
