
// Utilitários de validação e sanitização de entrada
export const validateMessage = (message: string): { isValid: boolean; error?: string } => {
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'Mensagem não pode estar vazia' };
  }

  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Mensagem não pode estar vazia' };
  }

  if (trimmed.length > 5000) {
    return { isValid: false, error: 'Mensagem muito longa (máximo 5000 caracteres)' };
  }

  // Verificar por conteúdo potencialmente malicioso
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Conteúdo não permitido na mensagem' };
    }
  }

  return { isValid: true };
};

export const sanitizeMessage = (message: string): string => {
  if (!message || typeof message !== 'string') return '';
  
  return message
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateProfileName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Nome é obrigatório' };
  }

  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Nome não pode estar vazio' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Nome muito longo (máximo 100 caracteres)' };
  }

  // Permitir apenas letras, números, espaços e alguns caracteres especiais
  const validNamePattern = /^[a-zA-ZÀ-ÿ0-9\s\-\.\_]+$/;
  if (!validNamePattern.test(trimmed)) {
    return { isValid: false, error: 'Nome contém caracteres não permitidos' };
  }

  return { isValid: true };
};

export const validateWhatsApp = (whatsapp: string): { isValid: boolean; error?: string } => {
  if (!whatsapp) return { isValid: true }; // Campo opcional
  
  if (typeof whatsapp !== 'string') {
    return { isValid: false, error: 'Formato de WhatsApp inválido' };
  }

  const trimmed = whatsapp.trim();
  
  // Formato brasileiro: +55 (XX) 9XXXX-XXXX ou variações
  const whatsappPattern = /^(\+55\s?)?\(?[1-9]{2}\)?\s?9?[0-9]{4,5}\-?[0-9]{4}$/;
  
  if (!whatsappPattern.test(trimmed)) {
    return { isValid: false, error: 'Formato de WhatsApp inválido (use: +55 (XX) 9XXXX-XXXX)' };
  }

  return { isValid: true };
};

export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'Nenhum arquivo selecionado' };
  }

  // Verificar tamanho do arquivo (máximo 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Arquivo muito grande (máximo 10MB)' };
  }

  // Verificar tipos de arquivo permitidos
  const allowedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov']
  };

  const allAllowedTypes = [...allowedTypes.image, ...allowedTypes.audio, ...allowedTypes.video];
  
  if (!allAllowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Tipo de arquivo não permitido. Use apenas imagens, áudios ou vídeos.' 
    };
  }

  return { isValid: true };
};

export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') return 'arquivo_sem_nome';
  
  return filename
    .replace(/[^a-zA-Z0-9\-\_\.]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100); // Limitar tamanho do nome
};
