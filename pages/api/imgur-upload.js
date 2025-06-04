import { supabase } from '../../utils/supabase/supabaseClient';
import formidable from 'formidable';
import fs from 'fs';

// Configurações do Imgur
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID; // Você precisa adicionar isso no .env.local
const IMGUR_CLIENT_SECRET = process.env.IMGUR_CLIENT_SECRET; // Você precisa adicionar isso no .env.local

// Configurar para não fazer parse automático do body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar se as credenciais do Imgur estão configuradas
    if (!IMGUR_CLIENT_ID) {
      return res.status(500).json({ 
        error: 'Credenciais do Imgur não configuradas. Adicione IMGUR_CLIENT_ID no .env.local' 
      });
    }

    // Parse do form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB máximo
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = files.image?.[0];
    if (!file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: 'Tipo de arquivo não suportado. Use: JPEG, PNG, GIF ou WebP' 
      });
    }

    // Ler o arquivo
    const imageData = fs.readFileSync(file.filepath);
    const base64Image = imageData.toString('base64');

    // Fazer upload para o Imgur
    const formData = new FormData();
    formData.append('image', base64Image);
    formData.append('type', 'base64');
    formData.append('title', fields.title?.[0] || 'Imagem da anotação');
    formData.append('description', fields.description?.[0] || 'Imagem anexada à base de conhecimento');

    const imgurResponse = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`,
      },
      body: formData,
    });

    const imgurData = await imgurResponse.json();

    if (!imgurResponse.ok || !imgurData.success) {
      console.error('Erro do Imgur:', imgurData);
      return res.status(500).json({ 
        error: 'Falha no upload para o Imgur',
        details: imgurData.data?.error || 'Erro desconhecido'
      });
    }

    // Remover arquivo temporário
    fs.unlinkSync(file.filepath);

    // Retornar dados da imagem
    const imageInfo = {
      id: imgurData.data.id,
      url: imgurData.data.link,
      deleteHash: imgurData.data.deletehash,
      title: fields.title?.[0] || 'Imagem da anotação',
      size: imgurData.data.size,
      type: imgurData.data.type,
      width: imgurData.data.width,
      height: imgurData.data.height,
    };

    res.status(200).json({
      success: true,
      image: imageInfo
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
} 