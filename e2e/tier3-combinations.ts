/**
 * Tier 3: Cross-Feature Combinations
 * Pairwise interactions across cash register, loyalty logic, anti-churn, settings, and reporting.
 * >= 20 comprehensive interaction tests.
 */

import React from 'react';
import { describe, it, expect, beforeEach, mountComponent } from './harness';
import { AppDriver } from './driver';
import { AwardModal } from '../src/components/AwardModal';
import { App } from '../src/App';
import * as whatsappService from '../src/services/whatsapp';
import * as seedData from '../src/services/seedData';

export function registerTier3Tests(): void {
  const driver = new AppDriver();

  beforeEach(async () => {
    await driver.init(true);
  });

  describe('Tier 3: Interações Cruzadas entre Features (Pairwise)', () => {
    
    // 1. F01 + F05: Botão rápido vs. Regra de compra mínima
    it('T3.01 [F01+F05]: Botão rápido R$ 5 atinge exatamente o valor mínimo de pontuação de fidelidade', async () => {
      driver.caixa.digitarTelefone('44984321098');
      driver.caixa.selecionarValorRapido(5);
      expect(driver.caixa.valorCompra).toBe('5');

      const res = await driver.caixa.confirmarCompra();
      expect(res.pontuou).toBe(true);
      expect(res.compra.valor).toBe(5.00);
      expect(res.compra.pontuou_fidelidade).toBe(true);
    });

    // 2. F01 + F02: Botão rápido seguido de Limpar (ESC)
    it('T3.02 [F01+F02]: Selecionar valor rápido R$ 50 e em seguida acionar ESC redefine valor para R$ 15', () => {
      driver.caixa.selecionarValorRapido(50);
      expect(driver.caixa.valorCompra).toBe('50');

      driver.caixa.pressionarEsc();
      expect(driver.caixa.valorCompra).toBe('15');
      expect(driver.caixa.telefoneInput).toBe('');
    });

    // 3. F03 + F04: Busca em tempo real seguida de confirmação de compra
    it('T3.03 [F03+F04]: Buscar WhatsApp de cliente existente e confirmar compra incrementa histórico e mês', async () => {
      const busca = driver.caixa.digitarTelefone('44991234567');
      expect(busca.match).toBeTruthy();
      const cli = busca.match!;
      const totalAntes = cli.total_compras_historico;

      driver.caixa.selecionarValorRapido(20);
      const res = await driver.caixa.confirmarCompra();
      expect(res.totalMes).toBe(10); // Seu Antônio atinge 10
      const atualizado = driver.clientes.find((c) => c.id === cli.id)!;
      expect(atualizado.total_compras_historico).toBe(totalAntes + 1);
    });

    // 4. F03 + F04: Cadastro relâmpago com compra imediata
    it('T3.04 [F03+F04]: Cadastro relâmpago aos 10 dígitos registra cliente e 1ª compra em transação única', async () => {
      const busca = driver.caixa.digitarTelefone('44998112244');
      expect(busca.isNovoCliente).toBe(true);

      driver.caixa.nomeNovoCliente = 'Gabriel Novaes';
      driver.caixa.selecionarValorRapido(25);
      const res = await driver.caixa.confirmarCompra();
      expect(res.compra.valor).toBe(25.00);
      expect(res.totalMes).toBe(1);

      const novo = driver.clientes.find((c) => c.nome === 'Gabriel Novaes')!;
      expect(novo).toBeTruthy();
      const resumo = driver.obterResumoCliente(novo.id)!;
      expect(resumo.compras_mes_atual).toBe(1);
    });

    // 5. F04 + F17: Confirmar compra que atinge a meta dispara modal festivo
    it('T3.05 [F04+F17]: Confirmar compra que atinge a meta de 10 visitas retorna atingiuMetaAgora: true', async () => {
      driver.caixa.digitarTelefone('44991234567');
      driver.caixa.selecionarValorRapido(12);
      const res = await driver.caixa.confirmarCompra();
      expect(res.totalMes).toBe(10);
      expect(res.atingiuMetaAgora).toBe(true);
      expect(driver.caixa.modalPremioAberto).toBe(true);
    });

    // 6. F04 + F17: Compra subsequente à meta não reabre o modal festivo
    it('T3.06 [F04+F17]: 11ª compra do cliente com meta atingida NÃO reabre o modal de premiação', async () => {
      driver.caixa.digitarTelefone('44991234567');
      driver.caixa.selecionarValorRapido(12);
      await driver.caixa.confirmarCompra(); // 10ª compra (bateu meta)
      driver.caixa.pressionarEsc(); // fecha modal

      driver.caixa.digitarTelefone('44991234567');
      driver.caixa.selecionarValorRapido(15);
      const res11 = await driver.caixa.confirmarCompra(); // 11ª compra
      expect(res11.totalMes).toBe(11);
      expect(res11.atingiuMetaAgora).toBe(false);
      expect(driver.caixa.modalPremioAberto).toBe(false);
    });

    // 7. F05 + F07: Compra abaixo do mínimo não eleva nível de engajamento
    it('T3.07 [F05+F07]: Cliente com 5 compras válidas fazendo compra de R$ 3,00 permanece Bronze', async () => {
      // Cria cliente com 5 compras válidas
      const novo = await driver.cadastrarClienteERegistrarCompra('Lucio Bronze', '44991119988', 10.00);
      for (let i = 0; i < 4; i++) {
        await driver.registrarCompra(novo.cliente.id, 10.00);
      }
      const resumo5 = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumo5.nivel).toBe('Bronze');

      // Compra abaixo do mínimo
      await driver.registrarCompra(novo.cliente.id, 3.00);
      const resumoDepois = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumoDepois.compras_mes_atual).toBe(6);
      expect(resumoDepois.compras_validas_fidelidade).toBe(5);
      expect(resumoDepois.nivel).toBe('Bronze');
    });

    // 8. F05 + F07: Compra qualificada de R$ 5,00 eleva nível de Bronze para Prata
    it('T3.08 [F05+F07]: 6ª compra com valor ≥ R$ 5,00 promove o cliente de Bronze para Prata', async () => {
      const novo = await driver.cadastrarClienteERegistrarCompra('Lucio Prata', '44991119977', 10.00);
      for (let i = 0; i < 4; i++) {
        await driver.registrarCompra(novo.cliente.id, 10.00);
      }
      // 6ª compra válida
      await driver.registrarCompra(novo.cliente.id, 5.00);
      const resumo = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumo.compras_validas_fidelidade).toBe(6);
      expect(resumo.nivel).toBe('Prata');
    });

    // 9. F08 + F10: Anti-churn radar com marcação de contato
    it('T3.09 [F08+F10]: Marcar cliente em risco como contatado atualiza data mantendo o radar íntegro', async () => {
      const beatriz = driver.obterResumoCliente('cli-08')!;
      expect(beatriz.status_churn).toBe(true);

      await driver.marcarContatoRealizado('cli-08');
      const beatrizAtualizada = driver.obterResumoCliente('cli-08')!;
      const hoje = new Date().toISOString().split('T')[0];
      expect(beatrizAtualizada.ultimo_contato).toBe(hoje);
      expect(beatrizAtualizada.status_churn).toBe(true); // Permanece sumida até comprar
    });

    // 10. F08 + F13: Filtro anti-churn crítico (vermelho) gera wa.me de resgate correto
    it('T3.10 [F08+F13]: Filtrar clientes vermelhos e disparar resgate gera URL com mensagem de resgate', () => {
      const vermelhos = driver.clientesSumidos.filter((c) => c.urgencia_churn === 'vermelho');
      expect(vermelhos.length).toBeGreaterThanOrEqual(1);

      const cliente = vermelhos[0].cliente;
      const texto = whatsappService.buildWhatsAppMessage(driver.config.mensagem_resgate, { nome: cliente.nome });
      const url = whatsappService.getWhatsAppUrl(cliente.whatsapp, texto);

      expect(url).toContain(encodeURIComponent(cliente.nome));
      expect(url).toContain('https://wa.me/55');
    });

    // 11. F14 + F05: Mudança no valor mínimo de pontuação altera cálculo de compras válidas
    it('T3.11 [F14+F05]: Alterar valor mínimo de R$ 5 para R$ 10 reclassifica compras entre 5 e 10 como não pontuadas', async () => {
      const tiagoAntes = driver.obterResumoCliente('cli-09')!; // Compras de 8.50
      expect(tiagoAntes.compras_validas_fidelidade).toBe(2);

      await driver.salvarConfiguracoes({ valor_minimo_pontuacao: 10.00 });

      const tiagoDepois = driver.obterResumoCliente('cli-09')!;
      expect(tiagoDepois.compras_validas_fidelidade).toBe(0);
    });

    // 12. F14 + F17: Reduzir a meta mensal altera o gatilho de premiação
    it('T3.12 [F14+F17]: Reduzir meta para 7 compras concede premiação na próxima compra de cliente com 6 visitas', async () => {
      // Felipe Takahashi tem 6 compras
      await driver.salvarConfiguracoes({ meta_compras_mes: 7 });
      const res = await driver.registrarCompra('cli-05', 20.00); // 7ª compra
      expect(res.totalMes).toBe(7);
      expect(res.atingiuMetaAgora).toBe(true);
    });

    // 13. F15 + F09: Reset de demonstração restaura fidelidade do seedData após mutações intensas
    it('T3.13 [F15+F09]: Reset geral restaura estado inicial de clientes, compras e configurações padrão', async () => {
      // Adiciona novos clientes, compras e altera config
      await driver.cadastrarClienteERegistrarCompra('Cliente X', '44999990011', 100);
      await driver.salvarConfiguracoes({ meta_compras_mes: 5 });

      await driver.reiniciarDadosDemo();

      expect(driver.clientes.length).toBe(seedData.INITIAL_CLIENTES.length);
      expect(driver.config.meta_compras_mes).toBe(10);
      const marlene = driver.obterResumoCliente('cli-01')!;
      expect(marlene.atingiu_meta).toBe(true);
    });

    // 14. F02 + F17: Tecla ESC fecha modal de premiação e limpa o formulário do caixa
    it('T3.14 [F02+F17]: Pressionar ESC com AwardModal aberto fecha o modal e libera o caixa', async () => {
      let modalAberto = true;
      const mounted = await mountComponent(
        React.createElement(AwardModal, {
          cliente: driver.clientes[0],
          comprasMes: 10,
          config: driver.config,
          onClose: () => {
            modalAberto = false;
          }
        })
      );
      driver.caixa.digitarTelefone('44991234567');
      driver.caixa.modalPremioAberto = true;

      const event = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(event);
      });

      expect(modalAberto).toBe(false);
      expect(event.defaultPrevented).toBe(true);
      driver.caixa.pressionarEsc();
      expect(driver.caixa.modalPremioAberto).toBe(false);
      expect(driver.caixa.telefoneInput).toBe('');
      mounted.unmount();
    });

    // 15. F18 + F02: Navegar via F1/F2 preserva entrada enquanto ESC a limpa
    it('T3.15 [F18+F02]: Alternar para Admin (F2) e voltar (F1) mantém telefone digitado; ESC limpa', async () => {
      const mounted = await mountComponent(React.createElement(App));
      driver.caixa.digitarTelefone('44998765432');
      expect(driver.caixa.telefoneInput).toBe('44998765432');

      // F2 -> Admin
      const eventF2 = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F2', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(eventF2);
      });
      expect(eventF2.defaultPrevented).toBe(true);
      expect(mounted.container.textContent).toContain('Painel do Dono');
      expect(driver.caixa.telefoneInput).toBe('44998765432');

      // F1 -> Caixa
      const eventF1 = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F1', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(eventF1);
      });
      expect(eventF1.defaultPrevented).toBe(true);
      expect(mounted.container.textContent).toContain('Frente de Caixa');
      expect(driver.caixa.telefoneInput).toBe('44998765432');

      // ESC
      driver.caixa.pressionarEsc();
      expect(driver.caixa.telefoneInput).toBe('');
      expect(driver.caixa.valorCompra).toBe('15');
      mounted.unmount();
    });

    // 16. F12 + F03: Cadastrar novo cliente relâmpago reflete imediatamente na exportação CSV
    it('T3.16 [F12+F03]: Cliente cadastrado no caixa aparece imediatamente no relatório CSV com BOM', async () => {
      await driver.cadastrarClienteERegistrarCompra('Fernanda CSV', '44998811234', 35.00);
      const csv = driver.exportarCSV();
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Fernanda CSV');
      expect(csv).toContain('(44) 99881-1234');
      expect(csv).toContain('35,00');
    });

    // 17. F16 + F17: Modal comemorativo gera link do WhatsApp formatado com o prêmio da configuração
    it('T3.17 [F16+F17]: Mensagem do WhatsApp no modal de prêmio reflete a descrição configurada do brinde', () => {
      const cliente = driver.clientes[1]; // Seu Antônio
      const msg = whatsappService.buildWhatsAppMessage(driver.config.mensagem_whatsapp, {
        nome: cliente.nome,
        compras: 10,
        premio: driver.config.premio_descricao
      });
      const url = whatsappService.getWhatsAppUrl(cliente.whatsapp, msg);

      expect(url).toContain(encodeURIComponent(driver.config.premio_descricao));
      expect(url).toContain(encodeURIComponent(cliente.nome));
    });

    // 18. F16 + F13: Resgate no WhatsApp formata corretamente o telefone internacional
    it('T3.18 [F16+F13]: Link de resgate assegura DDI 55 e codificação de emojis sem corromper URL', () => {
      const cliente = driver.clientes.find((c) => c.id === 'cli-08')!;
      const msg = whatsappService.buildWhatsAppMessage(driver.config.mensagem_resgate, { nome: cliente.nome });
      const url = whatsappService.getWhatsAppUrl(cliente.whatsapp, msg);

      expect(url.startsWith('https://wa.me/5544988776655')).toBe(true);
      expect(url).toContain('%20');
    });

    // 19. F11 + F04: Confirmar compra atualiza KPIs e Ranking em tempo real sem reload
    it('T3.19 [F11+F04]: Registrar compra no balcão atualiza imediatamente faturamento e ranking', async () => {
      const fatAntes = driver.metricas.faturamentoMes;
      const visitasAntes = driver.metricas.totalVisitasMes;

      await driver.registrarCompra('cli-06', 50.00);

      const fatDepois = driver.metricas.faturamentoMes;
      const visitasDepois = driver.metricas.totalVisitasMes;

      expect(visitasDepois).toBe(visitasAntes + 1);
      expect(fatDepois).toBeCloseTo(fatAntes + 50.00, 0.01);
    });

    // 20. F06 + F11: Compras do mês anterior não inflam KPIs do mês atual
    it('T3.20 [F06+F11]: Compras de clientes sumidos no mês anterior não afetam faturamentoMes atual', () => {
      const valdomiro = driver.obterResumoCliente('cli-07')!;
      expect(valdomiro.compras_mes_anterior).toBe(14);
      expect(valdomiro.valor_total_mes).toBe(0);

      // Faturamento deve incluir apenas compras do mês atual
      const faturamentoEsperado = driver.resumosMensais.reduce((acc, r) => acc + r.valor_total_mes, 0);
      expect(driver.metricas.faturamentoMes).toBeCloseTo(faturamentoEsperado, 0.01);
    });

    // 21. F21 + F05: Carrinho abaixo da meta de pontuação
    it('T3.21 [F21+F05]: Compra via carrinho com total R$ 4,99 entra no histórico mas não pontua', async () => {
      const prod = await driver.createProduto({
        categoria_id: 'temp',
        nome: 'Balinha',
        preco: 4.99,
        controlar_estoque: false,
        ativo: true
      });
      driver.caixa.pressionarEsc();
      driver.caixa.digitarTelefone('44998765432');
      driver.caixa.adicionarAoCarrinho(prod, 1);
      const res = await driver.caixa.confirmarCompra();
      expect(res.compra.valor).toBe(4.99);
      expect(res.pontuou).toBe(false);
    });

    // 22. F21 + F17: Carrinho bate a meta de brinde
    it('T3.22 [F21+F17]: Compra via carrinho bate a 10ª meta e aciona prêmio', async () => {
      const p = driver.produtos.find(x => x.preco >= 5.00)!;
      driver.caixa.pressionarEsc();
      driver.caixa.digitarTelefone('44991234567'); // cli-02 (Seu Antônio, 9 compras)
      driver.caixa.adicionarAoCarrinho(p, 1);
      const res = await driver.caixa.confirmarCompra(); // 10ª de Seu Antônio
      expect(res.atingiuMetaAgora).toBe(true);
      expect(driver.caixa.modalPremioAberto).toBe(true);
    });

    // 23. F21 + F01: Carrinho sobrepõe valor rápido
    it('T3.23 [F21+F01]: Se o carrinho tem itens, o subtotal do carrinho sobrepõe o valor rápido selecionado', async () => {
      driver.caixa.pressionarEsc();
      driver.caixa.selecionarValorRapido(50);
      const prod = driver.produtos[0];
      driver.caixa.adicionarAoCarrinho(prod, 2);
      const expectedTotal = prod.preco * 2;
      driver.caixa.digitarTelefone('44998765432');
      const res = await driver.caixa.confirmarCompra();
      expect(res.compra.valor).toBe(expectedTotal);
    });

  });
}
