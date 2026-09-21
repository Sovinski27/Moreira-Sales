# Plano de Implementação: KDS, Cardápio Digital e WhatsApp

Após um estudo detalhado da arquitetura atual do seu projeto, identificamos um ponto crítico: o sistema de Caixa atual ("Mesas Abertas") salva os dados apenas localmente no navegador (`localStorage`). Para que o Cardápio na mesa, o WhatsApp e a Cozinha conversem com o Caixa em tempo real, precisaremos migrar essa gestão de mesas 100% para a nuvem.

Abaixo está o plano técnico de como faremos isso:

## 1. Banco de Dados Central (Supabase) ✅ (Concluído)
O coração da integração é a criação de tabelas para gerenciar os pedidos e itens.
- Criamos a tabela `pedidos` (id, cliente_id, origem, identificador_origem, status, valor_total, observacoes, criado_em). 
      *(Origem pode ser 'Mesa', 'Balcão' ou 'WhatsApp')*
- Criamos a tabela `itens_pedido` (id, pedido_id, produto_id, quantidade, preco_unitario).
- Habilitamos o **Supabase Realtime** na tabela `pedidos` para que a cozinha seja notificada no mesmo milissegundo.
- Configuramos regras de segurança (RLS) para permitir que os clientes (Cardápio Digital) consigam inserir novos pedidos.

## 2. Refatoração do Caixa e Mesas (Obrigatório) ⏳ (Próximo passo)
Para que o Caixa consiga cobrar os pedidos feitos pelo celular do cliente.
- Remover a dependência de memória local (`localStorage`) para a gestão de `mesas_abertas`.
- Alterar o grid de mesas do Caixa para puxar da nuvem as mesas ativas (buscando `pedidos` onde `status` é diferente de 'Pago').
- Ao fechar a conta de uma mesa, o sistema vai somar todos os pedidos daquela mesa, gerar a pontuação de fidelidade do cliente (tabela `compras`) e marcar os pedidos como 'Pago'.

## 3. Cardápio Digital (Página Separada / PWA)
A interface que o cliente acessa via celular (ex: escaneando o QR Code na mesa).
- Criar interface focada no celular (mobile-first) para listar os produtos do banco de dados.
- Implementar a lógica do Carrinho.
- Ao clicar em "Pedir", o sistema lê qual a mesa da URL (ex: `?mesa=5`) e salva um novo pedido no Supabase com status `Pendente`.
- **Tempo Real para o Cliente:** A tela do cliente vai "escutar" o banco de dados. Quando a cozinha mudar o status para `Preparando` ou `Pronto`, o celular do cliente atualiza sozinho.

## 4. Sistema da Cozinha (KDS)
A tela que ficará em um tablet ou monitor na área de produção.
- Desenvolver interface visual estilo "Kanban" (Colunas: Pendentes, Em Preparo, Prontos).
- Implementar a conexão contínua (Realtime) com a tabela `pedidos`. Caiu no banco, aparece na tela.
- Adicionar controles rápidos para o cozinheiro tocar e avançar o status do pedido, atualizando o Supabase.

## 5. Automação do WhatsApp (Bot)
Integrando o robô de IA no fluxo de produção.
- **Entrada:** O bot (Evolution API integrado com n8n ou código próprio) processa a conversa e insere um pedido no banco de dados com a origem `WhatsApp`. A cozinha recebe isso instantaneamente.
- **Saída (Opcional):** Configurar um gatilho. Quando o cozinheiro marcar o pedido do WhatsApp como `Pronto` na tela dele, o Supabase avisa o bot para mandar uma mensagem automática: "Seu pedido está pronto para retirada!".

---

## ⚠️ Pontos de Atenção (Para Decidirmos)

1. **Dependência de Internet:** Como tudo agora será sincronizado para a cozinha e cliente em tempo real, se a panificadora ficar sem internet, o sistema do Caixa não conseguirá ver os pedidos novos das mesas. Tudo bem assumirmos que o sistema precisa de internet para esse fluxo completo?
2. **Separação de Cozinha vs Copa/Bar:** Vocês precisam que bebidas saiam em uma tela diferente (Copa) das comidas (Cozinha), ou tudo vai para a mesma tela de produção?
3. **Segurança (Cardápio Digital):** Se o cardápio é aberto na internet, precisaremos colocar alguma proteção anti-spam para evitar que pessoas de casa fiquem mandando pedidos falsos para a cozinha (ex: limite de pedidos por mesa)?
