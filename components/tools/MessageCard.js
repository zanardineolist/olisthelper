import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faCopy, faTrash, faLock, faGlobe, faEdit } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import styles from '../../styles/MessageCard.module.css';

export default function MessageCard({ message, user, onDeleted, onMessageLiked, onEdit }) {
  const [copying, setCopying] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleCopy = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(message.content);
      Swal.fire({
        icon: 'success',
        title: 'Copiado!',
        text: 'Texto copiado para a área de transferência',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível copiar o texto'
      });
    } finally {
      setCopying(false);
    }
  };

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const response = await fetch('/api/messages/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId: message.id }),
      });

      if (!response.ok) throw new Error('Erro ao curtir mensagem');
      
      onMessageLiked();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível curtir a mensagem'
      });
    } finally {
      setLiking(false);
    }
  };

  const handleClick = () => {
    Swal.fire({
      title: message.title,
      html: `<div style="text-align: left; white-space: pre-wrap;">${message.content}</div>`,
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        htmlContainer: 'message-modal-content'
      }
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/messages?id=${message.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Erro ao deletar mensagem');

        onDeleted();
        Swal.fire({
          icon: 'success',
          title: 'Sucesso!',
          text: 'Mensagem excluída com sucesso',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Não foi possível excluir a mensagem'
        });
      }
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{message.title}</h3>
        <div className={styles.visibility}>
          {message.is_private && (
            <FontAwesomeIcon icon={faLock} className={styles.visibilityIcon} title="Privado" />
          )}
          {message.is_shared && (
            <FontAwesomeIcon icon={faGlobe} className={styles.visibilityIcon} title="Compartilhado" />
          )}
        </div>
      </div>

      <div className={styles.content} onClick={handleClick}>
        <p>{message.content.length > 150 
          ? `${message.content.substring(0, 150)}...` 
          : message.content}
        </p>
      </div>

      <div className={styles.tags}>
        {message.tags && message.tags.map((tag, index) => (
          <span key={index} className={styles.tag}>{tag}</span>
        ))}
      </div>

      <div className={styles.metadata}>
        <span className={styles.author}>Por: {message.author_name || 'Anônimo'}</span>
        <span className={styles.date}>
          {new Date(message.created_at).toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div className={styles.actions}>
        <button 
          className={`${styles.actionButton} ${message.liked_by_user ? styles.liked : ''}`}
          onClick={handleLike}
          disabled={liking}
          title="Curtir"
        >
          <FontAwesomeIcon icon={faHeart} />
          <span>{message.likes_count || 0}</span>
        </button>

        <button
          className={styles.actionButton}
          onClick={handleCopy}
          disabled={copying}
          title="Copiar conteúdo"
        >
          <FontAwesomeIcon icon={faCopy} />
        </button>

        {message.user_id === user.id && (
          <>
            <button
              className={styles.actionButton}
              onClick={handleEdit}
              title="Editar"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button
              className={styles.actionButton}
              onClick={handleDelete}
              title="Excluir"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}