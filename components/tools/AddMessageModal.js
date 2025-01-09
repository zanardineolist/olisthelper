import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Swal from 'sweetalert2';
import styles from '../../styles/AddMessageModal.module.css';

export default function AddMessageModal({ 
  isOpen, 
  onClose, 
  onMessageAdded, 
  user, 
  availableTags,
  editingMessage = null 
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [],
    is_private: false,
    is_shared: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingMessage) {
      setFormData({
        title: editingMessage.title,
        content: editingMessage.content,
        tags: editingMessage.tags.map(tag => ({ value: tag, label: tag })),
        is_private: editingMessage.is_private,
        is_shared: editingMessage.is_shared
      });
    }
  }, [editingMessage]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTagChange = async (selectedOptions) => {
    const selectedTags = selectedOptions || [];
    
    // Verificar se há novas tags para criar
    const newTags = selectedTags.filter(tag => tag.__isNew__);
    const existingTags = selectedTags.filter(tag => !tag.__isNew__);

    // Criar novas tags se necessário
    for (const newTag of newTags) {
      try {
        const response = await fetch('/api/messages/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newTag.value }),
        });

        if (!response.ok) throw new Error('Erro ao criar tag');
        
        const tag = await response.json();
        existingTags.push({
          value: tag.id,
          label: tag.name
        });
      } catch (error) {
        console.error('Error creating tag:', error);
      }
    }

    setFormData(prev => ({
      ...prev,
      tags: existingTags
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Swal.fire('Erro', 'O título é obrigatório', 'error');
      return false;
    }
    if (!formData.content.trim()) {
      Swal.fire('Erro', 'O conteúdo é obrigatório', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validateForm()) return;

    setSubmitting(true);
    try {
      const endpoint = editingMessage 
        ? `/api/messages/${editingMessage.id}`
        : '/api/messages';
      
      const method = editingMessage ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          tags: formData.tags.map(tag => tag.value),
          is_private: formData.is_private,
          is_shared: formData.is_shared
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar mensagem');

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: `Mensagem ${editingMessage ? 'atualizada' : 'salva'} com sucesso`,
        timer: 1500,
        showConfirmButton: false
      });

      onMessageAdded();
      handleClose();
    } catch (error) {
      console.error('Error saving message:', error);
      Swal.fire('Erro', 'Não foi possível salvar a mensagem', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      content: '',
      tags: [],
      is_private: false,
      is_shared: true
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      contentLabel={editingMessage ? "Editar Mensagem" : "Adicionar Mensagem"}
      className={styles.modal}
      overlayClassName={styles.overlay}
    >
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>
          {editingMessage ? 'Editar Mensagem' : 'Nova Mensagem'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Título</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.input}
              required
              maxLength={100}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="content">Conteúdo</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              className={styles.textarea}
              rows="6"
              required
              maxLength={2000}
            />
            <span className={styles.charCount}>
              {formData.content.length}/2000
            </span>
          </div>

          <div className={styles.formGroup}>
            <label>Tags</label>
            <CreatableSelect
              isMulti
              options={availableTags}
              value={formData.tags}
              onChange={handleTagChange}
              placeholder="Selecione ou crie tags..."
              className={styles.tagSelect}
              classNamePrefix="select"
            />
          </div>

          <div className={styles.checkboxGroup}>
            <label>
              <input
                type="checkbox"
                name="is_private"
                checked={formData.is_private}
                onChange={handleInputChange}
              />
              Privado (apenas você pode ver)
            </label>
            <label>
              <input
                type="checkbox"
                name="is_shared"
                checked={formData.is_shared}
                onChange={handleInputChange}
              />
              Compartilhado (todos podem ver)
            </label>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : (editingMessage ? 'Atualizar' : 'Salvar')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}