import { useState, useEffect } from 'react';
import { FaChevronRight, FaChevronDown, FaFolder, FaFolderOpen, FaExclamationTriangle } from 'react-icons/fa';
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

// Simplificar a lógica de expansão
function canExpand(node, childrenMap) {
  // Se já sabemos que não tem filhos, não pode expandir
  if (childrenMap[node.id] === null) {
    return false;
  }
  
  // Se já carregou filhos, verifica se há filhos
  if (childrenMap[node.id] !== undefined) {
    return childrenMap[node.id].length > 0;
  }
  
  // Se veio com children_categories, verifica se tem filhos
  if (Array.isArray(node.children_categories)) {
    return node.children_categories.length > 0;
  }
  
  // Se não sabemos, assume que pode expandir (será verificado ao clicar)
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
            title={expanded[node.id] ? 'Recolher' : 'Expandir'}
            disabled={loading}
          >
            {expanded[node.id] ? <FaChevronDown /> : <FaChevronRight />}
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
          {expanded[node.id] ? <FaFolderOpen /> : <FaFolder />} 
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
  const [loadingNode, setLoadingNode] = useState(null);

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
            setChildrenMap(prev => ({ 
              ...prev, 
              [cat.id]: cat.children_categories.map(child => ({ 
                id: child.id, 
                name: child.name || '', 
                children_categories: undefined 
              })) 
            }));
          } else {
            setChildrenMap(prev => ({ ...prev, [cat.id]: [] }));
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

  // Buscar detalhes completos ao expandir um nó
  const handleToggle = async (id) => {
    const isExpanding = !expanded[id];
    setExpanded(exp => ({ ...exp, [id]: isExpanding }));
    
    if (isExpanding && childrenMap[id] === undefined) {
      setLoadingNode(id);
      try {
        const cat = await fetchCategory(id);
        const children = (cat.children_categories || []).map(child => ({ 
          id: child.id, 
          name: child.name || '', 
          children_categories: undefined 
        }));
        
        setChildrenMap(map => ({ ...map, [id]: children }));
      } catch (err) {
        setError('Erro ao carregar subcategorias.');
        setExpanded(exp => ({ ...exp, [id]: false }));
        setChildrenMap(map => ({ ...map, [id]: [] }));
      } finally {
        setLoadingNode(null);
      }
    }
  };

  // Renderização recursiva da árvore
  const renderNode = (node, level = 0) => {
    const isExpanded = expanded[node.id];
    const children = childrenMap[node.id] || [];
    
    return (
      <div key={node.id} className={styles.treeNodeContainer}>
        <CategoryNode
          node={node}
          expanded={expanded}
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
              <div className={styles.treeLoading} style={{ padding: '0.5rem', fontSize: 12 }}>
                Carregando...
              </div>
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
        </div>
      </div>
      {renderTree()}
    </div>
  );
} 