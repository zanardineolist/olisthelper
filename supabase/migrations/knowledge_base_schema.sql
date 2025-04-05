-- Criação das tabelas para a Base de Conhecimento

-- Tabela de sessões de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES knowledge_sessions(id) ON DELETE SET NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  ticket_link VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_knowledge_sessions_user_id ON knowledge_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_session_id ON knowledge_base(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_title ON knowledge_base USING gin(to_tsvector('portuguese', title));
CREATE INDEX IF NOT EXISTS idx_knowledge_base_description ON knowledge_base USING gin(to_tsvector('portuguese', description));
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING gin(tags);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar o timestamp de updated_at
CREATE TRIGGER update_knowledge_sessions_updated_at
BEFORE UPDATE ON knowledge_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON knowledge_base
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança (RLS)

-- Habilitar RLS nas tabelas
ALTER TABLE knowledge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela knowledge_sessions

-- Política para visualização (usuário só vê suas próprias sessões)
CREATE POLICY knowledge_sessions_select_policy
ON knowledge_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Política para inserção (usuário só insere suas próprias sessões)
CREATE POLICY knowledge_sessions_insert_policy
ON knowledge_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política para atualização (usuário só atualiza suas próprias sessões)
CREATE POLICY knowledge_sessions_update_policy
ON knowledge_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Política para exclusão (usuário só exclui suas próprias sessões)
CREATE POLICY knowledge_sessions_delete_policy
ON knowledge_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para a tabela knowledge_base

-- Política para visualização (usuário só vê seus próprios itens)
CREATE POLICY knowledge_base_select_policy
ON knowledge_base
FOR SELECT
USING (auth.uid() = user_id);

-- Política para inserção (usuário só insere seus próprios itens)
CREATE POLICY knowledge_base_insert_policy
ON knowledge_base
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política para atualização (usuário só atualiza seus próprios itens)
CREATE POLICY knowledge_base_update_policy
ON knowledge_base
FOR UPDATE
USING (auth.uid() = user_id);

-- Política para exclusão (usuário só exclui seus próprios itens)
CREATE POLICY knowledge_base_delete_policy
ON knowledge_base
FOR DELETE
USING (auth.uid() = user_id);

-- Função para busca de texto completo nos itens de conhecimento
CREATE OR REPLACE FUNCTION search_knowledge_items(search_term TEXT, user_id UUID)
RETURNS SETOF knowledge_base AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM knowledge_base
  WHERE 
    knowledge_base.user_id = search_knowledge_items.user_id
    AND (
      to_tsvector('portuguese', title) @@ to_tsquery('portuguese', search_term)
      OR to_tsvector('portuguese', description) @@ to_tsquery('portuguese', search_term)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para filtrar itens por tags
CREATE OR REPLACE FUNCTION filter_knowledge_by_tags(tag_list TEXT[], user_id UUID)
RETURNS SETOF knowledge_base AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM knowledge_base
  WHERE 
    knowledge_base.user_id = filter_knowledge_by_tags.user_id
    AND knowledge_base.tags && tag_list;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;