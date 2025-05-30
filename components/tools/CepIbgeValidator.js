import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner, FaSearch, FaHistory, FaEye } from 'react-icons/fa';
import styles from '../../styles/CepValidator.module.css';
import { useApiLoader } from '../../utils/apiLoader';
import { LocalLoader, useLoading } from '../ui';

const PopularCepCard = ({ cepData, onSelect }) => {
  if (!cepData) return null;
  
  const { cep, data, searchCount } = cepData;
  const isMatch = data.correspondencia.igual;
  
  return (
    <div className={styles.popularCepCard} onClick={() => onSelect(cep)}>
      <div className={styles.popularCepHeader}>
        <span className={styles.popularCepNumber}>{cep.replace(/(\d{5})(\d{3})/, '$1-$2')}</span>
        {isMatch ? (
          <span className={styles.miniMatchTag}>
            <FaCheckCircle /> Cidades idênticas
          </span>
        ) : (
          <span className={styles.miniMismatchTag}>
            <FaExclamationTriangle /> Divergência
          </span>
        )}
      </div>
      <div className={styles.popularCepData}>
        <div className={styles.popularCepRow}>
          <span>Correios:</span> <strong>{data.correios.cidade}/{data.correios.uf}</strong>
        </div>
        <div className={styles.popularCepRow}>
          <span>IBGE:</span> <strong className={isMatch ? '' : styles.highlighted}>{data.ibge.cidade}/{data.ibge.uf}</strong>
        </div>
        <div className={styles.popularCepSearchCount}>
          <FaEye /> <span>{searchCount || 0} consulta{searchCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

const CepIbgeValidator = () => {
  const [cep, setCep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [popularCeps, setPopularCeps] = useState([]);
  
  // Usando o hook personalizado para as chamadas de API com loading
  const { callApi } = useApiLoader();
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    fetchPopularCeps();
  }, []);

  const fetchPopularCeps = async () => {
    try {
      // Utilizando o novo sistema de loading para componentes específicos
      const data = await callApi('/api/cep-top-searched?limit=3', {}, {
        message: 'Carregando CEPs populares...',
        type: 'local' // Utilizando loading local em vez de fullscreen
      });
      
      setPopularCeps(data);
    } catch (err) {
      console.error('Erro ao buscar CEPs populares:', err);
    }
  };

  const formatCep = (value) => {
    // Remover caracteres não numéricos
    const cepNumerico = value.replace(/\D/g, '');
    
    // Aplicar máscara de formatação
    if (cepNumerico.length <= 5) {
      return cepNumerico;
    } else {
      return `${cepNumerico.slice(0, 5)}-${cepNumerico.slice(5, 8)}`;
    }
  };

  const handleCepChange = (e) => {
    const formattedCep = formatCep(e.target.value);
    setCep(formattedCep);
  };

  const validateCep = async () => {
    // Limpar estados anteriores
    setResult(null);
    setError(null);
    setCopied(false);

    // Validação básica
    const cepNumerico = cep.replace(/\D/g, '');
    if (cepNumerico.length !== 8) {
      setError('CEP inválido. Digite um CEP com 8 dígitos.');
      return;
    }

    try {
      // Usando o sistema centralizado de loading
      const data = await callApi(`/api/cep-ibge?cep=${cepNumerico}`, {}, {
        message: 'Consultando CEP...'
      });
      
      setResult(data);
      // Atualiza lista de CEPs populares após busca bem-sucedida
      fetchPopularCeps();
    } catch (err) {
      setError(err.message || 'Erro ao consultar o CEP');
    }
  };

  const handleSelectPopularCep = (popularCep) => {
    const cepNumerico = popularCep.replace(/\D/g, '');
    // Busca no array de CEPs populares
    const selectedCepData = popularCeps.find(item => item.cep === cepNumerico);
    
    if (selectedCepData) {
      setCep(formatCep(cepNumerico));
      setResult(selectedCepData.data);
      setError(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar para o clipboard:', err);
      });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Validador CEP x IBGE</h2>
        <p className={styles.description}>
          Consulte um CEP para obter a nomenclatura correta da cidade conforme o IBGE.
        </p>
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={cep}
            onChange={handleCepChange}
            placeholder="Digite o CEP (ex: 00000-000)"
            className={styles.input}
            maxLength="9"
          />
          <button 
            onClick={validateCep} 
            className={styles.searchButton}
          >
            <FaSearch />
            <span>Consultar</span>
          </button>
        </div>
        
        {error && (
          <div className={styles.errorMessage}>
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Seção de CEPs Populares */}
      <div className={styles.popularCepsSection}>
        <h3 className={styles.popularCepsTitle}>
          <FaHistory className={styles.popularCepsIcon} />
          CEPs mais consultados
        </h3>
        
        {popularCeps.length === 0 ? (
          <div className={styles.loadingPopular}>
            <LocalLoader message="Carregando CEPs populares..." size="small" />
          </div>
        ) : popularCeps.length > 0 ? (
          <div className={styles.popularCepsGrid}>
            {popularCeps.map((cepItem, index) => (
              <PopularCepCard 
                key={index} 
                cepData={cepItem} 
                onSelect={() => handleSelectPopularCep(cepItem.cep)}
              />
            ))}
          </div>
        ) : (
          <p className={styles.noPopularCeps}>Nenhum CEP foi consultado recentemente.</p>
        )}
      </div>

      {result && (
        <div className={styles.resultsContainer}>
          <h3 className={styles.resultsTitle}>Resultado da Consulta</h3>
          
          <div className={styles.resultCard}>
            {result.correspondencia.igual ? (
              <div className={styles.matchResult}>
                <div className={styles.matchIcon}>
                  <FaCheckCircle />
                </div>
                <div className={styles.matchContent}>
                  <h4>Cidades idênticas ✅</h4>
                  <p>A nomenclatura dos Correios e do IBGE são iguais para este CEP.</p>
                </div>
              </div>
            ) : (
              <div className={styles.mismatchResult}>
                <div className={styles.mismatchIcon}>
                  <FaExclamationTriangle />
                </div>
                <div className={styles.mismatchContent}>
                  <h4>Divergência encontrada ⚠️</h4>
                  <p>A nomenclatura dos Correios e do IBGE são diferentes.</p>
                </div>
              </div>
            )}
          </div>

          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonCard}>
              <h4>📮 Correios</h4>
              <div className={styles.cityInfo}>
                <span className={styles.cityName}>{result.correios.cidade}</span>
                <span className={styles.uf}>{result.correios.uf}</span>
              </div>
              <div className={styles.additionalInfo}>
                <p><strong>Bairro:</strong> {result.correios.bairro}</p>
                <p><strong>Logradouro:</strong> {result.correios.logradouro}</p>
              </div>
            </div>

            <div className={styles.comparisonCard}>
              <h4>🏛️ IBGE (Oficial)</h4>
              <div className={styles.cityInfo}>
                <span className={`${styles.cityName} ${!result.correspondencia.igual ? styles.highlighted : ''}`}>
                  {result.ibge.cidade}
                </span>
                <span className={styles.uf}>{result.ibge.uf}</span>
              </div>
              <div className={styles.additionalInfo}>
                <p><strong>Código IBGE:</strong> {result.ibge.codigo_ibge}</p>
                <p><strong>DDD:</strong> {result.ibge.ddd}</p>
              </div>
              
              {!result.correspondencia.igual && (
                <div className={styles.copySection}>
                  <button 
                    className={styles.copyButton}
                    onClick={() => copyToClipboard(result.ibge.cidade)}
                  >
                    {copied ? 'Copiado!' : 'Copiar nome IBGE'}
                  </button>
                  <p className={styles.copyInstruction}>
                    👆 Use este nome no sistema da Olist
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CepIbgeValidator; 