import React, { useContext } from 'react';
import { FaHeart, FaRegHeart, FaCopy, FaEdit, FaTrash, FaMagic } from 'react-icons/fa';
import { motion } from 'framer-motion';
import MessageContext from './MessageContext';
import styles from '../../styles/MessageCard.module.css';

const MessageActions = ({ message }) => {
  const { 
    user, 
    handleToggleFavorite, 
    handleCopyMessage, 
    handleEditMessage, 
    handleDeleteMessage, 
    handleGeminiSuggestion 
  } = useContext(MessageContext);

  // Verificar se o usuário atual é o autor da mensagem
  const isAuthor = message.user_id === user.id;

  // Animação para o botão quando favoritado
  const heartVariants = {
    favorited: {
      scale: [1, 1.2, 1],
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className={styles.actions} aria-label="Ações para esta mensagem">
      {/* Botão de Favoritar */}
      <button
        onClick={() => handleToggleFavorite(message.id)}
        className={styles.actionButton}
        aria-label={message.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        title={message.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {message.isFavorite ? (
          <motion.div
            animate="favorited"
            variants={heartVariants}
          >
            <FaHeart className={`${styles.actionIcon} ${styles.liked}`} />
          </motion.div>
        ) : (
          <FaRegHeart className={styles.actionIcon} />
        )}
      </button>

      {/* Botão de Copiar */}
      <button
        onClick={() => handleCopyMessage(message.content, message.id)}
        className={styles.actionButton}
        aria-label="Copiar conteúdo"
        title="Copiar conteúdo"
      >
        <FaCopy className={styles.actionIcon} />
      </button>

      {/* Ações exclusivas do autor */}
      {isAuthor && (
        <>
          {/* Botão de Editar */}
          <button
            onClick={() => handleEditMessage(message)}
            className={styles.actionButton}
            aria-label="Editar mensagem"
            title="Editar mensagem"
          >
            <FaEdit className={styles.actionIcon} />
          </button>

          {/* Botão de Excluir */}
          <button
            onClick={() => handleDeleteMessage(message.id)}
            className={styles.actionButton}
            aria-label="Excluir mensagem"
            title="Excluir mensagem"
          >
            <FaTrash className={styles.actionIcon} />
          </button>

          {/* Botão de Melhorar com IA */}
          <button
            onClick={() => handleGeminiSuggestion(message.id, message.content)}
            className={`${styles.actionButton} ${styles.geminiButton}`}
            aria-label="Melhorar com IA"
            title="Melhorar com IA"
          >
            <FaMagic className={styles.actionIcon} />
          </button>
        </>
      )}
    </div>
  );
};

export default MessageActions;