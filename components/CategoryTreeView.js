import { useState, useEffect } from 'react';
import { FaChevronRight, FaChevronDown, FaFolder, FaFolderOpen, FaExclamationTriangle, FaExpand, FaCompress } from 'react-icons/fa';
import styles from '../styles/ValidadorML.module.css';

// Utilitário para buscar categorias do ML
async function fetchCategory(id) {
  const res = await fetch(`/api/mercadolivre/tree?id=${id}`);
  if (!res.ok) throw new Error('Erro ao buscar categoria');
  return res.json();
}

async function fetchRootCategories() {
  const res = await fetch('/api/mercadolivre/tree');
  if (!res.ok) throw new Error('Erro ao buscar categorias raiz');
  return res.json();
}

// Um nó pode ser expandido se não for folha (ou seja, se não for do último nível)
function canExpand(node, childrenMap) {
  // Se já carregou filhos, verifica se há filhos
  if (childrenMap[node.id]) {
    return childrenMap[node.id].length > 0;
  }
  // Se veio com children_categories, assume que pode expandir
  if (Array.isArray(node.children_categories)) {
    return node.children_categories.length > 0;
  }
  // Se não sabemos, assume que pode expandir (só não mostra seta se for folha de verdade)
  return true;
}

function CategoryNode({ node, expanded, onToggle, onSelect, selectedId, level = 0, loading, childrenMap }) {
  const isSelected = selectedId === node.id;
  const showArrow = canExpand(node, childrenMap);
  return (
    <div className={styles.treeNode} style={{ marginLeft: `${level * 20}px` }}>
      <div className={`${styles.treeNodeRow} ${isSelected ? styles.treeNodeSelected : ''}`}>
        {showArrow ? (
          <button 
            className={styles.treeToggleBtn} 
            onClick={() => onToggle(node.id)}
            title={expanded ? 'Recolher' : 'Expandir'}
            disabled={loading}
          >
            {expanded ? <FaChevronDown /> : <FaChevronRight />}
          </button>
        ) : (
          <span className={styles.treeToggleBtn} style={{ opacity: 0.3 }}>
            <FaChevronRight />
          </span>
        )}
        <button 
          className={styles.treeNodeLabel} 
          onClick={() => onSelect(node)}
          title={`${node.name} (${node.id})`}
        >
          {expanded ? <FaFolderOpen /> : <FaFolder />} 
          <span className={styles.nodeName}>{node.name}</span>
          <span className={styles.nodeId}>({node.id})</span>
        </button>
      </div>
    </div>
  );
}

export default function CategoryTreeView({ rootCategoryId, onSelect, selectedId }) {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [childrenMap, setChildrenMap] = useState({});
  const [loadingNode, setLoadingNode] = useState(null); // Para loading individual

  // Carrega categorias raiz ou a partir de rootCategoryId
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        if (rootCategoryId) {
          const cat = await fetchCategory(rootCategoryId);
          setTree([cat]);
          setExpanded(prev => ({ ...prev, [rootCategoryId]: true }));
          // Carregar filhos do rootCategoryId no childrenMap
          if (cat.children_categories && cat.children_categories.length > 0) {
            setChildrenMap(prev => ({ ...prev, [cat.id]: cat.children_categories.map(child => ({ id: child.id, name: child.name || '', children_categories: undefined })) }));
          }
        } else {
          const categories = await fetchRootCategories();
          setTree(categories);
        }
      } catch (err) {
        setError('Erro ao carregar categorias. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [rootCategoryId]);

  // Sempre buscar detalhes completos ao expandir um nó
  const handleToggle = async (id) => {
    const isExpanding = !expanded[id];
    setExpanded(exp => ({ ...exp, [id]: isExpanding }));
    if (isExpanding && !childrenMap[id]) {
      setLoadingNode(id);
      try {
        const cat = await fetchCategory(id);
        // Preenche os filhos com id e name (e mantém children_categories indefinido para forçar busca sob demanda)
        setChildrenMap(map => ({ ...map, [id]: (cat.children_categories || []).map(child => ({ id: child.id, name: child.name || '', children_categories: undefined })) }));
      } catch (err) {
        setError('Erro ao carregar subcategorias.');
        setExpanded(exp => ({ ...exp, [id]: false }));
      } finally {
        setLoadingNode(null);
      }
    }
  };

  // Expandir todas as categorias (mantém igual, mas busca detalhes completos)
  const expandAll = async () => {
    setLoading(true);
    const newExpanded = { ...expanded };
    const newChildrenMap = { ...childrenMap };
    try {
      const expandCategory = async (node) => {
        newExpanded[node.id] = true;
        if (!newChildrenMap[node.id]) {
          try {
            const cat = await fetchCategory(node.id);
            newChildrenMap[node.id] = (cat.children_categories || []).map(child => ({ id: child.id, name: child.name || '', children_categories: undefined }));
          } catch (err) {
            newChildrenMap[node.id] = [];
          }
        }
        const childrenToExpand = newChildrenMap[node.id].slice(0, 10);
        for (const child of childrenToExpand) {
          await expandCategory(child);
        }
      };
      const categoriesToExpand = tree.slice(0, 5);
      for (const node of categoriesToExpand) {
        await expandCategory(node);
      }
      setExpanded(newExpanded);
      setChildrenMap(newChildrenMap);
    } catch (err) {
      setError('Erro ao expandir categorias. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Recolher todas as categorias
  const collapseAll = () => {
    setExpanded({});
  };

  // Renderização recursiva da árvore
  const renderNode = (node, level = 0) => {
    const isExpanded = expanded[node.id];
    const children = childrenMap[node.id] || [];
    return (
      <div key={node.id} className={styles.treeNodeContainer}>
        <CategoryNode
          node={node}
          expanded={isExpanded}
          onToggle={handleToggle}
          onSelect={onSelect}
          selectedId={selectedId}
          level={level}
          loading={loadingNode === node.id}
          childrenMap={childrenMap}
        />
        {isExpanded && (
          <div className={styles.treeChildren}>
            {loadingNode === node.id ? (
              <div className={styles.treeLoading} style={{ padding: '0.5rem', fontSize: 12 }}>Carregando...</div>
            ) : (
              children.map(child => renderNode(child, level + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  // Renderizar árvore completa
  const renderTree = () => {
    if (!tree.length) return null;
    return (
      <div className={styles.treeContainer}>
        {tree.map(node => renderNode(node))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.treeLoading}>
        <div className={styles.loadingSpinner}></div>
        Carregando categorias...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.treeError}>
        <FaExclamationTriangle />
        {error}
        <button 
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!tree.length) {
    return (
      <div className={styles.treeEmpty}>
        <FaFolder style={{ opacity: 0.5 }} />
        Nenhuma categoria encontrada.
      </div>
    );
  }

  return (
    <div className={styles.treeWrapper}>
      <div className={styles.treeHeader}>
        <h4 className={styles.treeTitle}>
          <FaFolder /> Árvore de Categorias
        </h4>
        <div className={styles.treeStats}>
          <span className={styles.treeCount}>
            {tree.length} categoria{tree.length !== 1 ? 's' : ''} raiz
          </span>
          <div className={styles.treeActions}>
            <button 
              className={styles.treeActionBtn}
              onClick={expandAll}
              title="Expandir todas as categorias"
            >
              <FaExpand /> Expandir Tudo
            </button>
            <button 
              className={styles.treeActionBtn}
              onClick={collapseAll}
              title="Recolher todas as categorias"
            >
              <FaCompress /> Recolher Tudo
            </button>
          </div>
        </div>
      </div>
      {renderTree()}
    </div>
  );
} 