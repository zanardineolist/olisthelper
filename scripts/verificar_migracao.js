// scripts/verificar_migracao.js
// Script para verificar dados após a migração do Google Sheets para o Supabase

require('dotenv').config();
const { getSheetValues } = require('../utils/googleSheets');
const { supabaseAdmin } = require('../utils/supabase/supabaseClient');

async function verificarMigracao() {
  console.log('Iniciando verificação da migração dos registros de acesso remoto...');
  
  try {
    // 1. Obter dados do Google Sheets
    console.log('Buscando dados do Google Sheets...');
    const registrosSheets = await getSheetValues('Remoto', 'A:G');
    const dadosSemCabecalho = registrosSheets.length > 0 && 
      ['Data', 'data', 'DATE'].includes(registrosSheets[0][0]) ? 
      registrosSheets.slice(1) : registrosSheets;
    
    // Filtrar apenas registros válidos (com dados nas colunas essenciais)
    const registrosSheetsValidos = dadosSemCabecalho.filter(
      r => r[0] && r[1] && r[2] && r[3] && r[4]
    );
    
    // 2. Obter dados do Supabase
    console.log('Buscando dados do Supabase...');
    const { data: registrosSupabase, error } = await supabaseAdmin
      .from('remote_access')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // 3. Análise estatística
    console.log('\n===== ANÁLISE DA MIGRAÇÃO =====');
    console.log(`Total de registros no Google Sheets: ${registrosSheetsValidos.length}`);
    console.log(`Total de registros no Supabase: ${registrosSupabase.length}`);
    
    // 4. Verificar registros não migrados
    const registrosNaoMigrados = [];
    
    for (const registro of registrosSheetsValidos) {
      const data = registro[0]; // Data
      const hora = registro[1]; // Hora
      const email = registro[3]; // Email
      const chamado = registro[4]; // Número do chamado
      
      // Verificar se existe no Supabase
      const existeNoSupabase = registrosSupabase.some(r => 
        r.date === data && 
        r.time === hora && 
        r.email === email && 
        r.ticket_number === chamado
      );
      
      if (!existeNoSupabase) {
        registrosNaoMigrados.push(registro);
      }
    }
    
    // 5. Verificar registros extras no Supabase
    const registrosExtras = [];
    
    for (const registro of registrosSupabase) {
      const existeNoSheets = registrosSheetsValidos.some(r => 
        r[0] === registro.date && 
        r[1] === registro.time && 
        r[3] === registro.email && 
        r[4] === registro.ticket_number
      );
      
      if (!existeNoSheets) {
        registrosExtras.push(registro);
      }
    }
    
    // 6. Exibir resultados
    console.log(`\nRegistros no Google Sheets não encontrados no Supabase: ${registrosNaoMigrados.length}`);
    if (registrosNaoMigrados.length > 0) {
      console.log('Primeiros 5 registros não migrados (ou todos, se menos de 5):');
      console.table(registrosNaoMigrados.slice(0, 5).map(r => ({
        Data: r[0],
        Hora: r[1],
        Nome: r[2],
        Email: r[3],
        Chamado: r[4],
        Tema: r[5] || '(vazio)',
      })));
    }
    
    console.log(`\nRegistros no Supabase não encontrados no Google Sheets: ${registrosExtras.length}`);
    if (registrosExtras.length > 0) {
      console.log('Primeiros 5 registros extras (ou todos, se menos de 5):');
      console.table(registrosExtras.slice(0, 5).map(r => ({
        Data: r.date,
        Hora: r.time,
        Nome: r.name,
        Email: r.email,
        Chamado: r.ticket_number,
        Tema: r.theme,
      })));
    }
    
    // 7. Sumário de temas (categorias) para verificar mapeamento
    console.log('\nSumário de Temas no Supabase:');
    const temaCounts = {};
    registrosSupabase.forEach(r => {
      temaCounts[r.theme] = (temaCounts[r.theme] || 0) + 1;
    });
    
    for (const [tema, count] of Object.entries(temaCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`- ${tema || '(vazio)'}: ${count} registros`);
    }
    
    console.log('\n===== VERIFICAÇÃO CONCLUÍDA =====');
    
    return {
      totalSheets: registrosSheetsValidos.length,
      totalSupabase: registrosSupabase.length,
      naoMigrados: registrosNaoMigrados.length,
      extras: registrosExtras.length,
      temas: temaCounts
    };
  } catch (error) {
    console.error('Erro durante a verificação:', error);
    throw error;
  }
}

// Executar a verificação se o script for rodado diretamente
if (require.main === module) {
  verificarMigracao()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Erro na verificação:', err);
      process.exit(1);
    });
}

module.exports = { verificarMigracao }; 