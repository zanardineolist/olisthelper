import React from 'react';
import { Trophy, Flame } from 'lucide-react';

const StatusBadge = ({ count }) => {
  // Definição dos estilos base para o wrapper
  const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
    animation: 'fadeIn 0.3s ease-in',
  };

  // Definições específicas para cada status
  const statusConfigs = {
    above: {
      style: {
        ...wrapperStyle,
        backgroundColor: '#FF6B6B20',
        color: '#FF6B6B',
      },
      icon: Flame,
      text: 'Meta Superada!',
      iconClass: 'animate-bounce',
    },
    met: {
      style: {
        ...wrapperStyle,
        backgroundColor: '#4CAF5020',
        color: '#4CAF50',
      },
      icon: Trophy,
      text: 'Meta Atingida!',
    },
  };

  // Determina o status baseado na contagem
  const getStatus = (count) => {
    if (count > 30) return 'above';
    if (count === 30) return 'met';
    return null;
  };

  const status = getStatus(count);
  if (!status) return null;

  const config = statusConfigs[status];
  const Icon = config.icon;

  return (
    <div style={config.style} className="ml-2">
      <Icon 
        size={16}
        className={config.iconClass}
        style={status === 'above' ? { animation: 'flicker 1s infinite' } : {}}
      />
      <span className="text-sm">{config.text}</span>

      <style jsx global>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-bounce {
          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25%); }
        }
      `}</style>
    </div>
  );
};

export default StatusBadge;