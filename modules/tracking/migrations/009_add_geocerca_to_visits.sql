alter table tracking__visits
  add column if not exists es_valida boolean,
  add column if not exists distancia_metros_checkin integer,
  add column if not exists radio_metros_aplicado integer;
