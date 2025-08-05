-- ===================================================================
-- SCRIPT PARA REMOVER COMPLETAMENTE O SISTEMA DE ANALYTICS
-- 
-- Execute este script no Supabase SQL Editor para remover:
-- - Todas as tabelas de analytics
-- - Todas as views materializadas
-- - Todas as funções relacionadas
-- - Todos os índices
-- - Todas as políticas RLS
-- 
-- ⚠️ ATENÇÃO: Esta operação é irreversível!
-- ===================================================================

-- Log do início da remoção
DO $$
BEGIN
    RAISE NOTICE '🧹 INICIANDO REMOÇÃO DO SISTEMA ANALYTICS...';
    RAISE NOTICE '⏰ Timestamp: %', NOW();
END
$$;

-- ===================================================================
-- ETAPA 1: REMOVER FUNÇÕES (deve ser feito antes das tabelas)
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️ ETAPA 1: Removendo funções...';
END
$$;

-- Remover funções de analytics
DROP FUNCTION IF EXISTS "public"."get_online_users_count"() CASCADE;
DROP FUNCTION IF EXISTS "public"."upsert_user_session"(TEXT, UUID, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS "public"."close_inactive_sessions"() CASCADE;
DROP FUNCTION IF EXISTS "public"."insert_page_visits_batch"(JSONB) CASCADE;
DROP FUNCTION IF EXISTS "public"."get_analytics_dashboard_data"(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS "public"."refresh_analytics_views"() CASCADE;
DROP FUNCTION IF EXISTS "public"."update_user_session_activity"(TEXT, UUID) CASCADE;

-- ===================================================================
-- ETAPA 2: REMOVER VIEWS MATERIALIZADAS
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️ ETAPA 2: Removendo views materializadas...';
END
$$;

-- Remover views materializadas
DROP MATERIALIZED VIEW IF EXISTS "public"."mv_online_users" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS "public"."mv_top_pages_7d" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS "public"."mv_hourly_activity_7d" CASCADE;

-- ===================================================================
-- ETAPA 3: REMOVER TABELAS
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️ ETAPA 3: Removendo tabelas...';
END
$$;

-- Remover tabelas de analytics (CASCADE remove dependências)
DROP TABLE IF EXISTS "public"."page_visits" CASCADE;
DROP TABLE IF EXISTS "public"."user_sessions" CASCADE;
DROP TABLE IF EXISTS "public"."analytics_hourly" CASCADE;
DROP TABLE IF EXISTS "public"."analytics_daily" CASCADE;

-- ===================================================================
-- ETAPA 4: VERIFICAR E REMOVER ÍNDICES RESIDUAIS
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️ ETAPA 4: Verificando índices residuais...';
END
$$;

-- Verificar se existem índices relacionados ao analytics
DO $$
DECLARE
    index_record RECORD;
    index_count INTEGER := 0;
BEGIN
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND (indexname LIKE '%analytics%' OR indexname LIKE '%visit%' OR indexname LIKE '%session%')
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(index_record.indexname) || ' CASCADE';
        index_count := index_count + 1;
        RAISE NOTICE '🗑️ Removido índice: %', index_record.indexname;
    END LOOP;
    
    IF index_count = 0 THEN
        RAISE NOTICE 'ℹ️ Nenhum índice residual encontrado';
    ELSE
        RAISE NOTICE '✅ Removidos % índices residuais', index_count;
    END IF;
END
$$;

-- ===================================================================
-- ETAPA 5: VERIFICAR E REMOVER POLÍTICAS RLS RESIDUAIS
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️ ETAPA 5: Verificando políticas RLS residuais...';
END
$$;

-- Verificar se existem políticas RLS relacionadas ao analytics
DO $$
DECLARE
    policy_record RECORD;
    policy_count INTEGER := 0;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (tablename LIKE '%analytics%' OR tablename LIKE '%visit%' OR tablename LIKE '%session%')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON ' || 
                quote_ident(policy_record.schemaname) || '.' || quote_ident(policy_record.tablename);
        policy_count := policy_count + 1;
        RAISE NOTICE '🗑️ Removida política: %', policy_record.policyname;
    END LOOP;
    
    IF policy_count = 0 THEN
        RAISE NOTICE 'ℹ️ Nenhuma política RLS residual encontrada';
    ELSE
        RAISE NOTICE '✅ Removidas % políticas RLS residuais', policy_count;
    END IF;
END
$$;

-- ===================================================================
-- ETAPA 6: VERIFICAR E REMOVER TRIGGERS RESIDUAIS
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️ ETAPA 6: Verificando triggers residuais...';
END
$$;

-- Verificar se existem triggers relacionados ao analytics
DO $$
DECLARE
    trigger_record RECORD;
    trigger_count INTEGER := 0;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND (event_object_table LIKE '%analytics%' OR event_object_table LIKE '%visit%' OR event_object_table LIKE '%session%')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trigger_record.trigger_name) || 
                ' ON ' || quote_ident(trigger_record.event_object_table) || ' CASCADE';
        trigger_count := trigger_count + 1;
        RAISE NOTICE '🗑️ Removido trigger: %', trigger_record.trigger_name;
    END LOOP;
    
    IF trigger_count = 0 THEN
        RAISE NOTICE 'ℹ️ Nenhum trigger residual encontrado';
    ELSE
        RAISE NOTICE '✅ Removidos % triggers residuais', trigger_count;
    END IF;
END
$$;

-- ===================================================================
-- ETAPA 7: VERIFICAÇÃO FINAL
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 ETAPA 7: Verificação final...';
END
$$;

-- Verificar se ainda existem objetos relacionados ao analytics
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    view_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Verificar tabelas
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%analytics%' OR table_name LIKE '%visit%' OR table_name LIKE '%session%');
    
    -- Verificar funções
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND (routine_name LIKE '%analytics%' OR routine_name LIKE '%visit%' OR routine_name LIKE '%session%');
    
    -- Verificar views
    SELECT COUNT(*) INTO view_count
    FROM pg_matviews 
    WHERE schemaname = 'public'
    AND (matviewname LIKE '%analytics%' OR matviewname LIKE '%visit%' OR matviewname LIKE '%session%');
    
    -- Verificar índices
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND (indexname LIKE '%analytics%' OR indexname LIKE '%visit%' OR indexname LIKE '%session%');
    
    RAISE NOTICE '📊 RESULTADO DA VERIFICAÇÃO:';
    RAISE NOTICE '   - Tabelas encontradas: %', table_count;
    RAISE NOTICE '   - Funções encontradas: %', function_count;
    RAISE NOTICE '   - Views encontradas: %', view_count;
    RAISE NOTICE '   - Índices encontrados: %', index_count;
    
    IF table_count = 0 AND function_count = 0 AND view_count = 0 AND index_count = 0 THEN
        RAISE NOTICE '✅ SUCESSO: Sistema de analytics completamente removido!';
    ELSE
        RAISE NOTICE '⚠️ ATENÇÃO: Ainda existem objetos residuais. Verifique manualmente.';
    END IF;
END
$$;

-- ===================================================================
-- RELATÓRIO FINAL
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 REMOÇÃO CONCLUÍDA!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 O que foi removido:';
    RAISE NOTICE '   ✅ Tabelas: page_visits, user_sessions, analytics_hourly, analytics_daily';
    RAISE NOTICE '   ✅ Views: mv_online_users, mv_top_pages_7d, mv_hourly_activity_7d';
    RAISE NOTICE '   ✅ Funções: get_online_users_count, upsert_user_session, etc.';
    RAISE NOTICE '   ✅ Índices: Todos os índices relacionados';
    RAISE NOTICE '   ✅ Políticas RLS: Todas as políticas de segurança';
    RAISE NOTICE '   ✅ Triggers: Todos os triggers de updated_at';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sistema de analytics completamente removido do banco de dados!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Próximos passos:';
    RAISE NOTICE '   1. Remover arquivos do frontend (já feito)';
    RAISE NOTICE '   2. Remover APIs do backend (já feito)';
    RAISE NOTICE '   3. Atualizar documentação (já feito)';
    RAISE NOTICE '   4. Testar aplicação sem analytics';
    RAISE NOTICE '';
END
$$; 