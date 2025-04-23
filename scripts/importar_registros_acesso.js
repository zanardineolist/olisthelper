// scripts/importar_registros_acesso.js
// Script para migrar dados de acesso remoto do Google Sheets para o Supabase

require('dotenv').config();
const { getSheetValues } = require('../utils/googleSheets');
const { supabaseAdmin } = require('../utils/supabase/supabaseClient');
const fs = require('fs');
const path = require('path');

// Diretório para logs
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Arquivo de log
const LOG_FILE = path.join(LOG_DIR, `migracao_${new Date().toISOString().replace(/:/g, '-')}.log`);
const ERRORS_FILE = path.join(LOG_DIR, `erros_migracao_${new Date().toISOString().replace(/:/g, '-')}.json`);

// Função para escrever no log
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Função para retornar se o registro já existe no Supabase
async function registroExiste(data, time, email, ticketNumber) {
  const { data: existingRecords, error } = await supabaseAdmin
    .from('remote_access')
    .select('id')
    .eq('date', data)
    .eq('time', time)
    .eq('email', email)
    .eq('ticket_number', ticketNumber)
    .limit(1);

  if (error) {
    throw error;
  }

  return existingRecords && existingRecords.length > 0;
}

// Função para buscar ID do usuário pelo email
async function getUserIdByEmail(email) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
      
    if (error) {
      // Se não encontrar o usuário, retornar null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data ? data.id : null;
  } catch (error) {
    log(`Erro ao buscar ID do usuário ${email}: ${error.message}`);
    return null;
  }
}

