import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaGlobe, FaLock, FaTag, FaInfo } from 'react-icons/fa';
import TagInput from './TagInput';
import styles from '../../styles/shared-messages/index.module.css';

const MessageForm = ({ formData: initialFormData, setFormData: setParentFormData, onSave, onCancel, isEditing }) => {
  // Estado local do formulário para melhor controle
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [charCount, setCharCount] = useState({
    title: initialFormData.title.length,
    content: initialFormData.content.length
  });

  // Atualizar contador de caracteres quando formData mudar
  useEffect(() => {
    setCharCount({
      title: formData.title.length,
      content: formData.content.length
    });
  }, [formData.title, formData.content]);

  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Título deve ter no máximo 100 caracteres';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Conteúdo é obrigatório';
    } else if (formData.content.length > 5000) {
      newErrors.content = 'Conteúdo deve ter no máximo 5000 caracteres';
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
          
          <form onSubmit={handleSubmit} className={styles.messageForm}>
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.formLabel}>
                Título
                <span className={styles.requiredMark} aria-hidden="true">*</span>
              </label>
              <div className={styles.inputWrapper}>
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
                  maxLength="100"
                />
                <span className={styles.charCount} aria-live="polite">
                  {charCount.title}/100
                </span>
              </div>
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
              <div className={styles.textareaWrapper}>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  className={`${styles.formTextarea} ${errors.content ? styles.hasError : ''}`}
                  placeholder="Conteúdo da mensagem"
                  rows="8"
                  aria-required="true"
                  aria-invalid={errors.content ? "true" : "false"}
                  aria-describedby={errors.content ? "content-error" : undefined}
                  maxLength="5000"
                />
                <span className={styles.charCount} aria-live="polite">
                  {charCount.content}/5000
                </span>
              </div>
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
              <div className={styles.formHint}>
                <FaInfo className={styles.hintIcon} />
                <span>Adicione palavras-chave relevantes para facilitar a busca</span>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <div className={styles.visibilityToggle}>
                <span className={styles.visibilityLabel}>Visibilidade:</span>
                
                <label className={`${styles.visibilityOption} ${formData.isPublic ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={() => handleChange({ target: { name: 'isPublic', value: true }})}
                    className={styles.visibilityRadio}
                  />
                  <FaGlobe className={styles.visibilityIcon} />
                  <span>Pública</span>
                </label>
                
                <label className={`${styles.visibilityOption} ${!formData.isPublic ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="isPublic"
                    checked={!formData.isPublic}
                    onChange={() => handleChange({ target: { name: 'isPublic', value: false }})}
                    className={styles.visibilityRadio}
                  />
                  <FaLock className={styles.visibilityIcon} />
                  <span>Privada</span>
                </label>
              </div>
              
              <div className={styles.visibilityHint}>
                {formData.isPublic ? (
                  <span>Mensagens públicas podem ser vistas por todos os usuários</span>
                ) : (
                  <span>Mensagens privadas são visíveis apenas para você</span>
                )}
              </div>
            </div>
            
            <div className={styles.formActions}>
              <motion.button
                type="button"
                onClick={onCancel}
                className={styles.cancelButton}
                disabled={isSaving}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaTimes className={styles.buttonIcon} />
                <span>Cancelar</span>
              </motion.button>
              
              <motion.button
                type="submit"
                className={styles.saveButton}
                disabled={isSaving}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaCheck className={styles.buttonIcon} />
                <span>{isSaving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageForm;