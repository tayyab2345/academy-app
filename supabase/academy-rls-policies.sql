-- AcademyFlow Supabase RLS policies.
--
-- Apply this in Supabase SQL editor only after confirming your runtime access
-- pattern. The Next.js server uses Prisma with DATABASE_URL, so server-side app
-- access is still enforced by existing API/session checks. These policies are
-- for direct Supabase Auth/PostgREST access and future Supabase client usage.
--
-- JWT expectation:
-- auth.uid() = users.id
-- auth.jwt()->'user_metadata' includes:
--   academy_id: current academy id
--   role: admin | teacher | student | parent

create schema if not exists app;

create or replace function app.current_user_id()
returns text
language sql
stable
as $$
  select auth.uid()::text
$$;

create or replace function app.current_academy_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'academy_id', '')
$$;

create or replace function app.current_role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'role', '')
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
as $$
  select app.current_role() = 'admin'
$$;

create or replace function app.teacher_profile_id()
returns text
language sql
stable
as $$
  select tp.id
  from public.teacher_profiles tp
  where tp.user_id = app.current_user_id()
  limit 1
$$;

create or replace function app.student_profile_id()
returns text
language sql
stable
as $$
  select sp.id
  from public.student_profiles sp
  where sp.user_id = app.current_user_id()
  limit 1
$$;

create or replace function app.parent_profile_id()
returns text
language sql
stable
as $$
  select pp.id
  from public.parent_profiles pp
  where pp.user_id = app.current_user_id()
  limit 1
$$;

alter table public.academies enable row level security;
alter table public.users enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.parent_profiles enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendances enable row level security;
alter table public.reports enable row level security;
alter table public.invoices enable row level security;

drop policy if exists academies_select_own on public.academies;
create policy academies_select_own on public.academies
for select
using (id = app.current_academy_id());

drop policy if exists users_select_scoped on public.users;
create policy users_select_scoped on public.users
for select
using (
  academy_id = app.current_academy_id()
  and (
    app.is_admin()
    or id = app.current_user_id()
  )
);

drop policy if exists users_admin_manage_academy on public.users;
create policy users_admin_manage_academy on public.users
for all
using (app.is_admin() and academy_id = app.current_academy_id())
with check (app.is_admin() and academy_id = app.current_academy_id());

