-- 0011_admin_fixes.sql
-- Grant authenticated role access to admin_actions table

GRANT ALL ON TABLE public.admin_actions TO authenticated;
