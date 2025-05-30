import React from 'react';
import { Trophy, Flame } from 'lucide-react';

const StatusBadge = ({ count }) => {
  const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '0.875rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
  };

  const statusConfigs = {
    above: {
      style: {
        ...wrapperStyle,
        background: 'linear-gradient(45deg, #FF6B6B, #FF8787)',
        color: '#fff',
      },
      icon: Flame,
      text: 'Meta Superada!',
      iconClass: 'animate-flicker',
    },
    met: {
      style: {
        ...wrapperStyle,
        background: 'linear-gradient(45deg, #4CAF50, #81C784)',
        color: '#fff',
      },
      icon: Trophy,
      text: 'Meta Atingida!',
      iconClass: 'animate-shine',
    },
  };

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
    <div style={config.style} className="transform hover:scale-105 transition-transform duration-200">
      <Icon 
        size={18}
        className={config.iconClass}
        strokeWidth={2.5}
      />
      <span>{config.text}</span>

      <style jsx global>{`
        @keyframes flicker {
          0% { opacity: 1; transform: scale(1); }
          25% { opacity: 0.8; transform: scale(1.1); }
          50% { opacity: 1; transform: scale(1); }
          75% { opacity: 0.8; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes shine {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          50% { transform: scale(1) rotate(0deg); }
          75% { transform: scale(1.1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .animate-flicker {
          animation: flicker 2s infinite;
        }

        .animate-shine {
          animation: shine 2s infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
};

export default StatusBadge;