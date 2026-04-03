-- Spec 1/6: Decision workspace + loop-closure schema for structured dual-output recommendations.
alter table public.recommendations
  add column if not exists structured_payload jsonb,
  add column if not exists action_status text,
  add column if not exists teacher_approved_at timestamptz,
  add column if not exists teacher_implemented_at timestamptz,
  add column if not exists teacher_feedback text,
  add column if not exists feedback_sentiment text,
  add column if not exists feedback_confidence numeric(4,3),
  add column if not exists closure_share_note text,
  add column if not exists not_actioned_at timestamptz,
  add column if not exists restored_from_recommendation_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recommendations_action_status_check'
  ) then
    alter table public.recommendations
      add constraint recommendations_action_status_check
      check (
        action_status is null
        or action_status in (
          'pending',
          'approved',
          'implemented',
          'feedback_logged',
          'dismissed',
          'not_actioned'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'recommendations_feedback_sentiment_check'
  ) then
    alter table public.recommendations
      add constraint recommendations_feedback_sentiment_check
      check (
        feedback_sentiment is null
        or feedback_sentiment in ('positive', 'neutral', 'negative')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recommendations_restored_from_fkey'
  ) then
    alter table public.recommendations
      add constraint recommendations_restored_from_fkey
      foreign key (restored_from_recommendation_id)
      references public.recommendations(id)
      on delete set null;
  end if;
end $$;

update public.recommendations
set action_status = case
  when coalesce(status::text, '') = 'dismissed'
    or coalesce(teacher_approval_status, '') = 'dismissed'
    then 'dismissed'
  when coalesce(status::text, '') = 'approved'
    or coalesce(teacher_approval_status, '') = 'approved'
    then 'approved'
  else 'pending'
end
where action_status is null;

create index if not exists recommendations_action_status_idx
  on public.recommendations (class_id, action_status, created_at desc);

create index if not exists recommendations_structured_payload_idx
  on public.recommendations
  using gin (structured_payload jsonb_path_ops);

create index if not exists recommendations_restored_from_idx
  on public.recommendations (class_id, restored_from_recommendation_id);
