begin;

alter table public.abuse_events
  drop constraint if exists abuse_events_action_scope_check;

alter table public.abuse_events
  add constraint abuse_events_action_scope_check
  check (
    action_scope in (
      'add_link_attempt',
      'add_link_success',
      'report_link_attempt',
      'report_link_success',
      'link_verify_request',
      'link_verify_email_request'
    )
  );

commit;