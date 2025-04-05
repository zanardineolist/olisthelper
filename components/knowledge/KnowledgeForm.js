// components/knowledge/KnowledgeForm.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaBook, FaLink, FaTag, FaLayerGroup } from 'react-icons/fa';
import { useKnowledgeContext } from './KnowledgeContext';
import TagInput from '../TagInput';
import styles from '../../styles/knowledge/Form.module.css';

const KnowledgeForm = () => {
  const { 
    formData, 
    setFormData, 
    isFormOpen, 
    setIsFormOpen, 
    editingItemId,
    sessions,
    addKnowledgeItem,
    updateKnowledgeItem,
    resetForm
  } = useKnowledgeContext();

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [charCount, setCharCount] = useState({
    title: formData.title.length,
    description: formData.description.length
  });

  // Atualizar contador de caracteres quando formData mudar
  useEffect(() => {
    setCharCount({
      title: formData.title.length,
      description: formData.description.length
    });
  }, [formData.title, formData.description]);

  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Título deve ter no máximo 100 caracteres';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Atualizar estado do formulário
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro ao editar campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Atualizar tags
  const handleTagsChange = (tagsString) => {
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags: tagsArray
    }));
  };

  // Processar salvamento
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    let success = false;

    try {
      if (editingItemId) {
        success = await updateKnowledgeItem(editingItemId, formData);
      } else {
        success = await addKnowledgeItem(formData);
      }

      if (success) {
        handleCancel();
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Fechar formulário e resetar
  const handleCancel = () => {
    setIsFormOpen(false);
    setTimeout(() => {
      resetForm();
    }, 300); // Aguardar a animação de saída
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
      {isFormOpen && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <motion.div 
            className={styles.modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <FaBook className={styles.modalIcon} />
                {editingItemId ? 'Editar Item' : 'Novo Item de Conhecimento'}
              </h2>
              <button 
                className={styles.closeButton} 
                onClick={handleCancel}
                aria-label="Fechar"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.knowledgeForm}>
              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.formLabel}>
                  Título <span className={styles.requiredMark}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`${styles.formControl} ${errors.title ? styles.hasError : ''}`}
                    placeholder="Ex: Problema com faturamento de pedido"
                  />
                  <div className={styles.charCounter}>
                    {charCount.title}/100
                  </div>
                </div>
                {errors.title && <div className={styles.errorMessage}>{errors.title}</div>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.formLabel}>
                  Descrição <span className={styles.requiredMark}>*</span>
                </label>
                <div className={styles.textareaWrapper}>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={`${styles.formTextarea} ${errors.description ? styles.hasError : ''}`}
                    placeholder="Descreva o problema e a solução encontrada"
                    rows={5}
                  />
                  <div className={styles.charCounter}>
                    {charCount.description}/1000
                  </div>
                </div>
                {errors.description && <div className={styles.errorMessage}>{errors.description}</div>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="sessionId" className={styles.formLabel}>
                  <FaLayerGroup className={styles.labelIcon} />
                  Sessão
                </label>
                <select
                  id="sessionId"
                  name="sessionId"
                  value={formData.sessionId || ''}
                  onChange={handleChange}
                  className={styles.formControl}
                >
                  <option value="">Sem sessão</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="ticketLink" className={styles.formLabel}>
                  <FaLink className={styles.labelIcon} />
                  Link do Chamado
                </label>
                <input
                  type="url"
                  id="ticketLink"
                  name="ticketLink"
                  value={formData.ticketLink || ''}
                  onChange={handleChange}
                  className={styles.formControl}
                  placeholder="https://exemplo.com/chamado/123"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FaTag className={styles.labelIcon} />
                  Tags
                </label>
                <TagInput 
                  value={formData.tags ? formData.tags.join(', ') : ''} 
                  onChange={handleTagsChange} 
                />
                <div className={styles.helpText}>
                  Adicione tags para facilitar a busca (pressione vírgula ou espaço para adicionar)
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : (
                    <>
                      <FaCheck /> {editingItemId ? 'Atualizar' : 'Salvar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default KnowledgeForm;