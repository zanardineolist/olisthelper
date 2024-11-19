import { useState } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import styles from '../styles/Remote.module.css';

const temaOptions = [
  { value: 'Certificado A1', label: 'Certificado A1' },
  { value: 'Certificado A3', label: 'Certificado A3' },
  { value: 'Etiqueta de produto', label: 'Etiqueta de produto' },
  { value: 'SAT', label: 'SAT' },
];

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--labels-bg)',
    borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
    color: 'var(--text-color)',
    borderRadius: '5px',
    padding: '5px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--color-primary)',
    },
    outline: 'none',
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
    caretColor: 'var(--text-color)',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--labels-bg)',
    maxHeight: '220px',
    overflowY: 'auto',
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    maxHeight: '220px',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'var(--scroll-bg)',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'var(--scroll)',
      borderRadius: '10px',
      border: '2px solid var(--scroll-bg)',
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused
      ? 'var(--color-trodd)'
      : state.isSelected
      ? 'var(--color-primary)'
      : 'var(--box-color)',
    color: 'var(--text-color)',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'var(--color-trodd)',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--text-color2)',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: 'var(--text-color)',
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: 'var(--color-border)',
  }),
};

export default function RegisterAccess({ user }) {
  const [formData, setFormData] = useState({
    chamado: '',
    tema: null,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (selectedOption) => {
    setFormData((prev) => ({
      ...prev,
      tema: selectedOption,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validação dos campos obrigatórios: 'tema' e 'chamado'
    if (!formData.tema || !formData.chamado) {
      Swal.fire('Erro', 'Os campos Número do Chamado e Tema são obrigatórios.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/remote-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: new Date().toLocaleDateString('pt-BR'),
          time: new Date().toLocaleTimeString('pt-BR'),
          name: user.name,
          email: user.email,
          chamado: formData.chamado,
          tema: formData.tema.label,
          description: formData.description,
        }),
      });

      if (response.ok) {
        Swal.fire('Sucesso', 'Acesso registrado com sucesso.', 'success');
        setFormData({ chamado: '', tema: null, description: '' });
      } else {
        const errorData = await response.json();
        Swal.fire('Erro', `Falha ao registrar acesso: ${errorData.error}`, 'error');
      }
    } catch (error) {
      console.error('Erro ao registrar acesso:', error);
      Swal.fire('Erro', 'Falha ao registrar acesso. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Registrar Acesso Remoto</h2>
      <form onSubmit={handleSubmit}>
        {/* Campo: Número do Chamado */}
        <div className={styles.formGroup}>
          <label htmlFor="chamado">Número do Chamado</label>
          <input
            type="text"
            id="chamado"
            name="chamado"
            value={formData.chamado}
            onChange={handleInputChange}
            onKeyDown={(event) => {
              if (
                !/[0-9]/.test(event.key) &&
                event.key !== 'Backspace' &&
                event.key !== 'Delete' &&
                event.key !== 'ArrowLeft' &&
                event.key !== 'ArrowRight'
              ) {
                event.preventDefault();
              }
            }}
            required
            className={styles.inputField}
            autoComplete="off"
          />
        </div>
  
        {/* Campo: Tema */}
        <div className={styles.formGroup}>
          <label htmlFor="tema">Tema</label>
          <Select
            id="tema"
            name="tema"
            options={temaOptions}
            value={formData.tema}
            onChange={handleSelectChange}
            isClearable
            placeholder="Indique o tema do acesso"
            styles={customSelectStyles}
            classNamePrefix="react-select"
            required
          />
        </div>
  
        {/* Campo: Descrição */}
        <div className={styles.formGroup}>
          <label htmlFor="description">Descrição</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Adicione aqui informações do acesso se necessário..."
            rows="4"
            className={styles.formTextarea}
          />
        </div>
  
        {/* Botão de Envio */}
        <div className={styles.formButtonContainer}>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );  
}
