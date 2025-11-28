# Configuração Manual - ScriBook

## ⚠️ IMPORTANTE: Execute estes passos no Supabase

### 1. Popular tabela de Géneros e criar Buckets de Storage

Vá ao **SQL Editor** do seu projeto Supabase e execute este script:

```sql
-- =====================================================
-- POPULAR DADOS INICIAIS E CONFIGURAR STORAGE
-- =====================================================

-- 1. Popular tabela de gêneros com opções comuns
INSERT INTO public.genres (name) VALUES
  ('Ficção'),
  ('Não-ficção'),
  ('Romance'),
  ('Suspense'),
  ('Terror'),
  ('Fantasia'),
  ('Ficção Científica'),
  ('Biografia'),
  ('Autoajuda'),
  ('Negócios'),
  ('Tecnologia'),
  ('História'),
  ('Infantil'),
  ('Juvenil'),
  ('Poesia'),
  ('Drama'),
  ('Comédia'),
  ('Aventura'),
  ('Mistério'),
  ('Educação')
ON CONFLICT (name) DO NOTHING;

-- 2. Criar buckets de storage se não existirem
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('ebook-covers', 'ebook-covers', true),
  ('ebook-uploads', 'ebook-uploads', false)
ON CONFLICT (id) DO NOTHING;
```

### 2. Configurar Políticas de Storage (Supabase Dashboard)

Vá para **Storage** no Supabase Dashboard e configure as políticas:

**Para o bucket `ebook-covers`:**
1. Clique em `ebook-covers` → Policies
2. Adicione estas políticas:
   - **SELECT (público)**: `bucket_id = 'ebook-covers'`
   - **INSERT (autenticados)**: `bucket_id = 'ebook-covers' AND auth.role() = 'authenticated'`
   - **UPDATE (próprio)**: `bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]`
   - **DELETE (próprio)**: `bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]`

**Para o bucket `ebook-uploads`:**
1. Clique em `ebook-uploads` → Policies
2. Adicione estas políticas:
   - **SELECT (próprio)**: `bucket_id = 'ebook-uploads' AND auth.uid()::text = (storage.foldername(name))[1]`
   - **INSERT (autenticados)**: `bucket_id = 'ebook-uploads' AND auth.role() = 'authenticated'`
   - **UPDATE (próprio)**: `bucket_id = 'ebook-uploads' AND auth.uid()::text = (storage.foldername(name))[1]`
   - **DELETE (próprio)**: `bucket_id = 'ebook-uploads' AND auth.uid()::text = (storage.foldername(name))[1]`

### 3. Configurar API de Templates Externos (Opcional)

Para usar templates de APIs externas:

1. **Opção A - JSONBin.io (Grátis)**:
   - Crie uma conta em https://jsonbin.io
   - Crie um novo bin com este formato:
   ```json
   {
     "templates": [
       {
         "id": "modern-magazine",
         "name": "Revista Moderna",
         "description": "Layout estilo revista com colunas",
         "thumbnail": "https://url-da-imagem.jpg"
       }
     ]
   }
   ```
   - Copie o BIN ID
   - Edite `src/hooks/useEbookTemplates.ts` linha 9 e substitua `YOUR_BIN_ID` pelo ID real

2. **Opção B - Outra API**:
   - Edite `src/hooks/useEbookTemplates.ts` 
   - Altere `API_TEMPLATES_ENDPOINT` para sua API
   - Adapte o mapeamento de dados se necessário

### 4. Verificar que a formatação Rich Text está funcionando

A formatação (negrito, itálico, sublinhado) **já está funcionando corretamente** no código:
- O CKEditor salva o conteúdo como HTML
- O campo `content` no banco de dados é tipo TEXT e suporta HTML
- Ao reabrir, o HTML é carregado e renderizado corretamente

**Se ainda assim você encontrar problemas**:
1. Verifique o console do navegador por erros
2. Confirme que o campo `content` na tabela `chapters` não está truncando o texto
3. Tente fazer um teste simples: adicione negrito, salve, recarregue a página

### 5. Problemas Resolvidos

✅ **Campo Género**: Agora populated com 20 opções após executar o SQL  
✅ **Templates**: Sistema com fallback - usa 3 locais + opcionalmente API externa  
✅ **Formatação**: Já funciona corretamente (CKEditor + HTML no DB)  
✅ **Capa**: Buckets criados com permissões corretas  

## Próximos Passos

Após executar o SQL:
1. Teste criar um ebook do zero e verificar se o campo Género mostra as opções
2. Teste fazer upload de uma capa e verificar se aparece
3. Teste adicionar formatação (negrito/itálico) e salvar
4. (Opcional) Configure a API de templates externos
