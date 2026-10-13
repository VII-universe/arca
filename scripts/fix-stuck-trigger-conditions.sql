-- One-off data cleanup — AUDIT.md: "TriggerCondition.status zůstává PENDING
-- i po doručení".
--
-- Background: an older version of the cron (app/api/cron/process-triggers)
-- wrote MessagePack.status = TRIGGERED without also writing
-- TriggerCondition.status = EXECUTED in the same transaction. That's been
-- fixed in the current code (every sweep now updates both atomically), but
-- a handful of rows from before the fix are stuck: the pack itself moved on
-- (TRIGGERED or DELIVERED), while its trigger condition still reads PENDING.
-- Harmless today — sweep A only re-matches rows where
-- MessagePack.status = ACTIVE, so these are never re-processed — but it's
-- incorrect data, and worth fixing now that TRIGGERED → DELIVERED is a real
-- transition recipients actually reach (see CHANGELOG).
--
-- Run the SELECT first to see exactly which rows this will touch. Only run
-- the UPDATE once you're satisfied with that list — this only needs to run
-- once, ever, against production.

-- 1. Preview — run this first.
SELECT
  tc.id            AS trigger_condition_id,
  tc.status        AS trigger_status,
  tc."executeAtDate",
  mp.id            AS pack_id,
  mp.title         AS pack_title,
  mp.status        AS pack_status
FROM "TriggerCondition" tc
JOIN "MessagePack" mp ON mp.id = tc."messagePackId"
WHERE tc.status = 'PENDING'
  AND mp.status IN ('TRIGGERED', 'DELIVERED');

-- 2. Fix — only run after reviewing the SELECT above.
UPDATE "TriggerCondition" tc
SET status = 'EXECUTED'
FROM "MessagePack" mp
WHERE tc."messagePackId" = mp.id
  AND tc.status = 'PENDING'
  AND mp.status IN ('TRIGGERED', 'DELIVERED');
