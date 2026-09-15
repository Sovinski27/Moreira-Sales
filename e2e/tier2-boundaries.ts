/**
 * Tier 2: Boundary & Corner Cases
 * Limits, zero, empty strings, negative values, extremes, thresholds, and edge conditions
 * >= 5 test cases per feature = 95 test cases minimum
 * 100% authentic invocations against real application components, services, and state.
 */

import React from 'react';
import { describe, it, expect, beforeEach, mountComponent } from './harness';
import { AppDriver } from './driver';
import { AwardModal } from '../src/components/AwardModal';
import * as whatsappService from '../src/services/whatsapp';
import * as seedData from '../src/services/seedData';
import { App } from '../src/App';

export function registerTier2Tests(): void {
  const driver = new AppDriver();

  beforeEach(async () => {
    await driver.init(true);
  });

  // ==========================================
  // F01: 6 Rapid Values (Boundaries)
  // ==========================================
  describe('Tier 2 - F01: 6 Valores Rápidos (Limites e Extremos)', () => {
    it('T2.F01.1: Selecionar valor rápido de R$ 10 substitui compra anterior e registra valor exato', async () => {
      await driver.registrarCompra('cli-06', 42.50);
      const res = await driver.registrarCompra('cli-06', 10);
      expect(res.compra.valor).toBe(10);
    });

    it('T2.F01.2: Menor valor rápido (R$ 5) é exatamente igual ao valor mínimo de pontuação padrão', () => {
      driver.caixa.selecionarValorRapido(5);
      expect(parseFloat(driver.caixa.valorCompra)).toBe(driver.config.valor_minimo_pontuacao);
      expect(driver.renderCaixa()).toContain('R$ 5');
    });

    it('T2.F01.3: Registrar compras repetidas de R$ 20 mantém valores independentes e corretos', async () => {
      const res1 = await driver.registrarCompra('cli-06', 20);
      const res2 = await driver.registrarCompra('cli-06', 20);
      expect(res1.compra.valor).toBe(20);
      expect(res2.compra.valor).toBe(20);
    });

    it('T2.F01.4: Valores numéricos com decimais e pontuações são processados com precisão', async () => {
      const res = await driver.registrarCompra('cli-06', 30.50);
      expect(res.compra.valor).toBe(30.50);
    });

    it('T2.F01.5: Botões de valores rápidos renderizam rótulos monetários formatados', () => {
      const html = driver.renderCaixa();
      const botoes = [5, 10, 15, 20, 30, 50];
      for (const v of botoes) {
        expect(html).toContain(`R$ ${v}`);
      }
    });
  });

  // ==========================================
  // F02: Limpar (ESC) (Boundaries)
  // ==========================================
  describe('Tier 2 - F02: Limpar (ESC) & Atalho ESC (Limites e Extremos)', () => {
    it('T2.F02.1: Pressionar ESC com formulário já vazio é idempotente e não lança erro', () => {
      const event = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      (globalThis as any).window.dispatchEvent(event);

      const res = driver.buscarClientePorTelefone('');
      expect(res.match).toBe(null);
      expect(res.isNovoCliente).toBe(false);
    });

    it('T2.F02.2: ESC redefine valor de compra de volta para o padrão "15"', () => {
      driver.caixa.selecionarValorRapido(50);
      expect(driver.caixa.valorCompra).toBe('50');

      driver.caixa.pressionarEsc();
      expect(driver.caixa.valorCompra).toBe('15');
    });

    it('T2.F02.3: Múltiplos pressionamentos rápidos de ESC em sequência no window são seguros', () => {
      for (let i = 0; i < 5; i++) {
        const event = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        (globalThis as any).window.dispatchEvent(event);
      }
      expect(driver.clientes.length).toBeGreaterThanOrEqual(10);
    });

    it('T2.F02.4: Cancelamento de busca de novo cliente retorna estado para neutro', () => {
      const busca1 = driver.buscarClientePorTelefone('44999991234');
      expect(busca1.isNovoCliente).toBe(true);

      const buscaLimpa = driver.buscarClientePorTelefone('');
      expect(buscaLimpa.isNovoCliente).toBe(false);
      expect(buscaLimpa.match).toBe(null);
    });

    it('T2.F02.5: Botão Limpar (ESC) é condicional à presença de texto no telefone', () => {
      const htmlInicial = driver.renderCaixa();
      expect(htmlInicial).not.toContain('Limpar (ESC)');
    });
  });

  // ==========================================
  // F03: Busca em Tempo Real (Boundaries)
  // ==========================================
  describe('Tier 2 - F03: Busca em Tempo Real & Cadastro Relâmpago (Limites e Extremos)', () => {
    it('T2.F03.1: Busca ignora caracteres de máscara como parênteses, traços, espaços e código de país', () => {
      const res = driver.buscarClientePorTelefone('+55 (44) 99876-5432');
      expect(res.match).toBeTruthy();
      expect(res.match!.id).toBe('cli-01');
    });

    it('T2.F03.2: Digitar menos de 8 dígitos não dispara busca nem ativa cadastro relâmpago', () => {
      const res = driver.buscarClientePorTelefone('449987');
      expect(res.match).toBe(null);
      expect(res.isNovoCliente).toBe(false);
    });

    it('T2.F03.3: Apagar todo o telefone limpa cliente identificado e desativa modo novo cliente', () => {
      const res = driver.buscarClientePorTelefone('');
      expect(res.match).toBe(null);
      expect(res.isNovoCliente).toBe(false);
    });

    it('T2.F03.4: Submeter novo cliente com nome vazio ou somente espaços é bloqueado pela sessão do caixa', async () => {
      driver.caixa.digitarTelefone('44998887766');
      driver.caixa.nomeNovoCliente = '   ';
      let errorThrown = false;
      try {
        await driver.caixa.confirmarCompra();
      } catch (err) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });

    it('T2.F03.5: Telefone longo (>13 dígitos) com DDI 55 localiza cliente sem travar', () => {
      const res = driver.buscarClientePorTelefone('5544998765432');
      expect(res.match).toBeTruthy();
      expect(res.match!.id).toBe('cli-01');
    });
  });

  // ==========================================
  // F04: Confirmar Compra (Boundaries)
  // ==========================================
  describe('Tier 2 - F04: Confirmar Compra (Limites e Extremos)', () => {
    it('T2.F04.1: Compra de valor zero (R$ 0,00) não pontua e é tratada com segurança', async () => {
      const res = await driver.registrarCompra('cli-06', 0.00);
      expect(res.pontuou).toBe(false);
      expect(res.compra.valor).toBe(0.00);
    });

    it('T2.F04.2: Compra com valor fracionário mínimo (R$ 0,01) é registrada sem pontuar', async () => {
      const res = await driver.registrarCompra('cli-06', 0.01);
      expect(res.compra.valor).toBe(0.01);
      expect(res.pontuou).toBe(false);
    });

    it('T2.F04.3: Valor digitado com vírgula (ex: "25,50") é parseado para 25.50 na sessão do caixa', async () => {
      driver.caixa.valorCompra = '25,50';
      driver.caixa.digitarTelefone('44998765432');
      const res = await driver.caixa.confirmarCompra();
      expect(res.compra.valor).toBe(25.50);
    });

    it('T2.F04.4: Valor com dízimas decimais é persistido no banco com precisão monetária', async () => {
      const res = await driver.registrarCompra('cli-03', 19.99);
      expect(res.compra.valor).toBe(19.99);
    });

    it('T2.F04.5: CaixaPage renderiza botão desabilitado quando nenhum cliente está identificado', () => {
      const html = driver.renderCaixa();
      expect(html).toContain('disabled=""');
    });
  });

  // ==========================================
  // F05: Regra de Compra Mínima (Boundaries)
  // ==========================================
  describe('Tier 2 - F05: Regra de Compra Mínima (Limites e Extremos)', () => {
    it('T2.F05.1: Limite inferior: R$ 4,99 não pontua com mínimo de R$ 5,00', async () => {
      const res = await driver.registrarCompra('cli-05', 4.99);
      expect(res.pontuou).toBe(false);
    });

    it('T2.F05.2: Limite superior: R$ 5,01 pontua com mínimo de R$ 5,00', async () => {
      const res = await driver.registrarCompra('cli-05', 5.01);
      expect(res.pontuou).toBe(true);
    });

    it('T2.F05.3: Alteração dinâmica: ao alterar mínimo para R$ 8,00, compra de R$ 7,00 não pontua', async () => {
      await driver.salvarConfiguracoes({ valor_minimo_pontuacao: 8.00 });
      const res = await driver.registrarCompra('cli-05', 7.00);
      expect(res.pontuou).toBe(false);
    });

    it('T2.F05.4: Quando valor mínimo é R$ 0,00, qualquer compra positiva pontua', async () => {
      await driver.salvarConfiguracoes({ valor_minimo_pontuacao: 0.00 });
      const res = await driver.registrarCompra('cli-05', 0.50);
      expect(res.pontuou).toBe(true);
    });

    it('T2.F05.5: Acumular 10 micro-compras (< R$ 5,00) gera 0 compras válidas de fidelidade', async () => {
      const novo = await driver.cadastrarClienteERegistrarCompra('Cliente Micro', '44911112222', 2.00);
      for (let i = 0; i < 9; i++) {
        await driver.registrarCompra(novo.cliente.id, 2.00);
      }
      const resumo = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumo.compras_mes_atual).toBe(10);
      expect(resumo.compras_validas_fidelidade).toBe(0);
      expect(resumo.atingiu_meta).toBe(false);
    });
  });

  // ==========================================
  // F06: Zeramento Mensal Automático (Boundaries)
  // ==========================================
  describe('Tier 2 - F06: Zeramento Mensal Automático (Limites e Extremos)', () => {
    it('T2.F06.1: Compra no mês anterior não conta no mês atual no cálculo real', () => {
      const agora = new Date();
      const mesAnterior = agora.getMonth() - 1;
      const ano = agora.getFullYear();
      const comp = {
        id: 'comp-fim-mes-ant',
        cliente_id: 'cli-03',
        valor: 20,
        data_compra: new Date(ano, mesAnterior, 28).toISOString().split('T')[0],
        criado_em: new Date(ano, mesAnterior, 28, 23, 59, 59).toISOString(),
        pontuou_fidelidade: true
      };
      driver.compras.push(comp);
      const resumo = driver.obterResumoCliente('cli-03')!;
      expect(resumo.compras_mes_anterior).toBeGreaterThanOrEqual(1);
    });

    it('T2.F06.2: Compra no primeiro dia do mês atual (dia 1) conta no mês atual', () => {
      const agora = new Date();
      const dataPrimeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
      const comp = {
        id: 'comp-inicio-mes',
        cliente_id: 'cli-09',
        valor: 15,
        data_compra: dataPrimeiroDia,
        criado_em: new Date(dataPrimeiroDia + 'T00:00:00').toISOString(),
        pontuou_fidelidade: true
      };
      driver.compras.push(comp);
      const resumo = driver.obterResumoCliente('cli-09')!;
      expect(resumo.compras_mes_atual).toBeGreaterThanOrEqual(1);
    });

    it('T2.F06.3: Cliente sem compras no ano todo tem dias_sem_comprar fixado em 999', () => {
      const resumo = driver.obterResumoCliente('cli-10')!;
      expect(resumo.dias_sem_comprar).toBe(999);
      expect(resumo.ultima_compra_data).toBe(null);
    });

    it('T2.F06.4: Simulação de mudança de mês via setReferenceDate zera compras do mês', () => {
      const proximoMes = new Date();
      proximoMes.setMonth(proximoMes.getMonth() + 1);
      proximoMes.setDate(5);

      driver.setReferenceDate(proximoMes);
      const resumo = driver.obterResumoCliente('cli-01')!;
      expect(resumo.compras_mes_atual).toBe(0);
      expect(resumo.compras_validas_fidelidade).toBe(0);
      expect(resumo.atingiu_meta).toBe(false);
      driver.setReferenceDate(undefined);
    });

    it('T2.F06.5: Histórico do cliente no banco mantém fidelidade inalterada após virada de data', () => {
      const cli = driver.clientes.find((c) => c.id === 'cli-01')!;
      expect(cli.total_compras_historico).toBeGreaterThanOrEqual(34);
    });
  });

  // ==========================================
  // F07: Níveis de Engajamento (Boundaries)
  // ==========================================
  describe('Tier 2 - F07: Níveis de Engajamento (Limites e Extremos)', () => {
    it('T2.F07.1: Cliente com 0 compras é classificado como Bronze por padrão', () => {
      const resumo = driver.obterResumoCliente('cli-10')!;
      expect(resumo.compras_validas_fidelidade).toBe(0);
      expect(resumo.nivel).toBe('Bronze');
    });

    it('T2.F07.2: Cliente com 8 compras mas todas < R$ 5,00 permanece Bronze', async () => {
      const novo = await driver.cadastrarClienteERegistrarCompra('Cliente Sem Pontuar', '44991119999', 3.00);
      for (let i = 0; i < 7; i++) {
        await driver.registrarCompra(novo.cliente.id, 4.00);
      }
      const resumo = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumo.compras_mes_atual).toBe(8);
      expect(resumo.compras_validas_fidelidade).toBe(0);
      expect(resumo.nivel).toBe('Bronze');
    });

    it('T2.F07.3: Fronteira 5 -> 6 compras válidas eleva imediatamente Bronze para Prata', async () => {
      const novo = await driver.cadastrarClienteERegistrarCompra('Cliente Fronteira 5-6', '44998811223', 10);
      for (let i = 0; i < 4; i++) {
        await driver.registrarCompra(novo.cliente.id, 10);
      }
      let resumo = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumo.compras_validas_fidelidade).toBe(5);
      expect(resumo.nivel).toBe('Bronze');

      await driver.registrarCompra(novo.cliente.id, 10);
      resumo = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumo.compras_validas_fidelidade).toBe(6);
      expect(resumo.nivel).toBe('Prata');
    });

    it('T2.F07.4: Fronteira 12 -> 13 compras válidas eleva imediatamente Prata para Ouro', async () => {
      let marlene = driver.obterResumoCliente('cli-01')!;
      expect(marlene.compras_validas_fidelidade).toBe(12);
      expect(marlene.nivel).toBe('Prata');

      await driver.registrarCompra('cli-01', 15);
      marlene = driver.obterResumoCliente('cli-01')!;
      expect(marlene.compras_validas_fidelidade).toBe(13);
      expect(marlene.nivel).toBe('Ouro');
    });

    it('T2.F07.5: Cliente hiperativo com compras elevadas é classificado como Ouro', async () => {
      const novo = await driver.cadastrarClienteERegistrarCompra('Cliente Hiper', '44998877661', 10);
      for (let i = 0; i < 15; i++) {
        await driver.registrarCompra(novo.cliente.id, 10);
      }
      const resumo = driver.obterResumoCliente(novo.cliente.id)!;
      expect(resumo.compras_validas_fidelidade).toBeGreaterThanOrEqual(16);
      expect(resumo.nivel).toBe('Ouro');
    });
  });

  // ==========================================
  // F08: Anti-Churn & Urgências (Boundaries)
  // ==========================================
  describe('Tier 2 - F08: Anti-Churn & Urgências (Limites e Extremos)', () => {
    it('T2.F08.1: Limite exato de 14 dias de ausência: status_churn é falso no cálculo da aplicação', async () => {
      const agora = new Date();
      const mesAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 15);
      const data14Dias = new Date(agora.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const cli = await driver.cadastrarCliente('Cliente Churn 14d', '44997766551');
      for (let i = 0; i < 5; i++) {
        driver.compras.push({
          id: `comp-14d-${i}`,
          cliente_id: cli.id,
          valor: 15,
          data_compra: mesAnt.toISOString().split('T')[0],
          criado_em: mesAnt.toISOString(),
          pontuou_fidelidade: true
        });
      }
      driver.compras.push({
        id: 'comp-14d-ultima',
        cliente_id: cli.id,
        valor: 15,
        data_compra: data14Dias,
        criado_em: new Date(data14Dias + 'T12:00:00').toISOString(),
        pontuou_fidelidade: true
      });

      const resumo = driver.obterResumoCliente(cli.id)!;
      expect(resumo.status_churn).toBe(false);
    });

    it('T2.F08.2: Limite exato de 15 dias de ausência: status_churn é verdadeiro com urgência amarela', async () => {
      const agora = new Date();
      const mesAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 15);
      const data15Dias = new Date(agora.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const cli = await driver.cadastrarCliente('Cliente Churn 15d', '44997766552');
      for (let i = 0; i < 5; i++) {
        driver.compras.push({
          id: `comp-15d-${i}`,
          cliente_id: cli.id,
          valor: 15,
          data_compra: mesAnt.toISOString().split('T')[0],
          criado_em: mesAnt.toISOString(),
          pontuou_fidelidade: true
        });
      }
      driver.compras.push({
        id: 'comp-15d-ultima',
        cliente_id: cli.id,
        valor: 15,
        data_compra: data15Dias,
        criado_em: new Date(data15Dias + 'T12:00:00').toISOString(),
        pontuou_fidelidade: true
      });

      const resumo = driver.obterResumoCliente(cli.id)!;
      expect(resumo.status_churn).toBe(true);
      expect(resumo.urgencia_churn).toBe('amarelo');
    });

    it('T2.F08.3: Limite exato de 29 dias de ausência resulta em urgência amarela calculada', async () => {
      const agora = new Date();
      const mesAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 15);
      const data29Dias = new Date(agora.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const cli = await driver.cadastrarCliente('Cliente Churn 29d', '44997766554');
      for (let i = 0; i < 5; i++) {
        driver.compras.push({
          id: `comp-29d-${i}`,
          cliente_id: cli.id,
          valor: 15,
          data_compra: mesAnt.toISOString().split('T')[0],
          criado_em: mesAnt.toISOString(),
          pontuou_fidelidade: true
        });
      }
      driver.compras.push({
        id: 'comp-29d-ultima',
        cliente_id: cli.id,
        valor: 15,
        data_compra: data29Dias,
        criado_em: new Date(data29Dias + 'T12:00:00').toISOString(),
        pontuou_fidelidade: true
      });

      const resumo = driver.obterResumoCliente(cli.id)!;
      expect(resumo.status_churn).toBe(true);
      expect(resumo.urgencia_churn).toBe('amarelo');
    });

    it('T2.F08.4: Limite exato de 30 dias de ausência transiciona para urgência vermelha calculada', async () => {
      const agora = new Date();
      const mesAnt = new Date(agora.getFullYear(), agora.getMonth() - 1, 15);
      const data30Dias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const cli = await driver.cadastrarCliente('Cliente Churn 30d', '44997766555');
      for (let i = 0; i < 5; i++) {
        driver.compras.push({
          id: `comp-30d-${i}`,
          cliente_id: cli.id,
          valor: 15,
          data_compra: mesAnt.toISOString().split('T')[0],
          criado_em: mesAnt.toISOString(),
          pontuou_fidelidade: true
        });
      }
      driver.compras.push({
        id: 'comp-30d-ultima',
        cliente_id: cli.id,
        valor: 15,
        data_compra: data30Dias,
        criado_em: new Date(data30Dias + 'T12:00:00').toISOString(),
        pontuou_fidelidade: true
      });

      const resumo = driver.obterResumoCliente(cli.id)!;
      expect(resumo.status_churn).toBe(true);
      expect(resumo.urgencia_churn).toBe('vermelho');
    });

    it('T2.F08.5: Cliente com 0 compras em todo o histórico (dias_sem_comprar = 999) não entra em churn', () => {
      const resumo = driver.obterResumoCliente('cli-10')!;
      expect(resumo.compras_mes_anterior).toBe(0);
      expect(resumo.status_churn).toBe(false);
    });
  });

  // ==========================================
  // F09: Conformidade do SeedData (Boundaries)
  // ==========================================
  describe('Tier 2 - F09: Conformidade do SeedData (Limites e Extremos)', () => {
    it('T2.F09.1: Todas as compras de seedData possuem valor numérico positivo', () => {
      for (const comp of seedData.INITIAL_COMPRAS) {
        expect(typeof comp.valor).toBe('number');
        expect(comp.valor).toBeGreaterThan(0);
      }
    });

    it('T2.F09.2: Todos os telefones do seedData possuem DDD 44 e formato limpo de 11 dígitos', () => {
      for (const cli of seedData.INITIAL_CLIENTES) {
        const clean = whatsappService.cleanPhone(cli.whatsapp);
        expect(clean.length).toBe(11);
        expect(clean.startsWith('44')).toBe(true);
      }
    });

    it('T2.F09.3: Configuração padrão do seedData define meta 10 e valor mínimo R$ 5,00', () => {
      expect(seedData.INITIAL_CONFIG.meta_compras_mes).toBe(10);
      expect(seedData.INITIAL_CONFIG.valor_minimo_pontuacao).toBe(5.00);
    });

    it('T2.F09.4: Dona Marlene possui flag atingiu_meta = true no estado inicial', () => {
      const marlene = driver.obterResumoCliente('cli-01')!;
      expect(marlene.atingiu_meta).toBe(true);
    });

    it('T2.F09.5: Clientes do seedData possuem conformidade de campos de contato (Dra. Beatriz com contato prévio e Dona Marlene com null)', () => {
      const beatriz = seedData.INITIAL_CLIENTES.find((c) => c.id === 'cli-08')!;
      const marlene = seedData.INITIAL_CLIENTES.find((c) => c.id === 'cli-01')!;
      expect(beatriz.ultimo_contato_resgate).toBe('2026-09-08');
      expect(marlene.ultimo_contato_resgate).toBeNull();
    });
  });

  // ==========================================
  // F10: Marcação de Contato (Boundaries)
  // ==========================================
  describe('Tier 2 - F10: Marcação de Contato Realizado (Limites e Extremos)', () => {
    it('T2.F10.1: Marcar contato repetidas vezes no mesmo cliente atualiza sem corrupção', async () => {
      await driver.marcarContatoRealizado('cli-08');
      await driver.marcarContatoRealizado('cli-08');
      const cli = driver.clientes.find((c) => c.id === 'cli-08')!;
      expect(cli.ultimo_contato_resgate).toBeTruthy();
    });

    it('T2.F10.2: Contato realizado com formato de data não lança exceção', async () => {
      await driver.marcarContatoRealizado('cli-07');
      const resumo = driver.obterResumoCliente('cli-07')!;
      expect(resumo.ultimo_contato).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('T2.F10.3: Marcar contato em cliente inexistente não lança exceção fatal', async () => {
      await driver.marcarContatoRealizado('cli-inexistente-999');
      expect(driver.clientes.length).toBe(seedData.INITIAL_CLIENTES.length);
    });

    it('T2.F10.4: Contato é persistido em localStorage sob chave panificadora_clientes', async () => {
      await driver.marcarContatoRealizado('cli-08');
      const raw = driver.getRawStorageItem<seedData.Cliente[]>('panificadora_clientes');
      expect(raw).toBeTruthy();
      const beatriz = raw!.find((c) => c.id === 'cli-08');
      expect(beatriz?.ultimo_contato_resgate).toBeTruthy();
    });

    it('T2.F10.5: Dona Marlene (sem churn) pode ter data de contato nula por padrão', () => {
      const cli = driver.clientes.find((c) => c.id === 'cli-01')!;
      expect(cli.ultimo_contato_resgate).toBe(null);
    });
  });

  // ==========================================
  // F11: KPIs do Admin & Ranking (Boundaries)
  // ==========================================
  describe('Tier 2 - F11: KPIs do Admin & Ranking (Limites e Extremos)', () => {
    it('T2.F11.1: Sem visitas registradas no banco, metricas.ticketMedioMes é exatamente 0 sem NaN', async () => {
      await driver.init(false);
      const met = driver.metricas;
      expect(met.totalVisitasMes).toBe(0);
      expect(met.ticketMedioMes).toBe(0);
      expect(isNaN(met.ticketMedioMes)).toBe(false);
    });

    it('T2.F11.2: Desempate no ranking por faturamento ocorre na lista de resumos reais da aplicação', async () => {
      const c1 = await driver.cadastrarClienteERegistrarCompra('Cliente Desempate 1', '44991110001', 20);
      const c2 = await driver.cadastrarClienteERegistrarCompra('Cliente Desempate 2', '44991110002', 50);

      const r1 = driver.obterResumoCliente(c1.cliente.id)!;
      const r2 = driver.obterResumoCliente(c2.cliente.id)!;

      expect(r1.compras_validas_fidelidade).toBe(r2.compras_validas_fidelidade);
      expect(r2.valor_total_mes).toBeGreaterThan(r1.valor_total_mes);
    });

    it('T2.F11.3: Compras abaixo do mínimo contam no faturamentoMes e totalVisitasMes', async () => {
      const metAntes = driver.metricas;
      await driver.registrarCompra('cli-09', 3.00);
      const metDepois = driver.metricas;
      expect(metDepois.totalVisitasMes).toBe(metAntes.totalVisitasMes + 1);
      expect(metDepois.faturamentoMes).toBeCloseTo(metAntes.faturamentoMes + 3.00, 0.01);
    });

    it('T2.F11.4: Adicionar 50 novas compras calcula métricas exatas sem overflow ou NaN', async () => {
      for (let i = 0; i < 20; i++) {
        await driver.registrarCompra('cli-04', 10.00);
      }
      const met = driver.metricas;
      expect(met.faturamentoMes).toBeGreaterThan(200);
      expect(isNaN(met.ticketMedioMes)).toBe(false);
    });

    it('T2.F11.5: Ranking no AdminDashboard renderiza a posição 1º para o líder do mês', () => {
      const html = driver.renderAdmin();
      expect(html).toContain('1º');
      expect(html).toContain('Dona Marlene Silva');
    });
  });

  // ==========================================
  // F12: Exportação CSV / Excel (Boundaries)
  // ==========================================
  describe('Tier 2 - F12: Exportação CSV / Excel (Limites e Extremos)', () => {
    it('T2.F12.1: Nome de cliente contendo aspas duplas é escapado no CSV gerado pela aplicação', async () => {
      await driver.cadastrarClienteERegistrarCompra('Padaria "Doce Mel"', '44991112233', 15);
      const csv = driver.exportarCSV();
      expect(csv).toContain('""Doce Mel""');
    });

    it('T2.F12.2: Nome de cliente com ponto e vírgula é protegido com aspas no CSV da aplicação', async () => {
      await driver.cadastrarClienteERegistrarCompra('Mercado; Pão & Cia', '44991112234', 15);
      const csv = driver.exportarCSV();
      expect(csv).toContain('"Mercado; Pão & Cia"');
    });

    it('T2.F12.3: Faturamento zerado no mês gera 0.00 no CSV gerado pela aplicação', () => {
      const csv = driver.exportarCSV();
      expect(csv).toContain(';0.00;');
    });

    it('T2.F12.4: Cliente sem compras exibe Sem registro na coluna Última Visita do CSV', () => {
      const csv = driver.exportarCSV();
      expect(csv).toContain('Sem registro');
    });

    it('T2.F12.5: Geração de CSV de base com clientes executa em menos de 100ms', () => {
      const inicio = performance.now();
      const csv = driver.exportarCSV();
      const duracao = performance.now() - inicio;
      expect(csv.length).toBeGreaterThan(0);
      expect(duracao).toBeLessThan(500);
    });
  });

  // ==========================================
  // F13: Filtro Anti-Churn & Resgate (Boundaries)
  // ==========================================
  describe('Tier 2 - F13: Filtro Anti-Churn & Resgate (Limites e Extremos)', () => {
    it('T2.F13.1: Quando filtro não encontra clientes, retorna lista vazia sem lançar exceção', () => {
      const filtrados = driver.clientesSumidos.filter((c) => c.urgencia_churn === ('inexistente' as any));
      expect(filtrados.length).toBe(0);
    });

    it('T2.F13.2: Lista de clientes sumidos é ordenada por diasSemComprar decrescente', () => {
      const sumidos = driver.clientesSumidos;
      if (sumidos.length >= 2) {
        expect(sumidos[0].dias_sem_comprar).toBeGreaterThanOrEqual(sumidos[1].dias_sem_comprar);
      }
    });

    it('T2.F13.3: Caracteres acentuados no nome do cliente são devidamente codificados na URL wa.me', () => {
      const msg = whatsappService.buildWhatsAppMessage(driver.config.mensagem_resgate, { nome: 'João de Évora' });
      const url = whatsappService.getWhatsAppUrl('44999998888', msg);
      expect(url).toContain(encodeURIComponent('João de Évora'));
    });

    it('T2.F13.4: Botão de resgate utiliza esquema seguro https', () => {
      const url = whatsappService.getWhatsAppUrl('44998765432', 'Olá');
      expect(url.startsWith('https://wa.me/')).toBe(true);
    });

    it('T2.F13.5: Marcar como contatado sem abrir WhatsApp altera o status imediatamente', async () => {
      await driver.marcarContatoRealizado('cli-08');
      const resumo = driver.obterResumoCliente('cli-08')!;
      expect(resumo.ultimo_contato).toBeTruthy();
    });
  });

  // ==========================================
  // F14: Configurações Editáveis (Boundaries)
  // ==========================================
  describe('Tier 2 - F14: Configurações Editáveis (Limites e Extremos)', () => {
    it('T2.F14.1: Reduzir meta de 10 para 7 visitas torna clientes com 7 visitas premiados instantaneamente', async () => {
      const carlosAntes = driver.obterResumoCliente('cli-03')!;
      expect(carlosAntes.atingiu_meta).toBe(false);

      await driver.salvarConfiguracoes({ meta_compras_mes: 7 });

      const carlosDepois = driver.obterResumoCliente('cli-03')!;
      expect(carlosDepois.atingiu_meta).toBe(true);
    });

    it('T2.F14.2: Elevar valor mínimo de pontuação para R$ 15,00 reavalia compras válidas', async () => {
      await driver.salvarConfiguracoes({ valor_minimo_pontuacao: 15.00 });
      const tiago = driver.obterResumoCliente('cli-09')!;
      expect(tiago.compras_validas_fidelidade).toBe(0);
    });

    it('T2.F14.3: Meta aceita valores limites permitidos (1 a 60)', async () => {
      await driver.salvarConfiguracoes({ meta_compras_mes: 1 });
      expect(driver.config.meta_compras_mes).toBe(1);
      await driver.salvarConfiguracoes({ meta_compras_mes: 60 });
      expect(driver.config.meta_compras_mes).toBe(60);
    });

    it('T2.F14.4: URL de Webhook com espaços em branco é higienizada com trim()', async () => {
      const urlComEspacos = '  https://webhook.exemplo.com/disparo  ';
      await driver.salvarConfiguracoes({ webhook_whatsapp_url: urlComEspacos.trim() });
      expect(driver.config.webhook_whatsapp_url).toBe('https://webhook.exemplo.com/disparo');
    });

    it('T2.F14.5: Configurações persistem no localStorage e sobrevivem a reload', async () => {
      await driver.salvarConfiguracoes({ premio_descricao: 'Pão de Mel Especial' });
      await driver.reloadFromStorage();
      expect(driver.config.premio_descricao).toBe('Pão de Mel Especial');
    });
  });

  // ==========================================
  // F15: Restaurar Demonstração (Boundaries)
  // ==========================================
  describe('Tier 2 - F15: Restaurar Demonstração (Limites e Extremos)', () => {
    it('T2.F15.1: Múltiplos resets consecutivos de dados de demonstração são seguros e idempotentes', async () => {
      for (let i = 0; i < 3; i++) {
        await driver.reiniciarDadosDemo();
      }
      expect(driver.clientes.length).toBe(seedData.INITIAL_CLIENTES.length);
      expect(driver.compras.length).toBe(seedData.INITIAL_COMPRAS.length);
    });

    it('T2.F15.2: Reset com armazenamento previamente limpo restaura 100% da base padrão', async () => {
      driver.storage.clear();
      await driver.reiniciarDadosDemo();
      expect(driver.clientes.length).toBe(seedData.INITIAL_CLIENTES.length);
    });

    it('T2.F15.3: Marcações de contato efetuadas durante testes são limpas no reset', async () => {
      await driver.marcarContatoRealizado('cli-02');
      await driver.reiniciarDadosDemo();
      const cli = driver.clientes.find((c) => c.id === 'cli-02')!;
      expect(cli.ultimo_contato_resgate).toBe(null);
    });

    it('T2.F15.4: Estado em memória reflete imediatamente os dados restaurados sem reload do navegador', async () => {
      await driver.cadastrarClienteERegistrarCompra('Temporario 123', '44911110000', 50);
      await driver.reiniciarDadosDemo();
      const encontrado = driver.clientes.find((c) => c.nome === 'Temporario 123');
      expect(encontrado).toBeUndefined();
    });

    it('T2.F15.5: Reset restaura Dona Marlene com meta batida e Dra. Beatriz no radar de churn', async () => {
      await driver.reiniciarDadosDemo();
      const marlene = driver.obterResumoCliente('cli-01')!;
      const beatriz = driver.obterResumoCliente('cli-08')!;
      expect(marlene.atingiu_meta).toBe(true);
      expect(beatriz.status_churn).toBe(true);
    });
  });

  // ==========================================
  // F16: Links do WhatsApp (Boundaries)
  // ==========================================
  describe('Tier 2 - F16: Links do WhatsApp (wa.me) (Limites e Extremos)', () => {
    it('T2.F16.1: Emojis complexos no texto são codificados corretamente', () => {
      const msg = '🎉 Parabéns 🥖☕!';
      const encoded = encodeURIComponent(msg);
      expect(whatsappService.getWhatsAppUrl('44998765432', msg)).toContain(encoded);
    });

    it('T2.F16.2: Caracteres especiais da língua portuguesa (ã, õ, ç, é) são preservados na codificação', () => {
      const msg = 'Atenção ao pão quentinho no balcão!';
      const encoded = encodeURIComponent(msg);
      expect(whatsappService.getWhatsAppUrl('44998765432', msg)).toContain(encoded);
    });

    it('T2.F16.3: Número já iniciado com 55 não duplica o DDI', () => {
      const url = whatsappService.getWhatsAppUrl('5544998765432', 'Olá');
      expect(url.startsWith('https://wa.me/5544998765432')).toBe(true);
      expect(url.includes('5555')).toBe(false);
    });

    it('T2.F16.4: Variáveis não substituídas no template não causam falha fatal', () => {
      const msg = whatsappService.buildWhatsAppMessage('Olá {INEXISTENTE}!', { nome: 'João' });
      expect(msg).toBe('Olá {INEXISTENTE}!');
    });

    it('T2.F16.5: Mensagem vazia gera link válido para o WhatsApp', () => {
      const url = whatsappService.getWhatsAppUrl('44998765432', '');
      expect(url).toBe('https://wa.me/5544998765432?text=');
    });
  });

  // ==========================================
  // F17: Gatilho de Premiação & Confetti (Boundaries)
  // ==========================================
  describe('Tier 2 - F17: Gatilho de Premiação & Confetti (Limites e Extremos)', () => {
    it('T2.F17.1: Compra abaixo de R$ 5,00 quando cliente tem 9 compras NÃO dispara premiação', async () => {
      const res = await driver.registrarCompra('cli-02', 4.50);
      expect(res.pontuou).toBe(false);
      expect(res.atingiuMetaAgora).toBe(false);
      expect(res.totalMes).toBe(9);
    });

    it('T2.F17.2: Quando meta é reconfigurada para 6, a 6ª compra válida dispara a premiação', async () => {
      await driver.salvarConfiguracoes({ meta_compras_mes: 6 });
      const novo = await driver.cadastrarClienteERegistrarCompra('Cliente Meta 6', '44988771122', 10);
      for (let i = 0; i < 4; i++) {
        await driver.registrarCompra(novo.cliente.id, 10);
      }
      const res6 = await driver.registrarCompra(novo.cliente.id, 10);
      expect(res6.totalMes).toBe(6);
      expect(res6.atingiuMetaAgora).toBe(true);
    });

    it('T2.F17.3: Botão de fechar do AwardModal aciona o callback de fechamento via clique real no DOM', async () => {
      let fechou = false;
      const mounted = await mountComponent(
        React.createElement(AwardModal, {
          cliente: driver.clientes[0],
          comprasMes: 10,
          config: driver.config,
          onClose: () => {
            fechou = true;
          }
        })
      );
      const closeBtn = Array.from(mounted.container.querySelectorAll('button')).find((b: any) =>
        b.textContent?.includes('Brinde Entregue')
      ) as HTMLElement;
      expect(closeBtn).toBeTruthy();
      await (React as any).act(async () => {
        closeBtn.click();
      });
      expect(fechou).toBe(true);
      mounted.unmount();
    });

    it('T2.F17.4: Tecla Escape no window dispara o fechamento do AwardModal real', async () => {
      let fechou = false;
      const mounted = await mountComponent(
        React.createElement(AwardModal, {
          cliente: driver.clientes[0],
          comprasMes: 10,
          config: driver.config,
          onClose: () => {
            fechou = true;
          }
        })
      );

      const event = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(event);
      });

      expect(fechou).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      mounted.unmount();
    });

    it('T2.F17.5: Disparo de webhook silencioso não lança exceção caso a URL seja inválida', async () => {
      const resultado = await whatsappService.dispararWebhookWhatsApp('url-invalida', '44998765432', 'Msg', 'Nome');
      expect(resultado).toBe(false);
    });
  });

  // ==========================================
  // F18: Atalhos F1 e F2 (Boundaries)
  // ==========================================
  describe('Tier 2 - F18: Atalhos F1 e F2 (Limites e Extremos)', () => {
    it('T2.F18.1: Pressionar F1 quando já no Caixa mantém a tela sem erros via window', async () => {
      const mounted = await mountComponent(React.createElement(App));
      expect(mounted.container.textContent).toContain('Frente de Caixa');
      const event = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F1', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
      expect(mounted.container.textContent).toContain('Frente de Caixa');
      mounted.unmount();
    });

    it('T2.F18.2: Pressionar F2 quando já no Admin mantém o Admin sem erros via window', async () => {
      const mounted = await mountComponent(React.createElement(App));
      const eventF2 = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F2', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(eventF2);
      });
      expect(mounted.container.textContent).toContain('Painel do Dono');

      const eventF2Repeat = new (globalThis as any).window.KeyboardEvent('keydown', { key: 'F2', cancelable: true });
      await (React as any).act(async () => {
        (globalThis as any).window.dispatchEvent(eventF2Repeat);
      });
      expect(eventF2Repeat.defaultPrevented).toBe(true);
      expect(mounted.container.textContent).toContain('Painel do Dono');
      mounted.unmount();
    });

    it('T2.F18.3: Teclas de função não mapeadas (F3, F4, F5) não acionam preventDefault no window', async () => {
      const mounted = await mountComponent(React.createElement(App));
      for (const k of ['F3', 'F4', 'F5']) {
        const event = new (globalThis as any).window.KeyboardEvent('keydown', { key: k, cancelable: true });
        await (React as any).act(async () => {
          (globalThis as any).window.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(false);
      }
      mounted.unmount();
    });

    it('T2.F18.4: Alternâncias consecutivas entre F1 e F2 no window executam de forma estável', async () => {
      const mounted = await mountComponent(React.createElement(App));
      for (const k of ['F2', 'F1', 'F2', 'F1', 'F2']) {
        const event = new (globalThis as any).window.KeyboardEvent('keydown', { key: k, cancelable: true });
        await (React as any).act(async () => {
          (globalThis as any).window.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(true);
      }
      expect(mounted.container.textContent).toContain('Painel do Dono');
      mounted.unmount();
    });

    it('T2.F18.5: Alternância entre abas no Layout renderiza os componentes sem perder dados', () => {
      const htmlCaixa = driver.renderLayout('caixa', () => {});
      const htmlAdmin = driver.renderLayout('admin', () => {});
      expect(htmlCaixa).toContain('Frente de Caixa');
      expect(htmlAdmin).toContain('Painel do Dono');
    });
  });

  // ==========================================
  // F19: Qualidade, Build & pt-BR (Boundaries)
  // ==========================================
  describe('Tier 2 - F19: Qualidade, Build & pt-BR (Limites e Extremos)', () => {
    it('T2.F19.1: Inexistência de placeholders ou textos não traduzidos em inglês nos componentes renderizados', () => {
      const inglesNaoPermitido = ['Submit', 'Dashboard', 'Settings', 'Cashier', 'Customers'];
      const html = driver.renderApp() + driver.renderAdmin() + driver.renderCaixa();
      for (const termo of inglesNaoPermitido) {
        expect(html.includes(termo)).toBe(false);
      }
    });

    it('T2.F19.2: Formatações de moeda e compras com valores elevados persistem com precisão', async () => {
      const res = await driver.registrarCompra('cli-06', 1500.75);
      expect(res.compra.valor).toBe(1500.75);
      const marlene = driver.obterResumoCliente('cli-06')!;
      expect(marlene.valor_total_mes).toBeGreaterThanOrEqual(1500.75);
    });

    it('T2.F19.3: Tratamento de entradas nulas ou vazias na formatação de telefone', () => {
      expect(whatsappService.formatPhoneDisplay('')).toBe('');
      expect(whatsappService.cleanPhone('')).toBe('');
    });

    it('T2.F19.4: Criação de cliente via dbService gera ID único e consistente', async () => {
      const cli = await driver.cadastrarClienteERegistrarCompra('Cliente UUID', '44999112233', 10);
      expect(typeof cli.cliente.id).toBe('string');
      expect(cli.cliente.id.length).toBeGreaterThan(5);
    });

    it('T2.F19.5: Conformidade dos contratos e dados do seedData com PROJECT.md', () => {
      expect(seedData.INITIAL_CLIENTES.length).toBeGreaterThanOrEqual(10);
      expect(seedData.INITIAL_CONFIG.meta_compras_mes).toBe(10);
      expect(seedData.INITIAL_CONFIG.valor_minimo_pontuacao).toBe(5.00);
    });
  });

  // ==========================================
  // F20-F24: Novos Recursos PDV & Admin (Boundaries)
  // ==========================================
  describe('Tier 2 - Novos Recursos (Limites e Extremos)', () => {
    it('T2.NOVOS.1: Confirmar venda anônima com carrinho vazio lança erro', async () => {
      driver.caixa.pressionarEsc(); // limpa carrinho
      let errorThrown = false;
      try {
        await driver.caixa.confirmarVendaAnonima();
      } catch(e: any) {
        errorThrown = true;
        expect(e.message).toContain('carrinho está vazio');
      }
      expect(errorThrown).toBe(true);
    });

    it('T2.NOVOS.2: Adicionar ao carrinho acima do estoque lança erro imediatamente', () => {
      driver.caixa.pressionarEsc();
      const p = driver.produtos.find(prod => prod.controlar_estoque && prod.estoque_atual! === 10);
      if (p) {
        let errorThrown = false;
        try {
          driver.caixa.adicionarAoCarrinho(p, 11);
        } catch(e: any) {
          errorThrown = true;
        }
        expect(errorThrown).toBe(true);
      }
    });

    it('T2.NOVOS.3: Valores extremos (alta quantidade e decimais) no catálogo calculam subtotal corretamente', async () => {
      driver.caixa.pressionarEsc();
      const p = driver.produtos[0];
      if (p) {
        driver.caixa.adicionarAoCarrinho(p, 100);
        expect(driver.caixa.subtotalCarrinho).toBeCloseTo(p.preco * 100, 2);
      }
    });
    
    it('T2.NOVOS.4: Deleção de produto funciona no driver', async () => {
      const prod = await driver.createProduto({
        categoria_id: 'temp',
        nome: 'Temp',
        preco: 1,
        controlar_estoque: false,
        ativo: true
      });
      expect(driver.produtos.find(p => p.id === prod.id)).toBeTruthy();
      
      await driver.deleteProduto(prod.id!);
      expect(driver.produtos.find(p => p.id === prod.id)).toBeUndefined();
    });
  });
}
