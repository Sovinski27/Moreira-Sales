#  Panificadora Moreira Sales — Ecossistema Integrado & CRM de Balcão

> **Sistema de Gestão Omnichannel, Fidelização sem Filas, Autoatendimento nas Mesas e Gestão Financeira/Insumos para Panificadoras e Confeitarias.**

---

## ?? Visão Geral

O projeto é um ecossistema digital completo sob medida desenvolvido em **React 18** e **Supabase (PostgreSQL)**. Ele resolve o problema do "cliente anônimo" no balcão, automatiza o autoatendimento por QR Code nas mesas, integra um atendente virtual de Inteligência Artificial no WhatsApp e oferece controle financeiro rigoroso com ficha técnica e gestão de insumos.

---

##  Principais Funcionalidades

###  1. Frente de Caixa Ultrarrápida (/caixa)
* **Identificação em < 3 segundos**: Busca pelo número do WhatsApp (DD) 9XXXX-XXXX sem causar filas.
* **Cadastro Relâmpago**: Modal de 1 campo (*Nome*) para novos clientes.
* **Gatilho Verde de Fidelidade**: Tela pisca em verde com animação ao atingir a meta mensal de compras (ex: 10ª compra) para entrega do brinde na hora.

###  2. Autoatendimento nas Mesas (QR Code & PWA)
* **Cardápio Digital PWA**: Navegação interativa organizada em 5 categorias (*Pães/Diários, Salgados/Lanches, Confeitaria/Doces, Bebidas/Cafeteria e Frios/Laticínios*).
* **Autocadastro Passivo**: Registro de Nome e WhatsApp no envio do pedido diretamente da mesa.

### 3. Atendente Virtual com IA no WhatsApp (Gemini API)
* Atendimento 24/7 para esclarecer dúvidas sobre produtos, horários de funcionamento e recebimento de pedidos para Delivery ou Retirada.

### 4. Central de Administração & CRM (/admin)
* **Ranking Mensal de Clientes Fiéis**: Classificação dinâmica nos níveis **Bronze, Prata e Ouro** com apuração do dia 1º ao fim de cada mês.
* **Módulo Anti-Churn**: Identificação automática de clientes ausentes há **mais de 15 dias** com disparo de cupom via WhatsApp em 1 clique.
* **Controle de Acessos & Audit Log**: Permissões por função (Admin, Gerente, Operador) e trilha de auditoria de alterações no sistema.

###  5. Gestão de Insumos, Ficha Técnica & CMV
* **Cadastro de Insumos e Fornecedores**: Controle de estoque de matérias-primas por quilo, grama, litro ou unidade.
* **Ficha Técnica (BOM)**: Cálculo automático do custo real de produção de cada item do cardápio.
* **Precificação & Margem Bruta**: Indicador em tempo real do lucro líquido por produto e baixa automática de insumos a cada venda.

---

##  Stack Tecnológica

* **Frontend**: React 18+, TypeScript, Vite, Tailwind CSS, Lucide Icons, Shadcn/ui.
* **Backend & Database**: Supabase (PostgreSQL), Row Level Security (RLS), Edge Functions.
* **Integrações**: API do Google Gemini (IA), Gateway WhatsApp (Z-API / Evolution API via Webhook).

---

##  Arquitetura do Sistema

`	ext
[ Cliente (Mesa / WhatsApp / Balcão) ]
                  ¦
                  ?
   [ Frontend React 18 (PWA / Caixa / Admin) ]
                  ¦
                  ?
   [ Supabase Nuvem (PostgreSQL + RLS) ] ?--? [ API Gemini (IA) ]
                  ¦
                  ?
  [ Gateway WhatsApp (Evolution / Z-API) ]
`

##  Licença & Propriedade
Desenvolvido por Sovinski Ltda (CNPJ: 64.062.783/0001-10) — Direitos reservados.
