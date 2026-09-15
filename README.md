# 🥖 Sistema de CRM, Fidelização e Retenção para Panificadora

Sistema de frente de caixa rápida e retenção de clientes desenvolvido especialmente para o segmento de panificadora e confeitaria em Umuarama - PR.

Projetado para **eliminar o cliente anônimo no balcão em menos de 3 segundos** e evitar filas mesmo nos horários de pico.

---

## 🚀 Funcionalidades do MVP (Fase 1)

### 1. Frente de Caixa Rápida (`/caixa`)
- **Identificação < 3 segundos**: Busca instantânea por número de WhatsApp.
- **Cadastro Relâmpago**: Se o cliente for novo, o sistema pede apenas o primeiro nome (em campo com foco automático).
- **Contador Mensal Instantâneo**: Exibe na hora quantas compras o cliente fez no mês vigente e a barra de progresso até o brinde.
- **Botões de Valores Rápidos**: R$ 5, R$ 10, R$ 15, R$ 20, R$ 30, R$ 50 ou digitação direta com confirmação via tecla `Enter`.
- **Gatilho de Fidelidade Visual e Sonoro**: Na 10ª compra do mês, uma tela verde comemorativa com confetes e aviso sonoro instrui a atendente a entregar o brinde (*1 Café com Pão na Chapa*).
- **Automação WhatsApp**: Botão com 1 clique para enviar mensagem comemorativa pré-formatada para o cliente.

### 2. Painel de Gestão do Proprietário (`/admin`)
- **Ranking Mensal de Clientes VIPs**:
  - Classificação por frequência com selos **Ouro** (+12 compras/mês), **Prata** (6 a 12 compras/mês) e **Bronze** (1 a 5 compras/mês).
  - Identifica os 20% de clientes que trazem 80% do faturamento.
- **Módulo Anti-Churn ("Clientes Sumidos")**:
  - Detecta automaticamente clientes fiéis (>5 compras no mês anterior) que não aparecem há mais de 15 dias.
  - Botão direto de WhatsApp para resgatar o cliente com mensagem calorosa e mimo de cortesia.
- **Totalizadores em Tempo Real**: Faturamento estimado no mês, total de visitas, clientes ativos e ticket médio.
- **Exportação para Excel / CSV**: Download imediato com dados compatíveis com Excel.
- **Configurações**: Ajuste da meta mensal de compras, descrição do prêmio e textos padrão das mensagens.

---

## 🛠️ Tecnologias Utilizadas
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Canvas Confetti.
- **Backend / Database**: PostgreSQL via Supabase (com script DDL, triggers e RLS em `supabase/schema.sql`).
- **Resiliência Offline / Demo**: Fallback automático em `LocalStorage` com dados realistas de demonstração caso as chaves do Supabase ainda não estejam configuradas.

---

## 📦 Como Rodar o Projeto Localmente

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Executar em modo desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador em `http://localhost:5173`.

3. **Atalhos Rápidos**:
   - `F1`: Vai para a Frente de Caixa.
   - `F2`: Vai para o Painel do Dono.

---

## 🗄️ Como Conectar ao Supabase (Opcional)

1. Crie um projeto gratuito no [supabase.com](https://supabase.com).
2. No painel do Supabase, abra o **SQL Editor** e execute o conteúdo do arquivo `supabase/schema.sql`.
3. Crie um arquivo `.env` na raiz do projeto com as suas credenciais:
   ```env
   VITE_SUPABASE_URL=https://sua-url-aqui.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```
4. Reinicie o servidor `npm run dev`. O badge no cabeçalho exibirá **"Supabase Online"**.
