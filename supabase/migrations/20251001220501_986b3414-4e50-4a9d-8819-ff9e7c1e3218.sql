-- Create mentorship-related tables

-- Mentorship programs table
CREATE TABLE public.mentorship_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('one-on-one', 'group')),
  category TEXT NOT NULL CHECK (category IN ('academic', 'skill-based')),
  max_participants INTEGER DEFAULT 1,
  duration_weeks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mentors table with extended profile information
CREATE TABLE public.mentors (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  bio TEXT,
  expertise TEXT[],
  qualification TEXT,
  experience_years INTEGER,
  availability_hours JSONB, -- Store weekly availability
  is_volunteer BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mentorship sessions table
CREATE TABLE public.mentorship_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.mentorship_programs(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('one-on-one', 'group')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  max_participants INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session participants table
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.mentorship_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'absent', 'cancelled')),
  joined_at TIMESTAMP WITH TIME ZONE,
  feedback_submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- Feedback table
CREATE TABLE public.mentorship_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.mentorship_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- Mentor applications table for onboarding
CREATE TABLE public.mentor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  expertise TEXT[],
  qualification TEXT,
  experience_years INTEGER,
  motivation TEXT,
  is_volunteer BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mentorship_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentorship_programs
CREATE POLICY "Anyone can view programs" 
ON public.mentorship_programs 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create programs" 
ON public.mentorship_programs 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'mentor'
));

CREATE POLICY "Only admins can update programs" 
ON public.mentorship_programs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'mentor'
));

-- RLS Policies for mentors
CREATE POLICY "Anyone can view verified mentors" 
ON public.mentors 
FOR SELECT 
USING (is_verified = true OR id = auth.uid());

CREATE POLICY "Mentors can update their own profile" 
ON public.mentors 
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Mentors can insert their own profile" 
ON public.mentors 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- RLS Policies for mentorship_sessions
CREATE POLICY "Anyone can view sessions" 
ON public.mentorship_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Mentors can create their sessions" 
ON public.mentorship_sessions 
FOR INSERT 
WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Mentors can update their sessions" 
ON public.mentorship_sessions 
FOR UPDATE 
USING (mentor_id = auth.uid());

-- RLS Policies for session_participants
CREATE POLICY "Participants can view their registrations" 
ON public.session_participants 
FOR SELECT 
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.mentorship_sessions 
  WHERE id = session_participants.session_id AND mentor_id = auth.uid()
));

CREATE POLICY "Students can register for sessions" 
ON public.session_participants 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Participants can update their status" 
ON public.session_participants 
FOR UPDATE 
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.mentorship_sessions 
  WHERE id = session_participants.session_id AND mentor_id = auth.uid()
));

-- RLS Policies for mentorship_feedback
CREATE POLICY "Students can submit feedback" 
ON public.mentorship_feedback 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Mentors can view their feedback" 
ON public.mentorship_feedback 
FOR SELECT 
USING (mentor_id = auth.uid() OR student_id = auth.uid());

-- RLS Policies for mentor_applications
CREATE POLICY "Users can submit applications" 
ON public.mentor_applications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their applications" 
ON public.mentor_applications 
FOR SELECT 
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'mentor'
));

CREATE POLICY "Admins can update applications" 
ON public.mentor_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'mentor'
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_mentorship_programs_updated_at
BEFORE UPDATE ON public.mentorship_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentors_updated_at
BEFORE UPDATE ON public.mentors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_sessions_updated_at
BEFORE UPDATE ON public.mentorship_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_applications_updated_at
BEFORE UPDATE ON public.mentor_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_mentorship_sessions_mentor_id ON public.mentorship_sessions(mentor_id);
CREATE INDEX idx_mentorship_sessions_scheduled_at ON public.mentorship_sessions(scheduled_at);
CREATE INDEX idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_student_id ON public.session_participants(student_id);
CREATE INDEX idx_mentorship_feedback_mentor_id ON public.mentorship_feedback(mentor_id);
CREATE INDEX idx_mentor_applications_status ON public.mentor_applications(status);