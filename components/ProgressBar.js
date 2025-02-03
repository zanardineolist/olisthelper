import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target } from 'lucide-react';

const ProgressBar = ({ count }) => {
  const [progress, setProgress] = useState(0);
  const minTarget = 25;
  const maxTarget = 30;

  useEffect(() => {
    setProgress((count / maxTarget) * 100);
  }, [count]);

  const progressBarVariants = {
    initial: { width: 0 },
    animate: { 
      width: `${Math.min(progress, 100)}%`,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const pulseVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.05, 1],
      transition: { duration: 1.5, repeat: Infinity }
    }
  };

  return (
    <div className="progress-wrapper">
      <motion.div 
        className="progress-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="progress-track">
          {/* Marcadores de meta */}
          <div className="markers">
            <motion.div 
              className="marker min-marker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Target size={16} />
              <span>{minTarget}</span>
            </motion.div>
            <motion.div 
              className="marker max-marker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Trophy size={16} />
              <span>{maxTarget}</span>
            </motion.div>
          </div>

          {/* Barra de progresso animada */}
          <motion.div 
            className="progress-fill"
            variants={progressBarVariants}
            initial="initial"
            animate="animate"
            style={{
              background: count >= maxTarget 
                ? 'linear-gradient(90deg, #4CAF50, #81C784)'
                : count >= minTarget
                ? 'linear-gradient(90deg, #FFA726, #FFB74D)'
                : 'linear-gradient(90deg, #42A5F5, #64B5F6)'
            }}
          >
            {count > maxTarget && (
              <motion.div 
                className="shine-effect"
                animate={{
                  x: ['0%', '100%'],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Mensagem de status animada */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={count >= maxTarget ? 'success' : count >= minTarget ? 'warning' : 'info'}
            className={`status-message ${count >= maxTarget ? 'success' : count >= minTarget ? 'warning' : 'info'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            variants={count >= maxTarget ? pulseVariants : {}}
          >
            {count >= maxTarget ? (
              <span>🎉 Meta atingida! Excelente trabalho! 🎉</span>
            ) : count >= minTarget ? (
              <span>Ótimo progresso! Próximo objetivo: {maxTarget}</span>
            ) : (
              <span>Faltam {minTarget - count} para o primeiro objetivo</span>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <style jsx>{`
        .progress-wrapper {
          margin: 2rem 0;
          padding: 1rem;
        }

        .progress-container {
          position: relative;
          padding: 2rem 0;
        }

        .progress-track {
          height: 24px;
          background: var(--box-color2);
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }

        .shine-effect {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
        }

        .markers {
          position: absolute;
          top: -30px;
          width: 100%;
          display: flex;
          justify-content: space-between;
          padding: 0 10px;
        }

        .marker {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-color);
          font-weight: 600;
        }

        .status-message {
          text-align: center;
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
        }

        .success {
          color: #4CAF50;
          background: rgba(76, 175, 80, 0.1);
        }

        .warning {
          color: #FFA726;
          background: rgba(255, 167, 38, 0.1);
        }

        .info {
          color: #42A5F5;
          background: rgba(66, 165, 245, 0.1);
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;