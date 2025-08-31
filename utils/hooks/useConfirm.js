import { useState, useCallback } from 'react';

const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'default',
    onConfirm: null
  });

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirmar ação',
        message: options.message || 'Tem certeza que deseja continuar?',
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        type: options.type || 'default',
        onConfirm: () => resolve(true)
      });
    });
  }, []);

  const confirmDelete = useCallback((itemName = 'este item') => {
    return confirm({
      title: 'Confirmar exclusão',
      message: `Tem certeza que deseja excluir ${itemName}? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });
  }, [confirm]);

  const confirmClear = useCallback(() => {
    return confirm({
      title: 'Limpar registros',
      message: 'Tem certeza que deseja limpar todos os registros? Esta ação não pode ser desfeita.',
      confirmText: 'Limpar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
  }, [confirm]);

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
  }, [confirmState.onConfirm]);

  return {
    confirmState,
    confirm,
    confirmDelete,
    confirmClear,
    closeConfirm,
    handleConfirm
  };
};

export default useConfirm;