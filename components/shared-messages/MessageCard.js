import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaClock, FaGlobe, FaLock, FaTag, FaStar, FaHeart, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import MessageActions from './MessageActions';
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

  return date.toLocaleDateString(); // Exibe a data se for muito antiga
}

const MessageCard = ({ message, isPopular }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { POPULAR_THRESHOLD } = useMessageContext();

  // Verificar se o conteúdo precisa do botão de expandir
  const needsExpansion = message.content.length > 150;
  const displayContent = isExpanded 
    ? message.content 
    : needsExpansion 
      ? `${message.content.substring(0, 150)}...` 
      : message.content;

  // Variants para animação com Framer Motion
  const cardVariants = {
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
      y: -5, 
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  };

  return (
    <motion.div 
      className={`${cardStyles.messageCard} ${isPopular ? cardStyles.popularCard : ''}`}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      layout
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
        
        <div className={cardStyles.timestamp} title={new Date(message.created_at).toLocaleString()}>
          <FaClock className={cardStyles.metaIcon} />
          <span>{formatRelativeTime(message.created_at)}</span>
          {message.updated_at !== message.created_at && (
            <span className={cardStyles.editedMark} title={`Atualizado em ${new Date(message.updated_at).toLocaleString()}`}>
              (editado)
            </span>
          )}
        </div>
      </div>
      
      <div className={cardStyles.cardContent}>
        <p>{displayContent}</p>
        
        {needsExpansion && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={cardStyles.expandButton}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <>
                <FaEyeSlash className={cardStyles.expandIcon} />
                <span>Ver menos</span>
              </>
            ) : (
              <>
                <FaEye className={cardStyles.expandIcon} />
                <span>Ver mais</span>
              </>
            )}
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
    </motion.div>
  );
};

export default MessageCard;