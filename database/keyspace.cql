-- ============================================================
-- FILE: keyspace.cql
-- MỤC ĐÍCH: Tạo Keyspace cho Financial Transaction Ledger
-- CHẠY ĐẦU TIÊN — trước schema.cql, mv_setup.cql, indexes.cql
-- ============================================================

-- SimpleStrategy: dùng cho môi trường dev / single-node Docker.
-- Khi lên production multi-datacenter, đổi sang:
--   WITH REPLICATION = {
--     'class'   : 'NetworkTopologyStrategy',
--     'dc1'     : 3,
--     'dc2'     : 3
--   }

CREATE KEYSPACE IF NOT EXISTS ledger
WITH REPLICATION = {
    'class'              : 'SimpleStrategy',
    'replication_factor' : 1
}
AND DURABLE_WRITES = true;

USE ledger;
