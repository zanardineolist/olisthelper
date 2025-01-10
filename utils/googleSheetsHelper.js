// utils/googleSheetsHelper.js
import { supabase } from './supabase';

// Função para buscar user_id do Supabase usando email
export async function getUserIdFromSupabase(email) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data?.user_id;
}

// Função para buscar dados do usuário do Supabase
export async function getUserDataFromSupabase(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
}

// Função para encontrar nome da aba no Google Sheets usando user_id
export async function findSheetNameByUserId(sheets, userId) {
  const sheetMeta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.SHEET_ID
  });

  const sheet = sheetMeta.data.sheets.find(sheet => 
    sheet.properties.title.startsWith(`#${userId}`)
  );

  return sheet?.properties.title;
}

// Função para validar perfil do usuário
export function validateUserRole(role, allowedRoles) {
  return allowedRoles.includes(role.toLowerCase());
}