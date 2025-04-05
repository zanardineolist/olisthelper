// components/knowledge/SessionForm.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaLayerGroup } from 'react-icons/fa';
import { useKnowledgeContext } from './KnowledgeContext';
import styles from '../../styles/knowledge/Form.module.css';

const SessionForm = () => {
  const { 
    sessionFormData, 
    setSessionFormData, 
    isSessionFormOpen, 
    setIsSessionFormOpen, 
    editingSessionId,
    addKnowledgeSession,
    updateKnowledgeSession,
    resetSessionForm
  } = useKnowledgeContext();

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!sessionFormData.name.trim()) {
      newErrors.name = 'Nome da sessão é obrigatório';
    } else if (sessionFormData.name.length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Atualizar estado do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setSessionFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
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
    let success = false;

    try {
      if (editingSessionId) {
        success = await updateKnowledgeSession(editingSessionId, sessionFormData);
      } else {
        success = await addKnowledgeSession(sessionFormData);
      }

      if (success) {
        handleCancel();
      }
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Fechar formulário e resetar
  const handleCancel = () => {
    setIsSessionFormOpen(false);
    setTimeout(() => {
      resetSessionForm();
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
      {isSessionFormOpen && (
        <>
          <motion.div 
            className={styles.modalOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            onClick={handleCancel}
          />
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
                <FaLayerGroup className={styles.modalIcon} />
                {editingSessionId ? 'Editar Sessão' : 'Nova Sessão'}
              </h2>
              <button 
                className={styles.closeButton} 
                onClick={handleCancel}
                aria-label="Fechar"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.sessionForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.formLabel}>
                  Nome da Sessão <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={sessionFormData.name}
                  onChange={handleChange}
                  className={`${styles.formControl} ${errors.name ? styles.hasError : ''}`}
                  placeholder="Ex: Problemas de Faturamento"
                />
                {errors.name && <div className={styles.errorMessage}>{errors.name}</div>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.formLabel}>
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={sessionFormData.description}
                  onChange={handleChange}
                  className={styles.formTextarea}
                  placeholder="Descreva o propósito desta sessão"
                  rows={3}
                />
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
                      <FaCheck /> {editingSessionId ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SessionForm;