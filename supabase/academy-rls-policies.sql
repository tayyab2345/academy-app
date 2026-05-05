-- AcademyFlow Supabase Row Level Security policies.
--
-- Purpose:
--   Protect direct Supabase Auth/PostgREST access for all academy data.
--   The Next.js server continues to use Prisma/server credentials and is not
--   blocked by these policies.
--
-- Identity mapping:
--   auth.uid() maps to either:
--     public.users.id
--     public.users.supabase_auth_user_id
--
-- This keeps existing app users safe while supporting migrated Supabase Auth
-- users whose profile user_id is now auth.users.id.

create schema if not exists app;

grant usage on schema app to authenticated;

create or replace function app.current_auth_user_id()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select nullif(auth.uid()::text, '')
$$;

create or replace function app.current_user_id()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.id
  from public.users u
  where u.id = app.current_auth_user_id()
     or u.supabase_auth_user_id = app.current_auth_user_id()
  limit 1
$$;

create or replace function app.current_academy_id()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.academy_id
  from public.users u
  where u.id = app.current_user_id()
  limit 1
$$;

create or replace function app.current_role()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.role::text
  from public.users u
  where u.id = app.current_user_id()
    and u.is_active = true
  limit 1
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(app.current_role() = 'admin', false)
$$;

create or replace function app.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(app.current_role() = 'teacher', false)
$$;

create or replace function app.is_student()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(app.current_role() = 'student', false)
$$;

create or replace function app.is_parent()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(app.current_role() = 'parent', false)
$$;

create or replace function app.same_academy(target_academy_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select target_academy_id is not null
     and target_academy_id = app.current_academy_id()
$$;

create or replace function app.my_teacher_profile_id()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select tp.id
  from public.teacher_profiles tp
  where tp.user_id = app.current_user_id()
  limit 1
$$;

create or replace function app.my_student_profile_id()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select sp.id
  from public.student_profiles sp
  where sp.user_id = app.current_user_id()
  limit 1
$$;

create or replace function app.my_parent_profile_id()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select pp.id
  from public.parent_profiles pp
  where pp.user_id = app.current_user_id()
  limit 1
$$;

create or replace function app.user_academy_id(target_user_id text)
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.academy_id
  from public.users u
  where u.id = target_user_id
  limit 1
$$;

create or replace function app.teacher_profile_academy_id(target_teacher_profile_id text)
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.academy_id
  from public.teacher_profiles tp
  join public.users u on u.id = tp.user_id
  where tp.id = target_teacher_profile_id
  limit 1
$$;

create or replace function app.student_profile_academy_id(target_student_profile_id text)
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.academy_id
  from public.student_profiles sp
  join public.users u on u.id = sp.user_id
  where sp.id = target_student_profile_id
  limit 1
$$;

create or replace function app.parent_profile_academy_id(target_parent_profile_id text)
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.academy_id
  from public.parent_profiles pp
  join public.users u on u.id = pp.user_id
  where pp.id = target_parent_profile_id
  limit 1
$$;

create or replace function app.is_teacher_for_class(target_class_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.class_teachers ct
    join public.classes c on c.id = ct.class_id
    where ct.class_id = target_class_id
      and ct.teacher_profile_id = app.my_teacher_profile_id()
      and c.academy_id = app.current_academy_id()
  )
$$;

create or replace function app.is_teacher_for_session(target_class_session_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.class_sessions cs
    where cs.id = target_class_session_id
      and app.is_teacher_for_class(cs.class_id)
  )
$$;

create or replace function app.is_student_in_class(target_class_id text, target_student_profile_id text default null)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.class_id = target_class_id
      and e.student_profile_id = coalesce(target_student_profile_id, app.my_student_profile_id())
      and e.status = 'active'
      and c.academy_id = app.current_academy_id()
  )
$$;

