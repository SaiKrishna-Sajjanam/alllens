set client_min_messages = warning;
-- Vuaz: the order of the topic buttons on the feed, as the reader arranges them. It only moves
-- buttons; it never hides or narrows any news. Same row-level security as the rest of the
-- profile (each reader reads and writes only their own row). Idempotent.
alter table public.profiles add column if not exists topic_order text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_topic_order_len;
alter table public.profiles add constraint profiles_topic_order_len check (cardinality(topic_order) <= 40);
