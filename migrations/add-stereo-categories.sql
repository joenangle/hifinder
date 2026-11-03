-- Stereo Builder v1: allow speakers and speaker_amp in components.category.
-- Live constraint name confirmed as components_category_check.
-- Transactional, so a failure cannot leave the table without its category check.
BEGIN;

ALTER TABLE components DROP CONSTRAINT IF EXISTS components_category_check;
ALTER TABLE components
  ADD CONSTRAINT components_category_check
  CHECK (category IN ('cans','iems','dac','amp','dac_amp','cable','speakers','speaker_amp'));

COMMIT;
