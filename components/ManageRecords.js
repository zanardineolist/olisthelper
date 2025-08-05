import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import styles from '../styles/ManageRecords.module.css';
import generalStyles from '../styles/Manager.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';

export default function ManageRecords({ user }) {
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editedRecord, setEditedRecord] = useState({
    date: '',
    time: '',
    name: '',
    email: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    loadRecords();
    loadCategories();
    loadUsers();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/manage-records?userId=${user.id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao carregar registros');
      }
      const data = await res.json();
      setRecords(data.records);
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao carregar registros. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor ao carregar registros. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Tentar novamente'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/manage-category');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao carregar categorias');
      }
      const data = await res.json();
      setCategories(data.categories.map(cat => ({ value: cat.name, label: cat.name })));
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/get-users');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao carregar usuários');
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    }
  };

  const handleEditRecord = (record) => {
    setEditedRecord(record);
    setEditingRecord(record);
    setIsEditing(true);
    setModalIsOpen(true);
  };

  const handleDeleteRecord = async (record) => {
    const isConfirmed = await Swal.fire({
      title: 'Confirmar exclusão',
      text: 'Deseja realmente excluir este registro? Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: true,
    });

    if (!isConfirmed.isConfirmed) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/manage-records?userId=${user.id}&recordId=${record.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao deletar registro');
      }

      const result = await res.json();

      await loadRecords();
      
      Swal.fire({
        icon: 'success',
        title: 'Registro excluído!',
        text: result.message || 'O registro foi excluído com sucesso.',
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao deletar registro:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao excluir registro. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('Registro não encontrado')) {
          errorMessage = err.message;
        } else if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Entendi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecord = async () => {
    try {
      setLoading(true);
      
      // Validações do frontend
      if (!editedRecord.name || !editedRecord.name.trim()) {
        Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'Nome do solicitante é obrigatório. Por favor, preencha o campo "Nome".',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (!editedRecord.email || !editedRecord.email.trim()) {
        Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'E-mail do solicitante é obrigatório. Por favor, preencha o campo "E-mail".',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      // Validar formato do e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedRecord.email.trim())) {
        Swal.fire({
          icon: 'error',
          title: 'E-mail inválido',
          text: 'Por favor, insira um e-mail válido (exemplo: usuario@empresa.com).',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (!editedRecord.category || !editedRecord.category.trim()) {
        Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'Categoria é obrigatória. Por favor, selecione uma categoria.',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      if (!editedRecord.description || !editedRecord.description.trim()) {
        Swal.fire({
          icon: 'error',
          title: 'Campo obrigatório',
          text: 'Descrição é obrigatória. Por favor, preencha o campo "Descrição".',
          confirmButtonText: 'Entendi'
        });
        return;
      }

      const res = await fetch(`/api/manage-records?userId=${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          record: {
            ...editedRecord,
            id: editingRecord.id
          }
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao salvar registro');
      }

      const result = await res.json();

      await loadRecords();
      setEditedRecord({
        date: '',
        time: '',
        name: '',
        email: '',
        category: '',
        description: '',
      });
      setEditingRecord(null);
      setIsEditing(false);
      setModalIsOpen(false);

      Swal.fire({
        icon: 'success',
        title: 'Registro atualizado!',
        text: result.message || 'Registro atualizado com sucesso.',
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao salvar registro:', err);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao salvar registro. Tente novamente.';
      
      if (err.message) {
        if (err.message.includes('obrigatório')) {
          errorMessage = err.message;
        } else if (err.message.includes('E-mail inválido')) {
          errorMessage = err.message;
        } else if (err.message.includes('Categoria')) {
          errorMessage = err.message;
        } else if (err.message.includes('Registro não encontrado')) {
          errorMessage = err.message;
        } else if (err.message.includes('Erro interno do servidor')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonText: 'Entendi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedRecord((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectUser = (selectedOption) => {
    const selectedUser = users.find(user => user.name === selectedOption.value);
    setEditedRecord((prev) => ({
      ...prev,
      name: selectedOption.value,
      email: selectedUser?.email || '',
    }));
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
    setEditingRecord(null);
    setEditedRecord({
      date: '',
      time: '',
      name: '',
      email: '',
      category: '',
      description: '',
    });
  };

  // Estilos personalizados para o React-Select
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'var(--modals-inputs)',
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
      backgroundColor: 'var(--modals-inputs)',
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
        : 'var(--modals-inputs)',
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

  return (
    <div className={generalStyles.main}>
      <div className={`${generalStyles.cardContainer} ${styles.cardContainer}`}>
        <div className={generalStyles.cardHeader}>
          <h2 className={generalStyles.cardTitle}>Lista de Registros</h2>
        </div>
        <div className={styles.itemsTable}>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.time}</td>
                  <td>{record.name}</td>
                  <td>{record.email}</td>
                  <td>{record.category}</td>
                  <td>{record.description}</td>
                  <td className={generalStyles.actionButtons}>
                    <button onClick={() => handleEditRecord(record)} className={generalStyles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button onClick={() => handleDeleteRecord(record)} className={generalStyles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Editar Registro"
        className={generalStyles.modal}
        overlayClassName={generalStyles.overlay}
        ariaHideApp={false}
      >
        <h2 className={generalStyles.modalTitle}>Editar Registro</h2>
        <div className={generalStyles.formContainer}>
          <input
            type="text"
            name="date"
            value={editedRecord.date}
            placeholder="Data"
            className={generalStyles.inputField}
            onChange={handleInputChange}
            disabled
          />
          <input
            type="text"
            name="time"
            value={editedRecord.time}
            placeholder="Hora"
            className={generalStyles.inputField}
            onChange={handleInputChange}
            disabled
          />
          <Select
            options={users.map(user => ({ value: user.name, label: user.name }))}
            value={{ value: editedRecord.name, label: editedRecord.name }}
            onChange={handleSelectUser}
            placeholder="Nome do Usuário"
            styles={customSelectStyles}
            required
          />
          <input
            type="email"
            name="email"
            value={editedRecord.email}
            placeholder="E-mail"
            className={generalStyles.inputField}
            onChange={handleInputChange}
            disabled
          />
          <Select
            options={categories}
            value={{ value: editedRecord.category, label: editedRecord.category }}
            onChange={(option) => setEditedRecord(prev => ({ ...prev, category: option.value }))}
            placeholder="Categoria"
            styles={customSelectStyles}
            required
          />
          <input
            type="text"
            name="description"
            value={editedRecord.description}
            placeholder="Descrição"
            className={generalStyles.inputField}
            onChange={handleInputChange}
            required
          />
          <button onClick={handleSaveRecord} disabled={loading} className={generalStyles.saveButton}>
            Salvar Registro
          </button>
          <button onClick={handleCloseModal} className={generalStyles.cancelButton}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}