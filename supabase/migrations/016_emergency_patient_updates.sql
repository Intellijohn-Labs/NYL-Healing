-- NYL emergency photo healing: tell the patient on WhatsApp when the healer taps Started and Done.
-- These columns make sure each message is sent only once. Run after 015. Safe to run again.

alter table emergency_requests add column if not exists started_notified_at timestamptz;
alter table emergency_requests add column if not exists done_notified_at timestamptz;
