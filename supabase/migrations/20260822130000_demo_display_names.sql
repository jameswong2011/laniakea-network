-- Forum names only. Does not change HP, tier, or login usernames.
update public.profiles as p
set
  display_name = v.display_name,
  updated_at = now()
from (
  values
  ('demo_vale_hart', 'Quiet Ledger 4821'),
  ('demo_nara_quinn', 'Lucid Desk 7314'),
  ('demo_elio_voss', 'Swift Vault 1908'),
  ('demo_kira_moss', 'Crisp Note 5642'),
  ('demo_mira_chen', 'Hidden Thesis 8830'),
  ('demo_jonas_reed', 'Stark Signal 2176'),
  ('demo_priya_shah', 'Keen Spread 6409'),
  ('demo_rafael_dunn', 'Calm Folio 3591'),
  ('demo_owen_blake', 'Prime Stack 9044'),
  ('demo_sasha_kline', 'Rare Draft 1287'),
  ('demo_helen_ortiz', 'Solid Curve 7753'),
  ('demo_amina_cole', 'Vivid Thread 4016'),
  ('demo_marcus_dale', 'Silent Rail 6288'),
  ('demo_yuna_park', 'Brisk Paper 2560'),
  ('demo_theo_nilsen', 'Noble Range 8193'),
  ('demo_lev_okada', 'Wry Quote 3475'),
  ('demo_irene_wahl', 'Amber Gate 5902'),
  ('demo_cyrus_ade', 'Tight Mark 1628'),
  ('demo_lina_moreau', 'Vast Flow 9341'),
  ('demo_nora_weiss', 'Curious Tape 2784')
) as v(username, display_name)
where p.username = v.username
  and p.role is distinct from 'admin';
