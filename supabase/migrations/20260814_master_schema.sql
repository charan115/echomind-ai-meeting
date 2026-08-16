-- 1. Clear existing tables and policies to prevent conflicts
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.action_items CASCADE;
DROP TABLE IF EXISTS public.decisions CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP FUNCTION IF EXISTS public.can_access_meeting(uuid) CASCADE;

-- 2. Create tables
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  duration text,
  raw_transcript text,
  summary text,
  tags text[] NOT NULL DEFAULT '{}',
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  decision_text text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  task text NOT NULL,
  assignee text,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'To Do',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  sender text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_items TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated, anon;
GRANT ALL ON public.meetings TO service_role;
GRANT ALL ON public.decisions TO service_role;
GRANT ALL ON public.action_items TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function for RLS
CREATE OR REPLACE FUNCTION public.can_access_meeting(_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = _meeting_id
      AND (m.user_id IS NULL OR m.user_id = auth.uid())
  )
$$;

-- 6. RLS Policies
CREATE POLICY "Own or demo meetings are visible" ON public.meetings
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Insert own or demo meetings" ON public.meetings
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Update own or demo meetings" ON public.meetings
  FOR UPDATE USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Delete own or demo meetings" ON public.meetings
  FOR DELETE USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Access decisions of accessible meetings" ON public.decisions
  FOR ALL USING (public.can_access_meeting(meeting_id))
  WITH CHECK (public.can_access_meeting(meeting_id));

CREATE POLICY "Access action items of accessible meetings" ON public.action_items
  FOR ALL USING (public.can_access_meeting(meeting_id))
  WITH CHECK (public.can_access_meeting(meeting_id));

CREATE POLICY "Access chat of accessible meetings" ON public.chat_messages
  FOR ALL USING (public.can_access_meeting(meeting_id))
  WITH CHECK (public.can_access_meeting(meeting_id));

-- 7. Insert Seed Data
INSERT INTO public.meetings (id, user_id, title, date, duration, tags, raw_transcript, summary) VALUES
('11111111-1111-4111-8111-111111111111', NULL, 'Q3 Product Roadmap Sync', now() - interval '2 days', '48:12', ARRAY['Roadmap','Product','Q3'],
'Speaker A (00:04): Welcome everyone. Today we are locking the Q3 roadmap.
Speaker B (01:20): The mobile rewrite is the biggest item. Engineering estimates six weeks.
Speaker A (02:15): We need to protect the launch date, so let us cut the analytics dashboard from scope.
Speaker C (04:02): Agreed. I will move analytics to Q4 and communicate to stakeholders.
Speaker B (07:44): One risk is the design system migration, still 40 percent done.
Speaker A (12:30): Let us allocate two designers full time for the next three weeks.
Speaker C (21:05): I will draft the updated roadmap doc and share by Friday.',
'The team locked the Q3 roadmap around the mobile rewrite as the flagship initiative, estimated at six weeks of engineering effort. To protect the launch date, the analytics dashboard was deferred to Q4. The design system migration was flagged as the primary risk at 40 percent completion, and two designers will be dedicated full time for three weeks to close the gap. An updated roadmap document will be circulated by Friday.'),
('22222222-2222-4222-8222-222222222222', NULL, 'Series B Budget Review', now() - interval '6 days', '31:45', ARRAY['Finance','Budget'],
'Speaker A (00:10): Let us review the runway before the board update.
Sarah (03:22): The current burn gives us nineteen months of runway.
Sarah (05:40): I recommend capping new hires at eight this quarter to keep burn flat.
Speaker B (09:11): Marketing spend should shift toward product-led growth experiments.
Sarah (14:50): I will rebuild the model with the eight-hire cap and send it Monday.',
'Finance reviewed runway ahead of the board update: nineteen months at current burn. Sarah recommended capping quarterly hiring at eight roles to hold burn flat, and marketing budget will shift toward product-led growth experiments. A revised financial model reflecting the hiring cap will be delivered Monday.'),
('33333333-3333-4333-8333-333333333333', NULL, 'Customer Discovery: Enterprise Onboarding', now() - interval '11 days', '54:03', ARRAY['Research','Customers','Onboarding'],
'Speaker A (00:08): Thanks for joining. Tell us about your onboarding experience.
Customer (02:30): SSO setup took our IT team almost two weeks.
Customer (11:15): Bulk user import is the single feature that would save us the most time.
Speaker B (25:40): We will prioritize a self-serve SAML flow.
Speaker A (40:12): I will write up the findings and share with product.',
'Enterprise customers reported that SSO configuration is the biggest onboarding blocker, taking up to two weeks of IT effort. Bulk user import was named the highest-value missing capability. The team committed to prioritizing a self-serve SAML flow and documenting findings for product review.');

INSERT INTO public.decisions (meeting_id, decision_text, category) VALUES
('11111111-1111-4111-8111-111111111111', 'Mobile rewrite is the flagship Q3 initiative with a six-week engineering estimate.', 'Scope'),
('11111111-1111-4111-8111-111111111111', 'Analytics dashboard deferred to Q4 to protect the launch date.', 'Prioritization'),
('11111111-1111-4111-8111-111111111111', 'Two designers allocated full time to the design system migration for three weeks.', 'Resourcing'),
('22222222-2222-4222-8222-222222222222', 'Cap new hires at eight for the quarter to keep burn flat.', 'Hiring'),
('22222222-2222-4222-8222-222222222222', 'Shift marketing budget toward product-led growth experiments.', 'Budget'),
('33333333-3333-4333-8333-333333333333', 'Prioritize a self-serve SAML flow for enterprise onboarding.', 'Product'),
('33333333-3333-4333-8333-333333333333', 'Add bulk user import to the enterprise roadmap.', 'Product');

INSERT INTO public.action_items (meeting_id, task, assignee, priority, status, due_date) VALUES
('11111111-1111-4111-8111-111111111111', 'Draft and circulate the updated Q3 roadmap doc', 'Marcus Lee', 'High', 'In Progress', current_date + 3),
('11111111-1111-4111-8111-111111111111', 'Communicate analytics deferral to stakeholders', 'Priya Nair', 'Medium', 'To Do', current_date + 5),
('11111111-1111-4111-8111-111111111111', 'Staff two designers on design system migration', 'Alex Rivera', 'High', 'Done', current_date - 1),
('22222222-2222-4222-8222-222222222222', 'Rebuild financial model with eight-hire cap', 'Sarah Chen', 'High', 'In Progress', current_date + 2),
('22222222-2222-4222-8222-222222222222', 'Draft PLG experiment plan for marketing spend', 'Dana Wu', 'Low', 'To Do', current_date + 10),
('33333333-3333-4333-8333-333333333333', 'Write up enterprise discovery findings', 'Jordan Ellis', 'Medium', 'Done', current_date - 4),
('33333333-3333-4333-8333-333333333333', 'Spec self-serve SAML onboarding flow', 'Priya Nair', 'High', 'To Do', current_date + 7);

INSERT INTO public.chat_messages (meeting_id, sender, message) VALUES
('22222222-2222-4222-8222-222222222222', 'user', 'What did Sarah say about the budget?'),
('22222222-2222-4222-8222-222222222222', 'assistant', 'Sarah reported nineteen months of runway at the current burn rate and recommended capping new hires at eight this quarter to keep burn flat. She also committed to rebuilding the financial model with that cap and sending it Monday.');