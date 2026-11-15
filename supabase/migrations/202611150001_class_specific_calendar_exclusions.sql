-- Migration: Make portion calendar exclusions class/batch specific
-- Allows each class to have independent working and non-working days for SEM-1 and SEM-2.

-- 1. Add batch column to portion_calendar_exclusions
alter table public.portion_calendar_exclusions
  add column if not exists batch text;

-- 2. Drop the old global unique constraint
alter table public.portion_calendar_exclusions
  drop constraint if exists portion_calendar_exclusions_semester_excluded_date_key;

-- 3. Clone existing global exclusions to each existing class so no class loses current calendar
insert into public.portion_calendar_exclusions (batch, semester, excluded_date, reason, created_by, created_at)
select distinct
  coalesce(s.class_id, s.batch) as batch,
  e.semester,
  e.excluded_date,
  e.reason,
  e.created_by,
  e.created_at
from public.portion_calendar_exclusions e
cross join (
  select distinct class_id, batch from public.students where class_id is not null or batch is not null
  union
  select distinct batch as class_id, batch from public.portion_subjects where batch is not null
) s
where e.batch is null
  and coalesce(s.class_id, s.batch) is not null
on conflict do nothing;

-- Delete old unassigned global exclusions once cloned
delete from public.portion_calendar_exclusions where batch is null;

-- 4. Create unique constraint per batch, semester, and excluded_date
alter table public.portion_calendar_exclusions
  add constraint portion_calendar_exclusions_batch_sem_date_key unique (batch, semester, excluded_date);

create index if not exists portion_calendar_exclusions_batch_sem_idx
  on public.portion_calendar_exclusions(batch, semester);

-- 5. Update RLS policies to enforce class/batch security
drop policy if exists "Portion calendar all class users read" on public.portion_calendar_exclusions;
create policy "Portion calendar all class users read"
on public.portion_calendar_exclusions for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_or_leader_for_batch(batch)
);

drop policy if exists "Portion calendar class leaders write" on public.portion_calendar_exclusions;
create policy "Portion calendar class leaders write"
on public.portion_calendar_exclusions for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_leader_for_batch(batch)
)
with check (
  exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role in ('staff', 'officer')
  )
  or public.is_class_leader_for_batch(batch)
);
