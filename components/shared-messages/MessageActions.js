import React from 'react';
import { motion } from 'framer-motion';
import { FaHeart, FaRegHeart, FaCopy, FaEdit, FaTrash, FaMagic } from 'react-icons/fa';
import { useMessageContext } from './MessageContext';
import styles from '../../styles/shared-messages/index.module.css';

const MessageActions = ({ message }) => {
  const { 
    user,
    handleToggleFavorite, 
    handleCopyMessage, 
    handleEditMessage, 
    handleDeleteMessage, 
    handleGeminiSuggestion 
  } = useMessageContext();

  // Verificar se o usuário atual é o autor da mensagem
  const isAuthor = message.user_id === user.id;

  // Configurações de animação para os botões
  const buttonVariants = {
    hover: {
      scale: 1.15,
      transition: { duration: 0.2 }
    },
    tap: {
      scale: 0.9,
      transition: { duration: 0.1 }
    }
  };

  // Animação específica para o botão de favorito
  const favoriteVariants = {
    ...buttonVariants,
    favorite: {
      scale: [1, 1.5, 1],
      transition: { 
        duration: 0.5,
        times: [0, 0.3, 1]
      }
    }
  };

  return (
    <div className={styles.actionButtons} role="toolbar" aria-label="Ações para esta mensagem">
      {/* Botão de Favoritar */}
      <motion.button
        onClick={() => handleToggleFavorite(message.id)}
        className={`${styles.actionButton} ${message.isFavorite ? styles.favoriteActive : ''}`}
        whileHover="hover"
        whileTap="tap"
        variants={favoriteVariants}
        animate={message.isFavorite ? "favorite" : ""}
        aria-label={message.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        title={message.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {message.isFavorite ? (
          <FaHeart />
        ) : (
          <FaRegHeart />
        )}
      </motion.button>

      {/* Botão de Copiar */}
      <motion.button
        onClick={() => handleCopyMessage(message.content, message.id)}
        className={styles.actionButton}
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        aria-label="Copiar conteúdo"
        title="Copiar conteúdo"
      >
        <FaCopy />
      </motion.button>

      {/* Ações exclusivas do autor */}
      {isAuthor && (
        <>
          {/* Botão de Editar */}
          <motion.button
            onClick={() => handleEditMessage(message)}
            className={styles.actionButton}
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            aria-label="Editar mensagem"
            title="Editar mensagem"
          >
            <FaEdit />
          </motion.button>

          {/* Botão de Excluir */}
          <motion.button
            onClick={() => handleDeleteMessage(message.id)}
            className={`${styles.actionButton} ${styles.deleteButton}`}
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            aria-label="Excluir mensagem"
            title="Excluir mensagem"
          >
            <FaTrash />
          </motion.button>

          {/* Botão de Melhorar com IA */}
          <motion.button
            onClick={() => handleGeminiSuggestion(message.id, message.content)}
            className={`${styles.actionButton} ${styles.geminiButton}`}
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            aria-label="Melhorar com IA"
            title="Melhorar com IA"
          >
            <FaMagic />
          </motion.button>
        </>
      )}
    </div>
  );
};

export default MessageActions;