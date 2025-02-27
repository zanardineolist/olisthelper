import React from 'react';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from '../../styles/Pagination.module.css';

const Pagination = ({ currentPage, totalPages, onChangePage }) => {
  // Se apenas uma página, não mostrar paginação
  if (totalPages <= 1) return null;

  // Criar array de páginas para exibir
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Se o total de páginas for menor ou igual ao máximo, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Sempre mostrar a primeira página
      pageNumbers.push(1);
      
      // Calcular páginas intermediárias
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Ajustar se necessário
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Sempre mostrar a última página
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  // Variantes de animação para os botões
  const buttonVariants = {
    hover: { scale: 1.1, backgroundColor: 'var(--color-primary-hover)' },
    tap: { scale: 0.95 },
    disabled: { 
      opacity: 0.5, 
      scale: 1, 
      backgroundColor: 'var(--box-color2)',
      cursor: 'not-allowed' 
    }
  };

  // Variantes para animação dos números de página
  const pageNumberVariants = {
    hover: { scale: 1.1, backgroundColor: 'var(--box-color3)' },
    tap: { scale: 0.95 },
    active: { 
      scale: 1.1, 
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-white)',
      boxShadow: '0 2px 8px rgba(10, 78, 228, 0.3)'
    }
  };

  return (
    <nav 
      className={styles.pagination} 
      aria-label="Navegação de página"
      role="navigation"
    >
      <motion.button 
        onClick={() => onChangePage(currentPage - 1)}
        disabled={currentPage === 1}
        className={styles.pageButton}
        aria-label="Página anterior"
        variants={buttonVariants}
        whileHover={currentPage !== 1 ? "hover" : "disabled"}
        whileTap={currentPage !== 1 ? "tap" : "disabled"}
        animate={currentPage === 1 ? "disabled" : ""}
      >
        <FaChevronLeft />
      </motion.button>
      
      <div className={styles.pageNumbers}>
        {getPageNumbers().map((page, index) => 
          page === '...' ? (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
          ) : (
            <motion.button
              key={`page-${page}`}
              onClick={() => onChangePage(page)}
              className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
              aria-label={`Página ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
              variants={pageNumberVariants}
              whileHover={currentPage !== page ? "hover" : ""}
              whileTap={currentPage !== page ? "tap" : ""}
              animate={currentPage === page ? "active" : ""}
            >
              {page}
            </motion.button>
          )
        )}
      </div>
      
      <motion.button 
        onClick={() => onChangePage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={styles.pageButton}
        aria-label="Próxima página"
        variants={buttonVariants}
        whileHover={currentPage !== totalPages ? "hover" : "disabled"}
        whileTap={currentPage !== totalPages ? "tap" : "disabled"}
        animate={currentPage === totalPages ? "disabled" : ""}
      >
        <FaChevronRight />
      </motion.button>
    </nav>
  );
};

export default Pagination;