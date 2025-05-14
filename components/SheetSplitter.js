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
  FaChevronRight
} from 'react-icons/fa';
import styles from '../styles/SheetSplitter.module.css';
import { useApiLoader } from '../utils/apiLoader';
import { LocalLoader } from './LoadingIndicator';
import toast from 'react-hot-toast';

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

  const layoutOptions = [
    { value: 'produtos', label: 'Produtos', icon: <FaTable /> },
    { value: 'clientes', label: 'Clientes', icon: <FaTable /> },
    { value: 'contatos', label: 'Contatos', icon: <FaTable /> },
    { value: 'inventario', label: 'Inventário', icon: <FaTable /> },
    { value: 'contas_receber', label: 'Contas a Receber', icon: <FaTable /> },
    { value: 'contas_pagar', label: 'Contas a Pagar', icon: <FaTable /> }
  ];

  const handleFileChange = async (event) => {
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
      
      setFile(selectedFile);
      setFileSummary(`Nome: ${selectedFile.name}, Tamanho: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB, Tipo: ${selectedFile.type || 'Não identificado'}`);
      setEstimatedSize(selectedFile.size);
      setActiveStep(2);
      
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
      setSuccessMessage('Validando formato da planilha...');
      
      await callApi('/api/validate-layout', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        skipContentType: true
      }, {
        message: 'Validando layout da planilha...',
        type: 'local'
      });
      
      setError('');
      setSuccessMessage('Validação concluída! A planilha está no formato correto.');
    } catch (error) {
      console.error('Erro na validação:', error);
      let errorMessage = error.message || 'Erro desconhecido';
      
      // Tratamento específico para mensagens de erro conhecidas
      if (errorMessage.includes('Número de colunas incorreto')) {
        errorMessage = `Layout incorreto: ${errorMessage}`;
      } else if (errorMessage.includes('Erro na coluna')) {
        errorMessage = `Layout incorreto: ${errorMessage}`;
      } else if (errorMessage.includes('limite de 5MB')) {
        errorMessage = 'Arquivo muito grande: O limite máximo é de 5MB.';
      }
      
      setError(`Erro na validação: ${errorMessage}`);
      setFile(null);
      
      // Limpar campo de arquivo
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
    setError('');
    setSuccessMessage('');
    setProgress(0);
    setIsProcessing(false);
    setFileUrl('');
    setFileSummary('');
    setEstimatedSize(0);
    
    // Se selecionou uma opção, pode avançar para o upload
    if (event.target.value) {
      setActiveStep(1);
    }

    if (file) {
      setFile(null);
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      setError('Por favor, insira um arquivo.');
      return;
    }

    if (!selectedOption) {
      setError('Por favor, selecione um tipo de planilha no menu.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setSuccessMessage('Iniciando validação do layout...');
    setActiveStep(3);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('layoutType', selectedOption);

    try {
      const response = await callApi('/api/split-handler', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/octet-stream',
        },
        skipContentType: true,
        onProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
          if (percentCompleted === 100) setSuccessMessage('Arquivo enviado, iniciando o processamento...');
        },
        responseType: 'blob'
      }, {
        message: 'Processando arquivo...'
      });

      // Verificar se a resposta é realmente um blob ou um erro JSON
      const contentType = response.type;
      if (contentType.includes('application/json')) {
        // É uma resposta de erro em formato JSON
        const errorText = await new Response(response).text();
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || 'Erro desconhecido durante o processamento');
      }

      const url = window.URL.createObjectURL(new Blob([response]));
      setFileUrl(url);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SheetSplitter_${selectedOption}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setSuccessMessage('Processamento concluído! Arquivo pronto para download.');
      setError('');
      setProgress(100);
      setFile(null);
      setActiveStep(4);
      
      // Limpa campo de arquivo
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
      // Exibe notificação de sucesso
      toast.success('Planilha dividida com sucesso!');
    } catch (error) {
      console.error('Erro no processamento:', error);
      let errorMessage = error.message || 'Erro desconhecido';
      
      // Tratamento específico para mensagens de erro conhecidas
      if (errorMessage.includes('layout')) {
        errorMessage = 'Formato da planilha incorreto. Verifique se está usando o modelo correto.';
      } else if (errorMessage.includes('limite')) {
        errorMessage = 'Arquivo muito grande: O limite máximo é de 5MB.';
      } else if (errorMessage.includes('vazio')) {
        errorMessage = 'A planilha está vazia ou contém apenas cabeçalho.';
      }
      
      setError(`Erro ao processar o arquivo: ${errorMessage}`);
      setFile(null);
      
      // Exibe notificação de erro
      toast.error('Erro ao processar a planilha');
      
      // Limpa campo de arquivo
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (estimatedSize > 5 * 1024 * 1024) {
      setError('O arquivo pode ser muito grande para processar. Considere dividir manualmente se exceder o limite de 5MB.');
    } else if (estimatedSize > 0 && !error) {
      setError('');
    }
  }, [estimatedSize]);

  const getLayoutInfo = (option) => {
    switch (option) {
      case 'produtos':
        return 'A planilha de produtos deve seguir o layout específico com colunas de código, descrição, preço e outros atributos do produto.';
      case 'clientes':
        return 'A planilha de clientes deve conter informações como nome, endereço, contato e documentos fiscais.';
      case 'contatos':
        return 'A planilha de contatos deve seguir o layout de informações de contatos com campos como nome, e-mail e telefone.';
      case 'inventario':
        return 'A planilha de inventário deve conter informações de SKU, localização e saldo de estoque.';
      case 'contas_receber':
        return 'A planilha de contas a receber deve incluir colunas como data de emissão, vencimento, valor e saldo.';
      case 'contas_pagar':
        return 'A planilha de contas a pagar deve incluir colunas de data de vencimento, valor e status de pagamento.';
      default:
        return '';
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className={styles.stepIndicator}>
        <div className={`${styles.step} ${activeStep >= 1 ? styles.activeStep : ''} ${activeStep > 1 ? styles.completedStep : ''}`}>
          <div className={styles.stepNumber}>1</div>
          <span className={styles.stepLabel}>Selecionar tipo</span>
        </div>
        <div className={styles.stepConnector}></div>
        <div className={`${styles.step} ${activeStep >= 2 ? styles.activeStep : ''} ${activeStep > 2 ? styles.completedStep : ''}`}>
          <div className={styles.stepNumber}>2</div>
          <span className={styles.stepLabel}>Enviar arquivo</span>
        </div>
        <div className={styles.stepConnector}></div>
        <div className={`${styles.step} ${activeStep >= 3 ? styles.activeStep : ''} ${activeStep > 3 ? styles.completedStep : ''}`}>
          <div className={styles.stepNumber}>3</div>
          <span className={styles.stepLabel}>Processar</span>
        </div>
        <div className={styles.stepConnector}></div>
        <div className={`${styles.step} ${activeStep >= 4 ? styles.activeStep : ''}`}>
          <div className={styles.stepNumber}>4</div>
          <span className={styles.stepLabel}>Download</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>
            <FaFileExcel className={styles.titleIcon} />
            Divisor de Planilhas ERP
          </h2>
          <p className={styles.description}>
            Divida planilhas grandes em partes menores para facilitar a importação no sistema ERP Olist.
          </p>
        </div>
      </div>

      {renderStepIndicator()}

      <div className={styles.contentContainer}>
        {error && (
          <div className={styles.errorMessage}>
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        {successMessage && !isProcessing && (
          <div className={styles.successMessage}>
            <FaCheckCircle />
            <span>{successMessage}</span>
          </div>
        )}
        
        <div className={styles.cardGrid}>
          <div className={styles.selectorCard}>
            <div className={styles.cardHeader}>
              <h3>Selecione o tipo de planilha</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.optionsContainer}>
                <div className={styles.layoutTypeGrid}>
                  {layoutOptions.map((option) => (
                    <div 
                      key={option.value} 
                      className={`${styles.layoutTypeOption} ${selectedOption === option.value ? styles.selectedLayout : ''}`}
                      onClick={() => {
                        setSelectedOption(option.value);
                        setError('');
                        setSuccessMessage('');
                        setProgress(0);
                        setIsProcessing(false);
                        setFileUrl('');
                        setFileSummary('');
                        setEstimatedSize(0);
                        setActiveStep(1);
                        if (file) {
                          setFile(null);
                          const fileInput = document.getElementById('file-input');
                          if (fileInput) fileInput.value = '';
                        }
                      }}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                      {selectedOption === option.value && <FaCheckCircle className={styles.selectedIcon} />}
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedOption && (
                <div className={styles.layoutInfo}>
                  <FaInfoCircle className={styles.infoIcon} />
                  <p>{getLayoutInfo(selectedOption)}</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.uploadCard}>
            <div className={styles.cardHeader}>
              <h3>Enviar arquivo</h3>
            </div>
            <div className={styles.cardContent}>
              <form onSubmit={handleSubmit} className={styles.uploadForm}>
                <div className={styles.fileInputContainer}>
                  <label 
                    htmlFor="file-input" 
                    className={`${styles.fileInputLabel} ${!selectedOption ? styles.fileInputDisabled : ''}`}
                  >
                    <FaFileAlt className={styles.fileIcon} />
                    <div className={styles.fileInputText}>
                      <span className={styles.fileInputTitle}>Arraste ou clique para selecionar</span>
                      <span className={styles.fileInputSubtitle}>Formatos suportados: .xls, .xlsx, .csv (máx. 5MB)</span>
                    </div>
                    <FaUpload className={styles.uploadIcon} />
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={handleFileChange}
                    disabled={!selectedOption}
                    className={styles.fileInput}
                  />
                </div>
  
                {fileSummary && (
                  <div className={styles.fileSummaryCard}>
                    <div className={styles.fileSummaryHeader}>
                      <FaFileExcel className={styles.fileSummaryIcon} />
                      <h3>Arquivo selecionado</h3>
                    </div>
                    <p className={styles.fileSummaryText}>{fileSummary}</p>
                  </div>
                )}
  
                {!isProcessing && file && (
                  <button type="submit" className={styles.submitButton}>
                    <span>Dividir Arquivo</span>
                    <FaChevronRight />
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className={styles.processingCard}>
            <div className={styles.cardHeader}>
              <h3>Processando...</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.progressContainer}>
                <div className={styles.progressBarContainer}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className={styles.progressPercentage}>{progress}%</span>
                </div>
                <p className={styles.progressText}>
                  {progress < 100 ? (
                    <>
                      <FaSpinner className={styles.spinnerIcon} /> {progress < 50 ? 'Analisando planilha...' : 'Dividindo planilha...'}
                    </>
                  ) : (
                    'Finalizando...'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {fileUrl && !isProcessing && (
          <div className={styles.resultCard}>
            <div className={styles.cardHeader}>
              <h3>Arquivo pronto!</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.downloadContainer}>
                <p className={styles.downloadText}>Seu arquivo foi processado com sucesso e está pronto para download.</p>
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.setAttribute('download', `SheetSplitter_${selectedOption}.zip`);
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode.removeChild(link);
                  }}
                  className={styles.downloadButton}
                >
                  <FaDownload />
                  <span>Baixar Arquivo ZIP</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.instructionsContainer}>
          <div className={styles.cardHeader}>
            <h3>Instruções de uso</h3>
          </div>
          <div className={styles.instructionsContent}>
            <div className={styles.instructionsColumn}>
              <h4>Como utilizar</h4>
              <ol className={styles.instructionsList}>
                <li>Selecione o tipo de planilha que deseja dividir</li>
                <li>Faça o upload do arquivo .xls, .xlsx ou .csv</li>
                <li>Clique em "Dividir Arquivo" para processar</li>
                <li>Baixe o arquivo ZIP com as partes divididas</li>
              </ol>
            </div>
            
            <div className={styles.instructionsColumn}>
              <div className={styles.warningBox}>
                <h4>Importante</h4>
                <ul>
                  <li>O tamanho máximo de arquivo é 5MB</li>
                  <li>O layout deve seguir o padrão exato do ERP</li>
                  <li>Cada parte manterá o cabeçalho original</li>
                  <li>As variações de produtos são mantidas com seus pais</li>
                </ul>
              </div>
              
              <div className={styles.tipBox}>
                <FaInfoCircle className={styles.tipIcon} />
                <div>
                  <h4>Dica</h4>
                  <p>
                    Planilhas com muitas linhas causam timeouts no ERP. Esta ferramenta divide sua planilha 
                    mantendo a integridade dos dados e facilitando a importação em lotes menores.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SheetSplitter; 