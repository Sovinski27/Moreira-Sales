/**
 * Tier 4: Real-World Application Scenarios
 * 10 realistic end-to-end user journeys modeling daily bakery counter and management routines.
 */

import React from 'react';
import { describe, it, expect, beforeEach, mountComponent } from './harness';
import { AppDriver } from './driver';
import { App } from '../src/App';
import { AwardModal } from '../src/components/AwardModal';
import * as whatsappService from '../src/services/whatsapp';
import * as seedData from '../src/services/seedData';

export function registerTier4Tests(): void {
  const driver = new AppDriver();

  beforeEach(async () => {
    await driver.init(true);
  });

  describe('Tier 4: Cenários Reais de Aplicação (End-to-End User Journeys)', () => {

    // Cenário 1: Horário de Pico Matinal (Morning Rush)
    it('T4.01 [Cenário 1]: Atendimento rápido e contínuo no balcão para 5 clientes consecutivos', async () => {
      // Atendente recebe 5 clientes em fila rápida
      const clientesFila = [
        { tel: '44998765432', valor: 15 }, // Dona Marlene
        { tel: '44991234567', valor: 10 }, // Seu Antônio
        { tel: '44988112233', valor: 20 }, // Dr. Carlos
        { tel: '44997788990', valor: 30 }, // Prof. Renata
        { tel: '44996655443', valor: 5 },  // Felipe
      ];

      const visitasIniciais = driver.metricas.totalVisitasMes;
      const faturamentoInicial = driver.metricas.faturamentoMes;

      for (const item of clientesFila) {
        // 1. Busca por WhatsApp via sessão do caixa
        const busca = driver.caixa.digitarTelefone(item.tel);
        expect(busca.match).toBeTruthy();

        // 2. Registro com valor rápido selecionado
        driver.caixa.selecionarValorRapido(item.valor);
        const res = await driver.caixa.confirmarCompra();
        expect(res.compra.valor).toBe(item.valor);

        // 3. Se atingiu meta (Seu Antônio), atende e fecha modal para próximo da fila
        if (res.atingiuMetaAgora) {
          expect(driver.caixa.modalPremioAberto).toBe(true);
          driver.caixa.pressionarEsc();
        }

        // 4. Caixa limpo e pronto para o próximo da fila
        expect(driver.caixa.telefoneInput).toBe('');
      }

      // Verificação consolidada
      expect(driver.metricas.totalVisitasMes).toBe(visitasIniciais + 5);
      expect(driver.metricas.faturamentoMes).toBeCloseTo(faturamentoInicial + 80, 0.01);
    });

    // Cenário 2: Cliente Fiel Conquista a Meta do Mês
    it('T4.02 [Cenário 2]: Seu Antônio (9 compras) realiza a 10ª compra, aciona alerta festivo e link de brinde', async () => {
      // 1. Identificação do cliente no caixa
      const busca = driver.caixa.digitarTelefone('44991234567');
      expect(busca.match).toBeTruthy();
      const antonio = busca.match!;

      // Verifica que está a 1 da meta
      const resumoAntes = driver.obterResumoCliente(antonio.id)!;
      expect(resumoAntes.compras_validas_fidelidade).toBe(9);
      expect(resumoAntes.atingiu_meta).toBe(false);

      // 2. Registra compra de R$ 15 (pão e café)
      driver.caixa.selecionarValorRapido(15);
      const res = await driver.caixa.confirmarCompra();
      expect(res.atingiuMetaAgora).toBe(true);
      expect(res.totalMes).toBe(10);
      expect(driver.caixa.modalPremioAberto).toBe(true);
      expect(driver.caixa.ultimoPremioDisparado?.cliente.id).toBe(antonio.id);

      // 3. Validação do modal de premiação renderizado
      const modalHtml = driver.renderAwardModal(antonio, res.totalMes, () => {});
      expect(modalHtml).toContain('PARABÉNS AO CLIENTE!');
      expect(modalHtml).toContain('Seu Antônio Moreira');
      expect(modalHtml).toContain('ENTREGAR BRINDE:');
      expect(modalHtml).toContain(driver.config.premio_descricao);

      const msg = whatsappService.buildWhatsAppMessage(driver.config.mensagem_whatsapp, {
        nome: antonio.nome,
        compras: res.totalMes,
        premio: driver.config.premio_descricao
      });
      expect(msg).toContain('Seu Antônio Moreira');
      expect(msg).toContain('10 compras');
      expect(msg).toContain(driver.config.premio_descricao);

      const url = whatsappService.getWhatsAppUrl(antonio.whatsapp, msg);
      expect(url.startsWith('https://wa.me/5544991234567')).toBe(true);

      // 4. Verificação no resumo
      const resumoDepois = driver.obterResumoCliente(antonio.id)!;
      expect(resumoDepois.atingiu_meta).toBe(true);
    });

    // Cenário 3: Compras Subsequentes Após Meta Batida
    it('T4.03 [Cenário 3]: Cliente que já atingiu a meta retorna nos dias seguintes sem spam de comemoração', async () => {
      // Dona Marlene já tem 12 compras
      const marlene = driver.clientes.find((c) => c.id === 'cli-01')!;
      const resumoAntes = driver.obterResumoCliente(marlene.id)!;
      expect(resumoAntes.atingiu_meta).toBe(true);

      // 13ª compra
      const res13 = await driver.registrarCompra(marlene.id, 14.50);
      expect(res13.atingiuMetaAgora).toBe(false); // NÃO dispara modal novamente
      expect(res13.totalMes).toBe(13);

      // 14ª compra
      const res14 = await driver.registrarCompra(marlene.id, 18.00);
      expect(res14.atingiuMetaAgora).toBe(false);
      expect(res14.totalMes).toBe(14);
    });

    // Cenário 4: Novo Cliente - Cadastro Relâmpago em Menos de 3 Segundos
    it('T4.04 [Cenário 4]: Cliente novo é cadastrado em segundos e entra diretamente no ranking mensal', async () => {
      // 1. Atendente digita telefone novo na sessão do caixa
      const telNovo = '44991556677';
      const busca = driver.caixa.digitarTelefone(telNovo);
      expect(busca.match).toBe(null);
      expect(busca.isNovoCliente).toBe(true);

      // 2. Digita nome e confirma compra de R$ 30
      driver.caixa.nomeNovoCliente = 'Mariana Castro';
      driver.caixa.selecionarValorRapido(30);
      const res = await driver.caixa.confirmarCompra();
      expect(res.compra.valor).toBe(30.00);

      // 3. Cliente já aparece nos resumos mensais e clientes ativos
      const clienteCriado = driver.clientes.find((c) => c.nome === 'Mariana Castro')!;
      expect(clienteCriado).toBeTruthy();
      const resumo = driver.obterResumoCliente(clienteCriado.id)!;
      expect(resumo.compras_mes_atual).toBe(1);
      expect(resumo.valor_total_mes).toBe(30.00);
      expect(resumo.nivel).toBe('Bronze');
    });

    // Cenário 5: Tratamento de Micro-Compra (Abaixo de R$ 5,00)
    it('T4.05 [Cenário 5]: Cliente compra apenas chiclete (R$ 2,50); valor entra no caixa mas não pontua', async () => {
      const cli = driver.clientes.find((c) => c.id === 'cli-05')!; // Felipe
      const resumoAntes = driver.obterResumoCliente(cli.id)!;
      const validasAntes = resumoAntes.compras_validas_fidelidade;
      const totalAntes = resumoAntes.compras_mes_atual;

      // Compra de R$ 2,50
      const res = await driver.registrarCompra(cli.id, 2.50);
      expect(res.pontuou).toBe(false);
      expect(res.atingiuMetaAgora).toBe(false);

      const resumoDepois = driver.obterResumoCliente(cli.id)!;
      expect(resumoDepois.compras_mes_atual).toBe(totalAntes + 1);
      expect(resumoDepois.compras_validas_fidelidade).toBe(validasAntes); // Intacto
    });

    // Cenário 6: Campanha de Resgate Anti-Churn pelo Dono da Panificadora
    it('T4.06 [Cenário 6]: Dono abre radar anti-churn, filtra urgência vermelha, contata cliente e registra data', async () => {
      // 1. Acesso ao módulo anti-churn e filtro vermelho
      const emRisco = driver.clientesSumidos.filter((c) => c.urgencia_churn === 'vermelho');
      expect(emRisco.length).toBeGreaterThanOrEqual(1);

      const clienteAlvo = emRisco[0];
      expect(clienteAlvo.cliente.nome).toBe('Dra. Beatriz Fontana');
      expect(clienteAlvo.dias_sem_comprar).toBeGreaterThanOrEqual(30);

      // 2. Disparo de mensagem no WhatsApp
      const msgResgate = whatsappService.buildWhatsAppMessage(driver.config.mensagem_resgate, {
        nome: clienteAlvo.cliente.nome
      });
      expect(msgResgate).toContain('Dra. Beatriz Fontana');
      expect(msgResgate).toContain('pão na chapa');

      // 3. Marcação de contato realizado
      await driver.marcarContatoRealizado(clienteAlvo.cliente.id);

      // 4. Verificação de persistência
      const resumoAtualizado = driver.obterResumoCliente(clienteAlvo.cliente.id)!;
      const hoje = new Date().toISOString().split('T')[0];
      expect(resumoAtualizado.ultimo_contato).toBe(hoje);
    });

    // Cenário 7: Fechamento de Mês e Exportação de Relatório Executivo CSV
    it('T4.07 [Cenário 7]: Dono consulta KPIs gerenciais, confere ranking VIP e exporta relatório em Excel', () => {
      // 1. Verificação das métricas do painel
      const met = driver.metricas;
      expect(met.totalVisitasMes).toBeGreaterThan(20);
      expect(met.faturamentoMes).toBeGreaterThan(200);
      expect(met.ticketMedioMes).toBeGreaterThan(0);
      expect(met.premiosEntregues).toBeGreaterThanOrEqual(1);

      // 2. Ranking de clientes VIP (Ouro/Prata)
      const ranking = [...driver.resumosMensais].sort((a, b) => b.compras_validas_fidelidade - a.compras_validas_fidelidade);
      expect(ranking[0].cliente.nome).toBe('Dona Marlene Silva');
      expect(ranking[0].nivel).toBe('Prata'); // 12 compras = Prata

      // 3. Exportação do arquivo CSV compatível com Excel
      const csv = driver.exportarCSV();
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Nome;WhatsApp;Compras Válidas Mês;Valor Total Mês (R$);Total Histórico;Nível Fidelidade;Última Visita');
      expect(csv).toContain('Dona Marlene Silva');
      expect(csv).toContain('Seu Antônio Moreira');
    });

    // Cenário 8: Personalização das Regras de Negócio da Panificadora
    it('T4.08 [Cenário 8]: Dono atualiza brinde para "Café com Bolo" e meta para 8 compras com efeito dinâmico', async () => {
      // 1. Salva novas configurações
      await driver.salvarConfiguracoes({
        meta_compras_mes: 8,
        valor_minimo_pontuacao: 6.00,
        premio_descricao: '1 Fatia de Bolo de Fubá Cremoso com Café Especial'
      });

      expect(driver.config.meta_compras_mes).toBe(8);
      expect(driver.config.valor_minimo_pontuacao).toBe(6.00);

      // 2. Dr. Carlos tem 7 compras válidas. Na 8ª compra, deve ganhar o novo prêmio!
      const res = await driver.registrarCompra('cli-03', 15.00);
      expect(res.totalMes).toBe(8);
      expect(res.atingiuMetaAgora).toBe(true);

      const msg = whatsappService.buildWhatsAppMessage(driver.config.mensagem_whatsapp, {
        nome: 'Dr. Carlos Eduardo',
        compras: res.totalMes,
        premio: driver.config.premio_descricao
      });
      expect(msg).toContain('1 Fatia de Bolo de Fubá Cremoso');
    });

    // Cenário 9: Recuperação de Falha e Reset Geral de Demonstração
    it('T4.09 [Cenário 9]: Operador executa restauração total de dados e valida integridade da massa inicial', async () => {
      // 1. Poluição de dados
      for (let i = 0; i < 5; i++) {
        await driver.cadastrarClienteERegistrarCompra(`Teste Fantasma ${i}`, `4499000000${i}`, 10);
      }
      expect(driver.clientes.length).toBe(seedData.INITIAL_CLIENTES.length + 5);

      // 2. Executa reset de emergência
      await driver.reiniciarDadosDemo();

      // 3. Validação estrita da conformidade
      expect(driver.clientes.length).toBe(seedData.INITIAL_CLIENTES.length);
      expect(driver.config.meta_compras_mes).toBe(10);
      expect(driver.config.valor_minimo_pontuacao).toBe(5.00);

      const marlene = driver.obterResumoCliente('cli-01')!;
      expect(marlene.atingiu_meta).toBe(true);
      const beatriz = driver.obterResumoCliente('cli-08')!;
      expect(beatriz.status_churn).toBe(true);
      expect(beatriz.urgencia_churn).toBe('vermelho');
    });

    // Cenário 10: Operação do Caixa Exclusivamente pelo Teclado (Foco em Agilidade)
    it('T4.10 [Cenário 10]: Atendente opera o caixa sem tirar a mão do teclado usando F1, ENTER e ESC', async () => {
      // 1. Alterna para Caixa via F1 com App montado
      const mounted = await mountComponent(React.createElement(App));
      
      const eventF1 = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F1', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(eventF1);
      });
      expect(eventF1.defaultPrevented).toBe(true);
      expect(mounted.container.textContent).toContain('Frente de Caixa');

      // 2. Digita telefone no caixa
      const tel = '44991234567';
      const busca = driver.caixa.digitarTelefone(tel);
      expect(busca.match).toBeTruthy();
      expect(driver.caixa.telefoneInput).toBe(tel);

      // 3. Confirma compra via sessão do caixa
      driver.caixa.selecionarValorRapido(15);
      const res = await driver.caixa.confirmarCompra();
      expect(res.compra.valor).toBe(15.00);

      // 4. Pressiona ESC para resetar e preparar para o próximo cliente
      driver.caixa.digitarTelefone('44998765432');
      expect(driver.caixa.telefoneInput).toBe('44998765432');
      driver.caixa.pressionarEsc();
      expect(driver.caixa.telefoneInput).toBe('');
      expect(driver.caixa.valorCompra).toBe('15');

      mounted.unmount();
    });

    // Cenário 11: Fluxo de Estoque Ponta-a-Ponta
    it('T4.11 [Cenário 11]: Proprietário cria Categoria e Produto com estoque 2, e o caixa esgota as 2 unidades', async () => {
      // 1. Admin cria categoria
      const cat = await driver.createCategoria({
        nome: 'Doces Tier4',
        icone: 'Cake',
        ordem: 1,
        ativo: true
      });
      // 2. Admin cria produto com estoque 2
      const prod = await driver.createProduto({
        categoria_id: cat.id!,
        nome: 'Bolo Cenário 11',
        preco: 20.00,
        controlar_estoque: true,
        estoque_atual: 2,
        ativo: true
      });

      // 3. Atendente atende cliente Fidelidade levando 1 Bolo
      driver.caixa.pressionarEsc();
      driver.caixa.digitarTelefone('44998765432');
      driver.caixa.adicionarAoCarrinho(prod, 1);
      const res1 = await driver.caixa.confirmarCompra();
      expect(res1.compra.valor).toBe(20.00);
      
      // reload produto para ver se baixou o estoque (opcional se dbService cuidar)
      await driver.reloadFromStorage();
      const p1 = driver.produtos.find(p => p.id === prod.id)!;
      expect(p1.estoque_atual).toBe(1);

      // 4. Atendente atende cliente Anônimo levando mais 1 Bolo
      driver.caixa.pressionarEsc();
      driver.caixa.adicionarAoCarrinho(p1, 1);
      const res2 = await driver.caixa.confirmarVendaAnonima();
      expect(res2.valor).toBe(20.00);

      await driver.reloadFromStorage();
      const p2 = driver.produtos.find(p => p.id === prod.id)!;
      expect(p2.estoque_atual).toBe(0);

      // 5. Cliente Fidelidade tenta comprar 1 Bolo Esgotado
      driver.caixa.pressionarEsc();
      let erroEsgotado = false;
      try {
        driver.caixa.adicionarAoCarrinho(p2, 1);
      } catch(e: any) {
        erroEsgotado = true;
      }
      expect(erroEsgotado).toBe(true);
    });

  });
}
