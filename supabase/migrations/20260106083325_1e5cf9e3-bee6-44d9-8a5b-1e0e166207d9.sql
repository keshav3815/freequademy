-- Enable realtime for mentorship_sessions table
ALTER TABLE public.mentorship_sessions REPLICA IDENTITY FULL;

-- Enable realtime for forum_threads table
ALTER TABLE public.forum_threads REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_threads;