// components/CategoryValidator/types.js

/**
 * @typedef {Object} Category
 * @property {string} id - ID da categoria
 * @property {string} hierarquia_completa - Caminho completo da categoria
 * @property {boolean} is_ultimo_nivel - Se é uma categoria de último nível
 * @property {boolean} items_reviews_allowed - Se permite reviews de itens
 * @property {boolean} listing_allowed - Se permite listagem
 * @property {number} max_description_length - Comprimento máximo da descrição
 * @property {number} max_pictures_per_item - Máximo de fotos por item
 * @property {number} max_pictures_per_item_var - Máximo de fotos por variação
 * @property {number} max_sub_title_length - Comprimento máximo do subtítulo
 * @property {number} max_title_length - Comprimento máximo do título
 * @property {number} max_variations_allowed - Máximo de variações permitidas
 * @property {string} minimum_price - Preço mínimo
 * @property {string} minimum_price_currency - Moeda do preço mínimo
 * @property {string} stock - Se requer estoque ('required' ou não)
 * @property {string} status - Status da categoria ('enabled' ou 'disabled')
 * @property {Array<Attribute>} [attributes] - Atributos obrigatórios
 * @property {Array<Variation>} [variations] - Variações permitidas
 */

/**
 * @typedef {Object} Attribute
 * @property {string} id - ID do atributo
 * @property {string} name - Nome do atributo
 * @property {string[]} tags - Tags do atributo (ex: 'required')
 * @property {Object} value_type - Tipo de valor do atributo
 * @property {Array<Object>} [values] - Valores permitidos
 */

/**
 * @typedef {Object} Variation
 * @property {string} id - ID da variação
 * @property {string} name - Nome da variação
 * @property {Array<Object>} values - Valores permitidos para a variação
 */

export {};