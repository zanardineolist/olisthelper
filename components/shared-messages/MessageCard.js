import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaClock, FaGlobe, FaLock, FaTag, FaStar, FaHeart, FaEye } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import MessageActions from './MessageActions';
import MessageModal from './MessageModal';
import cardStyles from '../../styles/shared-messages/Card.module.css';
import tagStyles from '../../styles/shared-messages/Tags.module.css';

// Formatação relativa de tempo
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

const MessageCard = ({ message, isPopular }) => {
  const [showModal, setShowModal] = useState(false);
  const { POPULAR_THRESHOLD } = useMessageContext();

  // Verificar se o conteúdo precisa do botão de "Ver mais"
  const needsExpansion = message.content.length > 150;
  const displayContent = needsExpansion 
    ? `${message.content.substring(0, 150)}...` 
    : message.content;

  // Variantes simplificadas para animação com Framer Motion (mais suaves)
  const cardVariants = {
    hover: { 
      y: -3, 
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className={`${cardStyles.messageCard} ${isPopular ? cardStyles.popularCard : ''}`}
      whileHover="hover"
      variants={cardVariants}
    >
      <div className={cardStyles.cardHeader}>
        <h3 className={cardStyles.cardTitle}>{message.title}</h3>
        
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
      </div>
      
      <div className={cardStyles.cardMeta}>
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
      
      <div className={cardStyles.cardContent}>
        <p>{displayContent}</p>
        
        {needsExpansion && (
          <button 
            onClick={() => setShowModal(true)} 
            className={cardStyles.expandButton}
            aria-label="Ver detalhes da mensagem"
          >
            <FaEye className={cardStyles.expandIcon} />
            <span>Ver mais</span>
          </button>
        )}
      </div>
      
      {/* Tags */}
      {message.tags && message.tags.length > 0 && (
        <div className={tagStyles.cardTags}>
          {message.tags.map((tag) => (
            <span key={tag} className={tagStyles.tag}>
              <FaTag className={tagStyles.tagIcon} />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      )}
      
      <div className={cardStyles.cardFooter}>
        {/* Favoritos */}
        <span className={cardStyles.favoriteCount}>
          <FaHeart className={`${cardStyles.heartIcon} ${message.isFavorite ? cardStyles.favorited : ''}`} />
          <span>{message.favorites_count || 0}</span>
        </span>
        
        {/* Ações */}
        <MessageActions message={message} />
      </div>

      {/* Modal de visualização completa */}
      <AnimatePresence>
        {showModal && (
          <MessageModal 
            message={message} 
            onClose={() => setShowModal(false)}
            isPopular={isPopular}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MessageCard;