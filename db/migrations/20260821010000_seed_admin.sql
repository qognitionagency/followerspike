-- Seed the owner account as an admin.
--
-- The row is created without a clerk_user_id; lib/session.ts claims it by email
-- on first sign-in, so signing in with this address lands on the existing row
-- rather than creating a second one.
insert into users (email, full_name, is_admin)
values ('hello@qognitionagency.com', 'Qognition Agency', true)
on conflict do nothing;

update users set is_admin = true where lower(email) = 'hello@qognitionagency.com';