create or replace function app.is_parent_of_student(target_student_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.parent_student_links psl
    join public.student_profiles sp on sp.id = psl.student_profile_id
    join public.users su on su.id = sp.user_id
    where psl.student_profile_id = target_student_profile_id
      and psl.parent_profile_id = app.my_parent_profile_id()
      and su.academy_id = app.current_academy_id()
  )
$$;

create or replace function app.is_parent_for_class(target_class_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.parent_student_links psl on psl.student_profile_id = e.student_profile_id
    join public.classes c on c.id = e.class_id
    where e.class_id = target_class_id
      and e.status = 'active'
      and psl.parent_profile_id = app.my_parent_profile_id()
      and c.academy_id = app.current_academy_id()
  )
$$;

create or replace function app.can_access_academy(target_academy_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select app.same_academy(target_academy_id)
$$;

create or replace function app.can_manage_academy(target_academy_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select app.is_admin() and app.same_academy(target_academy_id)
$$;

create or replace function app.can_access_class(target_class_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = target_class_id
      and c.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or app.is_teacher_for_class(c.id)
        or app.is_student_in_class(c.id)
        or app.is_parent_for_class(c.id)
      )
  )
$$;

create or replace function app.can_access_student_profile(target_student_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.student_profiles sp
    join public.users u on u.id = sp.user_id
    where sp.id = target_student_profile_id
      and u.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or sp.user_id = app.current_user_id()
        or exists (
          select 1
          from public.enrollments e
          where e.student_profile_id = sp.id
            and app.is_teacher_for_class(e.class_id)
        )
        or app.is_parent_of_student(sp.id)
      )
  )
$$;

create or replace function app.can_manage_student_profile(target_student_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select app.is_admin()
     and app.same_academy(app.student_profile_academy_id(target_student_profile_id))
$$;

create or replace function app.can_access_teacher_profile(target_teacher_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.teacher_profiles tp
    join public.users u on u.id = tp.user_id
    where tp.id = target_teacher_profile_id
      and u.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or tp.user_id = app.current_user_id()
        or exists (
          select 1
          from public.class_teachers ct
          where ct.teacher_profile_id = tp.id
            and (
              app.is_student_in_class(ct.class_id)
              or app.is_parent_for_class(ct.class_id)
              or app.is_teacher_for_class(ct.class_id)
            )
        )
      )
  )
$$;

create or replace function app.can_manage_teacher_profile(target_teacher_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select app.is_admin()
     and app.same_academy(app.teacher_profile_academy_id(target_teacher_profile_id))
$$;

create or replace function app.can_access_parent_profile(target_parent_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.parent_profiles pp
    join public.users u on u.id = pp.user_id
    where pp.id = target_parent_profile_id
      and u.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or pp.user_id = app.current_user_id()
        or exists (
          select 1
          from public.parent_student_links psl
          where psl.parent_profile_id = pp.id
            and psl.student_profile_id = app.my_student_profile_id()
        )
      )
  )
$$;

create or replace function app.can_manage_parent_profile(target_parent_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select app.is_admin()
     and app.same_academy(app.parent_profile_academy_id(target_parent_profile_id))
$$;

create or replace function app.can_access_parent_student_link(target_link_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.parent_student_links psl
    where psl.id = target_link_id
      and (
        app.is_admin()
        or psl.parent_profile_id = app.my_parent_profile_id()
        or psl.student_profile_id = app.my_student_profile_id()
        or exists (
          select 1
          from public.enrollments e
          where e.student_profile_id = psl.student_profile_id
            and app.is_teacher_for_class(e.class_id)
        )
      )
      and app.same_academy(app.student_profile_academy_id(psl.student_profile_id))
  )
$$;

create or replace function app.can_access_user(target_user_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_user_id
      and u.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or u.id = app.current_user_id()
        or exists (
          select 1 from public.teacher_profiles tp
          where tp.user_id = u.id
            and app.can_access_teacher_profile(tp.id)
        )
        or exists (
          select 1 from public.student_profiles sp
          where sp.user_id = u.id
            and app.can_access_student_profile(sp.id)
        )
        or exists (
          select 1 from public.parent_profiles pp
          where pp.user_id = u.id
            and app.can_access_parent_profile(pp.id)
        )
      )
  )
