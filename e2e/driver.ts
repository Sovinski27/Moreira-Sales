/**
 * Application Driver for Opaque-Box E2E Testing
 * Integrates directly with application services, storage layer, and real React components.
 * ZERO duplicate shadow logic.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { setupBrowserEnvironment, MemoryStorage } from './harness';
import { Cliente, Compra, ConfiguracaoFidelidade, ClienteResumoMensal, MetricasGerais, Produto, Categoria, ItemCarrinho } from '../src/types';
import * as seedData from '../src/services/seedData';
import * as whatsappService from '../src/services/whatsapp';
import * as dbService from '../src/services/db';
import { 
  calcularResumosMensais, 
  calcularClientesSumidos, 
  calcularMetricas, 
  avaliarCompra 
} from '../src/services/loyaltyEngine';
import { buscarClientePorTelefone } from '../src/services/clientSearch';
import { gerarRelatorioCSV } from '../src/services/reporting';
import { LoyaltyProvider } from '../src/context/LoyaltyContext';
import { CaixaPage } from '../src/pages/CaixaPage';
import { AdminDashboard } from '../src/pages/AdminDashboard';
import { AwardModal } from '../src/components/AwardModal';
import { Layout } from '../src/components/Layout';
import { App } from '../src/App';

export class CashierSession {
  public telefoneInput = '';
  public valorCompra = '15';
  public nomeNovoCliente = '';
  public modalPremioAberto = false;
  public ultimoPremioDisparado: { cliente: Cliente; comprasMes: number } | null = null;
  public carrinho: ItemCarrinho[] = [];
  public formaPagamento = 'pix';

  constructor(private driver: AppDriver) {}

  public digitarTelefone(input: string) {
    this.telefoneInput = input;
    return this.driver.buscarClientePorTelefone(input);
  }

  public selecionarValorRapido(valor: number) {
    this.valorCompra = valor.toString();
  }

  public adicionarAoCarrinho(produto: Produto, quantidade: number = 1) {
    const existente = this.carrinho.find(item => item.produto.id === produto.id);
    if (produto.controlar_estoque && produto.estoque_atual !== undefined) {
      const qtdAtual = existente ? existente.quantidade : 0;
      if (qtdAtual + quantidade > produto.estoque_atual) {
        throw new Error(`Estoque insuficiente! Restam apenas ${produto.estoque_atual} unidade(s) de "${produto.nome}".`);
      }
    }
    
    if (existente) {
      this.carrinho = this.carrinho.map(item => 
        item.produto.id === produto.id 
          ? { ...item, quantidade: item.quantidade + quantidade, subtotal: (item.quantidade + quantidade) * produto.preco }
          : item
      );
    } else {
      this.carrinho.push({
        id_temp: Date.now().toString() + Math.random(),
        produto,
        quantidade,
        subtotal: produto.preco * quantidade
      });
    }
  }

  public selecionarFormaPagamento(forma: string) {
    this.formaPagamento = forma;
  }

  public get subtotalCarrinho(): number {
    return this.carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  }

  public pressionarEsc() {
    this.telefoneInput = '';
    this.valorCompra = '15';
    this.nomeNovoCliente = '';
    this.modalPremioAberto = false;
    this.carrinho = [];
    this.formaPagamento = 'pix';
  }

  public async confirmarCompra(): Promise<{
    compra: Compra;
    atingiuMetaAgora: boolean;
    totalMes: number;
    pontuou: boolean;
  }> {
    // Se o carrinho estiver vazio, usa o valorCompra, caso contrário usa a soma do carrinho
    let valorNum = this.carrinho.length > 0 ? this.subtotalCarrinho : parseFloat(this.valorCompra.replace(',', '.')) || 0;
    const detalhesCompra = this.carrinho.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ') || undefined;

    const busca = this.driver.buscarClientePorTelefone(this.telefoneInput);

    if (busca.match) {
      const res = await this.driver.registrarCompra(busca.match.id, valorNum, detalhesCompra, this.carrinho, this.formaPagamento);
      if (res.atingiuMetaAgora) {
        this.modalPremioAberto = true;
        this.ultimoPremioDisparado = { cliente: busca.match, comprasMes: res.totalMes };
      } else {
        this.pressionarEsc();
      }
      return res;
    } else if (busca.isNovoCliente && this.nomeNovoCliente.trim()) {
      const res = await this.driver.cadastrarClienteERegistrarCompra(
        this.nomeNovoCliente.trim(),
        this.telefoneInput,
        valorNum,
        detalhesCompra,
        this.carrinho,
        this.formaPagamento
      );
      this.pressionarEsc();
      return res;
    }
    throw new Error('Operação de caixa inválida: cliente não identificado');
  }

  public async confirmarVendaAnonima(): Promise<Compra> {
    if (this.carrinho.length === 0) {
      throw new Error('O carrinho está vazio.');
    }
    const detalhesCompra = this.carrinho.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ');
    const res = await this.driver.cadastrarClienteERegistrarCompra(
      'Cliente Não Identificado',
      '0',
      this.subtotalCarrinho,
      detalhesCompra,
      this.carrinho,
      this.formaPagamento
    );
    this.pressionarEsc();
    return res.compra;
  }
}

export class AppDriver {
  public storage: MemoryStorage;
  public clientes: Cliente[] = [];
  public compras: Compra[] = [];
  public produtos: Produto[] = [];
  public categorias: Categoria[] = [];
  public config: ConfiguracaoFidelidade = { ...seedData.INITIAL_CONFIG };
  public caixa: CashierSession;
  private customReferenceDate?: Date;

  constructor() {
    const env = setupBrowserEnvironment();
    this.storage = env.storage;
    this.caixa = new CashierSession(this);
  }

  /**
   * Initializes application state from seed data or clean storage
   */
  public async init(populateSeed = true): Promise<void> {
    if (populateSeed) {
      dbService.resetToDemoData();
    } else {
      this.storage.setItem('panificadora_clientes', '[]');
      this.storage.setItem('panificadora_compras', '[]');
      this.storage.setItem('panificadora_categorias', '[]');
      this.storage.setItem('panificadora_produtos', '[]');
      this.storage.setItem('panificadora_config', JSON.stringify(seedData.INITIAL_CONFIG));
    }
    await this.reloadFromStorage();
    this.caixa.pressionarEsc();
  }

  public async reloadFromStorage(): Promise<void> {
    this.clientes = await dbService.fetchClientes();
    this.compras = await dbService.fetchCompras();
    this.produtos = await dbService.fetchProdutos();
    this.categorias = await dbService.fetchCategorias();
    this.config = await dbService.fetchConfiguracao();
  }

  public setReferenceDate(date: Date | undefined): void {
    this.customReferenceDate = date;
  }

  // DIRECT INVOCATION OF APPLICATION DOMAIN ENGINE
  public get resumosMensais(): ClienteResumoMensal[] {
    return calcularResumosMensais(this.clientes, this.compras, this.config, this.customReferenceDate);
  }

  public get clientesSumidos(): ClienteResumoMensal[] {
    return calcularClientesSumidos(this.resumosMensais);
  }

  public get metricas(): MetricasGerais {
    return calcularMetricas(this.resumosMensais, this.clientesSumidos);
  }

  public obterResumoCliente(clienteId: string): ClienteResumoMensal | null {
    return this.resumosMensais.find((r) => r.cliente.id === clienteId) || null;
  }

  public buscarClientePorTelefone(telefoneInput: string) {
    return buscarClientePorTelefone(this.clientes, telefoneInput);
  }

  public exportarCSV(): string {
    return gerarRelatorioCSV(this.resumosMensais);
  }

  // DIRECT INVOCATION OF APPLICATION PERSISTENCE LAYER (dbService / localStorage)
  public async registrarCompra(clienteId: string, valor: number, detalhes?: string, carrinho?: ItemCarrinho[], forma_pagamento?: string): Promise<{
    compra: Compra;
    atingiuMetaAgora: boolean;
    totalMes: number;
    pontuou: boolean;
  }> {
    const resumoAntes = this.obterResumoCliente(clienteId);
    const avaliacao = avaliarCompra(resumoAntes, valor, this.config);

    const novaCompra = await dbService.registerCompra(clienteId, valor, avaliacao.pontuou, detalhes, carrinho, forma_pagamento);
    await this.reloadFromStorage();

    return {
      compra: novaCompra,
      atingiuMetaAgora: avaliacao.atingiuMetaAgora,
      totalMes: avaliacao.totalValidasAtualizado,
      pontuou: avaliacao.pontuou
    };
  }

  public async cadastrarCliente(nome: string, whatsapp: string): Promise<Cliente> {
    const novoCliente = await dbService.createCliente(nome, whatsapp);
    await this.reloadFromStorage();
    return novoCliente;
  }

  public async cadastrarClienteERegistrarCompra(nome: string, whatsapp: string, valor: number, detalhes?: string, carrinho?: ItemCarrinho[], forma_pagamento?: string): Promise<{
    cliente: Cliente;
    compra: Compra;
    atingiuMetaAgora: boolean;
    totalMes: number;
    pontuou: boolean;
  }> {
    const cleanNumber = dbService.cleanPhone ? dbService.cleanPhone(whatsapp) : whatsapp.replace(/\D/g, '');
    let existingClient = this.clientes.find(c => c.whatsapp === cleanNumber);
    let targetCliente = existingClient;
    
    if (!targetCliente || cleanNumber === '0') {
        targetCliente = await dbService.createCliente(nome, whatsapp);
    }
    
    await this.reloadFromStorage();
    const res = await this.registrarCompra(targetCliente.id, valor, detalhes, carrinho, forma_pagamento);
    return {
      cliente: targetCliente,
      ...res
    };
  }

  public async salvarConfiguracoes(novasConfigs: Partial<ConfiguracaoFidelidade>): Promise<void> {
    this.config = await dbService.saveConfiguracao(novasConfigs);
    await this.reloadFromStorage();
  }

  public async marcarContatoRealizado(clienteId: string): Promise<void> {
    const hojeIso = new Date().toISOString().split('T')[0];
    await dbService.updateClienteContato(clienteId, hojeIso);
    await this.reloadFromStorage();
  }

  public async reiniciarDadosDemo(): Promise<void> {
    dbService.resetToDemoData();
    await this.reloadFromStorage();
  }
  
  // ADMIN CATÁLOGO CRUD
  public async createProduto(produto: Omit<Produto, 'id'>): Promise<Produto> {
    const p = await dbService.saveProduto(produto);
    await this.reloadFromStorage();
    return p;
  }
  
  public async deleteProduto(id: string): Promise<void> {
    await dbService.deleteProduto(id);
    await this.reloadFromStorage();
  }
  
  public async createCategoria(categoria: Omit<Categoria, 'id'>): Promise<Categoria> {
    const c = await dbService.saveCategoria(categoria);
    await this.reloadFromStorage();
    return c;
  }

  // DIRECT VERIFICATION OF PERSISTENCE STORE
  public getRawStorageItem<T>(key: string): T | null {
    const item = this.storage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  // COMPONENT RENDERING HELPERS
  public renderApp(): string {
    return renderToString(React.createElement(App));
  }

  public renderCaixa(): string {
    return renderToString(
      React.createElement(LoyaltyProvider, null, React.createElement(CaixaPage))
    );
  }

  public renderAdmin(): string {
    return renderToString(
      React.createElement(LoyaltyProvider, null, React.createElement(AdminDashboard))
    );
  }

  public renderAwardModal(cliente: Cliente, comprasMes: number, onClose: () => void): string {
    return renderToString(
      React.createElement(AwardModal, {
        cliente,
        comprasMes,
        config: this.config,
        onClose
      })
    );
  }

  public renderLayout(currentTab: 'caixa' | 'admin', onTabChange: (t: 'caixa' | 'admin') => void): string {
    return renderToString(
      React.createElement(
        LoyaltyProvider,
        null,
        React.createElement(Layout, { currentTab, setCurrentTab: onTabChange }, React.createElement('div', null, 'PageContent'))
      )
    );
  }
}
