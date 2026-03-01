# FlexCatalog - Guia de Custos de Produção

Referência completa de todos os serviços e seus custos para rodar a aplicação profissionalmente.

---

## Resumo Geral

| Categoria | Serviço | Custo Mensal |
|-----------|---------|-------------|
| Backend (API) | Render.com Starter | US$ 7 |
| Banco de Dados | MongoDB Atlas M2 | US$ 9 |
| Frontend | Vercel Pro | US$ 20 |
| Fiscal | Focus NFe básico | R$ 49 |
| Pagamentos | Stripe | 2,9% + US$0,30/transação |
| Storage | AWS S3 | US$ 1–5 |
| Domínio | .com.br | R$ 40/ano |
| Email | Resend.com | Grátis até 3k emails/mês |
| Código | GitHub Free | Grátis |

**Custo fixo mínimo estimado: ~US$ 36/mês + R$ 49/mês (Focus NFe)**

---

## 1. Render.com — Backend (API NestJS)

**Site:** https://render.com

| Plano | Preço | RAM | CPU | Obs |
|-------|-------|-----|-----|-----|
| Free | Grátis | 512MB | Compartilhado | Dorme após 15min inativo |
| **Starter** | **US$ 7/mês** | **512MB** | **Compartilhado** | **Sempre ativo — recomendado** |
| Standard | US$ 25/mês | 2GB | 1 vCPU | Para alto tráfego |
| Pro | US$ 85/mês | 4GB | 2 vCPU | Para uso intenso |

> **Por que pagar:** O plano grátis "dorme" após 15 minutos sem uso. A primeira requisição depois demora 30–60 segundos — péssima experiência para usuários reais.

---

## 2. MongoDB Atlas — Banco de Dados

**Site:** https://www.mongodb.com/cloud/atlas

| Plano | Preço | Storage | RAM | Obs |
|-------|-------|---------|-----|-----|
| M0 Free | Grátis | 512MB | Compartilhado | Bom para testes |
| **M2 Shared** | **US$ 9/mês** | **2GB** | **Compartilhado** | **Recomendado para início** |
| M5 Shared | US$ 25/mês | 5GB | Compartilhado | Médio porte |
| M10 Dedicated | US$ 57/mês | 10GB | 2GB RAM dedicado | Produção de alto volume |

> **Quando migrar:** Assim que os dados ultrapassarem ~300MB ou sentir lentidão nas queries.

---

## 3. Vercel — Frontend (Next.js)

**Site:** https://vercel.com

| Plano | Preço | Bandwidth | Obs |
|-------|-------|-----------|-----|
| Hobby | Grátis | 100GB | Apenas uso pessoal/teste |
| **Pro** | **US$ 20/mês** | **1TB** | **Necessário para uso comercial** |
| Enterprise | Sob consulta | Ilimitado | Grandes empresas |

> **Atenção:** Os Termos de Uso da Vercel proíbem uso comercial no plano Hobby. Migre para Pro quando tiver clientes reais pagando.

> **Repos privados:** Funcionam normalmente no plano Hobby — não precisa pagar só por causa do repositório privado.

---

## 4. Focus NFe — Integração Fiscal Brasileira

**Site:** https://focusnfe.com.br

| Plano | Preço | NFS-e | NF-e | Obs |
|-------|-------|-------|------|-----|
| Homologação | Grátis | Ilimitado (teste) | Ilimitado (teste) | Notas não têm validade fiscal |
| **Básico** | **R$ 49/mês** | Incluso | — | **Para NFS-e (serviços)** |
| Profissional | R$ 149/mês | Incluso | Incluso | NFS-e + NF-e (produtos) |
| Enterprise | Sob consulta | Ilimitado | Ilimitado | Alto volume |

> **Como funciona no FlexCatalog:** O token fica na variável `FOCUS_NFE_TOKEN` do servidor. Todas as empresas cadastradas na plataforma usam esse token — você paga um plano único para todos os tenants.

> **Quando pagar:** Só quando precisar emitir notas com validade fiscal real para clientes.

---

## 5. Stripe — Pagamentos

**Site:** https://stripe.com

