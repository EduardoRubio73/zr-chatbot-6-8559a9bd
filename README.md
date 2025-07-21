
# SIARA IA - Progressive Web App (PWA)

Um assistente virtual inteligente desenvolvido como PWA para PME e profissionais liberais, criado pela ZR Agency.

## ✨ Características

- 📱 **Progressive Web App (PWA)** - Instalável em dispositivos móveis e desktop
- 🔄 **Funcionamento Offline** - Cache inteligente para uso sem internet
- 💬 **Interface WhatsApp-like** - Design familiar e intuitivo
- 🤖 **IA Conversational** - Respostas inteligentes e contextuais
- 🎨 **Design Moderno** - Gradientes verdes e animações suaves
- 📊 **Supabase Integration** - Banco de dados em tempo real
- 🔔 **Push Notifications** - Notificações quando offline
- 📱 **Responsivo** - Funciona perfeitamente em todos os dispositivos

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ e npm
- Conta no Supabase (opcional para desenvolvimento)

### Instalação Local

```bash
# Clone o repositório
git clone <seu-repositorio>
cd siara-ia-pwa

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### Configuração do Supabase

1. Acesse [Supabase](https://supabase.com/) e crie um novo projeto
2. Configure as variáveis de ambiente (opcional para desenvolvimento local)
3. As tabelas serão criadas automaticamente na primeira execução

#### Tabelas Criadas Automaticamente:

- **profiles** - Perfis de usuários
- **conversations** - Conversas/chats
- **messages** - Mensagens
- **app_settings** - Configurações do sistema
- **activity_logs** - Logs de atividade

## 📦 Build e Deploy

### Build para Produção

```bash
# Construir para produção
npm run build

# Visualizar build localmente
npm run preview
```

### Deploy Recomendado

- **Netlify**: Ideal para PWAs com deploy automático
- **Vercel**: Excelente performance e CDN global
- **Firebase Hosting**: Integração nativa com PWA features

### Configuração PWA

O app já está configurado como PWA com:

- ✅ **Manifest.json** - Configuração de instalação
- ✅ **Service Worker** - Cache e funcionamento offline
- ✅ **Icons** - Ícones para diferentes dispositivos
- ✅ **Meta Tags** - Tags para iOS e Android
- ✅ **Offline Page** - Página para uso sem internet

## 📱 Como Instalar o PWA

### Android (Chrome/Edge)
1. Acesse o site pelo navegador
2. Toque no banner "Instalar SIARA IA" ou
3. Menu do navegador → "Adicionar à tela inicial"

### iOS (Safari)
1. Acesse o site pelo Safari
2. Toque no botão de compartilhar (□↗)
3. Selecione "Adicionar à Tela de Início"

### Desktop (Chrome/Edge)
1. Clique no ícone de instalação na barra de endereços
2. Ou vá em Menu → "Instalar SIARA IA..."

## 🛠️ Tecnologias Utilizadas

- **React 18** - Framework JavaScript
- **TypeScript** - Tipagem estática
- **Vite** - Build tool moderna
- **Tailwind CSS** - Framework CSS utilitário
- **Shadcn/ui** - Componentes de UI
- **Supabase** - Backend como serviço
- **Lucide React** - Ícones
- **Service Worker** - Funcionalidades PWA

## 🎨 Design System

### Cores Principais
```css
--whatsapp-green: 142 76% 36%     /* #25D366 */
--whatsapp-green-light: 142 76% 46% /* Verde claro */
--whatsapp-green-dark: 142 76% 26%  /* Verde escuro */
--whatsapp-teal: 174 75% 41%        /* #128C7E */
--whatsapp-bg: 43 20% 94%           /* Fundo das mensagens */
```

### Componentes
- **Message Bubbles** - Estilo WhatsApp com gradientes
- **Chat Header** - Cabeçalho com status online/offline
- **Input Area** - Barra de entrada com anexos e áudio
- **PWA Installer** - Banner de instalação inteligente

## 📋 Funcionalidades

### ✅ Implementadas
- [x] Interface de chat completa
- [x] Mensagens em tempo real (simulado)
- [x] Design responsivo
- [x] PWA com instalação
- [x] Funcionamento offline
- [x] Service worker
- [x] Supabase integration
- [x] Menu interativo
- [x] Status online/offline

### 🔄 Em Desenvolvimento
- [ ] Integração com IA real
- [ ] Upload de arquivos
- [ ] Gravação de áudio
- [ ] Videochamadas
- [ ] Push notifications
- [ ] Sincronização em tempo real
- [ ] Múltiplas conversas

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Visualizar build
npm run lint         # Linter ESLint
npm run type-check   # Verificação de tipos
```

## 📱 Suporte a Dispositivos

### Navegadores Suportados
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

### Dispositivos Testados
- ✅ iPhone (iOS 13+)
- ✅ Android (8.0+)
- ✅ Desktop (Windows, macOS, Linux)
- ✅ Tablets

## 🐛 Troubleshooting

### Problemas Comuns

**PWA não instala:**
- Verifique se está usando HTTPS
- Confirme se o manifest.json está acessível
- Teste em modo incógnito

**Service Worker não funciona:**
- Limpe o cache do navegador
- Verifique o console para erros
- Registre novamente o SW

**Supabase não conecta:**
- Verifique as credenciais
- Confirme se as tabelas foram criadas
- Teste a conexão de rede

## 📞 Suporte

Para suporte técnico ou dúvidas:

- 📧 **Email**: contato@zragency.com.br
- 📱 **WhatsApp**: (11) 99999-9999
- 🌐 **Site**: www.zragency.com.br

## 📄 Licença

Este projeto é propriedade da **ZR Agency**. Todos os direitos reservados.

---

**Desenvolvido com ❤️ pela ZR Agency**
