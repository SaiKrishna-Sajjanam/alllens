-- New readers see "Latest first" by default. Readers who already saved an
-- order keep it; the order stays theirs to change.
alter table public.profiles alter column feed_sort set default 'latest';
