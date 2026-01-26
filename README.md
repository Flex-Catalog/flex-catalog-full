# FlexCatalog - Sistema SaaS de Catálogo de Produtos

## 📋 Contexto do Projeto

FlexCatalog é um sistema web SaaS completo para cadastro de produtos com atributos dinâmicos, arquitetura multi-tenant (vários clientes/empresas), sistema de autenticação com permissões (RBAC), e pagamento obrigatório via Stripe (assinatura de US$ 500/mês) para liberar acesso ao sistema.

O sistema é mobile-friendly, desenvolvido em Node.js (NestJS) + React (Next.js), com traduções PT/EN/ES e arquitetura preparada para emissão fiscal por país (BR/EUA/PT etc. — começando com stubs).

## 🏗️ Arquitetura

### Stack Tecnológica

- **Monorepo**: pnpm workspaces
- **Backend**: NestJS + TypeScript
- **Banco de Dados**: MongoDB + Prisma (mongodb provider)
- **Frontend**: Next.js (React) + TypeScript
- **Autenticação**: JWT access + refresh tokens, cookies httpOnly, RBAC
- **Multi-tenant**: Isolamento completo por tenantId
- **Feature Flags**: Por tenant (cliente pode ter telas diferentes)
- **i18n**: pt/en/es (next-intl)
- **Pagamentos**: Stripe (assinatura mensal)
- **Storage**: AWS S3 (com suporte a LocalStack para desenvolvimento)

### Estrutura de Pastas

```
product-catalog/
├── apps/
│   ├── api/              # Backend NestJS
│   └── web/              # Frontend Next.js
├── packages/
│   └── shared/           # Tipos e constantes compartilhados
├── docker/
│   └── mongo/            # Scripts de inicialização MongoDB
├── docker-compose.yml    # Orquestração de serviços
├── pnpm-workspace.yaml
└── package.json
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker e Docker Compose

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Variáveis de Ambiente

#### Backend (`apps/api/.env`)

Copie o arquivo `.env.example` e configure:

```bash
cd apps/api
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
# App
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="mongodb://admin:admin123@localhost:27017/product_catalog?authSource=admin"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_51SsWeKKhMoJX6zEuD8iFIbuPcFEi2Rr6qDahIIdz2BRmTKhldDAHMEeAM06cSCwURw3ZJ6Ktv7KXM6eJY2OKH1l500TfP18AtJ
STRIPE_PUBLISHABLE_KEY=pk_test_51SsWeKKhMoJX6zEusPIJ5LwHN0iuYOPL3ZaN7TkK1CDVBSUDkQ5i4wKuZnjncgv52jVzocAjEEhuRtc6MCD7UB5y00tTNLC7fN
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID=price_monthly_500

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=product-catalog-uploads
AWS_S3_ENDPOINT=http://localhost:4566

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SsWeKKhMoJX6zEusPIJ5LwHN0iuYOPL3ZaN7TkK1CDVBSUDkQ5i4wKuZnjncgv52jVzocAjEEhuRtc6MCD7UB5y00tTNLC7fN
```

### 3. Iniciar Serviços com Docker

```bash
docker compose up -d
```

Isso iniciará:
- MongoDB (porta 27017)
- Mongo Express (porta 8081) - Interface web para MongoDB
- LocalStack (porta 4566) - S3 local para desenvolvimento

### 4. Configurar Banco de Dados

```bash
# Gerar Prisma Client
pnpm db:generate

# Aplicar schema ao banco
pnpm db:push
```

### 5. Iniciar Aplicação

```bash
# Inicia API e Web simultaneamente
pnpm dev

