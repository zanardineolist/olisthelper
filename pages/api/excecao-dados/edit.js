// pages/api/excecao-dados/edit.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { EXCECAO_DADOS_SHEET_NAME, getSheetValuesFromSpecificSheet, updateSpecificSheetRange } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.id) return res.status(401).json({ error: 'Não autorizado' });

  const { criadoEm, original, updated } = req.body || {};
  if (!original?.linkChamado || !original?.responsavel || !original?.dataRemocao) {
    return res.status(400).json({ error: 'Dados originais insuficientes' });
  }

  const spreadsheetId = process.env.EXCECAO_DADOS_SHEET_ID;
  if (!spreadsheetId) return res.status(500).json({ error: 'EXCECAO_DADOS_SHEET_ID não configurado' });

  try {
    const rows = await getSheetValuesFromSpecificSheet(spreadsheetId, EXCECAO_DADOS_SHEET_NAME, 'A:G');
    const idx = rows.findIndex((row, i) => {
      if (i === 0) return false;
      const matchCriado = criadoEm ? (row[0] || '') === criadoEm : true;
      return (
        (row[1] || '') === original.linkChamado &&
        (row[2] || '') === original.responsavel &&
        (row[5] || '') === original.dataRemocao &&
        matchCriado
      );
    });

    if (idx === -1) return res.status(404).json({ error: 'Registro não encontrado na planilha' });
    const rowNumber = idx + 1;

    // Atualizar B:G com os novos valores
    const toBR = (val) => val ?? '';
    const toDDMMYYYY = (isoOrBr) => {
      if (!isoOrBr) return '';
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoOrBr)) return isoOrBr;
      const d = new Date(isoOrBr);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = String(d.getFullYear());
      return `${dd}/${mm}/${yyyy}`;
    };

    const newRowBG = [[
      toBR(updated.linkChamado),
      toBR(updated.responsavel),
      toBR(updated.espacoAtual),
      toBR(updated.espacoAdicional),
      toDDMMYYYY(updated.dataRemocao),
      toBR(updated.situacao),
    ]];

    await updateSpecificSheetRange(
      spreadsheetId,
      `${EXCECAO_DADOS_SHEET_NAME}!B${rowNumber}:G${rowNumber}`,
      newRowBG
    );

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro ao editar registro:', e);
    return res.status(500).json({ error: 'Erro ao editar registro' });
  }
}


