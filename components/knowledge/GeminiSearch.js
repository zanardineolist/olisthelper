// components/knowledge/GeminiSearch.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaRobot, FaSearch, FaSpinner } from 'react-icons/fa';
import { useKnowledgeContext } from './KnowledgeContext';
import styles from '../../styles/knowledge/Search.module.css';

const GeminiSearch = () => {
  const { queryGemini } = useKnowledgeContext();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Processar a consulta
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await queryGemini(query);
      setResult(response);
    } catch (err) {
      console.error('Erro ao consultar Gemini:', err);
      setError('Não foi possível processar sua consulta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Limpar resultados
  const handleClear = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };

  // Variantes de animação
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  const resultVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className={styles.geminiContainer}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className={styles.geminiHeader}>
        <div className={styles.geminiTitle}>
          <FaRobot className={styles.geminiIcon} />
          <h2>Consulta Inteligente</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={styles.inputContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Faça uma pergunta sobre sua base de conhecimento..."
            className={styles.searchInput}
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          className={styles.searchButton}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? <FaSpinner className={styles.spinner} /> : 'Consultar'}
        </button>
        {(result || error) && (
          <button 
            type="button" 
            className={styles.clearButton}
            onClick={handleClear}
          >
            Limpar
          </button>
        )}
      </form>

      {isLoading && (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p>Consultando a base de conhecimento...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorContainer}>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <motion.div 
          className={styles.resultContainer}
          initial="hidden"
          animate="visible"
          variants={resultVariants}
        >
          <h3 className={styles.resultTitle}>Resposta:</h3>
          <div className={styles.resultContent}>
            {result.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div className={styles.resultFooter}>
            <p className={styles.disclaimer}>
              Esta resposta foi gerada com base no seu conhecimento armazenado.
              Verifique sempre a precisão das informações.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GeminiSearch;