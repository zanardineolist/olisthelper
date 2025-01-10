// services/supabaseService.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Serviços para Users
export const userService = {
  async getByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async list(filters = {}) {
    let query = supabase.from('users').select('*');
    
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// Serviços para Categories
export const categoryService = {
  async list() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(name) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, name) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Serviços para Messages
export const messageService = {
  async list(filters = {}) {
    let query = supabase
      .from('messages')
      .select(`
        *,
        user:users(name),
        tags:message_tags(tag:tags(name)),
        likes:message_likes(user_id)
      `);

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.isPrivate === true) {
      query = query.eq('is_private', true);
    }
    
    if (filters.isShared === true) {
      query = query.eq('is_shared', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(messageData) {
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Serviços para Tags
export const tagService = {
  async list() {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(name) {
    const { data, error } = await supabase
      .from('tags')
      .insert([{ name }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async addToMessage(messageId, tagId) {
    const { error } = await supabase
      .from('message_tags')
      .insert([{ message_id: messageId, tag_id: tagId }]);
    
    if (error) throw error;
    return true;
  }
};

// Serviços para Likes
export const likeService = {
  async toggle(messageId, userId) {
    // Verificar se já existe um like
    const { data: existingLike } = await supabase
      .from('message_likes')
      .select()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Remover like
      const { error } = await supabase
        .from('message_likes')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);

      if (error) throw error;
      return false;
    } else {
      // Adicionar like
      const { error } = await supabase
        .from('message_likes')
        .insert([{ message_id: messageId, user_id: userId }]);

      if (error) throw error;
      return true;
    }
  }
};