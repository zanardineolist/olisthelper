import { useState } from 'react';
import Modal from 'react-modal';
import Select from 'react-select';
import { saveMessage, createTag } from '../../utils/supabase';
import Swal from 'sweetalert2';
import styles from '../../styles/AddMessageModal.module.css';

export default function AddMessageModal({ isOpen, onClose, onMessageAdded, user, availableTags }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [],
    is_private: false,
    is_shared: true
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTagChange = (selectedOptions) => {
    setFormData(prev => ({
      ...prev,
      tags: selectedOptions || []
    }));
  };

  const handleCreateTag = async (inputValue) => {
    try {
      const newTag = await createTag(inputValue);
      if (newTag) {
        const newOption = { value: newTag.id, label: newTag.name };
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newOption]
        }));
        return newOption;
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      Swal.fire('Erro', 'Não foi possível criar a tag', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      Swal.fire('Erro', 'Por favor, preencha todos os campos obrigatórios', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const messageData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        user_id: user.id,
        is_private: formData.is_private,
        is_shared: formData.is_shared,
        tags: formData.tags.map(tag => tag.value)
      };

      const savedMessage = await saveMessage(messageData);
      if (savedMessage) {
        Swal.fire({
          icon: 'success',
          title: 'Sucesso!',
          text: 'Mensagem salva com sucesso',
          timer: 1500,
          showConfirmButton: false
        });
        onMessageAdded();
        handleClose();
      }
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
      contentLabel="Adicionar Mensagem"
      className={styles.modal}
      overlayClassName={styles.overlay}
    >
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Nova Mensagem</h2>
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
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tags</label>
            <Select
              isMulti
              options={availableTags}
              value={formData.tags}
              onChange={handleTagChange}
              onCreateOption={handleCreateTag}
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
              {submitting ? 'Salvando...' : 'Salvar'}
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