| Tipo | Taxa | Obs |
|------|------|-----|
| Cartão nacional | 2,9% + US$0,30 | Por transação aprovada |
| Cartão internacional | 3,9% + US$0,30 | Por transação aprovada |
| Estorno | US$15 por disputa | Se o cliente contestar |
| Mensalidade | **Grátis** | Sem custo fixo |

> **Exemplo:** Se você cobra R$500/mês de um cliente, o Stripe fica com ~R$16 (usando câmbio aproximado). Você recebe ~R$484.

> **Modo teste:** Totalmente gratuito para desenvolvimento e testes. Use o cartão `4242 4242 4242 4242` para simular pagamentos.

---

## 6. AWS S3 — Storage de Arquivos (Imagens de Produtos)

**Site:** https://aws.amazon.com/s3

| Recurso | Preço |
|---------|-------|
| Storage | US$0,023/GB/mês |
| Transferência de saída | US$0,09/GB |
| Requisições PUT/POST | US$0,005 por 1.000 |
| Requisições GET | US$0,0004 por 1.000 |

> **Estimativa real:** Para uma plataforma com ~1.000 produtos e imagens de tamanho médio (~500KB cada), o custo seria **menos de US$5/mês**.

> **Alternativa mais barata:** Cloudflare R2 — mesma API do S3, porém sem cobrar por transferência de saída (egress gratuito). Plano gratuito inclui 10GB de storage.

---

## 7. Domínio

| TLD | Registradora | Custo Anual |
|-----|-------------|-------------|
| `.com.br` | Registro.br | ~R$40/ano |
| `.com` | Namecheap / GoDaddy | ~US$10–15/ano |
| `.app` | Google Domains / Squarespace | ~US$14/ano |

> **Como conectar:** Após comprar o domínio, adicione os nameservers da Vercel (frontend) e configure um subdomínio `api.seudominio.com` apontando para o Render (backend).

---

## 8. Email Transacional (Reset de Senha, Boas-vindas)

**Site:** https://resend.com

| Plano | Preço | Emails/mês | Obs |
|-------|-------|-----------|-----|
| **Free** | **Grátis** | **3.000** | **Suficiente para começar** |
| Pro | US$20/mês | 50.000 | Quando crescer |
| Business | US$90/mês | 100.000 | Alto volume |

---

## 9. GitHub — Hospedagem do Código

**Site:** https://github.com

| Plano | Preço | Repos Privados | Colaboradores |
|-------|-------|---------------|---------------|
| **Free** | **Grátis** | **Ilimitados** | **Ilimitados** |
| Pro (pessoal) | US$4/mês | Ilimitados | Ilimitados + tools extras |
| Team (organização) | US$4/usuário/mês | Ilimitados | Para equipes |
| Enterprise | US$21/usuário/mês | Ilimitados | SSO, compliance |

> **Para uso solo:** O plano **Free é suficiente**. Repos privados funcionam normalmente, incluindo a integração com Vercel e Render.

> **Quando pagar:** Apenas se precisar de GitHub Actions com muitos minutos, code review avançado em equipe, ou quiser criar uma organização com nome de empresa.

---

## Prioridade de Contratação

```
Fase 1 — Lançar (indispensável)
  ✅ Render Starter         US$7/mês    → API sempre ativa
  ✅ Focus NFe (homologação) Grátis     → Testar emissão de notas

Fase 2 — Primeiros clientes
  ✅ Focus NFe Básico       R$49/mês    → Emitir NFS-e real
  ✅ Domínio .com.br        R$40/ano    → URL profissional
  ✅ MongoDB M2             US$9/mês    → Quando dados crescerem

Fase 3 — Crescimento
  ✅ Vercel Pro             US$20/mês   → Uso comercial formal
  ✅ Cloudflare R2          Grátis 10GB → Storage sem custo de saída

Fase 4 — Escala
  ✅ MongoDB M10            US$57/mês   → Alta performance
  ✅ Render Standard        US$25/mês   → Mais RAM/CPU
  ✅ Focus NFe Profissional R$149/mês   → NF-e + NFS-e
```

---

## Custo Total por Fase

