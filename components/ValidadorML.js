import { useState, useCallback, useEffect } from 'react';
import { 
  FaSearch, 
  FaInfoCircle, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaCopy,
  FaSpinner,
  FaTag,
  FaList,
  FaMoneyBillWave,
  FaChartBar
} from 'react-icons/fa';
import styles from '../styles/ValidadorML.module.css';

const ValidadorML = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentialsError, setCredentialsError] = useState(false);
  const [searchType, setSearchType] = useState('text'); // 'text' ou 'id'

  // Função para buscar categorias
  const searchCategories = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      let response;
      
      if (searchType === 'id') {
        // Busca direta por ID
        response = await fetch(`/api/mercadolivre/categories?type=details&categoryId=${encodeURIComponent(searchTerm.trim())}`);
        const data = await response.json();
        
        if (data.success) {
          setSelectedCategory(data.data);
          setCategoryDetails(data.data);
        } else {
          throw new Error(data.error || 'Categoria não encontrada');
        }
      } else {
        // Busca por texto
        response = await fetch(`/api/mercadolivre/categories?type=search&search=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (data.success) {
          setSearchResults(data.data);
        } else {
          throw new Error(data.error || 'Erro na busca');
        }
      }
    } catch (err) {
      console.error('Erro na busca:', err);
      
      // Verificar se é erro de credenciais
      if (err.message.includes('APP_ID') || err.message.includes('SECRET_KEY') || err.message.includes('obrigatórios')) {
        setCredentialsError(true);
        setError('Credenciais do Mercado Livre não configuradas. Configure as variáveis de ambiente APP_ID e SECRET_KEY.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, searchType]);

  // Função para obter detalhes de uma categoria
  const getCategoryDetails = useCallback(async (categoryId) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/mercadolivre/categories?type=details&categoryId=${categoryId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedCategory(data.data);
        setCategoryDetails(data.data);
      } else {
        throw new Error(data.error || 'Erro ao carregar detalhes');
      }
    } catch (err) {
      console.error('Erro ao obter detalhes:', err);
      
      // Verificar se é erro de credenciais
      if (err.message.includes('APP_ID') || err.message.includes('SECRET_KEY') || err.message.includes('obrigatórios')) {
        setCredentialsError(true);
        setError('Credenciais do Mercado Livre não configuradas. Configure as variáveis de ambiente APP_ID e SECRET_KEY.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para copiar informações
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Renderizar atributos detalhados
  const renderAttributes = (attributes) => {
    if (!Array.isArray(attributes) || attributes.length === 0) {
      return <p className={styles.noData}>Nenhum atributo encontrado</p>;
    }

    // Categorizar atributos
    const requiredAttributes = attributes.filter(attr => 
      Array.isArray(attr.tags) && attr.tags.includes('required')
    );
    const recommendedAttributes = attributes.filter(attr => 
      Array.isArray(attr.tags) && attr.tags.includes('recommended')
    );
    const optionalAttributes = attributes.filter(attr => 
      !Array.isArray(attr.tags) || 
      (!attr.tags.includes('required') && !attr.tags.includes('recommended'))
    );

    const renderAttributeDetail = (attr, type) => (
      <div key={attr.id} className={`${styles.attributeItem} ${styles[type]}`}>
        <div className={styles.attributeHeader}>
          <div className={styles.attributeTitle}>
            <span className={styles.attributeName}>{attr.name}</span>
            <span className={styles.attributeId}>ID: {attr.id}</span>
          </div>
          <div className={styles.attributeBadges}>
            {Array.isArray(attr.tags) && attr.tags.map(tag => (
              <span key={tag} className={`${styles.attributeBadge} ${styles[tag]}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        
        <div className={styles.attributeDetails}>
          <div className={styles.attributeRow}>
            <span className={styles.attributeLabel}>Tipo:</span>
            <span className={styles.attributeValue}>{attr.value_type || 'Não especificado'}</span>
          </div>
          
          {attr.value_max_length && (
            <div className={styles.attributeRow}>
              <span className={styles.attributeLabel}>Máx. caracteres:</span>
              <span className={styles.attributeValue}>{attr.value_max_length}</span>
            </div>
          )}
          
          {attr.default && (
            <div className={styles.attributeRow}>
              <span className={styles.attributeLabel}>Valor padrão:</span>
              <span className={styles.attributeValue}>{attr.default}</span>
            </div>
          )}

          {attr.values && attr.values.length > 0 && (
            <div className={styles.attributeRow}>
              <span className={styles.attributeLabel}>Valores aceitos:</span>
              <div className={styles.attributeValues}>
                <div className={styles.valuesContainer}>
                  {attr.values.slice(0, 5).map((value, index) => (
                    <span key={index} className={styles.valueItem}>
                      {value.name} ({value.id})
                    </span>
                  ))}
                  {attr.values.length > 5 && (
                    <span className={styles.moreValues}>
                      +{attr.values.length - 5} outros valores
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {attr.tooltip && (
            <div className={styles.attributeRow}>
              <span className={styles.attributeLabel}>Dica:</span>
              <span className={styles.attributeTooltip}>{attr.tooltip}</span>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className={styles.attributesContainer}>
        {/* Atributos Obrigatórios */}
        {requiredAttributes.length > 0 && (
          <div className={styles.attributeSection}>
            <h4 className={styles.attributeSectionTitle}>
              <FaExclamationTriangle className={styles.requiredIcon} />
              Atributos Obrigatórios ({requiredAttributes.length})
            </h4>
            <div className={styles.attributesList}>
              {requiredAttributes.map(attr => renderAttributeDetail(attr, 'required'))}
            </div>
          </div>
        )}

        {/* Atributos Recomendados */}
        {recommendedAttributes.length > 0 && (
          <div className={styles.attributeSection}>
            <h4 className={styles.attributeSectionTitle}>
              <FaCheckCircle className={styles.recommendedIcon} />
              Atributos Recomendados ({recommendedAttributes.length})
            </h4>
            <div className={styles.attributesList}>
              {recommendedAttributes.map(attr => renderAttributeDetail(attr, 'recommended'))}
            </div>
          </div>
        )}

        {/* Atributos Opcionais */}
        {optionalAttributes.length > 0 && (
          <div className={styles.attributeSection}>
            <h4 className={styles.attributeSectionTitle}>
              <FaInfoCircle className={styles.optionalIcon} />
              Atributos Opcionais ({optionalAttributes.length})
            </h4>
            <div className={styles.attributesList}>
              {optionalAttributes.map(attr => renderAttributeDetail(attr, 'optional'))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizar informações sobre variações
  const renderVariationsInfo = (category) => {
    if (!category) return null;

    const supportsVariations = category.attributes_types || category.allows_variations;
    
    return (
      <div className={styles.variationsSection}>
        <h4 className={styles.sectionTitle}>
          <FaTag /> Informações sobre Variações
        </h4>
        
        <div className={styles.variationInfo}>
          <div className={styles.variationStatus}>
            <span className={styles.variationLabel}>Permite variações:</span>
            <span className={`${styles.variationValue} ${supportsVariations ? styles.success : styles.error}`}>
              {supportsVariations ? 'Sim' : 'Não'}
            </span>
          </div>

          {supportsVariations && (
            <>
              {category.attribute_types && (
                <div className={styles.variationTypes}>
                  <span className={styles.variationLabel}>Tipos de variação aceitos:</span>
                  <div className={styles.variationList}>
                    {category.attribute_types.map((type, index) => (
                      <div key={index} className={styles.variationType}>
                        <span className={styles.typeTitle}>{type.name}</span>
                        <span className={styles.typeId}>({type.id})</span>
                        {type.allows_custom_values && (
                          <span className={styles.customBadge}>Aceita valores personalizados</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.variationNotes}>
                <FaInfoCircle className={styles.noteIcon} />
                <div className={styles.noteText}>
                  <p><strong>Dica:</strong> Variações permitem criar diferentes versões do mesmo produto (ex: tamanhos, cores)</p>
                  <p>Use variações para evitar criar anúncios separados para cada versão do produto</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <FaTag className={styles.titleIcon} />
          Validador Mercado Livre
        </h1>
        <p className={styles.description}>
          Valide categorias e obtenha informações essenciais para anunciar no Mercado Livre
        </p>
      </div>

      {/* Formulário de Busca */}
      <div className={styles.searchSection}>
        <div className={styles.searchTypeToggle}>
          <button
            className={`${styles.toggleButton} ${searchType === 'text' ? styles.active : ''}`}
            onClick={() => setSearchType('text')}
          >
            Busca por Texto
          </button>
          <button
            className={`${styles.toggleButton} ${searchType === 'id' ? styles.active : ''}`}
            onClick={() => setSearchType('id')}
          >
            Busca por ID
          </button>
        </div>

        <div className={styles.searchForm}>
          <div className={styles.searchInputGroup}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                searchType === 'id' 
                  ? 'Digite o ID da categoria (ex: MLB1055)' 
                  : 'Digite o nome da categoria (ex: smartphones)'
              }
              className={styles.searchInput}
              onKeyPress={(e) => e.key === 'Enter' && searchCategories()}
            />
            <button
              onClick={searchCategories}
              disabled={loading || !searchTerm.trim()}
              className={styles.searchButton}
            >
              {loading ? <FaSpinner className={styles.spinner} /> : <FaSearch />}
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Credenciais */}
      {credentialsError && (
        <div className={styles.credentialsAlert}>
          <div className={styles.alertHeader}>
            <FaExclamationTriangle className={styles.alertIcon} />
            <h3>Credenciais do Mercado Livre Não Configuradas</h3>
          </div>
          <div className={styles.alertContent}>
            <p>Para usar o ValidadorML, você precisa configurar suas credenciais do Mercado Livre:</p>
            <ol className={styles.steps}>
              <li>Acesse <a href="https://developers.mercadolivre.com.br/" target="_blank" rel="noopener noreferrer">developers.mercadolivre.com.br</a></li>
              <li>Crie uma nova aplicação</li>
              <li>Copie o <strong>APP_ID</strong> e <strong>SECRET_KEY</strong></li>
              <li>Configure as variáveis de ambiente no Vercel:
                <ul>
                  <li><code>MERCADO_LIVRE_APP_ID</code></li>
                  <li><code>MERCADO_LIVRE_SECRET_KEY</code></li>
                </ul>
              </li>
              <li>Faça um novo deploy da aplicação</li>
            </ol>
            <button 
              className={styles.retryButton}
              onClick={() => {
                setCredentialsError(false);
                setError('');
              }}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de Erro */}
      {error && !credentialsError && (
        <div className={styles.errorMessage}>
          <FaExclamationTriangle />
          {error}
        </div>
      )}

      {/* Resultados da Busca */}
      {searchResults.length > 0 && (
        <div className={styles.searchResults}>
          <h3 className={styles.resultsTitle}>
            <FaList /> Resultados ({searchResults.length})
          </h3>
          <div className={styles.resultsList}>
            {searchResults.map((category) => (
              <div
                key={category.id}
                className={styles.resultItem}
                onClick={() => getCategoryDetails(category.id)}
              >
                <div className={styles.resultInfo}>
                  <span className={styles.resultName}>{category.name}</span>
                  <span className={styles.resultId}>{category.id}</span>
                </div>
                <FaInfoCircle className={styles.detailsIcon} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhes da Categoria */}
      {categoryDetails && (
        <div className={styles.categoryDetails}>
          <div className={styles.detailsHeader}>
            <h3 className={styles.detailsTitle}>
              <FaCheckCircle className={styles.successIcon} />
              Detalhes da Categoria
            </h3>
          </div>

          <div className={styles.detailsGrid}>
            {/* Informações Básicas */}
            <div className={styles.detailsCard}>
              <h4 className={styles.cardTitle}>
                <FaInfoCircle /> Informações Básicas
              </h4>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Nome:</span>
                <span className={styles.infoValue}>
                  {categoryDetails.name}
                  <button
                    onClick={() => copyToClipboard(categoryDetails.name)}
                    className={styles.copyButton}
                    title="Copiar nome"
                  >
                    <FaCopy />
                  </button>
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ID:</span>
                <span className={styles.infoValue}>
                  {categoryDetails.id}
                  <button
                    onClick={() => copyToClipboard(categoryDetails.id)}
                    className={styles.copyButton}
                    title="Copiar ID"
                  >
                    <FaCopy />
                  </button>
                </span>
              </div>
              {categoryDetails.picture && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Imagem:</span>
                  <img 
                    src={categoryDetails.picture} 
                    alt={categoryDetails.name}
                    className={styles.categoryImage}
                  />
                </div>
              )}
            </div>

            {/* Caminho da Categoria */}
            {categoryDetails.path_from_root && (
              <div className={styles.detailsCard}>
                <h4 className={styles.cardTitle}>
                  <FaList /> Caminho da Categoria
                </h4>
                <div className={styles.breadcrumb}>
                  {categoryDetails.path_from_root.map((path, index) => (
                    <span key={path.id} className={styles.breadcrumbItem}>
                      {index > 0 && <span className={styles.breadcrumbSeparator}>&gt;</span>}
                      {path.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Configurações de Listagem */}
            <div className={styles.detailsCard}>
              <h4 className={styles.cardTitle}>
                <FaMoneyBillWave /> Configurações de Listagem
              </h4>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Permite variações:</span>
                <span className={`${styles.infoValue} ${categoryDetails.attributes_types ? styles.success : styles.error}`}>
                  {categoryDetails.attributes_types ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status:</span>
                <span className={styles.infoValue}>{categoryDetails.status || 'Ativa'}</span>
              </div>
            </div>
          </div>

          {/* Informações sobre Variações */}
          {renderVariationsInfo(categoryDetails)}

          {/* Atributos */}
          <div className={styles.attributesSection}>
            <h4 className={styles.sectionTitle}>
              <FaChartBar /> Atributos da Categoria
            </h4>
            {renderAttributes(Array.isArray(categoryDetails.attributes) ? categoryDetails.attributes : [])}
          </div>
        </div>
      )}

      {/* Informações de Ajuda */}
      <div className={styles.helpSection}>
        <h3 className={styles.helpTitle}>
          <FaInfoCircle /> Como usar
        </h3>
        <div className={styles.helpContent}>
          <div className={styles.helpItem}>
            <strong>Busca por Texto:</strong> Digite palavras-chave para encontrar categorias relacionadas
          </div>
          <div className={styles.helpItem}>
            <strong>Busca por ID:</strong> Digite o código exato da categoria (ex: MLB1055)
          </div>
          <div className={styles.helpItem}>
            <strong>Atributos Obrigatórios:</strong> Campos que DEVEM ser preenchidos ao criar um anúncio
          </div>
          <div className={styles.helpItem}>
            <strong>Dica:</strong> Use as informações de atributos obrigatórios para preparar seus produtos antes de anunciar
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidadorML; 