// Função principal de migração
async function migrarAcessosRemotos() {
  const errors = [];
  let total = 0;
  let processados = 0;
  let ignorados = 0;
  let erros = 0;
  let usuariosCriados = 0;
  
  try {
    log('Iniciando migração de registros de acesso remoto...');
    
    // 1. Buscar dados do Google Sheets
    const registros = await getSheetValues('Remoto', 'A:G');
    log(`Total de ${registros.length} registros encontrados no Google Sheets.`);
    
    // Detectar e remover cabeçalho, se existir
    const primeiraLinha = registros[0] || [];
    const contemCabecalho = primeiraLinha[0] === 'Data' || 
                             primeiraLinha[0] === 'data' || 
                             primeiraLinha[0] === 'DATE' ||
                             typeof primeiraLinha[0] === 'string' && primeiraLinha[0].toLowerCase().includes('data');
    
    const dadosSemCabecalho = contemCabecalho ? registros.slice(1) : registros;
    total = dadosSemCabecalho.length;
    log(`${contemCabecalho ? 'Cabeçalho detectado e removido.' : 'Nenhum cabeçalho detectado.'}`);
    log(`Processando ${total} registros...`);
    
    // 2. Processar registros em lotes
    const tamanhoDoBatch = 25; // Reduzindo o tamanho do batch para evitar sobrecarregar o Supabase
    let lotes = 0;
    
    for (let i = 0; i < dadosSemCabecalho.length; i += tamanhoDoBatch) {
      const batch = dadosSemCabecalho.slice(i, i + tamanhoDoBatch);
      lotes++;
      log(`\nProcessando lote ${lotes}/${Math.ceil(total/tamanhoDoBatch)}`);
      
      // Processar cada registro do lote
      for (const [index, registro] of batch.entries()) {
        const posicaoGlobal = i + index + 1; // +1 para considerar que linhas em planilhas começam em 1
        
        try {
          // Verificar se tem dados suficientes
          if (!registro[0] || !registro[1] || !registro[2] || !registro[3] || !registro[4]) {
            log(`Linha ${posicaoGlobal}: Dados incompletos, ignorando.`);
            ignorados++;
            continue;
          }
          
          const data = registro[0]; // Data
          const hora = registro[1]; // Hora
          const nome = registro[2]; // Nome
          const email = registro[3]; // Email
          const chamado = registro[4]; // Número do chamado
          const tema = registro[5] || 'Outros'; // Tema (defaulting para "Outros" se não existir)
          const descricao = registro[6] || ''; // Descrição
          
          // Verificar se o registro já existe no Supabase
          const existe = await registroExiste(data, hora, email, chamado);
          if (existe) {
            log(`Linha ${posicaoGlobal}: Registro já existe no Supabase, ignorando.`);
            ignorados++;
            continue;
          }
          
          // Buscar ID do usuário
          let userId = await getUserIdByEmail(email);
          
          // Se o usuário não existir, criar um usuário básico
          if (!userId) {
            log(`Linha ${posicaoGlobal}: Usuário ${email} não encontrado, criando...`);
            
            try {
              const { data: novoUsuario, error: erroUsuario } = await supabaseAdmin
                .from('users')
                .insert([{
                  name: nome,
                  email: email,
                  profile: 'support+', // Assumindo perfil support+ pois está registrando acessos remotos
                  created_at: new Date(),
                  updated_at: new Date(),
                  active: true
                }])
                .select()
                .single();
                
              if (erroUsuario) throw erroUsuario;
              
              userId = novoUsuario.id;
              usuariosCriados++;
              log(`Linha ${posicaoGlobal}: Usuário ${email} criado com sucesso.`);
            } catch (err) {
              log(`Linha ${posicaoGlobal}: Erro ao criar usuário ${email}: ${err.message}`);
              erros++;
              errors.push({
                linha: posicaoGlobal,
                registro,
                erro: `Erro ao criar usuário: ${err.message}`
              });
              continue;
            }
          }
          
          // Inserir o registro no Supabase
          const { error: erroInsercao } = await supabaseAdmin
            .from('remote_access')
            .insert([{
              support_id: userId,
              date: data,
              time: hora,
              name: nome,
              email: email,
              ticket_number: chamado,
              theme: tema,
              description: descricao,
              created_at: new Date(`${data.split('/').reverse().join('-')}T${hora}`)
            }]);
            
          if (erroInsercao) {
            log(`Linha ${posicaoGlobal}: Erro ao inserir registro: ${erroInsercao.message}`);
            erros++;
            errors.push({
              linha: posicaoGlobal,
              registro,
              erro: `Erro ao inserir: ${erroInsercao.message}`
            });
          } else {
            processados++;
            log(`Linha ${posicaoGlobal}: Registro inserido com sucesso.`);
          }
        } catch (err) {
          log(`Linha ${posicaoGlobal}: Erro não tratado: ${err.message}`);
          erros++;
          errors.push({
            linha: posicaoGlobal,
            registro,
            erro: `Erro não tratado: ${err.message}`
          });
        }
      }
      
      log(`Lote ${lotes} concluído. Progresso: ${Math.min(100, Math.round((i + batch.length) / total * 100))}%`);
      
      // Pausa entre os lotes para não sobrecarregar o Supabase
      if (i + tamanhoDoBatch < dadosSemCabecalho.length) {
        log(`Aguardando 3 segundos antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // 3. Resultados finais
    log('\n==== RESUMO DA MIGRAÇÃO ====');
    log(`Total de registros: ${total}`);
    log(`Registros processados com sucesso: ${processados}`);
    log(`Registros ignorados (duplicados ou dados incompletos): ${ignorados}`);
    log(`Registros com erro: ${erros}`);
    log(`Usuários criados: ${usuariosCriados}`);
    log(`Detalhes dos erros salvos em: ${ERRORS_FILE}`);
    log('============================');
    
    // Salvar detalhes dos erros
    if (errors.length > 0) {
      fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
    }
    
    return {
      total,
      processados,
      ignorados,
      erros,
      usuariosCriados
    };
    
  } catch (error) {
    log(`ERRO CRÍTICO: ${error.message}`);
    log(`Stack: ${error.stack}`);
    throw error;
  }
}

// Executar a migração se o script for rodado diretamente
if (require.main === module) {
  migrarAcessosRemotos()
    .then((resultados) => {
      log('Migração concluída.');
      process.exit(0);
    })
    .catch(err => {
      log(`Erro na migração: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { migrarAcessosRemotos }; 