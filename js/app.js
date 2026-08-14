// ---------- Navegação por abas (barra desktop + menu hambúrguer) ----------
const tabLinks = document.querySelectorAll('.tab-link'); // inclui .tab (desktop) e .mobile-tab
const panels = document.querySelectorAll('.panel');

function activateTab(tabId) {
  tabLinks.forEach(link => link.classList.toggle('active', link.dataset.tab === tabId));
  panels.forEach(p => p.classList.toggle('active', p.id === tabId));
}

tabLinks.forEach(link => {
  link.addEventListener('click', () => {
    activateTab(link.dataset.tab);
    closeMobileNav();
  });
});

// ---------- Menu hambúrguer (mobile) ----------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNav = document.getElementById('mobileNav');
const mobileNavClose = document.getElementById('mobileNavClose');

function openMobileNav() {
  mobileNav.classList.add('open');
  hamburgerBtn.classList.add('open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  mobileNav.classList.remove('open');
  hamburgerBtn.classList.remove('open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', () => {
  mobileNav.classList.contains('open') ? closeMobileNav() : openMobileNav();
});
mobileNavClose.addEventListener('click', closeMobileNav);
mobileNav.addEventListener('click', (e) => {
  if (e.target === mobileNav) closeMobileNav(); // clicou fora do painel
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileNav();
});

// ---------- Relógio ----------
function tick() {
  const now = new Date();
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = now.toLocaleTimeString('pt-BR');
}
tick();
setInterval(tick, 1000);

// ---------- Relatórios ----------
const reportViewer = document.getElementById('reportViewer');
const reportViewerTitle = document.getElementById('reportViewerTitle');
const reportTableBody = document.getElementById('reportTableBody');
const reportCount = document.getElementById('reportCount');
const filtroDe = document.getElementById('filtroDe');
const filtroAte = document.getElementById('filtroAte');

let relatorioAtual = null;

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function renderizarRelatorio(tipo) {
  relatorioAtual = tipo;
  const relatorio = RELATORIOS[tipo];
  reportViewerTitle.textContent = relatorio.titulo;
  reportViewer.hidden = false;

  const de = filtroDe.value;
  const ate = filtroAte.value;

  const registrosFiltrados = relatorio.registros.filter(r => {
    if (de && r.data < de) return false;
    if (ate && r.data > ate) return false;
    return true;
  });

  reportTableBody.innerHTML = registrosFiltrados.map(r => `
    <tr>
      <td data-label="Data" class="mono">${formatarData(r.data)}</td>
      <td data-label="Descrição">${r.descricao}</td>
      <td data-label="Valor" class="mono">${r.valor}</td>
      <td data-label="Responsável"><span class="user-chip">${r.usuario}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="empty-cell">Nenhum registro no período selecionado.</td></tr>`;

  reportCount.textContent = `${registrosFiltrados.length} movimentação(ões) — cada linha mostra o usuário responsável pelo lançamento.`;

  reportViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.querySelectorAll('.btn-view').forEach(btn => {
  btn.addEventListener('click', () => renderizarRelatorio(btn.dataset.report));
});

document.querySelectorAll('.btn-export-pdf').forEach(btn => {
  // Botões dos cards: abrem o relatório e já disparam a impressão (Salvar como PDF)
  if (btn.id === 'btnExportarPdf') return; // esse é tratado abaixo
  btn.addEventListener('click', () => {
    renderizarRelatorio(btn.dataset.report);
    setTimeout(() => window.print(), 200);
  });
});

document.getElementById('btnAplicarFiltro').addEventListener('click', () => {
  if (relatorioAtual) renderizarRelatorio(relatorioAtual);
});

document.getElementById('btnExportarPdf').addEventListener('click', () => {
  window.print();
});

document.getElementById('btnExportarCsv').addEventListener('click', () => {
  if (!relatorioAtual) return;
  const linhas = [['Data', 'Descrição', 'Valor', 'Responsável']];
  document.querySelectorAll('#reportTableBody tr').forEach(tr => {
    const cols = tr.querySelectorAll('td');
    if (cols.length < 4) return;
    linhas.push([
      cols[0].textContent.trim(),
      cols[1].textContent.trim(),
      cols[2].textContent.trim(),
      cols[3].textContent.trim()
    ]);
  });

  const csv = linhas.map(l => l.map(v => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${relatorioAtual}-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