drop policy if exists teacher_profiles_select_scoped on public.teacher_profiles;
create policy teacher_profiles_select_scoped on public.teacher_profiles
for select
using (
  exists (
    select 1 from public.users u
    where u.id = teacher_profiles.user_id
      and u.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or teacher_profiles.user_id = app.current_user_id()
        or exists (
          select 1
          from public.class_teachers ct
          join public.enrollments e on e.class_id = ct.class_id
          where ct.teacher_profile_id = teacher_profiles.id
            and e.student_profile_id = app.student_profile_id()
        )
        or exists (
          select 1
          from public.class_teachers ct
          join public.enrollments e on e.class_id = ct.class_id
          join public.parent_student_links psl on psl.student_profile_id = e.student_profile_id
          where ct.teacher_profile_id = teacher_profiles.id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
  )
);

drop policy if exists teacher_profiles_admin_manage on public.teacher_profiles;
create policy teacher_profiles_admin_manage on public.teacher_profiles
for all
using (
  app.is_admin()
  and exists (
    select 1 from public.users u
    where u.id = teacher_profiles.user_id
      and u.academy_id = app.current_academy_id()
  )
)
with check (
  app.is_admin()
  and exists (
    select 1 from public.users u
    where u.id = teacher_profiles.user_id
      and u.academy_id = app.current_academy_id()
  )
);

drop policy if exists student_profiles_select_scoped on public.student_profiles;
create policy student_profiles_select_scoped on public.student_profiles
for select
using (
  exists (
    select 1 from public.users u
    where u.id = student_profiles.user_id
      and u.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or student_profiles.user_id = app.current_user_id()
        or exists (
          select 1
          from public.enrollments e
          join public.class_teachers ct on ct.class_id = e.class_id
          where e.student_profile_id = student_profiles.id
            and ct.teacher_profile_id = app.teacher_profile_id()
        )
        or exists (
          select 1
          from public.parent_student_links psl
          where psl.student_profile_id = student_profiles.id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
  )
);

drop policy if exists student_profiles_admin_manage on public.student_profiles;
create policy student_profiles_admin_manage on public.student_profiles
for all
using (
  app.is_admin()
  and exists (
    select 1 from public.users u
    where u.id = student_profiles.user_id
      and u.academy_id = app.current_academy_id()
  )
)
with check (
  app.is_admin()
  and exists (
    select 1 from public.users u
    where u.id = student_profiles.user_id
      and u.academy_id = app.current_academy_id()
  )
);

drop policy if exists parent_profiles_select_scoped on public.parent_profiles;
create policy parent_profiles_select_scoped on public.parent_profiles
for select
using (
  app.is_admin()
  or user_id = app.current_user_id()
);

drop policy if exists parent_student_links_select_scoped on public.parent_student_links;
create policy parent_student_links_select_scoped on public.parent_student_links
for select
using (
  app.is_admin()
  or parent_profile_id = app.parent_profile_id()
  or student_profile_id = app.student_profile_id()
  or exists (
    select 1
    from public.enrollments e
    join public.class_teachers ct on ct.class_id = e.class_id
    where e.student_profile_id = parent_student_links.student_profile_id
      and ct.teacher_profile_id = app.teacher_profile_id()
  )
);

drop policy if exists classes_select_scoped on public.classes;
create policy classes_select_scoped on public.classes
for select
using (
  academy_id = app.current_academy_id()
  and (
    app.is_admin()
    or exists (
      select 1 from public.class_teachers ct
      where ct.class_id = classes.id
        and ct.teacher_profile_id = app.teacher_profile_id()
    )
    or exists (
      select 1 from public.enrollments e
      where e.class_id = classes.id
        and e.student_profile_id = app.student_profile_id()
    )
    or exists (
      select 1
      from public.enrollments e
      join public.parent_student_links psl on psl.student_profile_id = e.student_profile_id
      where e.class_id = classes.id
        and psl.parent_profile_id = app.parent_profile_id()
    )
  )
);

drop policy if exists classes_admin_manage on public.classes;
create policy classes_admin_manage on public.classes
for all
using (app.is_admin() and academy_id = app.current_academy_id())
with check (app.is_admin() and academy_id = app.current_academy_id());

drop policy if exists class_teachers_select_scoped on public.class_teachers;
create policy class_teachers_select_scoped on public.class_teachers
for select
using (
  exists (
    select 1 from public.classes c
    where c.id = class_teachers.class_id
      and c.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or class_teachers.teacher_profile_id = app.teacher_profile_id()
        or exists (
          select 1 from public.enrollments e
          where e.class_id = c.id
            and e.student_profile_id = app.student_profile_id()
        )
        or exists (
          select 1
          from public.enrollments e
          join public.parent_student_links psl on psl.student_profile_id = e.student_profile_id
          where e.class_id = c.id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
  )
);

drop policy if exists enrollments_select_scoped on public.enrollments;
create policy enrollments_select_scoped on public.enrollments
for select
using (
  exists (
    select 1
    from public.classes c
    where c.id = enrollments.class_id
      and c.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or enrollments.student_profile_id = app.student_profile_id()
        or exists (
          select 1 from public.class_teachers ct
          where ct.class_id = c.id
            and ct.teacher_profile_id = app.teacher_profile_id()
        )
        or exists (
          select 1 from public.parent_student_links psl
          where psl.student_profile_id = enrollments.student_profile_id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
  )
);

drop policy if exists class_sessions_select_scoped on public.class_sessions;
create policy class_sessions_select_scoped on public.class_sessions
for select
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_sessions.class_id
      and c.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or exists (
          select 1 from public.class_teachers ct
          where ct.class_id = c.id
            and ct.teacher_profile_id = app.teacher_profile_id()
        )
        or exists (
          select 1 from public.enrollments e
          where e.class_id = c.id
            and e.student_profile_id = app.student_profile_id()
        )
        or exists (
          select 1
          from public.enrollments e
          join public.parent_student_links psl on psl.student_profile_id = e.student_profile_id
          where e.class_id = c.id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
  )
);

drop policy if exists attendances_select_scoped on public.attendances;
create policy attendances_select_scoped on public.attendances
for select
using (
  exists (
    select 1
    from public.class_sessions cs
    join public.classes c on c.id = cs.class_id
    where cs.id = attendances.class_session_id
      and c.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or attendances.student_profile_id = app.student_profile_id()
        or exists (
          select 1 from public.class_teachers ct
          where ct.class_id = c.id
            and ct.teacher_profile_id = app.teacher_profile_id()
        )
        or exists (
          select 1 from public.parent_student_links psl
          where psl.student_profile_id = attendances.student_profile_id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
  )
);

drop policy if exists reports_select_scoped on public.reports;
create policy reports_select_scoped on public.reports
for select
using (
  exists (
    select 1
    from public.classes c
    where c.id = reports.class_id
      and c.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or reports.student_profile_id = app.student_profile_id()
        or reports.teacher_profile_id = app.teacher_profile_id()
        or exists (
          select 1 from public.parent_student_links psl
          where psl.student_profile_id = reports.student_profile_id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
    )
);

drop policy if exists invoices_select_scoped on public.invoices;
create policy invoices_select_scoped on public.invoices
for select
using (
  exists (
    select 1
    from public.student_profiles sp
    join public.users u on u.id = sp.user_id
    where sp.id = invoices.student_profile_id
      and u.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or invoices.student_profile_id = app.student_profile_id()
        or exists (
          select 1 from public.parent_student_links psl
          where psl.student_profile_id = invoices.student_profile_id
            and psl.parent_profile_id = app.parent_profile_id()
        )
      )
    )
);