$$;

create or replace function app.can_access_course(target_course_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.courses co
    where co.id = target_course_id
      and co.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or exists (
          select 1 from public.classes c
          where c.course_id = co.id
            and app.can_access_class(c.id)
        )
      )
  )
$$;

create or replace function app.can_access_session(target_class_session_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.class_sessions cs
    where cs.id = target_class_session_id
      and app.can_access_class(cs.class_id)
  )
$$;

create or replace function app.can_access_teacher_join(target_teacher_join_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.teacher_session_joins tj
    join public.class_sessions cs on cs.id = tj.class_session_id
    where tj.id = target_teacher_join_id
      and (
        app.is_admin()
        or tj.teacher_profile_id = app.my_teacher_profile_id()
        or app.is_teacher_for_class(cs.class_id)
      )
      and app.can_access_class(cs.class_id)
  )
$$;

create or replace function app.can_access_teacher_late_deduction(target_deduction_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.teacher_late_deductions d
    where d.id = target_deduction_id
      and d.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or d.teacher_profile_id = app.my_teacher_profile_id()
      )
  )
$$;

create or replace function app.can_access_attendance(target_attendance_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.attendances a
    join public.class_sessions cs on cs.id = a.class_session_id
    where a.id = target_attendance_id
      and (
        app.is_admin()
        or a.student_profile_id = app.my_student_profile_id()
        or app.is_parent_of_student(a.student_profile_id)
        or app.is_teacher_for_class(cs.class_id)
      )
      and app.can_access_class(cs.class_id)
  )
$$;

create or replace function app.can_access_material(target_material_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.materials m
    where m.id = target_material_id
      and app.can_access_class(m.class_id)
      and (
        app.is_admin()
        or m.teacher_profile_id = app.my_teacher_profile_id()
        or (
          m.is_published = true
          and (
            m.visibility = 'all_students'
            or exists (
              select 1
              from public.material_visibility mv
              where mv.material_id = m.id
                and (
                  mv.student_profile_id = app.my_student_profile_id()
                  or app.is_parent_of_student(mv.student_profile_id)
                )
            )
            or (m.visibility = 'selected_students' and app.is_parent_for_class(m.class_id))
          )
        )
      )
  )
$$;

create or replace function app.can_manage_material(target_material_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.materials m
    where m.id = target_material_id
      and (
        app.is_admin()
        or (
          m.teacher_profile_id = app.my_teacher_profile_id()
          and app.is_teacher_for_class(m.class_id)
        )
      )
      and app.can_access_class(m.class_id)
  )
$$;

create or replace function app.can_access_fee_plan(target_fee_plan_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.fee_plans fp
    where fp.id = target_fee_plan_id
      and fp.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or exists (
          select 1
          from public.class_fee_assignments cfa
          where cfa.fee_plan_id = fp.id
            and app.can_access_class(cfa.class_id)
        )
      )
  )
$$;

create or replace function app.can_access_invoice(target_invoice_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.invoices i
    join public.student_profiles sp on sp.id = i.student_profile_id
    join public.users su on su.id = sp.user_id
    where i.id = target_invoice_id
      and su.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or i.student_profile_id = app.my_student_profile_id()
        or app.is_parent_of_student(i.student_profile_id)
      )
  )
$$;

create or replace function app.can_access_report(target_report_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.reports r
    where r.id = target_report_id
      and app.can_access_class(r.class_id)
      and (
        app.is_admin()
        or r.teacher_profile_id = app.my_teacher_profile_id()
        or (
          r.status = 'published'
          and (
            r.student_profile_id = app.my_student_profile_id()
            or app.is_parent_of_student(r.student_profile_id)
          )
        )
      )
  )
