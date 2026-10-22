/* Nexo — versão nativa em HTML, CSS e JavaScript. Toda a operação é demonstrativa. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const app = $('#app');
  let murmurationCleanup = null;
  let landingEffectsCleanup = null;
  const priorityLabel = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  const stateLabel = { ligado: 'Ligado', desligado: 'Desligado', bloqueado: 'Bloqueado', aguardando: 'Aguardando' };
  const navItems = [
    { page: 'dashboard', label: 'Visão geral', icon: 'home' },
    { page: 'equipamentos', label: 'Equipamentos', icon: 'plug' },
    { page: 'regras', label: 'Regras', icon: 'sliders' },
    { page: 'simulador', label: 'Simulador', icon: 'flask' },
    { page: 'historico', label: 'Histórico', icon: 'history' },
    { page: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ];
  const initialEnergy = {
    battery: 67, solar: 1840, gridOnline: false, availablePower: 2200,
    backupLimit: 3000, stale: false, source: 'simulado', updatedAt: 'agora',
  };
  const initialThresholds = { alta: 20, media: 50, baixa: 80 };
  const initialDevices = [
    { id: 1, name: 'Geladeira', power: 350, priority: 'alta', order: 1, requested: true, socket: 'Cozinha 01', connection: 'online', simulated: true },
    { id: 2, name: 'Roteador', power: 18, priority: 'alta', order: 2, requested: true, socket: 'Escritório 01', connection: 'online', simulated: true },
    { id: 3, name: 'Iluminação principal', power: 120, priority: 'media', order: 1, requested: true, socket: 'Circuito luz', connection: 'online', simulated: true },
    { id: 4, name: 'Televisão', power: 145, priority: 'media', order: 2, requested: true, socket: 'Sala 02', connection: 'online', simulated: true },
    { id: 5, name: 'Computador', power: 480, priority: 'media', order: 3, requested: true, socket: 'Escritório 02', connection: 'online', simulated: true },
    { id: 6, name: 'Ventilador', power: 90, priority: 'baixa', order: 1, requested: true, socket: 'Quarto 01', connection: 'online', simulated: true },
    { id: 7, name: 'Micro-ondas', power: 1400, priority: 'baixa', order: 2, requested: false, socket: 'Cozinha 02', connection: 'online', simulated: true },
    { id: 8, name: 'Ar-condicionado', power: 1800, priority: 'baixa', order: 3, requested: true, socket: 'Quarto 02', connection: 'online', simulated: true },
  ];
  const initialHistory = [
    { id: 1, time: 'Hoje, 14:32', title: 'Modo backup ativado', detail: 'A rede foi interrompida. O motor reavaliou 8 equipamentos.', tone: 'warning' },
    { id: 2, time: 'Hoje, 14:32', title: 'Cargas essenciais preservadas', detail: 'Geladeira e roteador permaneceram ligados.', tone: 'success' },
    { id: 3, time: 'Hoje, 14:31', title: 'Dados energéticos atualizados', detail: 'Leitura simulada recebida sem inconsistências.', tone: 'info' },
    { id: 4, time: 'Ontem, 20:18', title: 'Prioridade alterada', detail: 'Televisão passou de baixa para média prioridade.', tone: 'info' },
  ];
  const scenarios = [
    { name: 'Bateria crítica', detail: '15% · somente proteção', patch: { battery: 15, availablePower: 900, gridOnline: false, stale: false } },
    { name: 'Intermediária', detail: '55% · cargas médias', patch: { battery: 55, availablePower: 1800, gridOnline: false, stale: false } },
    { name: 'Solar elevada', detail: '88% · 3,4 kW disponíveis', patch: { battery: 88, solar: 4200, availablePower: 3400, gridOnline: false, stale: false } },
    { name: 'Retorno da rede', detail: 'Operação normal', patch: { battery: 63, gridOnline: true, availablePower: 5000, stale: false } },
    { name: 'Dados indisponíveis', detail: 'Leitura desatualizada', patch: { stale: true } },
    { name: 'Dispositivo indisponível', detail: 'Televisão sem comunicação', patch: { stale: false }, offlineDevice: 4 },
  ];

  const state = {
    page: 'landing', energy: { ...initialEnergy }, thresholds: { ...initialThresholds },
    devices: initialDevices.map(d => ({ ...d })), history: initialHistory.map(e => ({ ...e })),
    menuOpen: false, addingDevice: false, deviceSearch: '', priorityFilter: 'todas',
    rulesDraft: { ...initialThresholds }, voice: '', voiceResult: '',
    residenceName: 'Casa São João', residenceLocation: 'São João del-Rei, MG',
    authLoading: false,
  };

  const iconPaths = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6"/>',
    plug: '<path d="M8 3v5m8-5v5M6 8h12v2a6 6 0 0 1-12 0V8Zm6 8v5"/>',
    sliders: '<path d="M4 6h8m4 0h4M14 4v4M4 12h3m4 0h9M9 10v4M4 18h10m4 0h2M16 16v4"/>',
    flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 16h10"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4m5-1v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    battery: '<rect x="3" y="7" width="17" height="10" rx="2"/><path d="M20 10h2v4h-2M6 10h8v4H6"/>',
    bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
    grid: '<path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    edit: '<path d="m4 16-1 5 5-1L19 9l-4-4L4 16Z"/><path d="m13 7 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
    voice: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/>',
    wifi: '<path d="M4 9a12 12 0 0 1 16 0M7 12.5a7.5 7.5 0 0 1 10 0M10.5 16a2.5 2.5 0 0 1 3 0"/><circle cx="12" cy="19" r=".5" fill="currentColor"/>',
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  const fmt = n => Number(n).toLocaleString('pt-BR');
  const icon = (name, extra = '') => `<svg ${extra} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>`;
  const logo = (light = false) => `<span class="logo ${light ? 'logo-light' : ''}" aria-label="Nexo"><img class="logo-symbol" src="./Assets/Nexo-Solar-Simbolo.svg" alt=""><strong>Nexo</strong></span>`;
  const btn = (text, { action = '', page = '', variant = 'primary', iconName = '', extra = '' } = {}) => `<button class="button button-${variant}" ${action ? `data-action="${action}"` : ''} ${page ? `data-page="${page}"` : ''} ${extra}>${iconName ? icon(iconName) : ''}${text}</button>`;
  const statusDot = (tone = 'success') => `<span class="status-dot ${tone}"></span>`;
  const dotTone = s => s === 'ligado' ? 'success' : s === 'bloqueado' ? 'warning' : 'muted';

  function calculate() {
    const energy = state.energy;
    const thresholds = state.thresholds;
    const capacity = Math.max(0, Math.min(energy.availablePower, energy.backupLimit));
    const released = ['alta', 'media', 'baixa'].filter(priority => energy.battery >= thresholds[priority]);
    const rank = { alta: 0, media: 1, baixa: 2 };
    let used = 0;
    const decisions = new Map();
    [...state.devices].sort((a, b) => rank[a.priority] - rank[b.priority] || a.order - b.order).forEach(device => {
      let deviceState = 'desligado';
      let reason = 'Desligada: o usuário não solicitou funcionamento.';
      if (energy.stale) {
        deviceState = 'aguardando'; reason = 'Aguardando: os dados energéticos estão desatualizados.';
      } else if (device.connection === 'offline') {
        deviceState = 'aguardando'; reason = 'Aguardando: o dispositivo está indisponível.';
      } else if (!device.requested) {
        deviceState = 'desligado';
      } else if (!released.includes(device.priority)) {
        deviceState = 'bloqueado'; reason = `Desligada: bateria abaixo do limite de ${thresholds[device.priority]}% para prioridade ${device.priority}.`;
      } else if (device.power > capacity - used) {
        deviceState = 'bloqueado'; reason = `Bloqueada: faltam ${device.power - (capacity - used)} W de potência disponível.`;
      } else {
        deviceState = 'ligado'; used += device.power;
        reason = energy.gridOnline ? 'Liberada: rede disponível e limites técnicos respeitados.' : 'Liberada no backup: bateria, prioridade e potência permitem o funcionamento.';
      }
      decisions.set(device.id, { ...device, state: deviceState, reason });
    });
    const devices = state.devices.map(device => decisions.get(device.id));
    return { devices, consumption: used, capacity, released, active: devices.filter(d => d.state === 'ligado').length, blocked: devices.filter(d => d.state === 'bloqueado').length };
  }
  function addEvent(title, detail) {
    state.history.unshift({ id: Date.now() + Math.random(), time: 'Agora', title, detail, tone: 'info' });
  }
  function navigate(page) {
    state.page = page; state.menuOpen = false; state.authLoading = false;
    if (page === 'regras') state.rulesDraft = { ...state.thresholds };
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderLanding() {
    return `<main class="landing">
      <header class="landing-nav"><div class="landing-nav-inner">
        <button class="logo-home" data-action="home" aria-label="Voltar ao início">${logo(true)}</button>
        <nav aria-label="Navegação principal">
          <button data-action="scroll-section" data-section="como-funciona">Como funciona</button>
          <button data-action="scroll-section" data-section="sistema">O sistema</button>
          <button data-action="scroll-section" data-section="seguranca">Segurança</button>
          <button data-page="login" data-action="navigate">Entrar</button>
          ${btn('Criar acesso', { page: 'cadastro', action: 'navigate', variant: 'secondary' })}
        </nav>
      </div></header>
      <div class="mmw-root" id="murmuration" style="height:100svh"><canvas aria-hidden="true"></canvas><span class="sr-only">NEXO</span>
        <div class="mmw-overlay"><div class="landing-shell">
          <section class="hero-copy"><p class="hero-context">Energia para o que realmente importa</p>
            <h1>Sua casa decide melhor durante uma falta de energia.</h1>
            <p>Escolha prioridades, defina limites e entenda quais equipamentos podem continuar funcionando — sem confundir preferência com disponibilidade.</p>
            <div class="hero-actions">${btn(`Explorar demonstração ${icon('chevron')}`, { page: 'cadastro', action: 'navigate' })}<span>Ambiente demonstrativo · nenhum dispositivo real será acionado</span></div>
          </section>
          <div class="hero-readout" aria-label="Demonstração do estado energético"><div><span>Bateria</span><strong>67%</strong></div><div><span>Disponível</span><strong>2,2 kW</strong></div><div>${statusDot()}<span>4 cargas preservadas</span></div></div>
        </div></div>
      </div>
      <section class="landing-story reveal-section" id="como-funciona"><div class="story-heading reveal"><div><span class="section-kicker">01 / Como funciona</span><h2>Preferências pessoais.<br>Limites técnicos intactos.</h2></div><p>O Nexo cruza o que você considera essencial com os dados energéticos da casa. Cada decisão vem acompanhada do motivo — para que você saiba não apenas o que aconteceu, mas por quê.</p></div>
        <div class="decision-flow reveal"><div><span>01 · Energia</span><strong>O que existe agora</strong><small>Bateria, geração e rede</small></div>${icon('chevron')}<div><span>02 · Prioridades</span><strong>O que importa para você</strong><small>Equipamentos essenciais</small></div>${icon('chevron')}<div><span>03 · Decisão</span><strong>O que pode continuar</strong><small>Regras e limites seguros</small></div></div>
      </section>
      <section class="system-section reveal-section" id="sistema"><div class="system-intro reveal"><span class="section-kicker">02 / O sistema</span><h2>Uma visão mais clara<br>da energia da sua casa.</h2><p>Menos suposições. Mais contexto para escolher como a energia disponível deve ser usada.</p></div>
        <div class="system-grid">
          <article class="system-card system-card-priorities reveal"><span class="card-index">01 — Prioridades</span><div class="priority-visual"><span>Geladeira <i class="priority-line priority-high"></i><b>Alta</b></span><span>Iluminação <i class="priority-line priority-medium"></i><b>Média</b></span><span>Conforto <i class="priority-line priority-low"></i><b>Baixa</b></span></div><h3>O que é essencial para você.</h3><p>Organize os equipamentos por importância e defina a ordem em que devem receber energia.</p></article>
          <article class="system-card system-card-capacity reveal"><span class="card-index">02 — Capacidade</span><div class="capacity-visual"><div class="capacity-ring"><strong>67<small>%</small></strong></div><div><span>Bateria</span><b>Disponível</b><span class="capacity-bar"><i></i></span></div></div><h3>O que a casa pode oferecer.</h3><p>Acompanhe bateria, potência disponível e o estado da rede em uma leitura simples.</p></article>
          <article class="system-card system-card-decision reveal"><span class="card-index">03 — Transparência</span><div class="decision-visual"><span class="decision-status">${icon('check')} Carga preservada</span><strong>Roteador</strong><p>Prioridade alta · 18 W</p><small>Dentro do limite de energia disponível.</small></div><h3>Por que cada decisão foi tomada.</h3><p>Entenda quando uma carga é mantida, aguarda ou é bloqueada — sempre com a justificativa.</p></article>
        </div>
      </section>
      <section class="safety-section reveal-section" id="seguranca"><div class="safety-mark reveal">${icon('bolt')}</div><div class="safety-copy reveal"><span class="section-kicker">03 / Segurança por princípio</span><h2>Preferência orienta.<br>Limite técnico decide.</h2><p>Uma prioridade pessoal nunca ultrapassa a potência ou a bateria disponíveis. O sistema foi pensado para explicar as opções sem prometer energia que a casa não tem.</p><button data-action="scroll-section" data-section="como-funciona">Entenda o fluxo ${icon('chevron')}</button></div><div class="safety-note reveal"><span>SIMULAÇÃO SEGURA</span><p>Esta experiência é demonstrativa. Nenhum dispositivo físico é acionado e nenhuma integração real está conectada.</p></div></section>
      <section class="landing-cta reveal-section"><span class="section-kicker reveal">Energia com mais intenção.</span><h2 class="reveal">Comece entendendo<br>o que importa na sua casa.</h2><div class="reveal">${btn(`Explorar demonstração ${icon('chevron')}`, { page: 'cadastro', action: 'navigate' })}</div></section>
      <footer class="landing-footer"><button class="logo-home" data-action="home" aria-label="Voltar ao início">${logo()}</button><span>Gestão de energia residencial · ambiente demonstrativo</span><button data-action="home">Voltar ao início ↑</button></footer>
    </main>`;
  }

  function renderAuth() {
    const isLogin = state.page === 'login';
    return `<main class="auth-page"><button class="auth-brand" data-action="home" aria-label="Voltar ao início">${logo()}</button>
      <section class="auth-panel"><div class="auth-intro"><span class="demo-badge">Acesso demonstrativo</span><h1>${isLogin ? 'Bem-vindo de volta.' : 'Comece pela sua casa.'}</h1><p>${isLogin ? 'Entre para acompanhar a distribuição de energia e ajustar suas prioridades.' : 'Crie um perfil demonstrativo para explorar as regras e cenários do Nexo.'}</p></div>
        <form data-form="auth">${!isLogin ? '<label>Nome completo<input required name="name" placeholder="Como devemos chamar você?" autocomplete="name"></label>' : ''}
          <label>E-mail<input required name="email" type="email" placeholder="voce@exemplo.com" autocomplete="email"></label>
          <label>Senha<input required name="password" type="password" minlength="6" placeholder="Mínimo de 6 caracteres" autocomplete="${isLogin ? 'current-password' : 'new-password'}"></label>
          <button class="button button-primary" type="submit" ${state.authLoading ? 'disabled' : ''}>${state.authLoading ? 'Preparando ambiente…' : isLogin ? 'Entrar na demonstração' : 'Criar acesso demonstrativo'}</button>
        </form><p class="auth-switch">${isLogin ? 'Ainda não tem acesso?' : 'Já criou seu acesso?'} <button data-action="navigate" data-page="${isLogin ? 'cadastro' : 'login'}">${isLogin ? 'Criar conta' : 'Entrar'}</button></p>
      </section><aside class="auth-aside"><div><span>Simulação segura</span><blockquote>“Veja a decisão antes de conectar qualquer equipamento físico.”</blockquote><p>Autenticação e sincronização reais dependem de um back-end futuro.</p></div></aside></main>`;
  }

  function renderShell(content) {
    const current = navItems.find(item => item.page === state.page) || navItems[0];
    const energy = state.energy;
    const nav = items => items.map(item => `<button class="${state.page === item.page ? 'active' : ''}" data-action="navigate" data-page="${item.page}">${icon(item.icon)}<span>${esc(item.label.replace('Visão geral', 'Início'))}</span></button>`).join('');
    return `<div class="app-shell"><aside class="sidebar ${state.menuOpen ? 'open' : ''}"><div class="sidebar-top"><button class="logo-home" data-action="home" aria-label="Voltar ao início">${logo()}</button><button class="mobile-close" data-action="close-menu" aria-label="Fechar menu">${icon('close')}</button></div><nav aria-label="Áreas do Nexo">${navItems.map(item => `<button class="${state.page === item.page ? 'active' : ''}" data-action="navigate" data-page="${item.page}">${icon(item.icon)}<span>${esc(item.label)}</span></button>`).join('')}</nav>
      <div class="sidebar-status"><div>${statusDot(energy.gridOnline ? 'success' : 'warning')}<span>${energy.gridOnline ? 'Rede disponível' : 'Modo backup'}</span></div><small>Dados ${energy.source === 'simulado' ? 'simulados' : 'externos'} · ${esc(energy.updatedAt)}</small></div></aside>
      ${state.menuOpen ? '<button class="menu-scrim" data-action="close-menu" aria-label="Fechar navegação"></button>' : ''}
      <div class="main-column"><header class="app-header"><button class="menu-trigger" data-action="open-menu" aria-label="Abrir menu">${icon('menu')}</button><div><span>${esc(state.residenceName)}</span><strong>${esc(current.label)}</strong></div><div class="header-actions"><span class="source-badge">${energy.source === 'simulado' ? 'Simulação ativa' : 'Fonte externa'}</span><button class="avatar" aria-label="Perfil demonstrativo">MA</button></div></header><main class="app-content">${content}</main></div>
      <nav class="bottom-nav" aria-label="Navegação móvel">${nav(navItems.slice(0, 5))}</nav></div>`;
  }

  function renderDashboard(result) {
    const energy = state.energy;
    const batteryTone = energy.battery < 25 ? 'critical' : energy.battery < 55 ? 'warning' : 'healthy';
    return `<div class="page-stack"><section class="page-title dashboard-title"><div><h1>${energy.gridOnline ? 'A casa está operando pela rede.' : 'A casa está protegida pelo backup.'}</h1><p>${result.active} equipamentos ligados agora, usando ${fmt(result.consumption)} W de ${fmt(result.capacity)} W disponíveis.</p></div>${btn('Testar cenário', { action: 'navigate', page: 'simulador', variant: 'secondary', iconName: 'flask' })}</section>
      ${energy.stale ? `<div class="alert-banner danger">${icon('alert')}<div><strong>Dados energéticos desatualizados</strong><span>As cargas estão aguardando uma leitura confiável antes de qualquer liberação.</span></div></div>` : ''}
      <section class="energy-overview"><div class="battery-hero ${batteryTone}"><div class="battery-meta"><span>Bateria disponível</span><span>${energy.gridOnline ? 'Carregando pela rede' : 'Sustentando o backup'}</span></div><div class="battery-value"><strong>${energy.battery}</strong><span>%</span></div><div class="battery-bar"><i style="width:${energy.battery}%"></i></div><div class="battery-foot"><span>Altas liberadas a partir de ${state.thresholds.alta}%</span><strong>${energy.battery >= state.thresholds.media ? 'Altas e médias liberadas' : 'Apenas cargas altas'}</strong></div></div>
        <div class="energy-details"><div class="metric-line">${icon('sun')}<div><span>Geração solar</span><strong>${fmt(energy.solar)} W</strong></div><small>estimativa simulada</small></div><div class="metric-line">${icon('bolt')}<div><span>Potência disponível</span><strong>${fmt(energy.availablePower)} W</strong></div><small>limite atual</small></div><div class="metric-line">${icon('plug')}<div><span>Consumo autorizado</span><strong>${fmt(result.consumption)} W</strong></div><small>${Math.round(result.consumption / Math.max(1, result.capacity) * 100)}% da capacidade</small></div></div></section>
      <section class="section-grid"><div class="section-block"><div class="section-heading"><div><h2>Cargas em operação</h2><p>Decisões atuais do motor energético</p></div><button data-action="navigate" data-page="equipamentos">Ver todas ${icon('chevron')}</button></div><div class="compact-device-list">${result.devices.slice(0, 5).map(device => `<div><span class="device-state state-${device.state}">${statusDot(dotTone(device.state))}</span><div><strong>${esc(device.name)}</strong><small>${esc(device.reason)}</small></div><b>${device.power} W</b></div>`).join('')}</div></div>
        <aside class="section-block decision-summary"><div class="section-heading"><div><h2>Leitura rápida</h2><p>O que o Nexo decidiu</p></div></div><div class="decision-number"><strong>${result.active}</strong><span>ligados</span><i></i><strong>${result.blocked}</strong><span>bloqueados</span></div><div class="priority-release">${['alta', 'media', 'baixa'].map(priority => `<div class="${result.released.includes(priority) ? 'released' : ''}"><span>${priorityLabel[priority]}</span><small>${result.released.includes(priority) ? 'Liberada' : 'Aguardando bateria'}</small></div>`).join('')}</div></aside></section></div>`;
  }

  function renderDevices(result) {
    const filtered = result.devices.filter(device => device.name.toLowerCase().includes(state.deviceSearch.toLowerCase()) && (state.priorityFilter === 'todas' || device.priority === state.priorityFilter));
    return `<div class="page-stack"><section class="page-title"><div><h1>Equipamentos e tomadas</h1><p>Altere preferências sem prometer um acionamento que a energia não permite.</p></div>${btn('Novo equipamento', { action: 'toggle-add-device', iconName: 'plus' })}</section>
      ${state.addingDevice ? `<form class="inline-form" data-form="add-device"><label>Nome<input name="deviceName" required placeholder="Ex.: Bomba d'água"></label><label>Potência estimada<input name="devicePower" required min="1" type="number" value="100"></label><label>Prioridade<select name="devicePriority"><option value="alta">Alta</option><option value="media" selected>Média</option><option value="baixa">Baixa</option></select></label><button class="button button-primary" type="submit">Adicionar</button><button class="button button-quiet" type="button" data-action="cancel-add-device">Cancelar</button></form>` : ''}
      <div class="toolbar"><label class="search-field">${icon('search')}<input data-field="device-search" value="${esc(state.deviceSearch)}" placeholder="Buscar equipamento" aria-label="Buscar equipamento"></label><div class="segmented">${['todas', 'alta', 'media', 'baixa'].map(item => `<button class="${state.priorityFilter === item ? 'active' : ''}" data-action="filter-priority" data-priority="${item}">${item === 'todas' ? 'Todas' : priorityLabel[item]}</button>`).join('')}</div></div>
      <section class="device-table"><div class="table-head"><span>Equipamento</span><span>Prioridade</span><span>Solicitação</span><span>Estado atual</span><span></span></div>
      ${filtered.map(device => `<article class="device-row"><div class="device-name"><span class="socket-icon state-${device.state}">${icon('plug')}</span><div><strong>${esc(device.name)}</strong><small>${device.power} W · ${esc(device.socket)} · ${device.simulated ? 'simulada' : 'real'}</small></div></div>
        <select class="priority-select priority-${device.priority}" data-device-priority="${device.id}" aria-label="Prioridade de ${esc(device.name)}"><option value="alta" ${device.priority === 'alta' ? 'selected' : ''}>Alta</option><option value="media" ${device.priority === 'media' ? 'selected' : ''}>Média</option><option value="baixa" ${device.priority === 'baixa' ? 'selected' : ''}>Baixa</option></select>
        <label class="switch"><input type="checkbox" data-device-request="${device.id}" ${device.requested ? 'checked' : ''}><span></span><em>${device.requested ? 'Ligado' : 'Desligado'}</em></label>
        <div class="state-label state-${device.state}">${statusDot(dotTone(device.state))}<span>${stateLabel[device.state]}</span></div><button class="icon-button danger" data-action="remove-device" data-id="${device.id}" aria-label="Remover ${esc(device.name)}">${icon('trash')}</button><p class="device-reason">${esc(device.reason)}</p></article>`).join('')}
      ${filtered.length === 0 ? `<div class="empty-state">${icon('search')}<strong>Nenhum equipamento encontrado</strong><span>Ajuste a busca ou os filtros.</span></div>` : ''}</section></div>`;
  }

  function renderRules() {
    const draft = state.rulesDraft;
    const valid = draft.alta <= draft.media && draft.media <= draft.baixa;
    return `<div class="page-stack rules-page"><section class="page-title"><div><h1>Regras energéticas</h1><p>Defina quando cada prioridade se torna elegível. A potência ainda será verificada.</p></div>${btn('Salvar limites', { action: 'save-rules', extra: valid ? '' : 'disabled' })}</section>
      ${!valid ? `<div class="alert-banner danger">${icon('alert')}<div><strong>Os limites estão contraditórios</strong><span>Mantenha alta menor ou igual a média, e média menor ou igual a baixa.</span></div></div>` : ''}
      <section class="threshold-editor"><div class="threshold-visual"><div class="battery-column"><span style="height:${100 - draft.baixa}%"></span><span class="low-zone" style="height:${draft.baixa - draft.media}%"></span><span class="medium-zone" style="height:${draft.media - draft.alta}%"></span><span class="high-zone" style="height:${draft.alta}%"></span></div><div class="visual-copy"><strong>A bateria define elegibilidade.</strong><p>O motor percorre as cargas elegíveis por prioridade e ordem. Se uma carga não couber na potência restante, ela será bloqueada.</p><div class="technical-note">${icon('alert')}<span>Estes são limites escolhidos pelo cliente. Parâmetros de proteção do inversor não são alterados.</span></div></div></div>
        <div class="threshold-controls">${['alta', 'media', 'baixa'].map(item => `<label class="threshold-control priority-${item}"><div><strong>Prioridade ${priorityLabel[item].toLowerCase()}</strong><span>${item === 'alta' ? 'Equipamentos essenciais' : item === 'media' ? 'Conforto importante' : 'Uso em condição favorável'}</span></div><output data-rule-output="${item}">${draft[item]}%</output><input type="range" min="5" max="95" step="5" value="${draft[item]}" data-rule-slider="${item}"></label>`).join('')}</div></section>
      <section class="logic-explainer"><h2>Como a decisão é tomada</h2><ol><li><span>1</span><div><strong>Validade dos dados</strong><p>Leituras desatualizadas colocam as cargas em espera.</p></div></li><li><span>2</span><div><strong>Elegibilidade</strong><p>A bateria libera os níveis configurados.</p></div></li><li><span>3</span><div><strong>Capacidade</strong><p>O menor valor entre potência disponível e limite de backup é respeitado.</p></div></li><li><span>4</span><div><strong>Seleção ordenada</strong><p>Alta, média e baixa; depois a ordem de preferência.</p></div></li></ol></section></div>`;
  }

  function renderSimulator(result) {
    const energy = state.energy;
    const range = (field, label, min, max, step, suffix) => `<label class="range-control"><div><span>${label}</span><output data-energy-output="${field}">${fmt(energy[field])}${suffix}</output></div><input type="range" min="${min}" max="${max}" step="${step}" value="${energy[field]}" data-energy-slider="${field}"></label>`;
    return `<div class="page-stack simulator-page"><section class="page-title"><div><span class="demo-badge">Ambiente isolado</span><h1>Simulador energético</h1><p>Teste decisões sem enviar comandos a tomadas físicas.</p></div>${btn('Restaurar padrão', { action: 'reset-simulator', variant: 'secondary' })}</section>
      <div class="scenario-strip">${scenarios.map((scenario, index) => `<button data-action="scenario" data-scenario="${index}"><strong>${esc(scenario.name)}</strong><span>${esc(scenario.detail)}</span></button>`).join('')}</div>
      <section class="simulator-grid"><div class="simulation-controls"><h2>Condições de entrada</h2>${range('battery', 'Bateria', 0, 100, 1, '%')}${range('solar', 'Geração solar', 0, 6000, 100, ' W')}${range('availablePower', 'Potência disponível', 0, 6000, 100, ' W')}${range('backupLimit', 'Limite da saída de backup', 500, 6000, 100, ' W')}
        <div class="toggle-row"><div><strong>Rede elétrica</strong><span>${energy.gridOnline ? 'Disponível' : 'Interrompida'}</span></div><label class="switch"><input type="checkbox" data-energy-bool="gridOnline" ${energy.gridOnline ? 'checked' : ''}><span></span></label></div><div class="toggle-row"><div><strong>Dados desatualizados</strong><span>Simula perda de telemetria</span></div><label class="switch"><input type="checkbox" data-energy-bool="stale" ${energy.stale ? 'checked' : ''}><span></span></label></div></div>
        <div class="simulation-result"><div class="result-header"><div><h2>Resultado imediato</h2><p>Capacidade considerada: ${fmt(result.capacity)} W</p></div><strong>${fmt(result.consumption)} W</strong></div><div class="power-track"><i style="width:${Math.min(100, result.consumption / Math.max(1, result.capacity) * 100)}%"></i></div><div class="simulation-list">${result.devices.map(device => `<div><span class="sim-state state-${device.state}">${icon(device.state === 'ligado' ? 'check' : device.state === 'bloqueado' ? 'alert' : 'close')}</span><div><strong>${esc(device.name)}</strong><small>${esc(device.reason)}</small></div><b>${device.power} W</b></div>`).join('')}</div></div>
      </section></div>`;
  }

  function renderHistory(result) {
    const alerts = result.devices.filter(device => device.state === 'bloqueado' || device.state === 'aguardando');
    return `<div class="page-stack"><section class="page-title"><div><h1>Histórico e alertas</h1><p>Eventos demonstrativos gerados pelas alterações desta sessão.</p></div></section><section class="history-layout"><div class="section-block"><div class="section-heading"><div><h2>Eventos recentes</h2><p>Registro local da demonstração</p></div></div><div class="timeline">${state.history.map(event => `<article><span class="timeline-dot ${event.tone}"></span><div><time>${esc(event.time)}</time><strong>${esc(event.title)}</strong><p>${esc(event.detail)}</p></div></article>`).join('')}</div></div>
      <aside class="section-block current-alerts"><div class="section-heading"><div><h2>Alertas atuais</h2><p>${alerts.length} condições pedem atenção</p></div></div>${alerts.map(device => `<div class="current-alert">${icon('alert')}<div><strong>${esc(device.name)}</strong><p>${esc(device.reason)}</p></div></div>`).join('')}${alerts.length === 0 ? `<div class="empty-state">${icon('check')}<strong>Nenhum alerta ativo</strong><span>Todos os pedidos cabem nos limites atuais.</span></div>` : ''}</aside></section></div>`;
  }

  function renderSettings() {
    const suggestions = ['Aumentar a prioridade da televisão', 'Colocar a geladeira em alta prioridade', 'Qual é a prioridade do roteador?'];
    return `<div class="page-stack"><section class="page-title"><div><h1>Configurações e integrações</h1><p>Conexões reais exigem serviço local, hardware compatível e credenciais.</p></div></section><section class="settings-grid"><div class="section-block settings-section"><div class="section-heading"><div><h2>Residência</h2><p>Contexto ativo desta demonstração</p></div></div><label>Nome da residência<input data-field="residence-name" value="${esc(state.residenceName)}"></label><label>Localização<input data-field="residence-location" value="${esc(state.residenceLocation)}"></label>${btn('Salvar nesta sessão', { action: 'save-residence', variant: 'secondary' })}</div>
      <div class="section-block integration-list"><div class="section-heading"><div><h2>Integrações</h2><p>Estado técnico das conexões</p></div></div><div><span class="integration-icon">${icon('bolt')}</span><div><strong>Fonte de dados energéticos</strong><small>Contrato interno preparado; usando simulação.</small></div><span class="tag warning">Simulada</span></div><div><span class="integration-icon">${icon('plug')}</span><div><strong>Tomadas inteligentes</strong><small>Nenhum fabricante ou credencial configurado.</small></div><span class="tag">Não conectada</span></div><div><span class="integration-icon">${icon('wifi')}</span><div><strong>Serviço local</strong><small>Necessário para operação sem internet.</small></div><span class="tag">Pendente</span></div></div></section>
      <section class="voice-demo section-block"><div class="voice-copy"><span class="voice-orb">${icon('voice')}</span><div><h2>Demonstração de comando de voz</h2><p>Este campo interpreta comandos localmente e usa o mesmo motor. Não está conectado à Alexa.</p></div></div><div class="voice-input"><input data-field="voice" value="${esc(state.voice)}" placeholder="Ex.: colocar a televisão em alta prioridade"><button class="button button-primary" data-action="run-voice">Interpretar</button></div>${state.voiceResult ? `<div class="voice-result">${icon('check')}<span>${esc(state.voiceResult)}</span></div>` : ''}<div class="voice-suggestions">${suggestions.map(text => `<button data-action="voice-suggestion" data-voice="${esc(text)}">${esc(text)}</button>`).join('')}</div></section></div>`;
  }

  function render() {
    if (!app) return;
    if (murmurationCleanup) { murmurationCleanup(); murmurationCleanup = null; }
    if (landingEffectsCleanup) { landingEffectsCleanup(); landingEffectsCleanup = null; }
    if (state.page === 'landing') app.innerHTML = renderLanding();
    else if (state.page === 'login' || state.page === 'cadastro') app.innerHTML = renderAuth();
    else {
      const result = calculate();
      let content = '';
      if (state.page === 'dashboard') content = renderDashboard(result);
      if (state.page === 'equipamentos') content = renderDevices(result);
      if (state.page === 'regras') content = renderRules();
      if (state.page === 'simulador') content = renderSimulator(result);
      if (state.page === 'historico') content = renderHistory(result);
      if (state.page === 'configuracoes') content = renderSettings();
      app.innerHTML = renderShell(content);
    }
    if (state.page === 'landing') { initMurmuration(); initLandingEffects(); }
  }

  function initLandingEffects() {
    const header = $('.landing-nav');
    const reveals = $$('.reveal');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 32);
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
    if (reducedMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(element => element.classList.add('is-visible'));
      landingEffectsCleanup = () => window.removeEventListener('scroll', updateHeader);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .14, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(element => observer.observe(element));
    landingEffectsCleanup = () => { observer.disconnect(); window.removeEventListener('scroll', updateHeader); };
  }

  function initMurmuration() {
    const root = $('#murmuration');
    const canvas = root && $('canvas', root);
    const ctx = canvas && canvas.getContext('2d');
    if (!root || !canvas || !ctx) return;
    if (murmurationCleanup) { murmurationCleanup(); murmurationCleanup = null; }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 1, height = 1, dpr = 1, raf = 0, particles = [], wordmarkTargets = [], solarTargets = [], clock = 0, last = performance.now();
    let pointer = { x: -9999, y: -9999 }, displayMode = 'wordmark', nextMode = 'solar';
    let hasDisturbedParticles = false, scatterUntil = 0, scatterTimer = 0, pendingMode = 'solar';
    let seed = 41;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    function layout() {
      const rect = root.getBoundingClientRect(); width = Math.max(1, Math.round(rect.width)); height = Math.max(1, Math.round(rect.height)); dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      const mask = document.createElement('canvas'); mask.width = width; mask.height = height;
      const mctx = mask.getContext('2d', { willReadFrequently: true });
      wordmarkTargets = []; solarTargets = [];
      if (mctx) {
        const step = Math.max(5, Math.round(Math.sqrt(width * height / 30000)));
        const collectTargets = word => {
          mctx.clearRect(0, 0, width, height);
          let size = Math.min(width * .23, height * .25);
          mctx.font = `900 ${size}px Manrope, sans-serif`;
          size *= Math.min(1, width * .34 / mctx.measureText(word).width);
          mctx.font = `900 ${size}px Manrope, sans-serif`;
          mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText(word, width * .82, height * .43);
          const pixels = mctx.getImageData(0, 0, width, height).data;
          const targets = [];
          for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) if (pixels[(y * width + x) * 4 + 3] > 100) targets.push({ x, y });
          return targets;
        };
        wordmarkTargets = collectTargets('NEXO');
        solarTargets = collectTargets('SOLAR');
      }
      const targets = displayMode === 'solar' ? solarTargets : wordmarkTargets;
      const count = Math.max(360, Math.round(780 * Math.min(1, width * height / 600000)));
      particles = Array.from({ length: count }, (_, i) => {
        const targetIndex = targets.length ? i % targets.length : 0;
        const target = targets[targetIndex] || { x: width * .5, y: height * .43 };
        return { x: target.x, y: target.y, vx: 0, vy: 0, phase: rand() * Math.PI * 2, depth: .55 + rand() * .45, target: targetIndex };
      });
      paint(0, true);
    }
    function paint(dt, still = false) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, '#18382A'); gradient.addColorStop(.72, '#73936F'); gradient.addColorStop(1, '#E4D6A7'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(width * .7, height * .82, 0, width * .7, height * .82, width * .42); glow.addColorStop(0, 'rgba(243,217,139,.8)'); glow.addColorStop(1, 'rgba(243,217,139,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
      if (!still) {
        clock += dt;
        const targets = displayMode === 'solar' ? solarTargets : wordmarkTargets;
        const scattering = scatterUntil > 0;
        for (const p of particles) {
          const target = targets[p.target % targets.length];
          let ax = scattering ? 0 : target ? (target.x - p.x) * 32 : 0;
          let ay = scattering ? 0 : target ? (target.y - p.y) * 32 : 0;
          ax += Math.sin(p.phase + clock) * (scattering ? 18 : 1.5);
          ay += Math.cos(p.phase + clock) * (scattering ? 18 : 1.5);
          const dx = p.x - pointer.x, dy = p.y - pointer.y, dist = Math.hypot(dx, dy); if (dist < 130) { const force = (1 - dist / 130) * 3300; ax += dx / (dist + .1) * force; ay += dy / (dist + .1) * force; }
          if (scattering) {
            p.vx = (p.vx + ax * dt) * (1 - dt * 1.2);
            p.vy = (p.vy + ay * dt) * (1 - dt * 1.2);
          } else {
            p.vx += (ax - p.vx * 12) * dt;
            p.vy += (ay - p.vy * 12) * dt;
          }
          p.x += p.vx * dt; p.y += p.vy * dt; p.phase += dt * 10;
        }
      }
      ctx.beginPath();
      for (const p of particles) { const size = 1.2 + p.depth * 1.2; ctx.moveTo(p.x + size, p.y); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); }
      ctx.fillStyle = '#111B15'; ctx.globalAlpha = .78; ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#15271D'; ctx.fillRect(0, height - 5, width, 5);
    }
    function frame(now) {
      if (!document.body.contains(root)) return;
      raf = requestAnimationFrame(frame);
      const dt = prefersReduced ? 0 : Math.min(.035, (now - last) / 1000);
      last = now; paint(dt, prefersReduced);
    }
    function beginTransition(origin) {
      pendingMode = nextMode;
      nextMode = nextMode === 'solar' ? 'wordmark' : 'solar';
      if (prefersReduced) {
        window.clearTimeout(scatterTimer);
        scatterUntil = 0;
        displayMode = pendingMode;
        const targets = displayMode === 'solar' ? solarTargets : wordmarkTargets;
        particles.forEach((particle, index) => {
          const target = targets[index % targets.length];
          if (target) { particle.x = target.x; particle.y = target.y; }
          particle.vx = 0; particle.vy = 0;
        });
        paint(0, true);
        return;
      }
      window.clearTimeout(scatterTimer);
      scatterUntil = performance.now() + 2300;
      scatterTimer = window.setTimeout(() => {
        displayMode = pendingMode;
        scatterUntil = 0;
        particles.forEach(particle => { particle.vx *= .15; particle.vy *= .15; });
      }, 2300);
      particles.forEach(particle => {
        const dx = particle.x - origin.x, dy = particle.y - origin.y;
        const distance = Math.hypot(dx, dy) || 1;
        const speed = 55 + rand() * 70;
        particle.vx += dx / distance * speed + (rand() - .5) * 100;
        particle.vy += dy / distance * speed + (rand() - .5) * 100;
      });
    }
    function onMove(event) {
      const rect = root.getBoundingClientRect();
      const nextPointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const moved = Math.hypot(event.movementX || 0, event.movementY || 0) > 4
        || (pointer.x >= 0 && Math.hypot(nextPointer.x - pointer.x, nextPointer.y - pointer.y) > 4);
      if (moved && !hasDisturbedParticles) {
        hasDisturbedParticles = true;
        beginTransition(nextPointer);
      }
      pointer = nextPointer;
    }
    function onLeave() { pointer = { x: -9999, y: -9999 }; hasDisturbedParticles = false; }
    function onPointerOut(event) { if (!event.relatedTarget || !root.contains(event.relatedTarget)) onLeave(); }
    layout(); if (!prefersReduced) raf = requestAnimationFrame(frame); const observer = new ResizeObserver(layout); observer.observe(root); root.addEventListener('pointermove', onMove); root.addEventListener('pointerleave', onLeave); root.addEventListener('pointerout', onPointerOut);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (document.body.contains(root)) layout(); });
    murmurationCleanup = () => { cancelAnimationFrame(raf); window.clearTimeout(scatterTimer); observer.disconnect(); root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave); root.removeEventListener('pointerout', onPointerOut); };
  }

  function runVoice() {
    const normalized = state.voice.toLowerCase();
    const device = state.devices.find(item => normalized.includes(item.name.toLowerCase().split(' ')[0]));
    if (!device) { state.voiceResult = 'Não foi possível identificar um equipamento. Tente “geladeira” ou “televisão”.'; render(); return; }
    const next = normalized.includes('alta') || normalized.includes('aumentar') ? 'alta' : normalized.includes('baixa') || normalized.includes('diminuir') ? 'baixa' : null;
    if (!next) { state.voiceResult = `${device.name} está em prioridade ${priorityLabel[device.priority].toLowerCase()}.`; render(); return; }
    state.devices = state.devices.map(item => item.id === device.id ? { ...item, priority: next } : item);
    state.voiceResult = `Comando simulado: ${device.name} passou para prioridade ${priorityLabel[next].toLowerCase()}. O motor reavaliou as cargas.`;
    addEvent('Comando de voz simulado', `${device.name} passou para prioridade ${priorityLabel[next].toLowerCase()}.`); render();
  }

  app.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    const action = target.dataset.action;
    if (action === 'home') {
      if (state.page !== 'landing') navigate('landing');
      else window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'navigate') { navigate(target.dataset.page); return; }
    if (action === 'scroll-story') { $('#como-funciona')?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (action === 'scroll-section') { $(`#${target.dataset.section}`)?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (action === 'open-menu') { state.menuOpen = true; render(); return; }
    if (action === 'close-menu') { state.menuOpen = false; render(); return; }
    if (action === 'toggle-add-device') { state.addingDevice = !state.addingDevice; render(); return; }
    if (action === 'cancel-add-device') { state.addingDevice = false; render(); return; }
    if (action === 'filter-priority') { state.priorityFilter = target.dataset.priority; render(); return; }
    if (action === 'remove-device') {
      const device = state.devices.find(d => String(d.id) === target.dataset.id);
      state.devices = state.devices.filter(d => String(d.id) !== target.dataset.id);
      if (device) addEvent('Equipamento removido', `${device.name} foi removido da demonstração.`);
      render(); return;
    }
    if (action === 'save-rules') {
      const draft = state.rulesDraft;
      if (!(draft.alta <= draft.media && draft.media <= draft.baixa)) return;
      state.thresholds = { ...draft }; addEvent('Limites de bateria atualizados', `Alta ${draft.alta}%, média ${draft.media}% e baixa ${draft.baixa}%.`); render(); return;
    }
    if (action === 'reset-simulator') {
      state.energy = { ...initialEnergy }; state.devices = initialDevices.map(d => ({ ...d }));
      addEvent('Simulador restaurado', 'Condições de energia e equipamentos voltaram ao padrão demonstrativo.'); render(); return;
    }
    if (action === 'scenario') {
      const scenario = scenarios[Number(target.dataset.scenario)]; if (!scenario) return;
      state.energy = { ...state.energy, ...scenario.patch, updatedAt: 'agora', source: 'simulado' };
      state.devices = state.devices.map(device => ({ ...device, connection: device.id === scenario.offlineDevice ? 'offline' : 'online' }));
      addEvent('Cenário aplicado', `Simulação: ${scenario.name}.`); render(); return;
    }
    if (action === 'save-residence') {
      const nameInput = $('[data-field="residence-name"]'); const locationInput = $('[data-field="residence-location"]');
      state.residenceName = nameInput ? nameInput.value.trim() || 'Minha residência' : state.residenceName;
      state.residenceLocation = locationInput ? locationInput.value.trim() : state.residenceLocation;
      addEvent('Residência atualizada', 'Preferências gerais salvas apenas nesta sessão.'); render(); return;
    }
    if (action === 'run-voice') { const input = $('[data-field="voice"]'); state.voice = input ? input.value : state.voice; runVoice(); return; }
    if (action === 'voice-suggestion') { state.voice = target.dataset.voice || ''; render(); const field = $('[data-field="voice"]'); field?.focus(); return; }
  });

  app.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]'); if (!form) return;
    event.preventDefault();
    if (form.dataset.form === 'auth') {
      if (!form.reportValidity()) return;
      state.authLoading = true; render();
      window.setTimeout(() => { state.authLoading = false; addEvent('Sessão demonstrativa iniciada', 'Acesso local iniciado; nenhuma autenticação real foi realizada.'); navigate('dashboard'); }, 350);
    }
    if (form.dataset.form === 'add-device') {
      const data = new FormData(form); const name = String(data.get('deviceName') || '').trim(); const power = Number(data.get('devicePower')); const priority = String(data.get('devicePriority') || 'media');
      if (!name || !Number.isFinite(power) || power <= 0 || !['alta', 'media', 'baixa'].includes(priority)) return;
      const next = { id: Date.now(), name, power, priority, order: state.devices.filter(d => d.priority === priority).length + 1, requested: true, socket: 'Não associada', connection: 'online', simulated: true };
      state.devices.push(next); addEvent('Equipamento adicionado', `${next.name}, ${next.power} W, prioridade ${priorityLabel[next.priority].toLowerCase()}.`); state.addingDevice = false; render();
    }
  });

  app.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-field="device-search"]')) { state.deviceSearch = target.value; const cursor = target.selectionStart; render(); const replacement = $('[data-field="device-search"]'); if (replacement) { replacement.focus(); replacement.setSelectionRange(cursor, cursor); } return; }
    if (target.matches('[data-field="voice"]')) { state.voice = target.value; return; }
    if (target.matches('[data-field="residence-name"]')) { state.residenceName = target.value; return; }
    if (target.matches('[data-field="residence-location"]')) { state.residenceLocation = target.value; return; }
    if (target.matches('[data-rule-slider]')) {
      const key = target.dataset.ruleSlider; state.rulesDraft[key] = Number(target.value);
      const output = $(`[data-rule-output="${key}"]`); if (output) output.textContent = `${target.value}%`;
      const draft = state.rulesDraft; const column = $('.battery-column');
      if (column) { const spans = $$('span', column); if (spans[0]) spans[0].style.height = `${100 - draft.baixa}%`; if (spans[1]) spans[1].style.height = `${draft.baixa - draft.media}%`; if (spans[2]) spans[2].style.height = `${draft.media - draft.alta}%`; if (spans[3]) spans[3].style.height = `${draft.alta}%`; }
      const valid = draft.alta <= draft.media && draft.media <= draft.baixa; const save = $('[data-action="save-rules"]'); if (save) save.disabled = !valid; return;
    }
    if (target.matches('[data-energy-slider]')) {
      const field = target.dataset.energySlider; state.energy[field] = Number(target.value); state.energy.updatedAt = 'agora'; state.energy.source = 'simulado';
      if (['battery', 'solar', 'availablePower'].includes(field)) state.energy.stale = false;
      const output = $(`[data-energy-output="${field}"]`); if (output) output.textContent = `${fmt(state.energy[field])}${field === 'battery' ? '%' : ' W'}`;
    }
  });

  app.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-device-priority]')) {
      const device = state.devices.find(d => String(d.id) === target.dataset.devicePriority); if (!device) return;
      const next = target.value; device.priority = next; addEvent('Prioridade atualizada', `${device.name} passou para prioridade ${priorityLabel[next].toLowerCase()}.`); render(); return;
    }
    if (target.matches('[data-device-request]')) {
      const device = state.devices.find(d => String(d.id) === target.dataset.deviceRequest); if (!device) return;
      device.requested = target.checked; render(); return;
    }
    if (target.matches('[data-rule-slider]')) { render(); return; }
    if (target.matches('[data-energy-slider]')) { render(); return; }
    if (target.matches('[data-energy-bool]')) {
      const key = target.dataset.energyBool; state.energy[key] = target.checked; state.energy.updatedAt = 'agora'; state.energy.source = 'simulado'; render(); return;
    }
  });

  render();
})();
