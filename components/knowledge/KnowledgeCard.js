// components/knowledge/KnowledgeCard.js
import React from 'react';
import { motion } from 'framer-motion';
import { FaEdit, FaTrash, FaExternalLinkAlt, FaTag, FaLayerGroup } from 'react-icons/fa';
import { useKnowledgeContext } from './KnowledgeContext';
import styles from '../../styles/knowledge/Card.module.css';

const KnowledgeCard = ({ item }) => {
  const { sessions, deleteKnowledgeItem, editItem } = useKnowledgeContext();

  // Encontrar o nome da sessão
  const sessionName = item.session_id 
    ? sessions.find(s => s.id === item.session_id)?.name || 'Sessão desconhecida'
    : 'Sem sessão';

  // Função para confirmar e excluir um item
  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este item da base de conhecimento?')) {
      await deleteKnowledgeItem(item.id);
    }
  };

  // Animação para o card
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    },
    hover: {
      y: -5,
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className={styles.card}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
    >
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <div className={styles.cardActions}>
          <button 
            className={styles.actionButton} 
            aria-label="Editar"
            onClick={() => editItem(item)}
          >
            <FaEdit />
          </button>
          <button 
            className={styles.actionButton} 
            aria-label="Excluir"
            onClick={handleDelete}
          >
            <FaTrash />
          </button>
        </div>
      </div>

      <div className={styles.cardContent}>
        <p className={styles.cardDescription}>{item.description}</p>
      </div>

      <div className={styles.cardFooter}>
        {item.session_id && (
          <div className={styles.sessionBadge}>
            <FaLayerGroup />
            <span>{sessionName}</span>
          </div>
        )}

        {item.ticket_link && (
          <a 
            href={item.ticket_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.ticketLink}
          >
            <FaExternalLinkAlt />
            <span>Ver chamado</span>
          </a>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className={styles.tagContainer}>
            <FaTag className={styles.tagIcon} />
            <div className={styles.tags}>
              {item.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default KnowledgeCard;