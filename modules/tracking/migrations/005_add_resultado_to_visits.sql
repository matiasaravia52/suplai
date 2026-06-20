alter table tracking__visits
  add column resultado text check (resultado in ('venta', 'no_venta'));
