ALTER TABLE public.category_groups
ADD COLUMN business_profile_id uuid REFERENCES public.business_profiles(id) ON DELETE SET NULL DEFAULT NULL;