import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Função para inicializar usuário no Supabase
export async function initializeUser(user) {
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from('users')
    .upsert({
      user_email: user.email,
      user_name: user.name
    }, {
      onConflict: 'user_email',
      returning: true
    });

  if (error) {
    console.error('Error initializing user:', error);
    return null;
  }

  return data?.[0];
}

// Função para buscar mensagens
export async function fetchMessages({ isPrivate = false, userId, searchTerm = '', tags = [] }) {
  let query = supabase
    .from('messages')
    .select(`
      *,
      tags!inner (name),
      likes: message_likes (count)
    `);

  // Filtrar por privacidade
  if (isPrivate) {
    query = query.eq('user_id', userId).eq('is_private', true);
  } else {
    query = query.eq('is_shared', true);
  }

  // Aplicar busca por termo
  if (searchTerm) {
    query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
  }

  // Filtrar por tags
  if (tags.length > 0) {
    query = query.contains('tags', tags);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data;
}

// Função para salvar nova mensagem
export async function saveMessage(messageData) {
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select();

  if (error) {
    console.error('Error saving message:', error);
    return null;
  }

  return data?.[0];
}

// Função para gerenciar likes
export async function toggleMessageLike(messageId, userId) {
  const { data: existingLike } = await supabase
    .from('message_likes')
    .select()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    const { error } = await supabase
      .from('message_likes')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId);

    return { liked: false, error };
  } else {
    const { error } = await supabase
      .from('message_likes')
      .insert([{ message_id: messageId, user_id: userId }]);

    return { liked: true, error };
  }
}

// Função para gerenciar tags
export async function fetchAllTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  return data;
}

export async function createTag(tagName) {
  const { data, error } = await supabase
    .from('tags')
    .insert([{ name: tagName }])
    .select();

  if (error) {
    console.error('Error creating tag:', error);
    return null;
  }

  return data?.[0];
}