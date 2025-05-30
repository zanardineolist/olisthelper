import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import styles from '../../styles/ManageRecords.module.css';
import generalStyles from '../../styles/Manager.module.css';
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
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
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
      title: 'Tem certeza?',
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

      await loadRecords();
      
      Swal.fire({
        icon: 'success',
        title: 'Excluído!',
        text: 'O registro foi excluído com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao deletar registro:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecord = async () => {
    try {
      setLoading(true);
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
        title: 'Sucesso!',
        text: 'Registro atualizado com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao salvar registro:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: err.message,
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
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
  };

  const selectedUser = users.find(u => u.email === editedRecord.email);
  const selectedUserOption = selectedUser ? { value: selectedUser.email, label: selectedUser.name } : null;

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
  };

  return (
    <div className={generalStyles.manageContainer}>
      <h2 className={generalStyles.title}>Gerenciar Registros</h2>

      {loading && (
        <div className={generalStyles.loading}>
          <div className="loaderOverlay">
            <div className="loader"></div>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.recordsTable}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Hora</th>
              <th>Nome</th>
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
                <td>{record.category}</td>
                <td className={styles.descriptionCell}>
                  {record.description?.substring(0, 50)}
                  {record.description?.length > 50 && '...'}
                </td>
                <td className={styles.actionsCell}>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEditRecord(record)}
                    title="Editar"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteRecord(record)}
                    title="Excluir"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {records.length === 0 && !loading && (
          <div className={styles.noRecords}>
            <p>Nenhum registro encontrado</p>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        contentLabel="Editar Registro"
      >
        <div className={styles.modalContent}>
          <h3>Editar Registro</h3>
          
          <div className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label>Data:</label>
              <input
                type="date"
                value={editedRecord.date}
                onChange={(e) => setEditedRecord({...editedRecord, date: e.target.value})}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Hora:</label>
              <input
                type="time"
                value={editedRecord.time}
                onChange={(e) => setEditedRecord({...editedRecord, time: e.target.value})}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Usuário:</label>
              <Select
                value={selectedUserOption}
                onChange={(selectedOption) => {
                  const selectedUser = users.find(u => u.email === selectedOption.value);
                  setEditedRecord({
                    ...editedRecord,
                    email: selectedOption.value,
                    name: selectedUser?.name || ''
                  });
                }}
                options={users.map(user => ({ value: user.email, label: user.name }))}
                styles={customSelectStyles}
                placeholder="Selecione um usuário"
                isSearchable
              />
            </div>

            <div className={styles.formGroup}>
              <label>Categoria:</label>
              <Select
                value={categories.find(cat => cat.value === editedRecord.category)}
                onChange={(selectedOption) => setEditedRecord({...editedRecord, category: selectedOption.value})}
                options={categories}
                styles={customSelectStyles}
                placeholder="Selecione uma categoria"
                isSearchable
              />
            </div>

            <div className={styles.formGroup}>
              <label>Descrição:</label>
              <textarea
                value={editedRecord.description}
                onChange={(e) => setEditedRecord({...editedRecord, description: e.target.value})}
                className={styles.textareaField}
                rows="4"
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button 
              onClick={handleSaveRecord}
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button 
              onClick={handleCloseModal}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 