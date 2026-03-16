-- Backfill reservation occupancies for environments where seed ran before CTE visibility fix

INSERT INTO occupancies (unit_id, start_date, end_date, occupancy_type, reservation_id, notes)
SELECT
  ru.unit_id,
  r.check_in,
  r.check_out,
  'reservation',
  r.id,
  'Backfill de ocupacion desde reserva'
FROM reservation_units ru
JOIN reservations r ON r.id = ru.reservation_id
WHERE NOT EXISTS (
  SELECT 1
  FROM occupancies o
  WHERE o.reservation_id = r.id
    AND o.unit_id = ru.unit_id
    AND o.start_date = r.check_in
    AND o.end_date = r.check_out
    AND o.occupancy_type = 'reservation'
);
