import { formidable } from 'formidable';
import XLSX from 'xlsx';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Layouts base (esperados) para cada tipo de planilha
const baseLayouts = {
  produtos: [
    'ID', 'Código (SKU)', 'Descrição', 'Unidade', 'NCM (Classificação fiscal)', 'Origem', 'Preço', 'Valor IPI fixo',
    'Observações', 'Situação', 'Estoque', 'Preço de custo', 'Cód do fornecedor', 'Fornecedor', 'Localização',
    'Estoque máximo', 'Estoque mínimo', 'Peso líquido (Kg)', 'Peso bruto (Kg)', 'GTIN/EAN', 'GTIN/EAN tributável',
    'Descrição complementar', 'CEST', 'Código de Enquadramento IPI', 'Formato embalagem', 'Largura embalagem',
    'Altura Embalagem', 'Comprimento embalagem', 'Diâmetro embalagem', 'Tipo do produto', 'URL imagem 1',
    'URL imagem 2', 'URL imagem 3', 'URL imagem 4', 'URL imagem 5', 'URL imagem 6', 'Categoria', 'Código do pai',
    'Variações', 'Marca', 'Garantia', 'Sob encomenda', 'Preço promocional', 'URL imagem externa 1', 'URL imagem externa 2',
    'URL imagem externa 3', 'URL imagem externa 4', 'URL imagem externa 5', 'URL imagem externa 6', 'Link do vídeo',
    'Título SEO', 'Descrição SEO', 'Palavras chave SEO', 'Slug', 'Dias para preparação', 'Controlar lotes', 'Unidade por caixa',
    'URL imagem externa 7', 'URL imagem externa 8', 'URL imagem externa 9', 'URL imagem externa 10', 'Markup',
    'Permitir inclusão nas vendas', 'EX TIPI'
  ],
  clientes: [
    'ID', 'Código', 'Nome', 'Fantasia', 'Endereço', 'Número', 'Complemento', 'Bairro', 'CEP', 'Cidade', 'Estado',
    'Observações do contato', 'Fone', 'Fax', 'Celular', 'E-mail', 'Web Site', 'Tipo pessoa', 'CNPJ / CPF', 'IE / RG',
    'IE isento', 'Situação', 'Observações', 'Estado civil', 'Profissão', 'Sexo', 'Data nascimento', 'Naturalidade',
    'Nome pai', 'CPF pai', 'Nome mãe', 'CPF mãe', 'Lista de Preço', 'Vendedor', 'E-mail para envio de NFe',
    'Tipos de Contatos', 'Contribuinte', 'Código de regime tributário', 'Limite de crédito'
  ],
  contatos: [
    'ID', 'CNPJ Cliente', 'Nome Cliente', 'Contato', 'Setor', 'E-mail', 'Telefone', 'Ramal'
  ],
  inventario: [
    'ID*', 'Produto', 'Código (SKU)*', 'GTIN/EAN', 'Localização', 'Saldo em estoque'
  ],
  contas_receber: [
    'ID', 'Cliente', 'Data Emissão', 'Data Vencimento', 'Data Liquidação', 'Valor documento', 'Saldo', 'Situação',
    'Número documento', 'Número no banco', 'Categoria', 'Histórico', 'Forma de recebimento', 'Meio de recebimento',
    'Taxas', 'Competência'
  ],
  contas_pagar: [
    'ID', 'Fornecedor', 'Data Emissão', 'Data Vencimento', 'Data Liquidação', 'Valor documento', 'Saldo', 'Situação',
    'Número documento', 'Categoria', 'Histórico', 'Pago', 'Competencia', 'Forma Pagamento', 'Chave PIX/Código boleto'
  ]
};

