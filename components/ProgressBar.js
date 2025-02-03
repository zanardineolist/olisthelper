import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ count }) => {
  const [progress, setProgress] = useState(0);
  const [scale, setScale] = useState(1);
  const [previousCount, setPreviousCount] = useState(count);
  const minTarget = 25;
  const maxTarget = 30;
  const progressRef = useRef(null);

  useEffect(() => {
    // Calcular o progresso baseado na contagem atual
    let newProgress;
    let newScale = 1;

    if (count <= maxTarget) {
      newProgress = (count / maxTarget) * 100;
    } else {
      // Quando ultrapassar a meta, ajustar a escala e o progresso
      newScale = maxTarget / count;
      newProgress = 100; // Manter a barra cheia
    }

    setProgress(newProgress);
    setScale(newScale);

    // Verificar se acabou de atingir ou ultrapassar a meta
    if (count >= maxTarget && previousCount < maxTarget) {
      triggerSuccessAnimation();
    }
    setPreviousCount(count);
  }, [count]);

  const getProgressColor = () => {
    if (count >= maxTarget) return '#4CAF50'; // Verde brilhante
    if (count >= minTarget) return '#FFA726'; // Laranja
    if (count >= minTarget * 0.7) return '#42A5F5'; // Azul
    return '#EF5350'; // Vermelho
  };

  return (
    <div className="progress-wrapper">
      <div className="progress-container">
        <motion.div
          className="progress-bar"
          style={{
            backgroundColor: 'var(--box-color2)',
            borderRadius: '12px',
            height: '24px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ 
              width: `${progress}%`,
              scale: [1, scale],
            }}
            transition={{ 
              duration: 0.5,
              ease: "easeOut"
            }}
            style={{
              height: '100%',
              backgroundColor: getProgressColor(),
              borderRadius: '12px',
              position: 'relative',
            }}
          >
            {count > maxTarget && (
              <motion.div
                className="boost-effect"
                animate={{
                  opacity: [0.7, 0.3],
                  scale: [1, 1.2],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '30%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))',
                }}
              />
            )}
          </motion.div>

          {/* Marcadores de meta */}
          <div className="markers-container">
            <div 
              className="marker min-marker"
              style={{
                position: 'absolute',
                left: `${(minTarget / maxTarget) * 100}%`,
                height: '20px',
                width: '2px',
                backgroundColor: '#FFA726',
                top: '-25px',
              }}
            >
              <span className="marker-label">
                Min {minTarget}
              </span>
            </div>
            <div 
              className="marker max-marker"
              style={{
                position: 'absolute',
                left: '100%',
                height: '20px',
                width: '2px',
                backgroundColor: '#4CAF50',
                top: '-25px',
              }}
            >
              <span className="marker-label">
                Meta {maxTarget}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="message">
        {count >= maxTarget ? (
          <motion.div 
            className="success-message"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              y: [0, -5, 0]
            }}
            transition={{ 
              duration: 0.5,
              y: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            🎉 Parabéns! {count > maxTarget ? `Você superou a meta! (${count}/${maxTarget})` : 'Você bateu a meta!'} 🎉
          </motion.div>
        ) : count >= minTarget ? (
          <div className="warning-message">
            Ótimo! Você chegou nos {minTarget} chamados. Continue assim!
          </div>
        ) : (
          <div className="info-message">
            Faltam {minTarget - count} chamados para atingir os {minTarget}.
          </div>
        )}
      </div>

      <style jsx>{`
        .progress-wrapper {
          width: 100%;
          max-width: 800px;
          margin: 2rem auto;
          padding: 1rem;
        }

        .progress-container {
          position: relative;
          padding-top: 30px;
          margin-bottom: 20px;
        }

        .markers-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
        }

        .marker-label {
          position: absolute;
          top: -20px;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 0.875rem;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 4px;
          color: white;
        }

        .min-marker .marker-label {
          background-color: #FFA726;
        }

        .max-marker .marker-label {
          background-color: #4CAF50;
        }

        .message {
          text-align: center;
          margin-top: 1.5rem;
          font-weight: bold;
        }

        .success-message {
          color: #4CAF50;
          font-size: 1.2rem;
        }

        .warning-message {
          color: #FFA726;
        }

        .info-message {
          color: var(--text-color);
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;