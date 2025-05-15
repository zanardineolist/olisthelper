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
  FaTimesCircle
} from 'react-icons/fa';
import styles from '../styles/SheetSplitter.module.css';
import { useApiLoader } from '../utils/apiLoader';
import { LocalLoader } from './LoadingIndicator';
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
      setSuccessMessage('Validando formato da planilha...');
      
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
      
      // Se chegarmos aqui, a validação foi bem-sucedida
      setError('');
      setSuccessMessage('Validação concluída! A planilha está no formato correto.');
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
    } catch (error) {
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
        errorMessage = `Incompatibilidade de layout: O número de colunas não corresponde ao layout esperado para "${getLayoutLabel(selectedOption)}".`;
      } else if (errorMessage.includes('Erro na coluna')) {
        // Extrair o nome da coluna esperada e recebida
        const match = errorMessage.match(/Esperado "([^"]+)", mas encontrado "([^"]+)"/);
        if (match) {
          const [_, expectedColumn, foundColumn] = match;
          detailedError = errorMessage;
          errorMessage = `Incompatibilidade de layout: Encontrada coluna "${foundColumn}" quando era esperada "${expectedColumn}".`;
        } else {
          detailedError = errorMessage;
          errorMessage = `Incompatibilidade de layout: As colunas não correspondem ao layout esperado para "${getLayoutLabel(selectedOption)}".`;
        }
      } else if (errorMessage.includes('limite de 5MB')) {
        errorMessage = 'Arquivo muito grande: O limite máximo é de 5MB.';
      } else if (errorMessage.includes('Erro 400')) {
        errorMessage = `O layout do arquivo não corresponde ao tipo "${getLayoutLabel(selectedOption)}" selecionado. Verifique se você escolheu o tipo correto de planilha.`;
      }
      
      // Definir resultado de validação para erro
      setValidationResult({
        status: 'error',
        message: errorMessage,
        details: validationDetails
      });
      
      setError(
        <div className={styles.errorContent}>
          <div className={styles.errorTitle}>
            <FaExclamationTriangle /> Erro na validação
          </div>
          <div className={styles.errorDescription}>
            {errorMessage}
          </div>
          {detailedError && (
            <div className={styles.errorDetails}>
              <details>
                <summary>Detalhes técnicos</summary>
                <p>{detailedError}</p>
              </details>
            </div>
          )}
          <div className={styles.errorHelp}>
            <strong>Sugestões:</strong>
            <ul>
              <li>Verifique se selecionou o tipo correto de planilha no menu</li>
              <li>Certifique-se de que o arquivo segue exatamente o layout esperado</li>
              <li>Compare o cabeçalho do seu arquivo com o modelo oficial</li>
            </ul>
          </div>
        </div>
      );
      toast.error('Erro na validação do arquivo');
      
      // Não limpar o arquivo para manter as informações visíveis
      // setFile(null);
      
      // Limpar campo de arquivo para permitir nova seleção
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
    setValidationResult(null);
    
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
    setValidationResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('layoutType', selectedOption);

    try {
      // Usando axios diretamente para ter mais controle sobre o tipo de resposta
      const response = await axios.post('/api/split-handler', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': '*/*'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
          if (percentCompleted === 100) setSuccessMessage('Arquivo enviado, iniciando o processamento...');
        },
        responseType: 'blob', // Isso garante que a resposta seja tratada como blob
      });

      // Verificando se a resposta é um formato JSON de erro
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        // É um erro em formato JSON
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            throw new Error(errorData.error || 'Erro desconhecido durante o processamento');
          } catch (jsonError) {
            throw new Error('Erro no formato da resposta do servidor');
          }
        };
        reader.readAsText(response.data);
      } else {
        // É um arquivo ZIP válido
        const url = window.URL.createObjectURL(new Blob([response.data]));
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
      }
    } catch (error) {
      let errorMessage = error.message || 'Erro desconhecido';
      
      // Tratamento específico para mensagens de erro conhecidas
      if (errorMessage.includes('layout')) {
        errorMessage = 'Formato da planilha incorreto. Verifique se está usando o modelo correto.';
      } else if (errorMessage.includes('limite')) {
        errorMessage = 'Arquivo muito grande: O limite máximo é de 5MB.';
      } else if (errorMessage.includes('vazio')) {
        errorMessage = 'A planilha está vazia ou contém apenas cabeçalho.';
      } else if (errorMessage.includes('JSON')) {
        errorMessage = 'Erro de comunicação com o servidor. Por favor, tente novamente.';
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
      toast.warning('Arquivo pode exceder o limite de tamanho permitido');
    } else if (estimatedSize > 0 && !error) {
      setError('');
    }
  }, [estimatedSize]);

  const getLayoutInfo = (option) => {
    switch (option) {
      case 'produtos':
        return (
          <div className={styles.detailedLayoutInfo}>
            <p><strong>Layout da planilha de Produtos:</strong></p>
            <p>Esta planilha deve conter as seguintes colunas principais:</p>
            <ul>
              <li><strong>ID</strong> - identificador único do produto</li>
              <li><strong>Código (SKU)</strong> - código do produto</li>
              <li><strong>Descrição</strong> - nome do produto</li>
              <li><strong>Unidade</strong> - unidade de medida (Un, Cx, Pc)</li>
              <li><strong>NCM (Classificação fiscal)</strong> - código fiscal</li>
              <li><strong>Origem</strong> - origem do produto</li>
              <li><strong>Preço</strong> - valor de venda</li>
              <li><strong>Situação</strong> - status do produto (Ativo, Inativo)</li>
              <li><strong>Estoque</strong> - quantidade em estoque</li>
              <li><strong>Tipo do produto</strong> - tipo (S para simples, V para variação)</li>
              <li><strong>GTIN/EAN</strong> - código de barras</li>
              <li><strong>Marca</strong> - marca do produto</li>
            </ul>
            <p>Além destas, o arquivo deve conter outras colunas específicas do ERP para importação completa.</p>
          </div>
        );
      case 'clientes':
        return (
          <div className={styles.detailedLayoutInfo}>
            <p><strong>Layout da planilha de Clientes:</strong></p>
            <p>Esta planilha deve conter as seguintes colunas principais:</p>
            <ul>
              <li><strong>ID</strong> - identificador único</li>
              <li><strong>Código</strong> - código do cliente</li>
              <li><strong>Nome</strong> - nome completo/razão social</li>
              <li><strong>Fantasia</strong> - nome fantasia</li>
              <li><strong>Endereço</strong> - logradouro</li>
              <li><strong>Número</strong> - número do endereço</li>
              <li><strong>Complemento</strong> - complemento do endereço</li>
              <li><strong>Bairro</strong> - bairro</li>
              <li><strong>CEP</strong> - código postal</li>
              <li><strong>Cidade</strong> - cidade</li>
              <li><strong>Estado</strong> - UF</li>
              <li><strong>Fone</strong> - telefone principal</li>
              <li><strong>E-mail</strong> - endereço de email</li>
              <li><strong>Tipo pessoa</strong> - Pessoa Física, Jurídica ou Estrangeiro</li>
              <li><strong>CNPJ / CPF</strong> - documento fiscal</li>
              <li><strong>Situação</strong> - status do cliente (Ativo, Inativo)</li>
            </ul>
            <p>O arquivo completo inclui outros campos importantes para cadastro completo no ERP.</p>
          </div>
        );
      case 'contatos':
        return (
          <div className={styles.detailedLayoutInfo}>
            <p><strong>Layout da planilha de Contatos:</strong></p>
            <p>Esta planilha deve conter as seguintes colunas:</p>
            <ul>
              <li><strong>ID</strong> - identificador único</li>
              <li><strong>CNPJ Cliente</strong> - CNPJ do cliente relacionado</li>
              <li><strong>Nome Cliente</strong> - nome da empresa ou cliente</li>
              <li><strong>Contato</strong> - nome da pessoa de contato</li>
              <li><strong>Setor</strong> - departamento (Administrativo, Compras, etc.)</li>
              <li><strong>E-mail</strong> - endereço de email</li>
              <li><strong>Telefone</strong> - número para contato</li>
              <li><strong>Ramal</strong> - número do ramal</li>
            </ul>
            <p>Este layout é mais simples e foca nos dados essenciais para contatos empresariais.</p>
          </div>
        );
      case 'inventario':
        return (
          <div className={styles.detailedLayoutInfo}>
            <p><strong>Layout da planilha de Inventário:</strong></p>
            <p>Esta planilha deve conter as seguintes colunas:</p>
            <ul>
              <li><strong>ID*</strong> - identificador único (opcional)</li>
              <li><strong>Produto</strong> - nome/descrição do produto</li>
              <li><strong>Código (SKU)*</strong> - código de estoque obrigatório</li>
              <li><strong>GTIN/EAN</strong> - código de barras</li>
              <li><strong>Localização</strong> - posição física no estoque</li>
              <li><strong>Saldo em estoque</strong> - quantidade disponível</li>
            </ul>
            <p>Atenção: O campo Código (SKU)* é obrigatório e deve existir previamente no cadastro.</p>
          </div>
        );
      case 'contas_receber':
        return (
          <div className={styles.detailedLayoutInfo}>
            <p><strong>Layout da planilha de Contas a Receber:</strong></p>
            <p>Esta planilha deve conter as seguintes colunas:</p>
            <ul>
              <li><strong>ID</strong> - identificador único</li>
              <li><strong>Cliente</strong> - nome do cliente</li>
              <li><strong>Data Emissão</strong> - data de criação</li>
              <li><strong>Data Vencimento</strong> - data limite para recebimento</li>
              <li><strong>Data Liquidação</strong> - data de pagamento (quando houver)</li>
              <li><strong>Valor documento</strong> - valor a receber</li>
              <li><strong>Saldo</strong> - valor remanescente</li>
              <li><strong>Situação</strong> - status (Em aberto, Paga)</li>
              <li><strong>Número documento</strong> - número do título</li>
              <li><strong>Número no banco</strong> - número bancário</li>
              <li><strong>Categoria</strong> - classificação financeira</li>
              <li><strong>Histórico</strong> - descrição/observações</li>
              <li><strong>Forma de recebimento</strong> - método de pagamento</li>
              <li><strong>Competência</strong> - mês/ano de competência</li>
            </ul>
            <p>Este layout permite importar todo o contas a receber para o sistema financeiro.</p>
          </div>
        );
      case 'contas_pagar':
        return (
          <div className={styles.detailedLayoutInfo}>
            <p><strong>Layout da planilha de Contas a Pagar:</strong></p>
            <p>Esta planilha deve conter as seguintes colunas:</p>
            <ul>
              <li><strong>ID</strong> - identificador único</li>
              <li><strong>Fornecedor</strong> - nome do fornecedor</li>
              <li><strong>Data Emissão</strong> - data de criação</li>
              <li><strong>Data Vencimento</strong> - data limite para pagamento</li>
              <li><strong>Data Liquidação</strong> - data de pagamento (quando houver)</li>
              <li><strong>Valor documento</strong> - valor a pagar</li>
              <li><strong>Saldo</strong> - valor remanescente</li>
              <li><strong>Situação</strong> - status (Em aberto, Paga)</li>
              <li><strong>Número documento</strong> - número do título</li>
              <li><strong>Categoria</strong> - classificação financeira</li>
              <li><strong>Histórico</strong> - descrição/observações</li>
              <li><strong>Pago</strong> - valor já pago</li>
              <li><strong>Competencia</strong> - mês/ano de competência</li>
              <li><strong>Forma Pagamento</strong> - método de pagamento</li>
              <li><strong>Chave PIX/Código boleto</strong> - informações de pagamento</li>
            </ul>
            <p>Este layout permite importar todo o contas a pagar para o sistema financeiro.</p>
          </div>
        );
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

  // Função auxiliar para obter o rótulo amigável do tipo de layout
  const getLayoutLabel = (option) => {
    const layout = layoutOptions.find(layout => layout.value === option);
    return layout ? layout.label : option;
  };

  // Função para baixar o modelo de planilha
  const downloadTemplate = (option) => {
    const templatePath = layoutTemplates[option];
    if (templatePath) {
      window.open(templatePath, '_blank');
      toast.success(`Baixando modelo de ${getLayoutLabel(option)}...`);
    } else {
      toast.error('Modelo não disponível');
    }
  };

  // Renderiza o resultado da validação do cabeçalho
  const renderValidationResult = () => {
    if (!validationResult) return null;
    
    if (validationResult.status === 'success') {
      return (
        <div className={styles.validationCard}>
          <div className={styles.cardHeader}>
            <h3>Resultado da Validação</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.validationSuccess}>
              <FaCheckCircle className={styles.validationSuccessIcon} />
              <div className={styles.validationMessage}>
                <h4>Layout validado com sucesso!</h4>
                <p>Todos os cabeçalhos estão corretos e compatíveis com o modelo esperado.</p>
              </div>
            </div>
            
            {validationResult.details && validationResult.details.columns && (
              <div className={styles.validationDetails}>
                <h4>Detalhes da Validação</h4>
                <div className={styles.columnsList}>
                  {validationResult.details.columns.map((column, index) => (
                    <div key={index} className={styles.columnItem}>
                      <FaCheckCircle className={styles.columnSuccessIcon} />
                      <span>{column}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.validationCard}>
          <div className={styles.cardHeader}>
            <h3>Resultado da Validação</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.validationError}>
              <FaTimesCircle className={styles.validationErrorIcon} />
              <div className={styles.validationMessage}>
                <h4>Problemas detectados no layout</h4>
                <p>{validationResult.message || 'Verifique se o arquivo segue o layout esperado'}</p>
              </div>
            </div>
            
            {validationResult.details && validationResult.details.expected && validationResult.details.found && (
              <div className={styles.validationDetails}>
                <h4>Comparação de Cabeçalhos</h4>
                <div className={styles.headersComparison}>
                  <div className={styles.headersColumn}>
                    <h5>Esperado</h5>
                    <div className={styles.columnsList}>
                      {validationResult.details.expected.map((column, index) => {
                        const isFound = validationResult.details.found.includes(column);
                        return (
                          <div key={`expected-${index}`} className={`${styles.columnItem} ${isFound ? styles.columnMatch : styles.columnMissing}`}>
                            {isFound ? <FaCheckCircle className={styles.columnSuccessIcon} /> : <FaTimesCircle className={styles.columnErrorIcon} />}
                            <span>{column}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className={styles.headersColumn}>
                    <h5>Encontrado</h5>
                    <div className={styles.columnsList}>
                      {validationResult.details.found.map((column, index) => {
                        const isExpected = validationResult.details.expected.includes(column);
                        return (
                          <div key={`found-${index}`} className={`${styles.columnItem} ${isExpected ? styles.columnMatch : styles.columnExtra}`}>
                            {isExpected ? <FaCheckCircle className={styles.columnSuccessIcon} /> : <FaExclamationTriangle className={styles.columnWarningIcon} />}
                            <span>{column}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>
            <FaFileExcel className={styles.titleIcon} />
            Divisor de Planilhas
          </h2>
          <p className={styles.description}>
            Divida planilhas grandes em partes menores para facilitar a importação no sistema.
          </p>
        </div>
      </div>

      {renderStepIndicator()}

      <div className={styles.contentContainer}>
        {error && (
          <div className={styles.errorMessage}>
            {typeof error === 'string' ? (
              <>
                <FaExclamationTriangle />
                <span>{error}</span>
              </>
            ) : (
              error
            )}
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
                        setValidationResult(null);
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
                      <span className={styles.fileInputTitle}>Clique para selecionar um arquivo</span>
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
                      {file && file.name.toLowerCase().endsWith('.csv') ? (
                        <FaFileAlt className={styles.fileSummaryIcon} />
                      ) : (
                        <FaFileExcel className={styles.fileSummaryIcon} />
                      )}
                      <h3>Arquivo selecionado</h3>
                    </div>
                    <div className={styles.fileSummaryContent}>
                      <div className={styles.fileSummaryItem}>
                        <strong>Nome:</strong> {file ? file.name : ''}
                      </div>
                      <div className={styles.fileSummaryItem}>
                        <strong>Tamanho:</strong> {file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : ''}
                      </div>
                      <div className={styles.fileSummaryItem}>
                        <strong>Formato:</strong> {file && file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 
                                           file && file.name.toLowerCase().endsWith('.xlsx') ? 'Excel (XLSX)' : 
                                           file && file.name.toLowerCase().endsWith('.xls') ? 'Excel (XLS)' : 'Desconhecido'}
                      </div>
                    </div>
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

        {/* Área de Status e Processamento - Agora mais visível */}
        <div className={styles.processingStatusArea}>
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

          {/* Renderizar o resultado da validação, se disponível */}
          {file && validationResult && !isProcessing && renderValidationResult()}

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
        </div>

        {/* Detalhes do layout selecionado */}
        {selectedOption && (
          <div className={styles.layoutInfoCard}>
            <div className={styles.cardHeader}>
              <h3>Informações do Layout</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.layoutInfo}>
                <FaInfoCircle className={styles.infoIcon} />
                {getLayoutInfo(selectedOption)}
                
                <div className={styles.templateDownload}>
                  <button 
                    className={styles.templateDownloadButton}
                    onClick={() => downloadTemplate(selectedOption)}
                  >
                    <FaCloudDownloadAlt />
                    <span>Baixar Modelo de {getLayoutLabel(selectedOption)}</span>
                  </button>
                  <p className={styles.templateNote}>Use este modelo como referência para garantir compatibilidade</p>
                </div>
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
                </ul>
              </div>
              
              <div className={styles.tipBox}>
                <FaInfoCircle className={styles.tipIcon} />
                <div>
                  <h4>Dica</h4>
                  <p>
                    Planilhas com muitas linhas causam timeouts ou erros na importação. Esta ferramenta divide a planilha 
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