| Fase | Custo Mensal Estimado |
|------|-----------------------|
| Fase 1 (lançamento) | ~US$7 (~R$35) |
| Fase 2 (primeiros clientes) | ~US$16 + R$49 (~R$130) |
| Fase 3 (crescimento) | ~US$36 + R$49 (~R$230) |
| Fase 4 (escala) | ~US$111 + R$149 (~R$710) |

> Câmbio de referência: US$1 ≈ R$5,00

---

## Custo Total por Porte de Empresa

Estimativas realistas de gasto mensal de acordo com o tamanho da operação.
Câmbio utilizado: **US$1 = R$5,00**. Stripe descontado da receita (não é custo fixo).

---

### Pequena Empresa (1–15 clientes ativos)

> Startup, profissional autônomo ou empresa em fase inicial.

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Render.com (API) | Starter | R$ 35 |
| MongoDB Atlas | M0 Free | R$ 0 |
| Vercel (Frontend) | Hobby | R$ 0 |
| Focus NFe | Básico | R$ 49 |
| AWS S3 | Pay-per-use | R$ 5 |
| Email (Resend) | Free | R$ 0 |
| Domínio .com.br | — | R$ 3 |
| GitHub | Free | R$ 0 |
| **Total fixo/mês** | | **~R$ 92** |
| Stripe (por cliente a R$2.500/mês) | 3,2% | ~R$80/cliente |

**Exemplo: 10 clientes × R$2.500 = R$25.000 receita → ~R$800 Stripe → custo total ~R$892/mês**

---

### Empresa Média (15–80 clientes ativos)

> Operação consolidada com necessidade de estabilidade e mais recursos.

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Render.com (API) | Starter | R$ 35 |
| MongoDB Atlas | M2 Shared | R$ 45 |
| Vercel (Frontend) | Pro | R$ 100 |
| Focus NFe | Básico | R$ 49 |
| AWS S3 | Pay-per-use | R$ 15 |
| Email (Resend) | Free | R$ 0 |
| Domínio .com.br | — | R$ 3 |
| GitHub | Free | R$ 0 |
| **Total fixo/mês** | | **~R$ 247** |
| Stripe (por cliente a R$2.500/mês) | 3,2% | ~R$80/cliente |

**Exemplo: 40 clientes × R$2.500 = R$100.000 receita → ~R$3.200 Stripe → custo total ~R$3.447/mês**

---

### Alta Demanda (80+ clientes ativos)

> Plataforma madura com alto volume de acessos, dados e emissões fiscais.

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Render.com (API) | Standard | R$ 125 |
| MongoDB Atlas | M10 Dedicated | R$ 285 |
| Vercel (Frontend) | Pro | R$ 100 |
| Focus NFe | Profissional | R$ 149 |
| AWS S3 | Pay-per-use | R$ 50 |
| Email (Resend) | Pro | R$ 100 |
| Domínio .com.br | — | R$ 3 |
| GitHub | Free | R$ 0 |
| **Total fixo/mês** | | **~R$ 812** |
| Stripe (por cliente a R$2.500/mês) | 3,2% | ~R$80/cliente |

**Exemplo: 120 clientes × R$2.500 = R$300.000 receita → ~R$9.600 Stripe → custo total ~R$10.412/mês**

---

### Visão Geral por Porte

| Porte | Clientes | Receita Estimada | Custo Fixo | Stripe (~3,2%) | **Custo Total** | **Margem Bruta** |
|-------|----------|-----------------|------------|----------------|-----------------|-----------------|
| Pequena | 1–15 | R$ 2.500–37.500 | R$ 92 | R$ 80–1.200 | R$ 172–1.292 | ~97% → ~97% |
| Média | 15–80 | R$ 37.500–200.000 | R$ 247 | R$ 1.200–6.400 | R$ 1.447–6.647 | ~96% → ~97% |
| Alta | 80+ | R$ 200.000+ | R$ 812 | R$ 6.400+ | R$ 7.212+ | ~96% → ~97% |

> A margem bruta se estabiliza em torno de **85–90%** conforme a base de clientes cresce, pois os custos fixos de infraestrutura crescem muito mais devagar do que a receita.

---

*Guia de custos FlexCatalog — atualizado em março/2026*