# Ou iniciar separadamente:
pnpm dev:api  # Backend na porta 3001
pnpm dev:web  # Frontend na porta 3000
```

### 6. Acessar Aplicação

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/docs
- **Mongo Express**: http://localhost:8081

## 📚 Funcionalidades

### ✅ Autenticação e Autorização

- **Registro**: Cria tenant com status `PENDING_PAYMENT` e redireciona para Stripe Checkout
- **Login**: JWT access token (15min) + refresh token (30 dias)
- **RBAC**: Sistema de permissões baseado em roles (TENANT_ADMIN, OPERATOR, READER)
- **Feature Flags**: Controle de funcionalidades por tenant

### ✅ Produtos

- **CRUD Completo**: Criar, listar, atualizar e deletar produtos
- **Atributos Dinâmicos**: JSON livre por produto (string/number/boolean/null)
- **Validação**: Validação com Zod no backend
- **Categorias**: Associação opcional com categorias
- **Imagens**: Suporte a múltiplas imagens por produto
- **SKU**: Código único por tenant

### ✅ Categorias

- **CRUD Completo**: Gerenciamento de categorias
- **Hierarquia**: Suporte a categorias pai/filho
- **Templates de Atributos**: Definição de templates de atributos por categoria
- **Visualização em Árvore**: Endpoint para visualizar categorias em estrutura de árvore

### ✅ Notas Fiscais

- **Criação**: Criar notas fiscais em rascunho
- **Emissão**: Emitir notas fiscais com providers por país
- **Providers Fiscais**: Arquitetura plugável por país
  - **Brasil**: Provider stub (retorna "not configured")
  - **EUA**: Provider básico funcional
  - **Portugal**: Provider stub (retorna "not configured")
- **Status**: DRAFT, PENDING, ISSUED, FAILED, CANCELED

### ✅ Upload de Imagens

- **Presigned URLs**: Geração de URLs assinadas para upload direto ao S3
- **Validação**: Validação de tipo e extensão de arquivo
- **AWS S3**: Integração completa com S3 (suporte a LocalStack para dev)

### ✅ Relatórios

- **Dashboard**: Visão geral com métricas consolidadas
- **Produtos**: Relatório de produtos (total, ativos, inativos, por categoria)
- **Vendas**: Relatório de vendas (invoices, receita, por status, por país)
- **Categorias**: Relatório de categorias (total, com/sem produtos, top categorias)

### ✅ Integração Stripe

- **Checkout**: Criação de sessão de checkout para assinatura
- **Webhooks**: Processamento de eventos do Stripe
  - `checkout.session.completed`: Ativa tenant
  - `customer.subscription.updated`: Atualiza status
  - `customer.subscription.deleted`: Cancela tenant
  - `invoice.payment_failed`: Marca como PAST_DUE
- **Customer Portal**: Acesso ao portal de gerenciamento do Stripe
- **Status do Tenant**: PENDING_PAYMENT, ACTIVE, PAST_DUE, CANCELED

## 🔐 Permissões e Roles

### Roles

- **TENANT_ADMIN**: Acesso total (todas as permissões)
- **OPERATOR**: Pode gerenciar produtos e invoices
- **READER**: Apenas leitura

### Permissões

- `PRODUCT_READ`: Ler produtos
- `PRODUCT_WRITE`: Criar/editar/deletar produtos
- `INVOICE_READ`: Ler invoices
- `INVOICE_ISSUE`: Criar e emitir invoices
- `USER_MANAGE`: Gerenciar usuários
- `TENANT_MANAGE`: Gerenciar configurações do tenant

## 🌍 Internacionalização (i18n)

O sistema suporta 3 idiomas:

- **Português (pt)**: Idioma padrão
- **Inglês (en)**
- **Espanhol (es)**

As traduções estão em `apps/web/messages/{locale}.json`

## 🧪 Testes

### Backend

```bash
# Executar todos os testes
pnpm --filter @product-catalog/api test

# Com cobertura
pnpm --filter @product-catalog/api test:cov

# Watch mode
pnpm --filter @product-catalog/api test:watch
```

### Frontend

```bash
# Executar todos os testes
pnpm --filter @product-catalog/web test

# Com cobertura
pnpm --filter @product-catalog/web test:cov