async function validateLayout(filePath, fileType) {
  const fileBuffer = await fs.readFile(filePath);
  let workbook;
  
  try {
    if (filePath.endsWith('.csv')) {
      workbook = XLSX.read(fileBuffer, { type: 'buffer', raw: false, codepage: 65001 });
    } else {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const fileHeaderRaw = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];

    // Normalizações para evitar falhas por BOM/aspas/whitespace
    const normalizeHeaderValue = (value) => {
      if (value === undefined || value === null) return '';
      let result = String(value);
      // Remover BOM
      result = result.replace(/^\uFEFF/, '');
      // Remover todas aspas duplas residuais comuns em CSVs exportados
      result = result.replace(/"/g, '');
      // Normalizar espaços
      result = result.replace(/\s+/g, ' ').trim();
      return result;
    };

    const fileHeader = (fileHeaderRaw || []).map(normalizeHeaderValue);

    // Variantes aceitáveis por layout (além do base)
    const layoutVariants = {
      produtos: [baseLayouts.produtos],
      clientes: [baseLayouts.clientes],
      contatos: [baseLayouts.contatos],
      inventario: [baseLayouts.inventario],
      // contas_receber: aceitar também variante sem a coluna "Competência"
      contas_receber: [
        baseLayouts.contas_receber,
        baseLayouts.contas_receber.filter((col) => col !== 'Competência')
      ],
      contas_pagar: [baseLayouts.contas_pagar],
    };

    const expectedVariants = layoutVariants[fileType];

    if (!expectedVariants) {
      throw new Error(`O layout para o tipo de arquivo "${fileType}" não foi definido.`);
    }
    
    // Tentar casar com qualquer uma das variantes
    const normalized = (arr) => arr.map(normalizeHeaderValue);
    let matchedVariant = null;
    for (const variant of expectedVariants) {
      const normalizedVariant = normalized(variant);
      if (
        fileHeader.length === normalizedVariant.length &&
        fileHeader.every((val, idx) => val === normalizedVariant[idx])
      ) {
        matchedVariant = variant;
        break;
      }
    }

    if (!matchedVariant) {
      // Montar detalhes tomando como base o primeiro layout esperado
      const primaryExpected = expectedVariants[0];
      const validationResult = {
        expected: primaryExpected,
        found: fileHeader,
        errors: []
      };
      
      // Verificar se o número de colunas está correto
      if (fileHeader.length !== primaryExpected.length) {
        const errorMsg = `Número de colunas incorreto. Esperado: ${primaryExpected.length} colunas, mas encontrado: ${fileHeader.length} colunas.`;
        validationResult.errors.push({
          type: 'column_count_mismatch',
          message: errorMsg,
          expected_count: primaryExpected.length,
          found_count: fileHeader.length
        });
        
        const error = new Error(errorMsg);
        error.details = validationResult;
        throw error;
      }
      
      // Verificar cada coluna individualmente
      const columnErrors = [];
      for (let i = 0; i < fileHeader.length; i++) {
        const normalizedFound = normalizeHeaderValue(fileHeader[i]);
        const normalizedExpected = normalizeHeaderValue(primaryExpected[i]);
        
        if (normalizedFound !== normalizedExpected) {
          const columnError = {
            type: 'column_name_mismatch',
            position: i + 1,
            expected: primaryExpected[i],
            found: fileHeader[i] || '(vazio)',
            message: `Coluna ${i + 1}: Esperado "${primaryExpected[i]}", mas encontrado "${fileHeader[i] || '(vazio)'}"`
          };
          columnErrors.push(columnError);
          validationResult.errors.push(columnError);
        }
      }
      
      // Se há erros de coluna, criar mensagem detalhada
      if (columnErrors.length > 0) {
        let errorMessage;
        if (columnErrors.length === 1) {
          errorMessage = columnErrors[0].message;
        } else {
          errorMessage = `Encontrados ${columnErrors.length} erros no cabeçalho:\n`;
          columnErrors.forEach((err, index) => {
            errorMessage += `${index + 1}. ${err.message}\n`;
          });
        }
        
        const error = new Error(errorMessage);
        error.details = validationResult;
        throw error;
      }
    }
    
    // Retornar informações mais detalhadas para o sucesso
    return {
      valid: true,
      columns: matchedVariant || expectedVariants[0]
    };
  } catch (error) {
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const options = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      keepExtensions: true,
    };
    
    const result = await new Promise((resolve, reject) => {
      const form = formidable(options);
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });
    
    const { fields, files } = result;
    const file = files.file[0]; // Na versão 3.x, files é um objeto com arrays
    const layoutType = fields.layoutType[0]; // Na versão 3.x, fields também é um objeto com arrays

    if (!file || !layoutType) {
      return res.status(400).json({ error: 'Arquivo ou tipo de layout não fornecido' });
    }

    try {
      const fileStats = await fs.stat(file.filepath);
      
      // Limitar tamanho do arquivo para 5MB
      if (fileStats.size > 5 * 1024 * 1024) {
        return res.status(413).json({ 
          error: 'O arquivo excede o limite de 5MB. Considere dividir manualmente antes de usar esta ferramenta.' 
        });
      }

      const validationResult = await validateLayout(file.filepath, layoutType);
      return res.status(200).json(validationResult);
    } catch (error) {
      const response = { error: error.message };
      
      // Incluir detalhes se disponíveis
      if (error.details) {
        response.details = error.details;
      }
      
      return res.status(400).json(response);
    } finally {
      try {
        await fs.unlink(file.filepath);
      } catch (e) {
        console.error('Erro ao remover arquivo temporário:', e);
      }
    }
  } catch (error) {
    console.error('Erro ao processar o formulário:', error);
    return res.status(500).json({ error: 'Erro ao processar o arquivo' });
  }
}