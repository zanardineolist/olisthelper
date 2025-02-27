// Novo componente TagInput.js
import React, { useState, useRef } from 'react';
import styles from '../styles/TagInput.module.css';
import { FaTimes } from 'react-icons/fa';

export default function TagInput({ value, onChange }) {
  const [tags, setTags] = useState(value ? value.split(',').map(t => t.trim()).filter(t => t) : []);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if ((e.key === ',' || e.key === ' ' || e.key === 'Enter') && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = (tag) => {
    if (!tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      onChange(newTags.join(', '));
    }
    setInputValue('');
  };

  const removeTag = (index) => {
    const newTags = tags.filter((_, i) => i !== index);
    setTags(newTags);
    onChange(newTags.join(', '));
  };

  return (
    <div className={styles.tagInputContainer} onClick={() => inputRef.current?.focus()}>
      <div className={styles.tagList}>
        {tags.map((tag, index) => (
          <span key={index} className={styles.tag}>
            {tag}
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className={styles.removeTag}
            >
              <FaTimes />
            </button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue.trim());
          }
        }}
        placeholder={tags.length === 0 ? "Digite tags e pressione espaço ou vírgula" : ""}
        className={styles.tagInput}
      />
    </div>
  );
}