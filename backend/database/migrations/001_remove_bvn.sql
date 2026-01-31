-- Migration: Remove BVN column from customers table
-- Description: Drops the 'bvn' column as part of the "No BVN Storage" policy change.
-- CAUTION: This will permanently delete all data in the 'bvn' column.

ALTER TABLE customers DROP COLUMN IF EXISTS bvn;
