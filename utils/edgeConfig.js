// utils/edgeConfig.js
let edgeConfig = null;

if (typeof window === 'undefined') {
  try {
    edgeConfig = require('@vercel/edge-config');
  } catch (e) {
    console.error("Falha ao importar Edge Config: ", e);
  }
}

async function getEdgeConfig(key) {
  if (!edgeConfig) {
    throw new Error("Edge Config não está disponível no ambiente atual.");
  }

  try {
    return await edgeConfig.get(key);
  } catch (error) {
    console.error(`Erro ao obter Edge Config para a chave ${key}:`, error);
    return null;
  }
}

async function setEdgeConfig(key, value, options) {
  if (!edgeConfig) {
    throw new Error("Edge Config não está disponível no ambiente atual.");
  }

  try {
    await edgeConfig.set(key, value, options);
  } catch (error) {
    console.error(`Erro ao definir Edge Config para a chave ${key}:`, error);
  }
}

module.exports = {
  getEdgeConfig,
  setEdgeConfig
};
