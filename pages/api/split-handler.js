import formidable from 'formidable';
import fs from 'fs/promises';
import XLSX from 'xlsx';
import archiver from 'archiver';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false,
  },
};

const maxFileSize = 5 * 1024 * 1024; // 5MB

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao processar o arquivo' });
    }

    const file = files.file;
    const layoutType = fields.layoutType;

    if (!file || !layoutType) {
      return res.status(400).json({ error: 'Arquivo ou tipo de layout não fornecido' });
    }

    try {
      const fileStats = await fs.stat(file.filepath);
      
      // Verificação de tamanho de arquivo
      if (fileStats.size > maxFileSize) {
        return res.status(413).json({ 
          error: 'O arquivo excede o limite de 5MB. Considere dividir manualmente antes de usar esta ferramenta.' 
        });
      }

      const parts = await processFileStream(file.filepath, layoutType);
      const zipBuffer = await createZip(parts);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=Planilha_${layoutType}_dividida.zip`);
      res.send(zipBuffer);
    } catch (error) {
      console.error('Erro:', error);
      
      if (error.message.includes('excede o limite')) {
        res.status(413).json({ error: 'O arquivo é muito grande. O limite permitido é 5MB.' });
      } else if (error.message.includes('layout')) {
        res.status(400).json({ error: 'Erro na validação do layout. Verifique o formato do arquivo.' });
      } else if (error.message.includes('ZIP')) {
        res.status(500).json({ error: 'Falha ao criar o arquivo ZIP. Tente novamente mais tarde.' });
      } else {
        res.status(500).json({ error: `Erro inesperado: ${error.message}` });
      }
    } finally {
      try {
        // Limpar o arquivo temporário
        await fs.unlink(file.filepath);
      } catch (e) {
        console.error('Erro ao remover arquivo temporário:', e);
      }
    }
  });
}

async function calculateBufferSize(part) {
  const newSheet = XLSX.utils.aoa_to_sheet(part);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Parte');
  const buffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer.length;
}

async function processFileStream(filePath, layoutType) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

  // Verificar se o arquivo tem conteúdo
  if (!worksheet || worksheet.length <= 1) {
    throw new Error('O arquivo está vazio ou contém apenas o cabeçalho.');
  }

  const header = worksheet[0];
  const rows = worksheet.slice(1);

  // Tratamento especial para planilhas de produtos
  if (layoutType === 'produtos') {
    return processProductFile(rows, header);
  }

  // Para outros tipos de planilhas, dividir em partes iguais
  // Começar com 500 linhas por parte e ajustar se necessário
  let linesPerPart = 500;
  let bufferSize = await calculateBufferSize([header, ...rows.slice(0, Math.min(linesPerPart, rows.length))]);

  // Ajustar o tamanho das partes para garantir que cada parte seja menor que o limite
  while (bufferSize > maxFileSize / 2 && linesPerPart > 10) {
    linesPerPart = Math.floor(linesPerPart / 2);
    bufferSize = await calculateBufferSize([header, ...rows.slice(0, Math.min(linesPerPart, rows.length))]);
  }

  const parts = [];
  let currentPart = [header];

  for (let i = 0; i < rows.length; i++) {
    currentPart.push(rows[i]);
    if (currentPart.length - 1 === linesPerPart) {
      parts.push([...currentPart]);
      currentPart = [header];
    }
  }

  // Adicionar a última parte se tiver conteúdo
  if (currentPart.length > 1) {
    parts.push(currentPart);
  }

  return parts;
}

async function processProductFile(rows, header) {
  // Processamento especial para produtos para manter variações junto com seus pais
  const parts = [];
  let currentPart = [header];
  let groupedRows = [];
  let currentParentSKU = null;
  let currentGroup = [];

  // Começar com 500 linhas por parte e ajustar se necessário
  let linesPerPart = 500;
  let bufferSize = await calculateBufferSize([header, ...rows.slice(0, Math.min(linesPerPart, rows.length))]);

  // Ajustar o tamanho das partes
  while (bufferSize > maxFileSize / 2 && linesPerPart > 10) {
    linesPerPart = Math.floor(linesPerPart / 2);
    bufferSize = await calculateBufferSize([header, ...rows.slice(0, Math.min(linesPerPart, rows.length))]);
  }

  // Índices para identificar produtos variantes e seus pais
  // Coluna "Tipo do produto" (V = Variação pai, S = Variação filha)
  const productTypeIndex = header.findIndex(col => col === 'Tipo do produto');
  // Coluna "Código do pai" para as variações filhas
  const parentCodeIndex = header.findIndex(col => col === 'Código do pai');
  // Coluna "Código (SKU)" para identificar o SKU do produto
  const skuIndex = header.findIndex(col => col === 'Código (SKU)');

  if (productTypeIndex === -1 || parentCodeIndex === -1 || skuIndex === -1) {
    // Caso não encontre as colunas necessárias, processar como arquivo normal
    return processFileStream(rows, header, linesPerPart);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const productType = row[productTypeIndex];
    const parentSKU = row[parentCodeIndex];
    const currentSKU = row[skuIndex];

    if (productType === 'V') {
      // Se encontrar um produto pai e tiver um grupo atual, adicionar o grupo anterior
      if (currentGroup.length > 0) {
        groupedRows.push(...currentGroup);
        currentGroup = [];
      }
      // Iniciar um novo grupo com o produto pai
      currentParentSKU = currentSKU;
      currentGroup.push(row);
    } else if (productType === 'S' && parentSKU === currentParentSKU) {
      // Adicionar variação ao grupo atual se pertencer ao pai atual
      currentGroup.push(row);
    } else {
      // Finalizar grupo anterior se existir
      if (currentGroup.length > 0) {
        groupedRows.push(...currentGroup);
        currentGroup = [];
        currentParentSKU = null;
      }
      // Adicionar linha normalmente (produto simples)
      groupedRows.push(row);
    }

    // Quando o grupo atinge o tamanho limite, criar uma nova parte
    if (groupedRows.length >= linesPerPart) {
      parts.push([...currentPart, ...groupedRows]);
      groupedRows = [];
      currentPart = [header];
    }
  }

  // Adicionar o último grupo se existir
  if (currentGroup.length > 0) {
    groupedRows.push(...currentGroup);
  }
  
  // Adicionar a última parte se tiver conteúdo
  if (groupedRows.length > 0) {
    parts.push([...currentPart, ...groupedRows]);
  }

  return parts;
}

async function createZip(parts) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const output = archiver('zip', { zlib: { level: 9 } }); // Nível máximo de compressão

    output.on('data', (data) => buffers.push(data));
    output.on('end', () => resolve(Buffer.concat(buffers)));
    output.on('error', (err) => reject(new Error(`Erro ao criar arquivo ZIP: ${err.message}`)));

    parts.forEach((part, index) => {
      const newSheet = XLSX.utils.aoa_to_sheet(part);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, `Parte_${index + 1}`);
      const buffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
      output.append(buffer, { name: `Parte_${index + 1}.xlsx` });
    });

    output.finalize();
  });
} 