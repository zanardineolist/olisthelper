import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaClock, FaGlobe, FaLock, FaTag, FaStar, FaHeart, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import MessageActions from './MessageActions';
import styles from '../../styles/shared-messages/index.module.css';

// Formatação relativa de tempo
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // diferença em segundos

  if (diff < 60) return `${diff} segundos atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutos atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} horas atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} dias atrás`;

  return date.toLocaleDateString(); // Exibe a data se for muito antiga
}

const MessageRow = ({ message, isPopular }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { POPULAR_THRESHOLD } = useMessageContext();

  // Variants para animação com Framer Motion
  const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        delay: Math.random() * 0.2 // Efeito cascata
      }
    },
    hover: { 
      backgroundColor: "var(--box-color3)",
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className={`${styles.messageRow} ${isPopular ? styles.popularRow : ''}`}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={rowVariants}
      layout
    >
      <div className={styles.rowMain}>
        <div className={styles.rowHeader}>
          {/* Status indicadores */}
          <div className={styles.rowStatus}>
            {isPopular && (
              <span className={styles.popularTag} title={`Mais de ${POPULAR_THRESHOLD} favoritos`}>
                <FaStar />
                <span className={styles.tagLabel}>Popular</span>
              </span>
            )}
            <span className={styles.visibilityTag} title={message.is_public ? "Mensagem pública" : "Mensagem privada"}>
              {message.is_public ? (
                <>
                  <FaGlobe />
                  <span className={styles.tagLabel}>Pública</span>
                </>
              ) : (
                <>
                  <FaLock />
                  <span className={styles.tagLabel}>Privada</span>
                </>
              )}
            </span>
          </div>

          {/* Título */}
          <h3 className={styles.rowTitle}>{message.title}</h3>
          
          {/* Tags */}
          <div className={styles.rowTags}>
            {message.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                <FaTag />
                <span className={styles.tagLabel}>{tag}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className={styles.rowContent}>
          <div className={`${styles.messagePreview} ${isExpanded ? styles.expanded : ''}`}>
            {message.content}
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={styles.expandButton}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <>
                <FaEyeSlash className={styles.expandIcon} />
                <span>Ver menos</span>
              </>
            ) : (
              <>
                <FaEye className={styles.expandIcon} />
                <span>Ver mais</span>
              </>
            )}
          </button>
        </div>
        
        {/* Metadados do autor e tempo */}
        <div className={styles.rowMeta}>
          <span className={styles.author}>
            <FaUser className={styles.metaIcon} />
            <span>{message.author_name}</span>
          </span>
          <span className={styles.timestamp} title={new Date(message.created_at).toLocaleString()}>
            <FaClock className={styles.metaIcon} />
            <span>{formatRelativeTime(message.created_at)}</span>
            {message.updated_at !== message.created_at && (
              <span className={styles.edited} title={`Atualizado em ${new Date(message.updated_at).toLocaleString()}`}>
                (editado)
              </span>
            )}
          </span>
          <span className={styles.favoriteCount}>
            <FaHeart className={`${styles.metaIcon} ${message.isFavorite ? styles.favorited : ''}`} />
            <span>{message.favorites_count || 0}</span>
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className={styles.rowActions}>
        <MessageActions message={message} />
      </div>
    </motion.div>
  );
};

export default MessageRow;