$$;

create or replace function app.can_manage_report(target_report_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.reports r
    where r.id = target_report_id
      and app.can_access_class(r.class_id)
      and (
        app.is_admin()
        or (
          r.teacher_profile_id = app.my_teacher_profile_id()
          and app.is_teacher_for_class(r.class_id)
        )
      )
  )
$$;

create or replace function app.can_access_exam(target_exam_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = target_exam_id
      and e.academy_id = app.current_academy_id()
      and app.can_access_class(e.class_id)
  )
$$;

create or replace function app.can_manage_exam(target_exam_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = target_exam_id
      and e.academy_id = app.current_academy_id()
      and (app.is_admin() or app.is_teacher_for_class(e.class_id))
  )
$$;

create or replace function app.can_access_exam_result(target_exam_result_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.exam_results er
    join public.exams e on e.id = er.exam_id
    where er.id = target_exam_result_id
      and e.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or app.is_teacher_for_class(e.class_id)
        or er.student_profile_id = app.my_student_profile_id()
        or app.is_parent_of_student(er.student_profile_id)
      )
  )
$$;

create or replace function app.can_access_result_file(target_result_file_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.result_files rf
    join public.exams e on e.id = rf.exam_id
    where rf.id = target_result_file_id
      and e.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or app.is_teacher_for_class(e.class_id)
        or (rf.student_profile_id is null and app.can_access_class(e.class_id))
        or rf.student_profile_id = app.my_student_profile_id()
        or app.is_parent_of_student(rf.student_profile_id)
      )
  )
$$;

create or replace function app.can_access_notification(target_notification_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.notifications n
    where n.id = target_notification_id
      and (
        n.user_id = app.current_user_id()
        or (
          app.is_admin()
          and n.academy_id = app.current_academy_id()
        )
      )
  )
$$;

create or replace function app.can_access_post(target_post_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.posts p
    join public.users au on au.id = p.author_user_id
    where p.id = target_post_id
      and au.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or p.author_user_id = app.current_user_id()
        or exists (
          select 1
          from public.post_recipients pr
          where pr.post_id = p.id
            and pr.user_id = app.current_user_id()
        )
        or (
          p.class_id is not null
          and app.can_access_class(p.class_id)
          and (
            p.visibility = 'everyone'
            or p.visibility = 'class_only'
            or (p.visibility = 'students_only' and app.is_student())
            or (p.visibility = 'parents_only' and app.is_parent())
            or app.is_teacher_for_class(p.class_id)
          )
        )
      )
  )
$$;

