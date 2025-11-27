-- Fix RLS policies for smt_initialization_logs table
-- Allow authenticated users to insert logs

DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON smt_initialization_logs;

CREATE POLICY "Allow authenticated users to insert logs"
ON smt_initialization_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to logs" ON smt_initialization_logs;

CREATE POLICY "Allow public read access to logs"
ON smt_initialization_logs
FOR SELECT
TO authenticated
USING (true);