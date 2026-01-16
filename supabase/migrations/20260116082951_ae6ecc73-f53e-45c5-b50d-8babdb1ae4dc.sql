-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  chapter TEXT NOT NULL,
  introduction TEXT NOT NULL,
  concept_explanation TEXT NOT NULL,
  real_life_example TEXT NOT NULL,
  quick_tips TEXT[] NOT NULL DEFAULT '{}',
  practice_questions JSONB NOT NULL DEFAULT '[]',
  summary_points TEXT[] NOT NULL DEFAULT '{}',
  motivational_line TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  read_time_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can read published blog posts"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

-- Mentors can create blog posts
CREATE POLICY "Mentors can create blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'mentor'
  )
);

-- Authors can update their own posts
CREATE POLICY "Authors can update own posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid());

-- Authors can delete their own posts
CREATE POLICY "Authors can delete own posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins can manage all blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_class_subject ON public.blog_posts(class_level, subject);