// pages/api/transfer-sheet-data.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Usar as credenciais que já estão no Vercel
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // ID da planilha original e da nova planilha
    const planilhaOriginalId = process.env.GOOGLE_SHEET_ID; // A planilha original
    
    // Verificar se o ID da planilha original existe
    if (!planilhaOriginalId) {
      return res.status(500).json({ error: 'ID da planilha original não configurado nas variáveis de ambiente (GOOGLE_SHEET_ID)' });
    }
    
    const novaPlanilhaId = req.body.novaPlanilhaId; // ID da nova planilha fornecido no corpo da requisição
    
    // Verificar se o ID da nova planilha foi fornecido
    if (!novaPlanilhaId) {
      return res.status(400).json({ error: 'ID da nova planilha não fornecido' });
    }
    
    const abaOrigem = 'remoto'; // Nome da aba de origem
    const abaDestino = req.body.abaDestino || 'Dados Importados'; // Nome da aba de destino

    // 1. Buscar os dados da aba "remoto" da planilha original
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: planilhaOriginalId,
      range: `${abaOrigem}!A:ZZ`,
    });

    const dados = response.data.values;
    
    if (!dados || dados.length === 0) {
      return res.status(404).json({ error: 'Nenhum dado encontrado na aba de origem' });
    }

    // 2. Verificar se a aba de destino existe na nova planilha, se não, criar
    try {
      await sheets.spreadsheets.get({
        spreadsheetId: novaPlanilhaId,
        ranges: [abaDestino],
        fields: 'sheets.properties'
      });
    } catch (error) {
      // Se a aba não existir, criar
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: novaPlanilhaId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: abaDestino
              }
            }
          }]
        }
      });
    }

    // 3. Limpar a aba de destino antes de inserir novos dados
    await sheets.spreadsheets.values.clear({
      spreadsheetId: novaPlanilhaId,
      range: `${abaDestino}!A:ZZ`,
    });

    // 4. Inserir os dados na nova planilha
    await sheets.spreadsheets.values.update({
      spreadsheetId: novaPlanilhaId,
      range: `${abaDestino}!A1`,
      valueInputOption: 'RAW',
      resource: {
        values: dados
      }
    });

    // 5. Formatar a planilha para melhor visualização
    try {
      // Congelar a primeira linha (cabeçalhos)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: novaPlanilhaId,
        resource: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: 0, // Altere para o ID correto da aba se necessário
                  gridProperties: {
                    frozenRowCount: 1
                  }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            },
            {
              // Formatar cabeçalhos em negrito
              repeatCell: {
                range: {
                  sheetId: 0, // Altere para o ID correto da aba se necessário
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true
                    }
                  }
                },
                fields: 'userEnteredFormat.textFormat.bold'
              }
            },
            {
              // Ajustar colunas automaticamente
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0, // Altere para o ID correto da aba se necessário
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: dados[0].length
                }
              }
            }
          ]
        }
      });
    } catch (formatError) {
      console.warn('Aviso: Não foi possível aplicar formatação:', formatError);
      // Continuar mesmo se a formatação falhar
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Dados transferidos com sucesso',
      totalLinhas: dados.length
    });

  } catch (error) {
    console.error('Erro ao transferir dados:', error);
    return res.status(500).json({ 
      error: 'Erro ao transferir dados da planilha', 
      details: error.message 
    });
  }
}