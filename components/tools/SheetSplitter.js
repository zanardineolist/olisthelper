import React, { useState, useEffect } from 'react';
import { 
  FaFileExcel, 
  FaUpload, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaDownload, 
  FaSpinner, 
  FaInfoCircle, 
  FaTable,
  FaFileAlt,
  FaChevronRight,
  FaCloudDownloadAlt,
  FaTimesCircle,
  FaRedo,
  FaSearch
} from 'react-icons/fa';
import styles from '../../styles/SheetSplitter.module.css';
import { useApiLoader } from '../../utils/apiLoader';
import { LocalLoader } from '../ui/LoadingIndicator';
import toast from 'react-hot-toast';
import axios from 'axios';

const SheetSplitter = () => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSummary, setFileSummary] = useState('');
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const { callApi } = useApiLoader();
  const [validationResult, setValidationResult] = useState(null);
  const [processCompleted, setProcessCompleted] = useState(false);
  const [processPhase, setProcessPhase] = useState('idle'); // 'idle', 'validating', 'splitting', 'complete'
  const [validationProgress, setValidationProgress] = useState(0);

  const layoutOptions = [
    { value: 'produtos', label: 'Produtos', icon: <FaTable /> },
    { value: 'clientes', label: 'Clientes', icon: <FaTable /> },
    { value: 'contatos', label: 'Contatos', icon: <FaTable /> },
    { value: 'inventario', label: 'Inventário', icon: <FaTable /> },
    { value: 'contas_receber', label: 'Contas a Receber', icon: <FaTable /> },
    { value: 'contas_pagar', label: 'Contas a Pagar', icon: <FaTable /> }
  ];

  // Mapeia os tipos de layout para os arquivos de modelo correspondentes
  const layoutTemplates = {
    'produtos': '/sheets/produtos.xls',
    'clientes': '/sheets/clientes.xls',
    'contatos': '/sheets/contatos_clientes.xls',
    'inventario': '/sheets/estoque_inventario.xls',
    'contas_receber': '/sheets/contas_receber_competencia.xls',
    'contas_pagar': '/sheets/contas_pagar_competencia.xls'
  };

  const handleFileChange = async (event) => {
    // Não permitir seleção de arquivo se o processo já foi completado
    if (processCompleted) {
      return;
    }
    
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
      
      // Verifica se o arquivo termina com extensões válidas mesmo se o tipo MIME não for reconhecido
      const fileName = selectedFile.name.toLowerCase();
      const hasValidExtension = fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv');
      
      if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
        setError('Tipo de arquivo não suportado. Selecione um arquivo .xls, .xlsx ou .csv.');
        setFile(null);
        return;
      }
      
      // Simplifica o tipo de arquivo para exibição
      let fileType = "Planilha";
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        fileType = "CSV";
      } else if (selectedFile.name.toLowerCase().endsWith('.xlsx')) {
        fileType = "Excel (XLSX)";
      } else if (selectedFile.name.toLowerCase().endsWith('.xls')) {
        fileType = "Excel (XLS)";
      }
      
      setFile(selectedFile);
      setFileSummary(`Nome: ${selectedFile.name}, Tamanho: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB, Formato: ${fileType}`);
      setEstimatedSize(selectedFile.size);
      setActiveStep(2);
      setValidationResult(null);
      
      if (!selectedOption) {
        setError('Selecione o tipo de planilha antes de enviar um arquivo.');
        return;
      }
      
      await validateFile(selectedFile);
    }
  };

  const validateFile = async (selectedFile) => {
    if (!selectedOption) {
      setError('Selecione o tipo de planilha antes de enviar um arquivo.');
      setFile(null);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('layoutType', selectedOption);

    try {
      setIsProcessing(true);
      setProcessPhase('validating');
      setSuccessMessage('Validando formato da planilha...');
      
      // Simulação de progresso de validação
      let validationTimer = setInterval(() => {
        setValidationProgress(prev => {
          if (prev >= 90) {
            clearInterval(validationTimer);
            return 90; // Mantém em 90% até a resposta da API
          }
          return prev + 10;
        });
      }, 150);
      
      const response = await callApi('/api/validate-layout', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        skipContentType: true,
        suppressConsoleError: true
      }, {
        message: 'Validando layout da planilha...',
        type: 'local'
      });
      
      // Validação concluída, ajusta para 100%
      clearInterval(validationTimer);
      setValidationProgress(100);
      
      // Após breve pausa para mostrar 100%, define o sucesso
      setTimeout(() => {
        // Se chegarmos aqui, a validação foi bem-sucedida
        setError('');
        setSuccessMessage('Validação concluída! A planilha está no formato correto.');
        setProcessPhase('validated');
        toast.success('Layout validado com sucesso!');
        
        // Definir resultado de validação
        try {
          // Tentar extrair detalhes da validação, se disponíveis
          if (response && response.data) {
            setValidationResult({
              status: 'success',
              details: response.data
            });
          } else {
            setValidationResult({
              status: 'success',
              details: null
            });
          }
        } catch (parseError) {
          console.error('Erro ao processar resultado da validação:', parseError);
          setValidationResult({
            status: 'success',
            details: null
          });
        }
      }, 500);
    } catch (error) {
      setValidationProgress(0);
      setProcessPhase('error');
      let errorMessage = error.message || 'Erro desconhecido';
      let detailedError = '';
      let validationDetails = null;
      
      // Ocultar a mensagem de validação quando há erro
      setSuccessMessage('');
      
      // Tentar extrair detalhes da validação, se disponíveis
      try {
        if (error.response && error.response.data) {
          validationDetails = error.response.data;
        }
      } catch (parseError) {
        console.error('Erro ao processar detalhes do erro:', parseError);
      }
      
      // Tratamento específico para mensagens de erro conhecidas
      if (errorMessage.includes('Número de colunas incorreto')) {
        detailedError = errorMessage;
      } else if (errorMessage.includes('Cabeçalho não confere')) {
        detailedError = errorMessage;
      } else if (errorMessage.includes('Linha em branco encontrada')) {
        detailedError = errorMessage;
      } else if (errorMessage.includes('Layout incompatível')) {
        detailedError = errorMessage;
      } else if (errorMessage.includes('Arquivo vazio ou corrompido')) {
        detailedError = 'O arquivo parece estar vazio ou corrompido. Verifique se o arquivo está íntegro e tente novamente.';
      } else if (errorMessage.includes('Formato de arquivo não suportado')) {
        detailedError = 'Formato de arquivo não suportado. Use apenas arquivos .xls, .xlsx ou .csv.';
      } else {
        // Para erros genéricos, usar a mensagem padrão
        detailedError = `Erro na validação: ${errorMessage}`;
      }
      
      console.error('Erro na validação:', error);
      setError(detailedError);
      toast.error('Erro na validação da planilha');
      
      setValidationResult({
        status: 'error',
        message: detailedError,
        details: validationDetails
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptionChange = async (event) => {
    const newOption = event.target.value;
    setSelectedOption(newOption);
    setActiveStep(newOption ? 2 : 1);
    setError('');
    setValidationResult(null);
    
    // Se há um arquivo selecionado, validar novamente com o novo tipo
    if (file && newOption) {
      await validateFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!file || !selectedOption) {
      setError('Selecione um arquivo e o tipo de planilha antes de enviar.');
      return;
    }

    // Verificar se a validação foi bem-sucedida antes de prosseguir
    if (!validationResult || validationResult.status !== 'success') {
      setError('Valide o arquivo antes de prosseguir com o processamento.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('layoutType', selectedOption);

    try {
      setIsProcessing(true);
      setProcessPhase('splitting');
      setProgress(0);
      setError('');
      setSuccessMessage('Iniciando processamento da planilha...');
      setActiveStep(3);

      // Simulação de progresso durante o processamento
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 90; // Mantém em 90% até a resposta da API
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await callApi('/api/process-sheet', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        skipContentType: true
      }, {
        message: 'Processando divisão da planilha...',
        type: 'local'
      });

      // Processamento concluído, ajusta para 100%
      clearInterval(progressTimer);
      setProgress(100);

      if (response && response.url) {
        setFileUrl(response.url);
        setSuccessMessage('Processamento concluído! Arquivo pronto para download.');
        setProcessPhase('complete');
        setProcessCompleted(true);
        setActiveStep(4);
        toast.success('Planilha processada com sucesso!');
      } else {
        throw new Error('Resposta da API inválida');
      }
    } catch (error) {
      clearInterval(progressTimer);
      setProgress(0);
      setProcessPhase('error');
      
      let errorMessage = error.message || 'Erro desconhecido no processamento';
      
      // Tratamento específico para diferentes tipos de erro
      if (errorMessage.includes('Arquivo muito grande')) {
        errorMessage = 'O arquivo é muito grande para processamento. Tente um arquivo menor (máximo 10MB).';
      } else if (errorMessage.includes('Memória insuficiente')) {
        errorMessage = 'Não foi possível processar o arquivo devido ao tamanho. Tente dividir o arquivo manualmente ou use um arquivo menor.';
      } else if (errorMessage.includes('Formato inválido')) {
        errorMessage = 'O formato do arquivo não é compatível com o processamento. Verifique se é um arquivo Excel ou CSV válido.';
      } else if (errorMessage.includes('Dados insuficientes')) {
        errorMessage = 'O arquivo não contém dados suficientes para divisão. Verifique se há pelo menos 1000 linhas de dados.';
      }
      
      console.error('Erro no processamento:', error);
      setError(errorMessage);
      toast.error('Erro no processamento da planilha');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProgress(0);
    setError('');
    setSuccessMessage('');
    setSelectedOption('');
    setFileUrl('');
    setFileSummary('');
    setEstimatedSize(0);
    setActiveStep(1);
    setValidationResult(null);
    setProcessCompleted(false);
    setProcessPhase('idle');
    setValidationProgress(0);
    
    // Limpar o input file
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDownloadTemplate = (layoutType) => {
    const templateUrl = layoutTemplates[layoutType];
    if (templateUrl) {
      // Criar um link temporário para download
      const link = document.createElement('a');
      link.href = templateUrl;
      link.download = `modelo_${layoutType}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Modelo baixado com sucesso!');
    } else {
      toast.error('Modelo não encontrado para este tipo de planilha.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FaFileExcel className={styles.headerIcon} />
        <div>
          <h2 className={styles.title}>Divisor de Planilhas</h2>
          <p className={styles.description}>
            Divida planilhas grandes em arquivos menores baseados no layout selecionado
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className={styles.progressSteps}>
        <div className={`${styles.step} ${activeStep >= 1 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>1</div>
          <span>Tipo</span>
        </div>
        <div className={`${styles.step} ${activeStep >= 2 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>2</div>
          <span>Arquivo</span>
        </div>
        <div className={`${styles.step} ${activeStep >= 3 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>3</div>
          <span>Processar</span>
        </div>
        <div className={`${styles.step} ${activeStep >= 4 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>4</div>
          <span>Download</span>
        </div>
      </div>

      {/* Layout Selection */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FaTable className={styles.sectionIcon} />
          Selecione o Tipo de Planilha
        </h3>
        <div className={styles.optionsGrid}>
          {layoutOptions.map((option) => (
            <label key={option.value} className={styles.optionCard}>
              <input
                type="radio"
                name="layoutType"
                value={option.value}
                checked={selectedOption === option.value}
                onChange={handleOptionChange}
                disabled={processCompleted}
                className={styles.radioInput}
              />
              <div className={styles.optionContent}>
                {option.icon}
                <span className={styles.optionLabel}>{option.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDownloadTemplate(option.value);
                  }}
                  className={styles.templateButton}
                  title="Baixar modelo"
                >
                  <FaDownload />
                </button>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* File Upload */}
      {selectedOption && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaUpload className={styles.sectionIcon} />
            Enviar Arquivo
          </h3>
          <div className={styles.uploadArea}>
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleFileChange}
              disabled={processCompleted}
              className={styles.fileInput}
              id="fileInput"
            />
            <label htmlFor="fileInput" className={styles.uploadLabel}>
              <FaCloudDownloadAlt className={styles.uploadIcon} />
              <span>Clique para selecionar o arquivo</span>
              <small>Formatos aceitos: .xls, .xlsx, .csv</small>
            </label>
          </div>

          {file && (
            <div className={styles.fileInfo}>
              <FaFileAlt className={styles.fileIcon} />
              <div className={styles.fileDetails}>
                <strong>{file.name}</strong>
                <span>{fileSummary}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Results */}
      {validationResult && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaSearch className={styles.sectionIcon} />
            Resultado da Validação
          </h3>
          
          {validationResult.status === 'success' && (
            <div className={styles.validationSuccess}>
              <FaCheckCircle className={styles.successIcon} />
              <div>
                <h4>Validação Bem-sucedida</h4>
                <p>A planilha está no formato correto e pronta para processamento.</p>
                {processPhase === 'validating' && (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${validationProgress}%` }}
                      ></div>
                    </div>
                    <span>{validationProgress}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {validationResult.status === 'error' && (
            <div className={styles.validationError}>
              <FaTimesCircle className={styles.errorIcon} />
              <div>
                <h4>Erro na Validação</h4>
                <p>{validationResult.message}</p>
                <button 
                  onClick={() => handleDownloadTemplate(selectedOption)}
                  className={styles.downloadTemplateButton}
                >
                  <FaDownload />
                  Baixar Modelo Correto
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing Section */}
      {validationResult && validationResult.status === 'success' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaFileExcel className={styles.sectionIcon} />
            Processamento
          </h3>
          
          {!processCompleted && (
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !file || !selectedOption}
              className={styles.processButton}
            >
              {isProcessing ? (
                <>
                  <FaSpinner className={styles.spinIcon} />
                  Processando...
                </>
              ) : (
                <>
                  <FaChevronRight />
                  Iniciar Processamento
                </>
              )}
            </button>
          )}

          {isProcessing && processPhase === 'splitting' && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span>{Math.round(progress)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Download Section */}
      {fileUrl && processCompleted && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaDownload className={styles.sectionIcon} />
            Download do Resultado
          </h3>
          <div className={styles.downloadSection}>
            <div className={styles.downloadInfo}>
              <FaCheckCircle className={styles.downloadIcon} />
              <div>
                <h4>Processamento Concluído</h4>
                <p>Seu arquivo foi dividido com sucesso e está pronto para download.</p>
              </div>
            </div>
            <a
              href={fileUrl}
              download
              className={styles.downloadButton}
            >
              <FaDownload />
              Baixar Arquivo Processado
            </a>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className={styles.errorMessage}>
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {successMessage && !error && (
        <div className={styles.successMessage}>
          <FaCheckCircle />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Reset Button */}
      {(file || error || successMessage) && (
        <div className={styles.resetSection}>
          <button onClick={handleReset} className={styles.resetButton}>
            <FaRedo />
            Reiniciar Processo
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && <LocalLoader message={successMessage} />}
    </div>
  );
};

export default SheetSplitter; 