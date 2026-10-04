-- Rollback for 20261001100000_5d7e1b3a-9c42-4f86-a0e5-3b8c6d2f1e97.sql
-- Restores the previous (over-broad) grants on get_user_counts().
GRANT EXECUTE ON FUNCTION public.get_user_counts() TO PUBLIC, anon, authenticated;
