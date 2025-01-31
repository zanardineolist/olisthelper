import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

const ProgressBar = ({ count }) => {
  const [progress, setProgress] = useState(0);
  const [previousCount, setPreviousCount] = useState(count);
  const minTarget = 25;
  const maxTarget = 30;

  useEffect(() => {
    // Atualizar progresso quando a contagem mudar
    const percentage = (count / maxTarget) * 100;
    setProgress(Math.min(percentage, 100));

    // Verificar se atingiu a meta agora
    if (count >= maxTarget && previousCount < maxTarget) {
      celebrateSuccess();
    }
    setPreviousCount(count);
  }, [count]);

  const getProgressColor = () => {
    if (count >= maxTarget) return '#4CAF50'; // Verde
    if (count >= minTarget) return '#FFA726'; // Laranja
    if (count >= minTarget * 0.7) return '#42A5F5'; // Azul
    return '#EF5350'; // Vermelho
  };

  const celebrateSuccess = () => {
    // Confetti no centro da tela
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Confetti dos cantos
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });

    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto mt-8 px-4">
      <div className="w-full bg-gray-700 rounded-full h-6 mb-2">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: getProgressColor(),
          }}
        />
      </div>
      
      <div className="w-full flex justify-between text-sm">
        <span>0</span>
        <div className="relative">
          <span 
            className="absolute -top-6 w-0.5 h-3 bg-yellow-500"
            style={{ left: `${(minTarget/maxTarget) * 100}%` }}
          />
          <span 
            className="absolute -top-10 transform -translate-x-1/2 text-yellow-500"
            style={{ left: `${(minTarget/maxTarget) * 100}%` }}
          >
            Min: {minTarget}
          </span>
        </div>
        <div className="relative">
          <span 
            className="absolute -top-6 w-0.5 h-3 bg-green-500"
            style={{ right: 0 }}
          />
          <span className="absolute -top-10 transform -translate-x-1/2 text-green-500" style={{ right: 0 }}>
            Meta: {maxTarget}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        {count >= maxTarget ? (
          <div className="text-green-500 font-bold">
            🎉 Parabéns! Meta atingida! 🎉
          </div>
        ) : count >= minTarget ? (
          <div className="text-yellow-500">
            Ótimo! Você já atingiu o mínimo. Continue assim!
          </div>
        ) : (
          <div className="text-gray-400">
            Faltam {minTarget - count} chamados para atingir o mínimo
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;