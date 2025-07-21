
export const downloadAndProcessLogo = async () => {
  try {
    // URL do logo fornecido
    const logoUrl = 'https://bfxzcrfnzcqleimuipyy.supabase.co/storage/v1/object/public/imagens-logo//SmartRecoveryblue.png';
    
    // Baixar a imagem
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    
    // Criar um canvas para redimensionar
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // Definir dimensões do canvas (420x420)
        canvas.width = 420;
        canvas.height = 420;
        
        // Calcular dimensões para manter proporção
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        
        // Desenhar a imagem redimensionada
        ctx?.drawImage(img, x, y, size, size, 0, 0, 420, 420);
        
        // Converter para blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Criar URL para download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'ZRChat-logo-420x420.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('Logo processado e baixado com sucesso!');
            resolve();
          } else {
            reject(new Error('Erro ao processar a imagem'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem'));
      };
      
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Erro ao processar o logo:', error);
    throw error;
  }
};

// Função para gerar diferentes tamanhos do logo
export const generateLogoSizes = async (originalBlob: Blob) => {
  const sizes = [16, 32, 72, 192, 420, 512];
  const logos: { [key: number]: Blob } = {};
  
  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        
        const originalSize = Math.min(img.width, img.height);
        const x = (img.width - originalSize) / 2;
        const y = (img.height - originalSize) / 2;
        
        ctx?.drawImage(img, x, y, originalSize, originalSize, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          if (blob) {
            logos[size] = blob;
          }
          resolve();
        }, 'image/png');
      };
      
      img.src = URL.createObjectURL(originalBlob);
    });
  }
  
  return logos;
};
