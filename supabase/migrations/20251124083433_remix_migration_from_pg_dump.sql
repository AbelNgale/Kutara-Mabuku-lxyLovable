CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: ebook_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ebook_type AS ENUM (
    'standard',
    'interactive',
    'professional'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_ebook_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ebook_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.ebooks
  SET rating = (
    SELECT AVG(rating)::decimal(3,2)
    FROM public.reviews
    WHERE ebook_id = NEW.ebook_id
  )
  WHERE id = NEW.ebook_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_review_reaction_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_review_reaction_counts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'like' THEN
      UPDATE public.reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
    ELSE
      UPDATE public.reviews SET dislikes_count = dislikes_count + 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reaction_type = 'like' AND NEW.reaction_type = 'dislike' THEN
      UPDATE public.reviews SET likes_count = likes_count - 1, dislikes_count = dislikes_count + 1 WHERE id = NEW.review_id;
    ELSIF OLD.reaction_type = 'dislike' AND NEW.reaction_type = 'like' THEN
      UPDATE public.reviews SET likes_count = likes_count + 1, dislikes_count = dislikes_count - 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE public.reviews SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.review_id;
    ELSE
      UPDATE public.reviews SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = OLD.review_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ebook_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    chapter_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ebooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ebooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    type public.ebook_type NOT NULL,
    template_id text,
    pages integer DEFAULT 0,
    file_size text,
    cover_image text,
    views integer DEFAULT 0,
    downloads integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    author text,
    is_public boolean DEFAULT false,
    price numeric(10,2) DEFAULT 0,
    genre text,
    formats text[] DEFAULT ARRAY['PDF'::text],
    published_at timestamp with time zone DEFAULT now(),
    rating numeric(3,2) DEFAULT 0,
    preview_content text
);


--
-- Name: genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.genres (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: review_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT review_reactions_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['like'::text, 'dislike'::text])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ebook_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    likes_count integer DEFAULT 0,
    dislikes_count integer DEFAULT 0,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    type public.ebook_type NOT NULL,
    thumbnail text,
    suggested_pages text,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ebook_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: ebooks ebooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebooks
    ADD CONSTRAINT ebooks_pkey PRIMARY KEY (id);


--
-- Name: genres genres_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_name_key UNIQUE (name);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: review_reactions review_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT review_reactions_pkey PRIMARY KEY (id);


--
-- Name: review_reactions review_reactions_review_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT review_reactions_review_id_user_id_key UNIQUE (review_id, user_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_user_id_ebook_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_ebook_id_key UNIQUE (user_id, ebook_id);


--
-- Name: idx_chapters_ebook_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_ebook_id ON public.chapters USING btree (ebook_id);


--
-- Name: idx_chapters_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_order ON public.chapters USING btree (ebook_id, chapter_order);


--
-- Name: reviews update_ebook_rating_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ebook_rating_trigger AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_ebook_rating();


--
-- Name: review_reactions update_review_reaction_counts_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_review_reaction_counts_trigger AFTER INSERT OR DELETE OR UPDATE ON public.review_reactions FOR EACH ROW EXECUTE FUNCTION public.update_review_reaction_counts();


--
-- Name: chapters chapters_ebook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_ebook_id_fkey FOREIGN KEY (ebook_id) REFERENCES public.ebooks(id) ON DELETE CASCADE;


--
-- Name: ebooks ebooks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebooks
    ADD CONSTRAINT ebooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: review_reactions review_reactions_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT review_reactions_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_reactions review_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT review_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_ebook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_ebook_id_fkey FOREIGN KEY (ebook_id) REFERENCES public.ebooks(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_ebook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_ebook_id_fkey FOREIGN KEY (ebook_id) REFERENCES public.ebooks(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: review_reactions Anyone can view reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reactions" ON public.review_reactions FOR SELECT USING (true);


--
-- Name: genres Genres are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Genres are viewable by everyone" ON public.genres FOR SELECT USING (true);


--
-- Name: profiles Profiles are viewable by everyone for reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone for reviews" ON public.profiles FOR SELECT USING (true);


--
-- Name: ebooks Public ebooks are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public ebooks are viewable by everyone" ON public.ebooks FOR SELECT USING (((is_public = true) OR (auth.uid() = user_id)));


--
-- Name: reviews Reviews are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);


--
-- Name: templates Templates are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Templates are viewable by everyone" ON public.templates FOR SELECT USING (true);


--
-- Name: review_reactions Users can add their own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add their own reactions" ON public.review_reactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlist Users can add to wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add to wishlist" ON public.wishlist FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chapters Users can create chapters for their ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create chapters for their ebooks" ON public.chapters FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ebooks
  WHERE ((ebooks.id = chapters.ebook_id) AND (ebooks.user_id = auth.uid())))));


--
-- Name: ebooks Users can create own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own ebooks" ON public.ebooks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reviews Users can create reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chapters Users can delete chapters of their ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete chapters of their ebooks" ON public.chapters FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.ebooks
  WHERE ((ebooks.id = chapters.ebook_id) AND (ebooks.user_id = auth.uid())))));


--
-- Name: ebooks Users can delete own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own ebooks" ON public.ebooks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reviews Users can delete own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: review_reactions Users can delete their own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own reactions" ON public.review_reactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: wishlist Users can remove from wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove from wishlist" ON public.wishlist FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chapters Users can update chapters of their ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update chapters of their ebooks" ON public.chapters FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.ebooks
  WHERE ((ebooks.id = chapters.ebook_id) AND (ebooks.user_id = auth.uid())))));


--
-- Name: ebooks Users can update own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own ebooks" ON public.ebooks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: review_reactions Users can update their own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reactions" ON public.review_reactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chapters Users can view chapters of their ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chapters of their ebooks" ON public.chapters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.ebooks
  WHERE ((ebooks.id = chapters.ebook_id) AND (ebooks.user_id = auth.uid())))));


--
-- Name: ebooks Users can view own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own ebooks" ON public.ebooks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: wishlist Users can view own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own wishlist" ON public.wishlist FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: ebooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

--
-- Name: genres; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: review_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


