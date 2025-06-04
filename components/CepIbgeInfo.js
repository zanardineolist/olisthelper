import styles from '../styles/Tools.module.css';

export default function CepIbgeInfo() {
  return (
    <div className={styles.infoCard}>
      <h2>Como utilizar</h2>
      <div className={styles.stepsList}>
        <div className={styles.step}>
          <span className={styles.stepNumber}>1</span>
          <div className={styles.stepContent}>
            <h3>Identifique o erro da SEFAZ</h3>
            <p>
              Quando o Seller tenta autorizar uma nota fiscal com nome de cidade incorreto, 
              a SEFAZ retorna um erro como este:
            </p>
            <div className={styles.errorImageContainer}>
              <img 
                src="https://i.imgur.com/xWxipTb.jpeg" 
                alt="Exemplo de erro da SEFAZ sobre nomenclatura de município" 
                className={styles.errorImage}
              />
            </div>
          </div>
        </div>
        
        <div className={styles.step}>
          <span className={styles.stepNumber}>2</span>
          <div className={styles.stepContent}>
            <h3>Consulte o CEP</h3>
            <p>
              Copie o CEP utilizado na NF-e e cole no campo de busca da ferramenta. 
              Clique em "Consultar" para obter a nomenclatura correta da cidade.
            </p>
          </div>
        </div>
        
        <div className={styles.step}>
          <span className={styles.stepNumber}>3</span>
          <div className={styles.stepContent}>
            <h3>Copie o nome oficial da cidade</h3>
            <p>
              Clique no botão "Copiar" ao lado do nome da cidade retornado pelo IBGE 
              (destacado em azul na seção de resultados).
            </p>
          </div>
        </div>
        
        <div className={styles.step}>
          <span className={styles.stepNumber}>4</span>
          <div className={styles.stepContent}>
            <h3>Corrija na NF-e</h3>
            <p>
              No sistema Olist ERP, selecione a nomenclatura correta do IBGE no campo "Município" 
              da NF-e e salve as alterações.
            </p>
          </div>
        </div>
        
        <div className={styles.step}>
          <span className={styles.stepNumber}>5</span>
          <div className={styles.stepContent}>
            <h3>Tente autorizar novamente</h3>
            <p>
              Após fazer as correções, tente autorizar a NF-e novamente.
            </p>
          </div>
        </div>
      </div>
      
      <div className={styles.importantAlert}>
        <h3>⚠️ Importante!</h3>
        <p>
          Caso o pedido de venda esteja preenchido com o endereço do cliente e um endereço de 
          cobrança com o mesmo CEP, é necessário ajustar o município no pedido original e 
          gerar uma nova NF-e. Caso contrário, o erro continuará ocorrendo.
        </p>
      </div>
      
      <h2>Por que isso é importante?</h2>
      <p>
        Ao emitir uma Nota Fiscal Eletrônica (NF-e), os dados do destinatário são validados pela SEFAZ, que 
        utiliza a nomenclatura oficial do IBGE para os municípios brasileiros. Se o nome da cidade na NF-e 
        não corresponder exatamente à nomenclatura oficial, a nota será rejeitada com o erro mostrado acima.
      </p>
      <p>
        Divergências comuns incluem acentuação, artigos (do/da), abreviações e nomes históricos que 
        foram alterados oficialmente.
      </p>
    </div>
  );
} 