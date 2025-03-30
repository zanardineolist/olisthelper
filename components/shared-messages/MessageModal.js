import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaClock, FaGlobe, FaLock, FaTag, FaStar, FaTimes, FaHeart } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import MessageActions from './MessageActions';
import styles from '../../styles/shared-messages/Form.module.css';
import cardStyles from '../../styles/shared-messages/Card.module.css';
import tagStyles from '../../styles/shared-messages/Tags.module.css';
import { createPortal } from 'react-dom';

// Formatação relativa de tempo (reutilizada dos componentes de card/row)
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // diferença em segundos

  if (diff < 60) return `${diff} segundos atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutos atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} horas atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} dias atrás`;

  // Exibe a data no formato brasileiro se for muito antiga
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); 
}

// Formatar data completa no fuso horário brasileiro
function formatDateTimeBR(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

const MessageModal = ({ message, onClose, isPopular }) => {
  const { POPULAR_THRESHOLD } = useMessageContext();
  
  // Efeito para prevenir rolagem do body quando o modal está aberto
  useEffect(() => {
    // Desabilita a rolagem do body quando o modal é aberto
    document.body.style.overflow = 'hidden';
    
    // Restaura a rolagem quando o modal é fechado
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Variantes de animação para o modal
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: 'spring', damping: 20, stiffness: 300 }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.2 }
    }
  };
  
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Usando createPortal para renderizar o modal diretamente no body
  return createPortal(
    <motion.div 
      className={styles.modalOverlay}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
      onClick={onClose}
    >
      <motion.div 
        className={styles.modalContent}
        variants={modalVariants}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="message-detail-title"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 id="message-detail-title" className={styles.modalTitle}>
            {message.title}
          </h2>
          <div className={cardStyles.cardBadges}>
            {/* Indicador de público/privado */}
            <span 
              className={cardStyles.visibilityBadge} 
              title={message.is_public ? "Mensagem pública" : "Mensagem privada"}
            >
              {message.is_public ? <FaGlobe /> : <FaLock />}
            </span>
            
            {/* Indicador de popular */}
            {isPopular && (
              <span className={cardStyles.popularBadge} title={`Mais de ${POPULAR_THRESHOLD} favoritos`}>
                <FaStar />
              </span>
            )}
          </div>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="Fechar"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={cardStyles.cardMeta}>
          {/* Indicador de público/privado movido para antes do autor */}
          <span 
            className={cardStyles.visibilityBadge} 
            title={message.is_public ? "Mensagem pública" : "Mensagem privada"}
            style={{ marginRight: '10px' }}
          >
            {message.is_public ? <FaGlobe /> : <FaLock />}
          </span>
          
          <div className={cardStyles.author}>
            <FaUser className={cardStyles.metaIcon} />
            <span>{message.author_name}</span>
          </div>
          
          <div className={cardStyles.timestamp} title={formatDateTimeBR(message.created_at)}>
            <FaClock className={cardStyles.metaIcon} />
            <span>{formatRelativeTime(message.created_at)}</span>
            {message.updated_at !== message.created_at && (
              <span className={cardStyles.editedMark} title={`Atualizado em ${formatDateTimeBR(message.updated_at)}`}>
                (editado)
              </span>
            )}
          </div>
        </div>
        
        {/* Tags */}
        {message.tags && message.tags.length > 0 && (
          <div className={tagStyles.cardTags} style={{ marginBottom: '15px' }}>
            {message.tags.map((tag) => (
              <span key={tag} className={tagStyles.tag}>
                <FaTag className={tagStyles.tagIcon} />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        )}
        
        {/* Conteúdo da mensagem com formatação preservada */}
        <div className="message-content" style={{ 
          backgroundColor: 'var(--box-color2)', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6',
          color: 'var(--text-color)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {message.content}
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '20px',
          paddingTop: '15px',
          borderTop: '1px solid var(--color-border)'
        }}>
          {/* Favoritos */}
          <span className={cardStyles.favoriteCount}>
            <FaHeart className={`${cardStyles.heartIcon} ${message.isFavorite ? cardStyles.favorited : ''}`} />
            <span>{message.favorites_count || 0}</span>
          </span>
          
          {/* Ações */}
          <MessageActions message={message} />
        </div>
      </motion.div>
    </motion.div>
  , document.body);
};

export default MessageModal;