├── public/                (Arquivos públicos acessíveis diretamente)
│   ├── favicon.png        (Ícone do site)
│   └── logo.png           (Logo da aplicação)
│
├── src/                   (Código-fonte do projeto)
│   ├── components/        (Componentes da aplicação)
│   │   ├── Layout.js               (Cabeçalho, rodapé e alternância de tema)
│   │   └── RegisterForm.js         (Formulário de registro de ajuda)
│   │
│   ├── pages/             (Páginas da aplicação)
│   │   ├── index.html               (Página inicial)
│   │   └── dashboard.html           (Página exclusiva para analistas)
│   │
│   ├── services/          (Serviços para integração)
│   │   └── googleSheets.js          (Funções para manipular Google Sheets e autenticação)
│   │
│   ├── styles/            (Estilos da aplicação)
│   │   ├── global.css              (Estilos gerais)
│   │   └── registerForm.css        (Estilos específicos do formulário de registro)
│   │
│   └── scripts/           (Scripts principais)
│       ├── app.js                  (Lógica principal: inicialização, autenticação, registro)
│       └── checkEmail.js           (Validações de e-mail e controle de login)
│
├── .env                    (Variáveis de ambiente)
├── .gitignore              (Arquivos e pastas ignorados pelo Git)
├── package.json            (Dependências e scripts do projeto)
├── README.md               (Instruções para o projeto)
└── vercel.json             (Configuração do deploy no Vercel)
