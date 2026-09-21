# WhatsApp Webhook (Evolution API)

Esta Edge Function do Supabase recebe webhooks da Evolution API (ou outra API não-oficial de WhatsApp), interpreta as mensagens dos clientes usando o **Gemini API**, e cria pedidos automaticamente na tabela `pedidos`.

## Como fazer o Deploy

1. Certifique-se de que tem o Supabase CLI instalado.
2. Faça login no Supabase CLI:
   ```bash
   supabase login
   ```
3. Vincule seu projeto (pegue o Reference ID do seu projeto no painel do Supabase):
   ```bash
   supabase link --project-ref <SEU_PROJECT_REF>
   ```
4. Faça o deploy da função:
   ```bash
   supabase functions deploy whatsapp-webhook
   ```

## Configuração de Variáveis de Ambiente

Para que a função consiga falar com o Gemini e acessar o banco de dados contornando RLS (para inserir o pedido), você precisa configurar os secrets no Supabase.

Execute no seu terminal:

```bash
supabase secrets set GEMINI_API_KEY="sua-chave-do-gemini"
```
*(Nota: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente no ambiente da Edge Function pelo Supabase)*

## Configurando o Webhook na Evolution API

Na interface ou API da Evolution API, configure a URL do Webhook da sua instância para apontar para a sua Edge Function:

**URL:** `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook`  
**Eventos:** Marque a opção de `messages.upsert` (ou o equivalente para recebimento de novas mensagens).

## Como funciona?

1. A função recebe o payload JSON do WhatsApp.
2. Extrai o texto da mensagem, número de telefone e nome do cliente.
3. Busca os produtos disponíveis (ativos) na tabela `produtos` do seu Supabase.
4. Envia o texto do cliente e a lista de produtos para o **Gemini 2.5 Flash**.
5. O Gemini interpreta a mensagem e retorna um JSON estruturado com os IDs dos produtos e as quantidades.
6. A função insere um registro na tabela `pedidos` (com status "Pendente") e vários registros na tabela `itens_pedido`.
