// utils/validador-ml/helpers.js
export const parseAttributesFromHtml = (cardsHtml) => {
    if (!cardsHtml) return [];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(cardsHtml, 'text/html');
    const cards = doc.querySelectorAll('.card');
    const attributes = [];
    
    cards.forEach(card => {
      try {
        const detailsContent = card.querySelector('.details pre')?.textContent;
        if (detailsContent) {
          const attribute = JSON.parse(detailsContent);
          attributes.push(attribute);
        }
      } catch (error) {
        console.error('Erro ao processar atributo:', error);
      }
    });
    
    return attributes;
  };
  
  export const sanitizeQuery = (query) => {
    if (typeof query !== 'string') return '';
    return query.replace(/[^\w\s-]/gi, '').trim();
  };