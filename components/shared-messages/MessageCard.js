import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaClock, FaGlobe, FaLock, FaTag, FaStar, FaHeart } from 'react-icons/fa';
import MessageContext from './MessageContext';
import MessageActions from './MessageActions';
import styles from '../../styles/MessageCard.module.css';

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

const MessageContent = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewLength = 150;
  const needsExpansion = content.length > previewLength;

  return (
    <div className={styles.content}>
      <p className={isExpanded ? styles.expanded : undefined}>
        {isExpanded ? content : content.slice(0, previewLength)}
        {!isExpanded && needsExpansion && (
          <span className={styles.fadeOut}>...</span>
        )}
      </p>
      {needsExpansion && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className={styles.expandButton}
          aria-expanded={isExpanded}
          aria-controls={`content-${content.substring(0, 10)}`}
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
};

const MessageCard = ({ message, isPopular }) => {
  const { POPULAR_THRESHOLD } = useContext(MessageContext);

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
        delay: Math.random() * 0.3 // Efeito cascata
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
      className={`${styles.card} ${isPopular ? styles.popular : ''}`}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{message.title}</h3>
        <div className={styles.visibility}>
          {message.is_public ? (
            <span className={styles.publicBadge} title="Mensagem pública">
              <FaGlobe className={styles.visibilityIcon} />
            </span>
          ) : (
            <span className={styles.privateBadge} title="Mensagem privada">
              <FaLock className={styles.visibilityIcon} />
            </span>
          )}
        </div>
      </div>

      <div className={styles.authorInfo}>
        <span className={styles.author}>
          <FaUser className={styles.authorIcon} />
          {message.author_name}
        </span>
        <span className={styles.timestamp} title={new Date(message.created_at).toLocaleString()}>
          <FaClock />
          {formatRelativeTime(message.created_at)}
          {message.updated_at !== message.created_at && (
            <span className={styles.edited} title={`Atualizado em ${new Date(message.updated_at).toLocaleString()}`}>
              (editado)
            </span>
          )}
        </span>
      </div>

      <MessageContent content={message.content} />

      <div className={styles.footer}>
        <div className={styles.tags}>
          {isPopular && (
            <span className={styles.popularTag} title={`Mais de ${POPULAR_THRESHOLD} favoritos`}>
              <FaStar />
              Popular
            </span>
          )}
          {message.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              <FaTag />
              {tag}
            </span>
          ))}
        </div>

        <div className={styles.metrics}>
          <span className={styles.metric} title="Total de favoritos">
            <FaHeart className={message.isFavorite ? styles.favorited : ''} />
            {message.favorites_count || 0}
          </span>
        </div>
      </div>

      <MessageActions message={message} />
    </motion.div>
  );
};

export default MessageCard;