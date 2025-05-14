import { formidable } from 'formidable';
import XLSX from 'xlsx';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Layouts esperados para cada tipo de planilha
const layouts = {
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
    'ID', 'Código', 'Nome', 'Endereço', 'Número', 'Complemento', 'Bairro', 'CEP', 'Cidade', 'Estado',
    'Observações do contato', 'Telefone', 'E-mail', 'CNPJ/CPF', 'IE/RG', 'Situação', 'Data de cadastro',
    'Data de atualização', 'Responsável', 'Observações do cliente'
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
    const fileHeader = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    const expectedLayout = layouts[fileType];

    if (!expectedLayout) {
      throw new Error(`O layout para o tipo de arquivo "${fileType}" não foi definido.`);
    }
    
    if (fileHeader.length !== expectedLayout.length) {
      throw new Error(`Número de colunas incorreto. Esperado: ${expectedLayout.length}, Recebido: ${fileHeader.length}.`);
    }

    for (let i = 0; i < fileHeader.length; i++) {
      if (fileHeader[i] !== expectedLayout[i]) {
        throw new Error(`Erro na coluna ${i + 1}: Esperado "${expectedLayout[i]}", mas encontrado "${fileHeader[i]}" na posição ${i + 1}. Verifique e ajuste o arquivo.`);
      }
    }
    return true;
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

      await validateLayout(file.filepath, layoutType);
      return res.status(200).json({ valid: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
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