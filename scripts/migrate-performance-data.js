// scripts/migrate-performance-data.js
// Script para migrar dados do CSV para a nova estrutura do banco

import fs from 'fs';
import csv from 'csv-parser';
import { supabaseAdmin } from '../utils/supabase/supabaseClient.js';

/**
 * Converte string de tempo para formato HH:MM:SS
 */
const formatTimeString = (timeStr) => {
  if (!timeStr || timeStr === '-' || timeStr === '#N/A') return '00:00:00';
  
  // Se já está no formato correto
  if (timeStr.includes(':')) return timeStr;
  
  // Se é um número (minutos), converter para HH:MM:SS
  const minutes = parseFloat(timeStr);
  if (!isNaN(minutes)) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return '00:00:00';
};

/**
 * Converte valor para número, retornando 0 se inválido
 */
const parseNumber = (value) => {
  if (!value || value === '-' || value === '#N/A') return 0;
  
  // Remove vírgulas e converte para ponto decimal
  const cleanValue = value.toString().replace(',', '.');
  const number = parseFloat(cleanValue);
  
  return isNaN(number) ? 0 : number;
};

/**
 * Processa linha do CSV e retorna objeto estruturado
 */
const processCSVRow = (row) => {
  return {
    user_email: row['E-mail']?.toLowerCase().trim(),
    user_name: row['Nome']?.trim(),
    supervisor: row['Supervisão']?.trim(),
    
    // Controle de presença
    dias_trabalhados: parseInt(row['Dias trabalhados']) || 0,
    dias_uteis: parseInt(row['Dias Uteis']) || 0,
    absenteismo_percentage: parseNumber(row['% ABS']),
    
    // Indicadores Chamados
    chamados_total: parseInt(row['Total Chamados']) || 0,
    chamados_media_dia: parseNumber(row['Média/dia']),
    chamados_tma_hours: parseNumber(row['TMA']), // Coluna TMA dos chamados
    chamados_csat_percent: parseNumber(row['CSAT']), // Coluna CSAT dos chamados
    
    // Indicadores Telefone
    telefone_total: parseInt(row['Total Telefone']) || 0,
    telefone_media_dia: parseNumber(row['Média/dia']), // Duplicado no CSV, pegar valor correto
    telefone_tma_time: formatTimeString(row['TMA']), // Coluna TMA do telefone
    telefone_csat_rating: parseNumber(row['CSAT']), // Escala 1-5
    telefone_perdidas: parseInt(row['Perdidas']) || 0,
    
    
    // Indicadores Chat
    chat_total: parseInt(row['Total Chats']) || 0,
    chat_media_dia: parseNumber(row['Média/dia']), // Coluna específica do chat
    chat_tma_time: formatTimeString(row['TMA']), // TMA do chat
    chat_csat_percent: parseNumber(row['CSAT']), // CSAT do chat
    
    // Controle
    atualizado_ate: row['Atualizado até']?.trim() || 'Dia 01 a 06 de Junho',
    nota_qualidade: parseNumber(row['Nota']),
    rfc: row['RFC']?.trim() || null
  };
};

/**
 * Migra dados do CSV para o banco
 */
async function migratePerformanceData(csvFilePath) {
  const results = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => {
        // Processar apenas linhas com email válido
        if (data['E-mail'] && data['E-mail'].includes('@')) {
          const processedRow = processCSVRow(data);
          results.push(processedRow);
        }
      })
      .on('end', async () => {
        try {
          console.log(`Processando ${results.length} registros...`);
          
          // Inserir em lotes para melhor performance
          const batchSize = 10;
          let successCount = 0;
          let errorCount = 0;
          
          for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            
            try {
              const { data, error } = await supabaseAdmin
                .from('performance_indicators')
                .upsert(batch, {
                  onConflict: 'user_email'
                });
              
              if (error) {
                console.error(`Erro no lote ${i}-${i + batch.length}:`, error);
                errorCount += batch.length;
              } else {
                successCount += batch.length;
                console.log(`✅ Lote ${i}-${i + batch.length} processado com sucesso`);
              }
            } catch (batchError) {
              console.error(`Erro crítico no lote ${i}-${i + batch.length}:`, batchError);
              errorCount += batch.length;
            }
          }
          
          console.log('\n🎉 Migração concluída!');
          console.log(`✅ Sucessos: ${successCount}`);
          console.log(`❌ Erros: ${errorCount}`);
          
          resolve({ successCount, errorCount });
        } catch (error) {
          console.error('Erro na migração:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Erro ao ler CSV:', error);
        reject(error);
      });
  });
}

/**
 * Script principal
 */
async function main() {
  const csvPath = './Olist Helper - Database Indicadores.csv';
  
  try {
    console.log('🚀 Iniciando migração de dados de performance...\n');
    
    // Verificar se arquivo existe
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Arquivo CSV não encontrado: ${csvPath}`);
    }
    
    // Executar migração
    await migratePerformanceData(csvPath);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migratePerformanceData }; 