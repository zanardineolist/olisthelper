import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaUpload, FaExclamationTriangle, FaCheckCircle, FaDownload, FaSpinner } from 'react-icons/fa';
import styles from '../styles/SheetSplitter.module.css';
import { useApiLoader } from '../utils/apiLoader';
import { LocalLoader } from './LoadingIndicator';

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
  const { callApi } = useApiLoader();

  const layoutOptions = [
    { value: 'produtos', label: 'Produtos' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'contatos', label: 'Contatos' },
    { value: 'inventario', label: 'Inventário' },
    { value: 'contas_receber', label: 'Contas a Receber' },
    { value: 'contas_pagar', label: 'Contas a Pagar' }
  ];

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Tipo de arquivo não suportado. Selecione um arquivo .xls, .xlsx ou .csv.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setFileSummary(`Nome: ${selectedFile.name}, Tamanho: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB, Tipo: ${selectedFile.type}`);
      setEstimatedSize(selectedFile.size);
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
    } catch (error) {
      setError(`Erro: ${error.message}`);
      setFile(null);
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
      
      // Limpa campo de arquivo
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setError(`Erro ao processar o arquivo: ${error.message}`);
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (estimatedSize > 5 * 1024 * 1024) {
      setError('O arquivo pode ser muito grande para processar. Considere dividir manualmente se exceder o limite de 5MB.');
    } else {
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Divisor de Planilhas</h2>
        <p className={styles.description}>
          Esta ferramenta permite dividir planilhas grandes do sistema ERP em partes menores para facilitar a importação.
        </p>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.optionsContainer}>
          <label htmlFor="layout-type" className={styles.selectLabel}>Selecione o tipo de planilha</label>
          <select 
            id="layout-type" 
            value={selectedOption} 
            onChange={handleOptionChange}
            className={styles.selectInput}
          >
            <option value="">Escolha um tipo de planilha</option>
            {layoutOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {selectedOption && (
            <div className={styles.layoutInfo}>
              <FaFileExcel className={styles.infoIcon} />
              <p>{getLayoutInfo(selectedOption)}</p>
            </div>
          )}
        </div>

        {fileSummary && (
          <div className={styles.fileSummary}>
            <h3>Informações do arquivo</h3>
            <p>{fileSummary}</p>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.uploadForm}>
          <div className={styles.fileInputContainer}>
            <label htmlFor="file-input" className={styles.fileInputLabel}>
              <FaUpload />
              <span>Selecionar arquivo (.xls, .xlsx, .csv)</span>
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

          {successMessage && !isProcessing && (
            <div className={styles.successMessage}>
              <FaCheckCircle />
              <span>{successMessage}</span>
            </div>
          )}

          {!isProcessing && file && (
            <button type="submit" className={styles.submitButton}>
              <FaFileExcel />
              <span>Dividir Arquivo</span>
            </button>
          )}
        </form>

        {fileUrl && !isProcessing && (
          <div className={styles.downloadContainer}>
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
              <span>Baixar Arquivo Novamente</span>
            </button>
          </div>
        )}

        {isProcessing && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
            </div>
            <p className={styles.progressText}>
              {progress < 100 ? (
                <>
                  <FaSpinner className={styles.spinnerIcon} /> Processando... {progress}%
                </>
              ) : (
                'Finalizando...'
              )}
            </p>
          </div>
        )}

        <div className={styles.instructionsContainer}>
          <h3>Como utilizar a ferramenta</h3>
          <ol className={styles.instructionsList}>
            <li>Selecione o tipo de planilha que você deseja dividir</li>
            <li>Faça o upload do arquivo no formato .xls, .xlsx ou .csv</li>
            <li>Clique no botão "Dividir Arquivo" para iniciar o processamento</li>
            <li>Após o processamento, o arquivo será baixado automaticamente como um arquivo ZIP</li>
            <li>O arquivo ZIP contém várias partes da planilha original, prontas para importação no sistema ERP</li>
          </ol>
          
          <div className={styles.warningBox}>
            <h4>Importante</h4>
            <ul>
              <li>O tamanho máximo de arquivo suportado é de 5MB</li>
              <li>O layout da planilha deve seguir o padrão exato do sistema ERP</li>
              <li>As partes geradas mantêm o cabeçalho em cada arquivo para facilitar a importação</li>
              <li>Para planilhas de produtos, a divisão preserva produtos variantes junto com seus produtos pais</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SheetSplitter; 