# Watch mode
pnpm --filter @product-catalog/web test:watch
```

## 📝 API Endpoints

### Autenticação

- `POST /auth/register` - Registrar novo tenant e usuário
- `POST /auth/login` - Login
- `POST /auth/refresh` - Renovar access token
- `POST /auth/logout` - Logout

### Produtos

- `GET /products` - Listar produtos (com paginação e filtros)
- `GET /products/:id` - Obter produto por ID
- `POST /products` - Criar produto
- `PATCH /products/:id` - Atualizar produto
- `DELETE /products/:id` - Deletar produto
- `PATCH /products/:id/images` - Atualizar imagens do produto

### Categorias

- `GET /categories` - Listar categorias
- `GET /categories?tree=true` - Listar categorias em árvore
- `GET /categories/:id` - Obter categoria por ID
- `POST /categories` - Criar categoria
- `PATCH /categories/:id` - Atualizar categoria
- `DELETE /categories/:id` - Deletar categoria

### Invoices

- `GET /invoices` - Listar invoices
- `GET /invoices/:id` - Obter invoice por ID
- `POST /invoices` - Criar invoice
- `POST /invoices/:id/issue` - Emitir invoice
- `PATCH /invoices/:id/cancel` - Cancelar invoice

### Uploads

- `POST /uploads/generate-url` - Gerar URL assinada para upload
- `DELETE /uploads/:key` - Deletar arquivo

### Relatórios

- `GET /reports/dashboard` - Dashboard completo
- `GET /reports/products` - Relatório de produtos
- `GET /reports/sales` - Relatório de vendas
- `GET /reports/categories` - Relatório de categorias

### Billing

- `POST /billing/checkout` - Criar sessão de checkout Stripe
- `POST /billing/portal` - Criar sessão do Customer Portal
- `POST /billing/webhook` - Webhook do Stripe (público)

## 💳 Testando Pagamentos com Stripe

O sistema está configurado com as chaves de teste do Stripe. Para testar pagamentos, use os cartões de teste disponíveis em: https://docs.stripe.com/testing#cards

### Cartões de Teste Recomendados

- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use qualquer data futura para expiração e qualquer CVC de 3 dígitos.

## 🗄️ Modelos de Dados

### Tenant

- `id`: ObjectId
- `name`: Nome da empresa
- `country`: Código do país
- `locale`: Idioma padrão
- `features[]`: Array de features habilitadas
- `status`: PENDING_PAYMENT | ACTIVE | PAST_DUE | CANCELED
- `stripeCustomerId`: ID do cliente no Stripe
- `stripeSubscriptionId`: ID da assinatura no Stripe
- `currentPeriodEnd`: Data de término do período atual

### User

- `id`: ObjectId
- `tenantId`: Referência ao tenant
- `email`: Email (único por tenant)
- `name`: Nome do usuário
- `passwordHash`: Hash da senha (argon2)
- `roles[]`: Array de roles
- `refreshTokenHash`: Hash do refresh token atual
- `isActive`: Status ativo/inativo

### Product

- `id`: ObjectId
- `tenantId`: Referência ao tenant
- `categoryId`: Referência opcional à categoria
- `name`: Nome do produto
- `sku`: Código SKU (único por tenant)
- `priceCents`: Preço em centavos
- `currency`: Moeda (padrão: USD)
- `attributes`: JSON com atributos dinâmicos
- `fiscal`: JSON com dados fiscais
- `images[]`: Array de URLs de imagens
- `isActive`: Status ativo/inativo

### Category

- `id`: ObjectId
- `tenantId`: Referência ao tenant
- `name`: Nome da categoria
- `parentId`: Referência opcional à categoria pai
- `attributeTemplate`: JSON com template de atributos

### Invoice

- `id`: ObjectId
- `tenantId`: Referência ao tenant
- `country`: Código do país
- `status`: DRAFT | PENDING | ISSUED | FAILED | CANCELED
- `payload`: JSON com dados da invoice
- `result`: JSON com resultado da emissão

## 🔧 Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Desenvolvimento
pnpm dev              # Inicia API + Web
pnpm dev:api          # Apenas API
pnpm dev:web          # Apenas Web

# Build
pnpm build            # Build de todos os projetos

# Testes
pnpm test             # Todos os testes
pnpm test:cov         # Com cobertura

# Banco de Dados
pnpm db:generate      # Gerar Prisma Client
pnpm db:push          # Aplicar schema
pnpm --filter @product-catalog/api prisma:studio  # Abrir Prisma Studio

# Docker
docker compose up -d  # Iniciar serviços
docker compose down   # Parar serviços
docker compose logs   # Ver logs
```

## 📦 Estrutura de Módulos

### Backend (NestJS)

- **auth**: Autenticação e autorização
- **users**: Gerenciamento de usuários
- **tenants**: Gerenciamento de tenants
- **products**: CRUD de produtos
- **categories**: CRUD de categorias
- **invoices**: Geração de notas fiscais
- **uploads**: Upload de imagens (S3)
- **reports**: Relatórios e dashboards
- **billing**: Integração Stripe

### Frontend (Next.js)

- **app/[locale]**: Rotas com suporte a i18n
  - `/login`: Página de login
  - `/register`: Página de registro
  - `/app`: Dashboard
  - `/app/products`: Lista de produtos
  - `/app/categories`: Lista de categorias
  - `/app/invoices`: Lista de invoices
  - `/app/reports`: Relatórios
  - `/app/users`: Gerenciamento de usuários
  - `/app/billing`: Gerenciamento de assinatura

## 🚨 Regras de Negócio

1. **Acesso Restrito**: Apenas tenants com status `ACTIVE` podem acessar o sistema (exceto rotas de auth/billing)
2. **SKU Único**: SKU deve ser único por tenant
3. **Categorias**: Não é possível deletar categoria com produtos ou subcategorias
4. **Invoices**: Apenas invoices em `DRAFT` podem ser emitidas
5. **Atributos**: Atributos de produtos devem ser string, number, boolean ou null
6. **Imagens**: Apenas tipos de imagem permitidos (jpeg, png, webp, gif)

## 🔒 Segurança

- **JWT**: Tokens assinados e validados
- **Refresh Tokens**: Armazenados como hash no banco
- **Cookies httpOnly**: Refresh tokens em cookies seguros
- **Validação de Input**: Zod e class-validator
- **RBAC**: Controle de acesso baseado em roles
- **Multi-tenant**: Isolamento completo por tenantId
- **Stripe Webhooks**: Validação de assinatura do webhook

## 📈 Próximos Passos

- [ ] Implementar providers fiscais reais (NFe, etc.)
- [ ] Adicionar mais testes de integração
- [ ] Implementar cache (Redis)
- [ ] Adicionar rate limiting
- [ ] Implementar auditoria de ações
- [ ] Adicionar exportação de relatórios (PDF/Excel)
- [ ] Melhorar UI/UX do frontend
- [ ] Adicionar notificações em tempo real

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Suporte

Para dúvidas ou problemas, consulte a documentação da API em `/docs` ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ usando NestJS, Next.js e TypeScript**
