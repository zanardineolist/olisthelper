import { FaHeart, FaRegHeart, FaCopy, FaEdit, FaTrash, FaMagic } from 'react-icons/fa';

const MessageActions = ({ message, user, onToggleFavorite, onCopy, onEdit, onDelete, onGeminiSuggestion }) => {
  const isAuthor = message.user_id === user.id;

  return (
    <div className="flex gap-2">
      {/* Ações disponíveis para todos os usuários */}
      <button
        onClick={() => onToggleFavorite(message.id)}
        className="text-gray-400 hover:text-red-500 transition-colors"
        title="Favoritar"
      >
        {message.isFavorite ? (
          <FaHeart className="text-red-500" />
        ) : (
          <FaRegHeart />
        )}
        {message.favorites_count > 0 && (
          <span className="ml-1 text-sm">{message.favorites_count}</span>
        )}
      </button>

      <button
        onClick={() => onCopy(message.content, message.id)}
        className="text-gray-400 hover:text-blue-500 transition-colors"
        title="Copiar"
      >
        <FaCopy />
        {message.copy_count > 0 && (
          <span className="ml-1 text-sm">{message.copy_count}</span>
        )}
      </button>

      {/* Ações disponíveis apenas para o autor */}
      {isAuthor && (
        <>
          <button
            onClick={() => onEdit(message)}
            className="text-gray-400 hover:text-green-500 transition-colors"
            title="Editar"
          >
            <FaEdit />
          </button>
          
          <button
            onClick={() => onDelete(message.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Excluir"
          >
            <FaTrash />
          </button>
          
          <button
            onClick={() => onGeminiSuggestion(message.id, message.content)}
            className="text-yellow-500 hover:text-yellow-600 transition-colors"
            title="Melhorar com IA"
          >
            <FaMagic />
          </button>
        </>
      )}
    </div>
  );
};

export default MessageActions;