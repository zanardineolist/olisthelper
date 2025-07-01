import MercadoLivreAPI from '../../../utils/mercadolivre';

export default async function handler(req, res) {
  const { id } = req.query;
  const ml = new MercadoLivreAPI();
  try {
    ml.validateCredentials();
    let data;
    if (id) {
      data = await ml.getCategoryById(id);
    } else {
      data = await ml.getAllCategories();
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 