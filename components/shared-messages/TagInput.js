import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import styles from '../../styles/SharedMessages.module.css';

const TagInput = ({ id, value, onChange }) => {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Inicializar tags quando o valor externo muda
  useEffect(() => {
    if (value && typeof value === 'string') {
      setTags(value.split(',').map(t => t.trim()).filter(t => t));
    }
  }, [value]);

  // Sincronizar tags com o valor externo
  useEffect(() => {
    const newValue = tags.join(', ');
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [tags, onChange]);

  // Manipuladores de eventos
  const handleKeyDown = (e) => {
    // Adicionar tag quando o usuário pressiona vírgula, espaço ou Enter
    if ((e.key === ',' || e.key === ' ' || e.key === 'Enter') && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } 
    // Remover a última tag quando o usuário pressiona Backspace com o input vazio
    else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setInputValue('');
    }
  };

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const pastedTags = pasteData.split(/[,\s]+/).map(t => t.trim()).filter(t => t);
    
    const newTags = [...tags];
    pastedTags.forEach(tag => {
      if (!newTags.includes(tag)) {
        newTags.push(tag);
      }
    });
    
    setTags(newTags);
  };

  // Animações para os tags
  const tagVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 }
    },
    hover: {
      scale: 1.05,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`${styles.tagInputContainer} ${focused ? styles.tagInputFocused : ''}`}
      onClick={handleContainerClick}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (inputValue.trim()) {
          addTag(inputValue.trim());
        }
      }}
    >
      <div className={styles.tagsList}>
        <AnimatePresence>
          {tags.map((tag, index) => (
            <motion.div
              key={`${tag}-${index}`}
              className={styles.tagItem}
              variants={tagVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              whileHover="hover"
              layout
            >
              <span className={styles.tagText}>{tag}</span>
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className={styles.removeTagButton}
                aria-label={`Remover tag ${tag}`}
              >
                <FaTimes />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? "Digite tags e pressione espaço, vírgula ou Enter" : ""}
          className={styles.tagInput}
          aria-label="Adicionar tags"
        />
      </div>
    </div>
  );
};

export default TagInput;