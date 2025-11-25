-- =====================================================
-- SCRIBOOK DATABASE SETUP
-- Execute este script no seu projeto Supabase
-- =====================================================
-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- (Dashboard > SQL Editor > New Query)
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TIPOS CUSTOMIZADOS
-- =====================================================

CREATE TYPE public.ebook_type AS ENUM (
    'standard',
    'interactive',
    'professional'
);

-- =====================================================
-- 2. FUNÇÕES
-- =====================================================

-- Função para criar perfil automaticamente quando um usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER
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

-- Função para atualizar rating do ebook quando uma review é adicionada/atualizada
CREATE OR REPLACE FUNCTION public.update_ebook_rating() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER
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

-- Função para atualizar contadores de likes/dislikes nas reviews
CREATE OR REPLACE FUNCTION public.update_review_reaction_counts() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER
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

-- =====================================================
-- 3. TABELAS
-- =====================================================

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela de gêneros
CREATE TABLE public.genres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela de templates
CREATE TABLE public.templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    type public.ebook_type NOT NULL,
    thumbnail text,
    suggested_pages text,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela de ebooks
CREATE TABLE public.ebooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Tabela de capítulos
CREATE TABLE public.chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    chapter_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabela de reviews
CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    likes_count integer DEFAULT 0,
    dislikes_count integer DEFAULT 0
);

-- Tabela de reações às reviews
CREATE TABLE public.review_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(review_id, user_id)
);

-- Tabela de wishlist
CREATE TABLE public.wishlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, ebook_id)
);

-- =====================================================
-- 4. ÍNDICES
-- =====================================================

CREATE INDEX idx_chapters_ebook_id ON public.chapters(ebook_id);
CREATE INDEX idx_chapters_order ON public.chapters(ebook_id, chapter_order);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger para criar perfil automaticamente ao registrar
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar rating do ebook
CREATE TRIGGER update_ebook_rating_trigger 
  AFTER INSERT OR UPDATE ON public.reviews 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_ebook_rating();

-- Trigger para atualizar contadores de reações
CREATE TRIGGER update_review_reaction_counts_trigger 
  AFTER INSERT OR DELETE OR UPDATE ON public.review_reactions 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_review_reaction_counts();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Profiles are viewable by everyone for reviews" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Políticas para GENRES
CREATE POLICY "Genres are viewable by everyone" 
  ON public.genres FOR SELECT 
  USING (true);

-- Políticas para TEMPLATES
CREATE POLICY "Templates are viewable by everyone" 
  ON public.templates FOR SELECT 
  USING (true);

-- Políticas para EBOOKS
CREATE POLICY "Users can view own ebooks" 
  ON public.ebooks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Public ebooks are viewable by everyone" 
  ON public.ebooks FOR SELECT 
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own ebooks" 
  ON public.ebooks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ebooks" 
  ON public.ebooks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ebooks" 
  ON public.ebooks FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas para CHAPTERS
CREATE POLICY "Users can view chapters of their ebooks" 
  ON public.chapters FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.ebooks
      WHERE ebooks.id = chapters.ebook_id 
      AND ebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chapters for their ebooks" 
  ON public.chapters FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ebooks
      WHERE ebooks.id = chapters.ebook_id 
      AND ebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chapters of their ebooks" 
  ON public.chapters FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.ebooks
      WHERE ebooks.id = chapters.ebook_id 
      AND ebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chapters of their ebooks" 
  ON public.chapters FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.ebooks
      WHERE ebooks.id = chapters.ebook_id 
      AND ebooks.user_id = auth.uid()
    )
  );

-- Políticas para REVIEWS
CREATE POLICY "Reviews are viewable by everyone" 
  ON public.reviews FOR SELECT 
  USING (true);

CREATE POLICY "Users can create reviews" 
  ON public.reviews FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" 
  ON public.reviews FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" 
  ON public.reviews FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas para REVIEW_REACTIONS
CREATE POLICY "Anyone can view reactions" 
  ON public.review_reactions FOR SELECT 
  USING (true);

CREATE POLICY "Users can add their own reactions" 
  ON public.review_reactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" 
  ON public.review_reactions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
  ON public.review_reactions FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas para WISHLIST
CREATE POLICY "Users can view own wishlist" 
  ON public.wishlist FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to wishlist" 
  ON public.wishlist FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from wishlist" 
  ON public.wishlist FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- SETUP CONCLUÍDO!
-- =====================================================
-- Agora configure as URLs de redirecionamento:
-- 1. Vá para Authentication > URL Configuration
-- 2. Site URL: cole a URL do seu preview do Lovable
-- 3. Redirect URLs: adicione a URL do seu preview do Lovable
-- =====================================================
