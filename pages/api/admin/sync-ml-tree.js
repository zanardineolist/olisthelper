import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ML_SITE_ID = 'MLB';
const ML_API_BASE = 'https://api.mercadolibre.com';

async function fetchCategories(parentId = null) {
  let url = parentId
    ? `${ML_API_BASE}/categories/${parentId}`
    : `${ML_API_BASE}/sites/${ML_SITE_ID}/categories`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao buscar categorias: ${url}`);
  return await res.json();
}

async function syncCategory(node, parentId = null, level = 0, path = []) {
  const fullPath = [...path, node.name].join(' > ');
  let children = [];

  if (Array.isArray(node)) {
    for (const cat of node) {
      await syncCategory(cat, null, 0, []);
    }
    return;
  }

  const details = await fetchCategories(node.id);
  if (details.children_categories && details.children_categories.length > 0) {
    for (const child of details.children_categories) {
      children.push(child.id);
      await syncCategory(child, node.id, level + 1, [...path, node.name]);
    }
  }

  await supabase.from('ml_categories_tree').upsert({
    id: node.id,
    name: node.name,
    parent_id: parentId,
    full_path: fullPath,
    level,
    children_ids: children,
    is_leaf: children.length === 0,
    raw_data: details,
    updated_at: new Date().toISOString(),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // (Opcional) Adicione autenticação extra aqui se desejar

  try {
    const rootCategories = await fetchCategories();
    await syncCategory(rootCategories, null, 0, []);
    return res.status(200).json({ success: true, message: 'Sincronização concluída!' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
} 