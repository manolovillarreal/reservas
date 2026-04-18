alter table public.account_profile
  add column if not exists checkin_time text default '3:00 PM',
  add column if not exists checkout_time text default '12:00 PM',
  add column if not exists anticipo_pct integer default 50,
  add column if not exists amenidades_generales text,
  add column if not exists descripcion_detallada text,
  add column if not exists politica_reserva text;

update public.account_profile ap
set
  checkin_time = ms.checkin_time,
  checkout_time = ms.checkout_time
from public.message_settings ms
where ms.account_id = ap.account_id
  and ms.checkin_time is not null;
