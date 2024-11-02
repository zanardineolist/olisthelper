import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import styles from '../styles/ManageCategories.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/manage-category');
      if (!res.ok) throw new Error('Erro ao carregar categorias');
      const data = await res.json();
      const sortedCategories = data.categories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCategories);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar categorias.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditCategory = (category) => {
    setNewCategory({ name: category.name });
    setIsEditing(true);
    setEditingCategoryIndex(category.index);
    setModalIsOpen(true);
  };

  const handleDeleteCategory = async (categoryIndex) => {
    const isConfirmed = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Deseja realmente excluir esta categoria? Esta ação não pode ser desfeita.',
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
      const res = await fetch(`/api/manage-category?index=${categoryIndex}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar categoria');

      await loadCategories();

      Swal.fire({
        icon: 'success',
        title: 'Excluído!',
        text: 'A categoria foi excluída com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao deletar categoria.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/manage-category', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.name, index: editingCategoryIndex }),
      });
      if (!res.ok) throw new Error('Erro ao salvar categoria');

      await loadCategories();

      setNewCategory({ name: '' });
      setIsEditing(false);
      setEditingCategoryIndex(null);
      setModalIsOpen(false);

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: isEditing ? 'Categoria atualizada com sucesso.' : 'Categoria adicionada com sucesso.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao salvar categoria.',
        timer: 2000,
        showConfirmButton: false,
        allowOutsideClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setNewCategory({ name: '' });
    setIsEditing(false);
    setEditingCategoryIndex(null);
    setModalIsOpen(true);
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
  };

  return (
    <div className={styles.main}>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Adicionar/Editar Categoria"
        className={styles.modal}
        overlayClassName={styles.overlay}
        ariaHideApp={false}
      >
        <h2 className={styles.modalTitle}>{isEditing ? 'Editar Categoria' : 'Adicionar Categoria'}</h2>
        <div className={styles.formContainer}>
          <input
            type="text"
            name="name"
            value={newCategory.name}
            placeholder="Nome da Categoria"
            className={styles.inputField}
            onChange={handleInputChange}
            required
          />
          <button onClick={handleSaveCategory} disabled={loading} className={styles.saveButton}>
            {isEditing ? 'Atualizar Categoria' : 'Adicionar Categoria'}
          </button>
          <button onClick={handleCloseModal} className={styles.cancelButton}>
            Cancelar
          </button>
        </div>
      </Modal>

      <div className={styles.cardContainer}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Lista de Categorias</h2>
          <button onClick={handleOpenModal} className={styles.addButton}>
            <FontAwesomeIcon icon={faPlus} /> Adicionar Nova Categoria
          </button>
        </div>
        <div className={styles.itemsTable}>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.index}>
                  <td>{category.name}</td>
                  <td className={styles.actionButtons}>
                    <button onClick={() => handleEditCategory(category)} className={styles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button onClick={() => handleDeleteCategory(category.index)} className={styles.actionButtonIcon}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
