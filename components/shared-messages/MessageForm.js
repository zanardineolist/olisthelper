import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import TagInput from './TagInput';
import styles from '../../styles/SharedMessages.module.css';

const MessageForm = ({ formData: initialFormData, setFormData: setParentFormData, onSave, onCancel, isEditing }) => {
  // Estado local do formulário para melhor controle
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Conteúdo é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Atualizar estado local e propagar para o pai
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      setParentFormData(updated);
      return updated;
    });
    
    // Limpar erro ao editar campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Processar salvamento
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    const success = await onSave(formData);
    setIsSaving(false);
    
    if (success) {
      onCancel();
    }
  };

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

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.modalOverlay}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={overlayVariants}
        onClick={onCancel}
      >
        <motion.div 
          className={styles.modalContent}
          variants={modalVariants}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-labelledby="message-form-title"
          aria-modal="true"
        >
          <div className={styles.modalHeader}>
            <h2 id="message-form-title" className={styles.modalTitle}>
              {isEditing ? 'Editar Mensagem' : 'Nova Mensagem'}
            </h2>
            <button 
              className={styles.closeButton} 
              onClick={onCancel}
              aria-label="Fechar"
            >
              <FaTimes />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.formLabel}>
                Título
                <span className={styles.requiredMark} aria-hidden="true">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className={`${styles.formControl} ${errors.title ? styles.hasError : ''}`}
                placeholder="Título da mensagem"
                aria-required="true"
                aria-invalid={errors.title ? "true" : "false"}
                aria-describedby={errors.title ? "title-error" : undefined}
              />
              {errors.title && (
                <div id="title-error" className={styles.errorMessage} role="alert">
                  {errors.title}
                </div>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="content" className={styles.formLabel}>
                Conteúdo
                <span className={styles.requiredMark} aria-hidden="true">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                className={`${styles.formTextarea} ${errors.content ? styles.hasError : ''}`}
                placeholder="Conteúdo da mensagem"
                rows="6"
                aria-required="true"
                aria-invalid={errors.content ? "true" : "false"}
                aria-describedby={errors.content ? "content-error" : undefined}
              />
              {errors.content && (
                <div id="content-error" className={styles.errorMessage} role="alert">
                  {errors.content}
                </div>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="tags" className={styles.formLabel}>
                Tags (separadas por vírgula)
              </label>
              <TagInput
                id="tags"
                value={formData.tags}
                onChange={(value) => handleChange({ target: { name: 'tags', value }})}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxLabel}>
                  Compartilhar com outros usuários
                </span>
              </label>
            </div>
            
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={onCancel}
                className={styles.cancelButton}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageForm;