import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner, FaSearch, FaHistory, FaEye } from 'react-icons/fa';
import styles from '../styles/CepValidator.module.css';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [popularCeps, setPopularCeps] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  useEffect(() => {
    fetchPopularCeps();
  }, []);

  const fetchPopularCeps = async () => {
    setLoadingPopular(true);
    try {
      const response = await fetch('/api/cep-top-searched?limit=3');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar CEPs populares');
      }
      
      const data = await response.json();
      setPopularCeps(data);
    } catch (err) {
      console.error('Erro ao buscar CEPs populares:', err);
    } finally {
      setLoadingPopular(false);
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

    setLoading(true);
    try {
      const response = await fetch(`/api/cep-ibge?cep=${cepNumerico}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao consultar o CEP');
      }
      
      const data = await response.json();
      setResult(data);
      // Atualiza lista de CEPs populares após busca bem-sucedida
      fetchPopularCeps();
    } catch (err) {
      setError(err.message || 'Erro ao consultar o CEP');
    } finally {
      setLoading(false);
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
            disabled={loading}
          >
            {loading ? <FaSpinner className={styles.spinner} /> : <FaSearch />}
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
        
        {loadingPopular ? (
          <div className={styles.loadingPopular}>
            <FaSpinner className={styles.spinner} />
            <span>Carregando CEPs populares...</span>
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
        <div className={styles.resultContainer}>
          <div className={styles.resultHeader}>
            <h3>Resultado para CEP {result.cep}</h3>
            {result.correspondencia.igual ? (
              <span className={styles.matchTag}>
                <FaCheckCircle /> Nomenclaturas idênticas
              </span>
            ) : (
              <span className={styles.mismatchTag}>
                <FaExclamationTriangle /> Nomenclaturas diferentes
              </span>
            )}
          </div>

          <div className={styles.resultGridContainer}>
            <div className={styles.resultGrid}>
              <div className={styles.resultColumn}>
                <h4>Dados Correios</h4>
                <div className={styles.resultItem}>
                  <span className={styles.label}>Cidade:</span>
                  <span className={styles.value}>{result.correios.cidade}</span>
                </div>
                <div className={styles.resultItem}>
                  <span className={styles.label}>UF:</span>
                  <span className={styles.value}>{result.correios.uf}</span>
                </div>
                {result.correios.bairro && (
                  <div className={styles.resultItem}>
                    <span className={styles.label}>Bairro:</span>
                    <span className={styles.value}>{result.correios.bairro}</span>
                  </div>
                )}
                {result.correios.logradouro && (
                  <div className={styles.resultItem}>
                    <span className={styles.label}>Logradouro:</span>
                    <span className={styles.value}>{result.correios.logradouro}</span>
                  </div>
                )}
              </div>

              <div className={styles.resultColumn}>
                <h4>Dados IBGE (para NFe)</h4>
                <div className={styles.resultItem}>
                  <span className={styles.label}>Cidade:</span>
                  <span className={`${styles.value} ${styles.highlighted}`}>{result.ibge.cidade}</span>
                  <button 
                    onClick={() => copyToClipboard(result.ibge.cidade)}
                    className={`${styles.copyButton} ${styles.primaryCopyButton}`}
                    title="Copiar nome oficial da cidade (IBGE)"
                  >
                    {copied ? <FaCheckCircle /> : 'Copiar'}
                  </button>
                </div>
                <div className={styles.resultItem}>
                  <span className={styles.label}>UF:</span>
                  <span className={styles.value}>{result.ibge.uf}</span>
                </div>
                <div className={styles.resultItem}>
                  <span className={styles.label}>Código IBGE:</span>
                  <span className={styles.value}>{result.ibge.codigo}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.observationBox}>
            <strong>Observação:</strong> {result.correspondencia.observacao}
          </div>
        </div>
      )}
    </div>
  );
};

export default CepIbgeValidator;