create or replace function app.can_create_post_for_class(target_class_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select app.is_admin()
      or (target_class_id is not null and app.is_teacher_for_class(target_class_id))
$$;

create or replace function app.can_access_payroll_record(target_payroll_record_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.payroll_records pr
    where pr.id = target_payroll_record_id
      and pr.academy_id = app.current_academy_id()
      and (app.is_admin() or pr.user_id = app.current_user_id())
  )
$$;

create or replace function app.can_access_compensation_profile(target_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.staff_compensation_profiles scp
    where scp.id = target_profile_id
      and scp.academy_id = app.current_academy_id()
      and (app.is_admin() or scp.user_id = app.current_user_id())
  )
$$;

create or replace function app.can_access_manual_payment_submission(target_submission_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.manual_payment_submissions mps
    where mps.id = target_submission_id
      and mps.academy_id = app.current_academy_id()
      and (
        app.is_admin()
        or mps.submitted_by_user_id = app.current_user_id()
        or app.can_access_invoice(mps.invoice_id)
      )
  )
$$;

grant execute on all functions in schema app to authenticated;

do $$
declare
  target_table text;
  target_tables text[] := array[
    'academies',
    'users',
    'teacher_profiles',
    'student_profiles',
    'parent_profiles',
    'parent_student_links',
    'courses',
    'classes',
    'class_teachers',
    'enrollments',
    'class_sessions',
    'teacher_session_joins',
    'teacher_late_deductions',
    'attendances',
    'materials',
    'material_visibility',
    'attachments',
    'fee_plans',
    'class_fee_assignments',
    'invoices',
    'payments',
    'invoice_adjustments',
    'manual_payment_submissions',
    'academy_payment_settings',
    'staff_compensation_profiles',
    'academy_payroll_settings',
    'payroll_records',
    'payroll_adjustments',
    'reports',
    'report_sections',
    'report_attachments',
    'exams',
    'exam_results',
    'result_files',
    'notifications',
    'posts',
    'comments',
    'post_reactions',
    'post_views',
    'post_recipients',
    'email_logs',
    'email_verifications',
    'stored_documents',
    'system_job_logs'
  ];
begin
  foreach target_table in array target_tables loop
    if to_regclass('public.' || target_table) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', target_table);
    end if;
  end loop;
end $$;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename <> '_prisma_migrations'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end $$;

create policy academies_read_scoped
on public.academies for select
using (app.can_access_academy(id));

create policy academies_admin_manage
on public.academies for all
using (app.can_manage_academy(id))
with check (app.can_manage_academy(id));

create policy users_read_scoped
on public.users for select
using (app.can_access_user(id));

create policy users_admin_manage
on public.users for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy teacher_profiles_read_scoped
on public.teacher_profiles for select
using (app.can_access_teacher_profile(id));

create policy teacher_profiles_admin_manage
on public.teacher_profiles for all
using (app.can_manage_teacher_profile(id))
with check (app.can_manage_teacher_profile(id));

create policy student_profiles_read_scoped
on public.student_profiles for select
using (app.can_access_student_profile(id));

create policy student_profiles_admin_manage
on public.student_profiles for all
using (app.can_manage_student_profile(id))
with check (app.can_manage_student_profile(id));

create policy parent_profiles_read_scoped
on public.parent_profiles for select
using (app.can_access_parent_profile(id));

create policy parent_profiles_admin_manage
on public.parent_profiles for all
using (app.can_manage_parent_profile(id))
with check (app.can_manage_parent_profile(id));

create policy parent_student_links_read_scoped
on public.parent_student_links for select
using (app.can_access_parent_student_link(id));

create policy parent_student_links_admin_manage
on public.parent_student_links for all
using (
  app.is_admin()
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
  and app.same_academy(app.parent_profile_academy_id(parent_profile_id))
)
with check (
  app.is_admin()
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
  and app.same_academy(app.parent_profile_academy_id(parent_profile_id))
);

create policy courses_read_scoped
on public.courses for select
using (app.can_access_course(id));

create policy courses_admin_manage
on public.courses for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy classes_read_scoped
on public.classes for select
using (app.can_access_class(id));

create policy classes_admin_manage
on public.classes for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy class_teachers_read_scoped
on public.class_teachers for select
using (app.can_access_class(class_id) and app.can_access_teacher_profile(teacher_profile_id));

create policy class_teachers_admin_manage
on public.class_teachers for all
using (
  app.is_admin()
  and app.can_access_class(class_id)
  and app.same_academy(app.teacher_profile_academy_id(teacher_profile_id))
)
with check (
  app.is_admin()
  and app.can_access_class(class_id)
  and app.same_academy(app.teacher_profile_academy_id(teacher_profile_id))
);

create policy enrollments_read_scoped
on public.enrollments for select
using (app.can_access_class(class_id) and app.can_access_student_profile(student_profile_id));

create policy enrollments_admin_manage
on public.enrollments for all
using (
  app.is_admin()
  and app.can_access_class(class_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
)
with check (
  app.is_admin()
  and app.can_access_class(class_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
);

create policy class_sessions_read_scoped
on public.class_sessions for select
using (app.can_access_session(id));

create policy class_sessions_admin_manage
on public.class_sessions for all
using (app.is_admin() and app.can_access_class(class_id))
with check (app.is_admin() and app.can_access_class(class_id));

create policy teacher_session_joins_read_scoped
on public.teacher_session_joins for select
using (app.can_access_teacher_join(id));

create policy teacher_session_joins_admin_manage
on public.teacher_session_joins for all
using (app.is_admin() and app.can_access_session(class_session_id))
with check (app.is_admin() and app.can_access_session(class_session_id));

create policy teacher_session_joins_teacher_write
on public.teacher_session_joins for all
using (
  teacher_profile_id = app.my_teacher_profile_id()
  and app.is_teacher_for_session(class_session_id)
)
with check (
  teacher_profile_id = app.my_teacher_profile_id()
  and app.is_teacher_for_session(class_session_id)
);

create policy teacher_late_deductions_read_scoped
on public.teacher_late_deductions for select
using (app.can_access_teacher_late_deduction(id));

create policy teacher_late_deductions_admin_manage
on public.teacher_late_deductions for all
using (
  app.can_manage_academy(academy_id)
  and app.can_access_session(class_session_id)
  and app.same_academy(app.teacher_profile_academy_id(teacher_profile_id))
)
with check (
  app.can_manage_academy(academy_id)
  and app.can_access_session(class_session_id)
  and app.same_academy(app.teacher_profile_academy_id(teacher_profile_id))
);

create policy attendances_read_scoped
on public.attendances for select
using (app.can_access_attendance(id));

create policy attendances_admin_manage
on public.attendances for all
using (
  app.is_admin()
  and app.can_access_session(class_session_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
)
with check (
  app.is_admin()
  and app.can_access_session(class_session_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
);

create policy attendances_teacher_manage
on public.attendances for all
using (
  app.is_teacher_for_session(class_session_id)
  and marked_by_teacher_id = app.my_teacher_profile_id()
)
with check (
  app.is_teacher_for_session(class_session_id)
  and (
    marked_by_teacher_id is null
    or marked_by_teacher_id = app.my_teacher_profile_id()
  )
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
);

create policy attendances_student_join_update
on public.attendances for update
using (
  student_profile_id = app.my_student_profile_id()
  and app.can_access_session(class_session_id)
)
with check (
  student_profile_id = app.my_student_profile_id()
  and app.can_access_session(class_session_id)
);

create policy materials_read_scoped
on public.materials for select
using (app.can_access_material(id));

create policy materials_admin_manage
on public.materials for all
using (app.is_admin() and app.can_access_class(class_id))
with check (app.is_admin() and app.can_access_class(class_id));

create policy materials_teacher_manage
on public.materials for all
using (
  teacher_profile_id = app.my_teacher_profile_id()
  and app.is_teacher_for_class(class_id)
)
with check (
  teacher_profile_id = app.my_teacher_profile_id()
  and app.is_teacher_for_class(class_id)
);

create policy material_visibility_read_scoped
on public.material_visibility for select
using (
  app.can_access_material(material_id)
  or student_profile_id = app.my_student_profile_id()
  or app.is_parent_of_student(student_profile_id)
);

create policy material_visibility_admin_teacher_manage
on public.material_visibility for all
using (app.can_manage_material(material_id))
with check (
  app.can_manage_material(material_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
);

create policy attachments_read_scoped
on public.attachments for select
using (app.can_access_material(material_id));

create policy attachments_admin_teacher_manage
on public.attachments for all
using (app.can_manage_material(material_id))
with check (app.can_manage_material(material_id));

create policy fee_plans_read_scoped
on public.fee_plans for select
using (app.can_access_fee_plan(id));

create policy fee_plans_admin_manage
on public.fee_plans for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy class_fee_assignments_read_scoped
on public.class_fee_assignments for select
using (app.can_access_class(class_id) and app.can_access_fee_plan(fee_plan_id));

create policy class_fee_assignments_admin_manage
on public.class_fee_assignments for all
using (app.is_admin() and app.can_access_class(class_id) and app.can_access_fee_plan(fee_plan_id))
with check (app.is_admin() and app.can_access_class(class_id) and app.can_access_fee_plan(fee_plan_id));

create policy invoices_read_scoped
on public.invoices for select
using (app.can_access_invoice(id));

create policy invoices_admin_manage
on public.invoices for all
using (
  app.is_admin()
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
)
with check (
  app.is_admin()
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
);

create policy payments_read_scoped
on public.payments for select
using (app.can_access_invoice(invoice_id));

create policy payments_admin_manage
on public.payments for all
using (app.is_admin() and app.can_access_invoice(invoice_id))
with check (app.is_admin() and app.can_access_invoice(invoice_id));

create policy invoice_adjustments_read_scoped
on public.invoice_adjustments for select
using (app.can_access_invoice(invoice_id));

create policy invoice_adjustments_admin_manage
on public.invoice_adjustments for all
using (app.is_admin() and app.can_access_invoice(invoice_id))
with check (app.is_admin() and app.can_access_invoice(invoice_id));

create policy manual_payment_submissions_read_scoped
on public.manual_payment_submissions for select
using (app.can_access_manual_payment_submission(id));

create policy manual_payment_submissions_admin_manage
on public.manual_payment_submissions for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy manual_payment_submissions_user_insert
on public.manual_payment_submissions for insert
with check (
  academy_id = app.current_academy_id()
  and submitted_by_user_id = app.current_user_id()
  and app.can_access_invoice(invoice_id)
);

create policy academy_payment_settings_read_scoped
on public.academy_payment_settings for select
using (app.can_access_academy(academy_id));

create policy academy_payment_settings_admin_manage
on public.academy_payment_settings for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy staff_compensation_profiles_read_scoped
on public.staff_compensation_profiles for select
using (app.can_access_compensation_profile(id));

create policy staff_compensation_profiles_admin_manage
on public.staff_compensation_profiles for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy academy_payroll_settings_admin_only
on public.academy_payroll_settings for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy payroll_records_read_scoped
on public.payroll_records for select
using (app.can_access_payroll_record(id));

create policy payroll_records_admin_manage
on public.payroll_records for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy payroll_adjustments_read_scoped
on public.payroll_adjustments for select
using (app.can_access_payroll_record(payroll_record_id));

create policy payroll_adjustments_admin_manage
on public.payroll_adjustments for all
using (app.is_admin() and app.can_access_payroll_record(payroll_record_id))
with check (app.is_admin() and app.can_access_payroll_record(payroll_record_id));

create policy reports_read_scoped
on public.reports for select
using (app.can_access_report(id));

create policy reports_admin_manage
on public.reports for all
using (app.is_admin() and app.can_access_class(class_id))
with check (
  app.is_admin()
  and app.can_access_class(class_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
  and app.same_academy(app.teacher_profile_academy_id(teacher_profile_id))
);

create policy reports_teacher_manage
on public.reports for all
using (app.can_manage_report(id))
with check (
  teacher_profile_id = app.my_teacher_profile_id()
  and app.is_teacher_for_class(class_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
);

create policy report_sections_read_scoped
on public.report_sections for select
using (app.can_access_report(report_id));

create policy report_sections_admin_teacher_manage
on public.report_sections for all
using (app.can_manage_report(report_id))
with check (app.can_manage_report(report_id));

create policy report_attachments_read_scoped
on public.report_attachments for select
using (app.can_access_report(report_id));

create policy report_attachments_admin_teacher_manage
on public.report_attachments for all
using (app.can_manage_report(report_id))
with check (
  app.can_manage_report(report_id)
  and uploaded_by_user_id = app.current_user_id()
);

create policy exams_read_scoped
on public.exams for select
using (app.can_access_exam(id));

create policy exams_admin_manage
on public.exams for all
using (app.can_manage_academy(academy_id))
with check (app.can_manage_academy(academy_id));

create policy exams_teacher_manage
on public.exams for all
using (app.can_manage_exam(id))
with check (
  academy_id = app.current_academy_id()
  and app.is_teacher_for_class(class_id)
);

create policy exam_results_read_scoped
on public.exam_results for select
using (app.can_access_exam_result(id));

create policy exam_results_admin_teacher_manage
on public.exam_results for all
using (app.can_manage_exam(exam_id))
with check (
  app.can_manage_exam(exam_id)
  and app.same_academy(app.student_profile_academy_id(student_profile_id))
);

create policy result_files_read_scoped
on public.result_files for select
using (app.can_access_result_file(id));

create policy result_files_admin_teacher_manage
on public.result_files for all
using (app.can_manage_exam(exam_id))
with check (
  app.can_manage_exam(exam_id)
  and (
    student_profile_id is null
    or app.same_academy(app.student_profile_academy_id(student_profile_id))
  )
  and uploaded_by_user_id = app.current_user_id()
);

create policy notifications_read_scoped
on public.notifications for select
using (app.can_access_notification(id));

create policy notifications_user_update_read_state
on public.notifications for update
using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());

create policy notifications_admin_manage
on public.notifications for all
using (
  app.is_admin()
  and (academy_id is null or academy_id = app.current_academy_id())
)
with check (
  app.is_admin()
  and (academy_id is null or academy_id = app.current_academy_id())
  and app.same_academy(app.user_academy_id(user_id))
);

create policy posts_read_scoped
on public.posts for select
using (app.can_access_post(id));

create policy posts_author_admin_teacher_manage
on public.posts for all
using (
  author_user_id = app.current_user_id()
  and (
    app.is_admin()
    or app.can_create_post_for_class(class_id)
  )
)
with check (
  author_user_id = app.current_user_id()
  and (
    app.is_admin()
    or app.can_create_post_for_class(class_id)
  )
);

create policy comments_read_scoped
on public.comments for select
using (app.can_access_post(post_id));

create policy comments_user_create
on public.comments for insert
with check (
  author_user_id = app.current_user_id()
  and app.can_access_post(post_id)
  and exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.allow_comments = true
  )
);

create policy comments_author_update
on public.comments for update
using (author_user_id = app.current_user_id() and app.can_access_post(post_id))
with check (author_user_id = app.current_user_id() and app.can_access_post(post_id));

create policy post_reactions_read_scoped
on public.post_reactions for select
using (app.can_access_post(post_id));

create policy post_reactions_user_manage
on public.post_reactions for all
using (user_id = app.current_user_id() and app.can_access_post(post_id))
with check (user_id = app.current_user_id() and app.can_access_post(post_id));

create policy post_views_read_scoped
on public.post_views for select
using (
  user_id = app.current_user_id()
  or app.is_admin()
  or app.can_access_post(post_id)
);

create policy post_views_user_manage
on public.post_views for all
using (user_id = app.current_user_id() and app.can_access_post(post_id))
with check (user_id = app.current_user_id() and app.can_access_post(post_id));

create policy post_recipients_read_scoped
on public.post_recipients for select
using (user_id = app.current_user_id() or app.is_admin() or app.can_access_post(post_id));

create policy post_recipients_admin_author_manage
on public.post_recipients for all
using (
  app.is_admin()
  or exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.author_user_id = app.current_user_id()
  )
)
with check (
  (app.is_admin() or app.can_access_post(post_id))
  and app.same_academy(app.user_academy_id(user_id))
);

create policy email_logs_admin_read_scoped
on public.email_logs for select
using (
  app.is_admin()
  and (
    recipient_user_id is null
    or app.same_academy(app.user_academy_id(recipient_user_id))
  )
);

-- No authenticated direct policies are intentionally created for:
--   email_verifications, stored_documents, system_job_logs
-- These are server/service-role only tables.
