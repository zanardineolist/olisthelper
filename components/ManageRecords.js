import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import styles from '../styles/Manager.module.css';
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
  const [editingRecordIndex, setEditingRecordIndex] = useState(null);
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
      Swal.fire('Erro', err.message, 'error');
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
      Swal.fire('Erro', err.message, 'error');
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
      Swal.fire('Erro', err.message, 'error');
    }
  };

  const handleEditRecord = (record, index) => {
    setEditedRecord(record);
    setIsEditing(true);
    setEditingRecordIndex(index);
    setModalIsOpen(true);
  };

  const handleDeleteRecord = async (index) => {
    const isConfirmed = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Deseja realmente excluir este registro? Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
    });

    if (!isConfirmed.isConfirmed) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/manage-records?userId=${user.id}&index=${index}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao deletar registro');
      }

      await loadRecords();
      Swal.fire('Excluído!', 'O registro foi excluído com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao deletar registro:', err);
      Swal.fire('Erro', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecord = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/manage-records?userId=${user.id}&index=${editingRecordIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record: editedRecord }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao salvar registro');
      }

      await loadRecords();
      setEditedRecord({ date: '', time: '', name: '', email: '', category: '', description: '' });
      setIsEditing(false);
      setModalIsOpen(false);
      Swal.fire('Sucesso!', 'Registro atualizado com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao salvar registro:', err);
      Swal.fire('Erro', err.message, 'error');
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
  };

  return (
    <div className={styles.main}>
      {/* Card de Lista de Registros */}
      <div className={styles.cardContainer}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Lista de Registros</h2>
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
              {records.map((record, index) => (
                <tr key={index}>
                  <td>{record.date}</td>
                  <td>{record.time}</td>
                  <td>{record.name}</td>
                  <td>{record.email}</td>
                  <td>{record.category}</td>
                  <td>{record.description}</td>
                  <td className={styles.actionButtons}>
                    <button onClick={() => handleEditRecord(record, index)} className={styles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button onClick={() => handleDeleteRecord(index)} className={styles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para editar registro */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Editar Registro"
        className={styles.modal}
        overlayClassName={styles.overlay}
        ariaHideApp={false}
      >
        <h2 className={styles.modalTitle}>Editar Registro</h2>
        <div className={styles.formContainer}>
          <input
            type="text"
            name="date"
            value={editedRecord.date}
            placeholder="Data"
            className={styles.inputField}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="time"
            value={editedRecord.time}
            placeholder="Hora"
            className={styles.inputField}
            onChange={handleInputChange}
            required
          />
          <Select
            options={users.map(user => ({ value: user.name, label: user.name }))}
            value={{ value: editedRecord.name, label: editedRecord.name }}
            onChange={handleSelectUser}
            placeholder="Nome do Usuário"
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: '#222',
                borderColor: '#333',
                color: '#fff',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }),
              singleValue: (base) => ({
                ...base,
                color: '#fff',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#333',
              }),
              option: (provided, state) => ({
                ...provided,
                color: state.isSelected ? '#f57c00' : '#fff',
                backgroundColor: state.isFocused ? '#444' : '#333',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }),
            }}
            required
          />
          <input
            type="email"
            name="email"
            value={editedRecord.email}
            placeholder="E-mail"
            className={styles.inputField}
            onChange={handleInputChange}
            disabled
          />
          <Select
            options={categories}
            value={{ value: editedRecord.category, label: editedRecord.category }}
            onChange={(option) => setEditedRecord(prev => ({ ...prev, category: option.value }))}
            placeholder="Categoria"
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: '#222',
                borderColor: '#333',
                color: '#fff',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }),
              singleValue: (base) => ({
                ...base,
                color: '#fff',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#333',
              }),
              option: (provided, state) => ({
                ...provided,
                color: state.isSelected ? '#f57c00' : '#fff',
                backgroundColor: state.isFocused ? '#444' : '#333',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }),
            }}
            required
          />
          <input
            type="text"
            name="description"
            value={editedRecord.description}
            placeholder="Descrição"
            className={styles.inputField}
            onChange={handleInputChange}
            required
          />
          <button onClick={handleSaveRecord} disabled={loading} className={styles.saveButton}>
            Salvar Registro
          </button>
          <button onClick={handleCloseModal} className={styles.cancelButton}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
