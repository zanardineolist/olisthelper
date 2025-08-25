// utils/corsConfig.js
// Configuração de CORS para APIs públicas

const allowedOrigins = [
  'https://olisthelper.vercel.app',
  'https://www.olisthelper.com',
  'http://localhost:3000', // Para desenvolvimento
  'http://localhost:3001'
];

const corsConfig = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 horas
};

// Middleware simples para APIs Next.js
export function applyCors(req, res, next) {
  const origin = req.headers.origin;
  
  // Verificar se a origem é permitida
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Responder a requisições OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (next) next();
}

export default corsConfig;