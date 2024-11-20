// utils/edgeConfig.js

let edgeConfig = null;
let isEdgeConfigAvailable = false;

if (typeof window === 'undefined') {
  try {
    edgeConfig = require('@vercel/edge-config');
    if (edgeConfig && typeof edgeConfig.get === 'function' && typeof edgeConfig.set === 'function') {
      isEdgeConfigAvailable = true;
    }
  } catch (e) {
    console.error("Falha ao importar Edge Config: ", e);
  }
}

export async function getEdgeConfig(key) {
  if (!isEdgeConfigAvailable) {
    console.warn("Edge Config não está disponível ou o método 'get' não existe.");
    return null;
  }

  try {
    return await edgeConfig.get(key);
  } catch (error) {
    console.error(`Erro ao obter Edge Config para a chave ${key}:`, error);
    return null;
  }
}

export async function setEdgeConfig(key, value, options) {
  if (!isEdgeConfigAvailable) {
    console.warn("Edge Config não está disponível ou o método 'set' não existe.");
    return;
  }

  try {
    await edgeConfig.set(key, value, options);
  } catch (error) {
    console.error(`Erro ao definir Edge Config para a chave ${key}:`, error);
  }
}

export async function deleteEdgeConfig(key) {
  if (!isEdgeConfigAvailable || typeof edgeConfig.delete !== 'function') {
    console.warn("Edge Config não está disponível ou o método 'delete' não existe.");
    return;
  }

  try {
    await edgeConfig.delete(key);
  } catch (error) {
    console.error(`Erro ao excluir Edge Config para a chave ${key}:`, error);
  }
}

export default {
  getEdgeConfig,
  setEdgeConfig,
  deleteEdgeConfig,
};