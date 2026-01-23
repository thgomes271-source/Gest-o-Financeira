const entradaBody = document.getElementById("entradaBody");
const saidaBody = document.getElementById("saidaBody");

const pagamento = document.getElementById("pagamento");
const dataInput = document.getElementById("data");
const cliente = document.getElementById("cliente");
const descricao = document.getElementById("descricao");
const valor = document.getElementById("valor");
const tipo = document.getElementById("tipo");
const status = document.getElementById("status");
const ajudante = document.getElementById("ajudante");
const metaInput = document.getElementById("metaInput");

const totalEntrada = document.getElementById("totalEntrada");
const totalSaida = document.getElementById("totalSaida");
const lucro = document.getElementById("lucro");

let editIndex = null;

const months = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const monthSelect = document.getElementById("monthSelect");

months.forEach(m => {
  const opt = document.createElement("option");
  opt.value = m;
  opt.textContent = m;
  monthSelect.appendChild(opt);
});

monthSelect.value = months[new Date().getMonth()];
monthSelect.addEventListener("change", loadMonth);

function getData() {
  return JSON.parse(localStorage.getItem("financeiro")) || {};
}

function saveData(data) {
  localStorage.setItem("financeiro", JSON.stringify(data));
}

function loadMonth() {
  const data = getData();
  const month = monthSelect.value;

  entradaBody.innerHTML = "";
  saidaBody.innerHTML = "";

  const lancamentos = data[month]?.lancamentos || [];

  lancamentos.forEach((l, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${l.data || "-"}</td>
      <td>${l.cliente || "-"}</td>
      <td>${l.descricao || "-"}</td>
      <td>R$ ${l.valor.toFixed(2)}</td>
      <td>R$ ${(l.ajudante || 0).toFixed(2)}</td>
      <td>${l.pagamento}</td>
      <td class="${l.status === "Pago" ? "status-pago" : "status-apagar"}">
        ${l.status}
      </td>
      <td>
        <button class="action-btn" onclick="editLancamento(${i})">✏️</button>
      </td>
    `;

    if (l.tipo === "entrada") entradaBody.appendChild(tr);
    else saidaBody.appendChild(tr);
  });

  calculate();
}

function addLancamento() {
  const month = monthSelect.value;
  const data = getData();

  if (!data[month]) {
    data[month] = { meta: 0, lancamentos: [] };
  }

  const novoLancamento = {
    data: dataInput.value,
    cliente: cliente.value,
    descricao: descricao.value,
    valor: Number(valor.value),
    tipo: tipo.value,
    pagamento: pagamento.value,
    status: status.value,
    ajudante: Number(ajudante.value || 0)
  };

  if (editIndex !== null) {
    data[month].lancamentos[editIndex] = novoLancamento;
    editIndex = null;
    document.querySelector(".form button").innerText = "Adicionar";
  } else {
    data[month].lancamentos.push(novoLancamento);
  }

  saveData(data);
  clearForm();
  loadMonth();
}

function editLancamento(index) {
  const data = getData();
  const l = data[monthSelect.value].lancamentos[index];

  dataInput.value = l.data;
  cliente.value = l.cliente;
  descricao.value = l.descricao;
  valor.value = l.valor;
  tipo.value = l.tipo;
  pagamento.value = l.pagamento;
  status.value = l.status;
  ajudante.value = l.ajudante;

  editIndex = index;
  document.querySelector(".form button").innerText = "Salvar edição";
}

function saveMeta() {
  const data = getData();
  const month = monthSelect.value;

  if (!data[month]) {
    data[month] = { meta: 0, lancamentos: [] };
  }

  data[month].meta = Number(metaInput.value || 0);
  saveData(data);
}

function calculate() {
  const data = getData()[monthSelect.value];
  if (!data) return;

  let entrada = 0;
  let saida = 0;

  data.lancamentos.forEach(l => {
    if (l.tipo === "entrada") entrada += l.valor;
    else saida += l.valor;
  });

  totalEntrada.textContent = entrada.toFixed(2);
  totalSaida.textContent = saida.toFixed(2);
  lucro.textContent = (entrada - saida).toFixed(2);
}

function clearForm() {
  dataInput.value = "";
  cliente.value = "";
  descricao.value = "";
  valor.value = "";
  ajudante.value = "";
  tipo.value = "entrada";
  status.value = "Pago";
}

/* ===================== PDF ===================== */

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const data = getData();
  const month = monthSelect.value;

  if (!data[month]) {
    alert("Não há dados para este mês.");
    return;
  }

  const lancamentos = data[month].lancamentos;
  const meta = data[month].meta || 0;

  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RELATÓRIO FINANCEIRO MENSAL", 105, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Mês de Referência: ${month}`, 15, y);
  y += 6;
  doc.text(`Meta Mensal: R$ ${meta.toFixed(2)}`, 15, y);
  y += 6;

  doc.line(15, y, 195, y);
  y += 8;

  let totalEntrada = 0;
  let totalSaida = 0;

  lancamentos.forEach(l => {
    if (l.tipo === "entrada") totalEntrada += l.valor;
    else totalSaida += l.valor;
  });

  doc.setFont("helvetica", "bold");
  doc.text("RESUMO FINANCEIRO", 15, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Faturamento Total: R$ ${totalEntrada.toFixed(2)}`, 15, y);
  y += 5;
  doc.text(`Total de Despesas: R$ ${totalSaida.toFixed(2)}`, 15, y);
  y += 5;
  doc.text(`Lucro Líquido: R$ ${(totalEntrada - totalSaida).toFixed(2)}`, 15, y);
  y += 8;

  doc.line(15, y, 195, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("ENTRADAS", 15, y);
  y += 6;

  doc.setFontSize(9);
  doc.text("Data", 15, y);
  doc.text("Cliente", 35, y);
  doc.text("Descrição", 75, y);
  doc.text("Valor", 140, y);
  doc.text("Pagamento", 165, y);
  y += 4;
  doc.line(15, y, 195, y);
  y += 4;

  doc.setFont("helvetica", "normal");

  lancamentos.filter(l => l.tipo === "entrada").forEach(l => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(l.data || "-", 15, y);
    doc.text(l.cliente || "-", 35, y);
    doc.text(l.descricao || "-", 75, y);
    doc.text(`R$ ${l.valor.toFixed(2)}`, 140, y);
    doc.text(l.pagamento, 165, y);
    y += 5;
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("SAÍDAS", 15, y);
  y += 6;

  doc.setFontSize(9);
  doc.text("Data", 15, y);
  doc.text("Origem", 35, y);
  doc.text("Descrição", 75, y);
  doc.text("Valor", 140, y);
  doc.text("Pagamento", 165, y);
  y += 4;
  doc.line(15, y, 195, y);
  y += 4;

  doc.setFont("helvetica", "normal");

  lancamentos.filter(l => l.tipo === "saida").forEach(l => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(l.data || "-", 15, y);
    doc.text(l.cliente || "-", 35, y);
    doc.text(l.descricao || "-", 75, y);
    doc.text(`R$ ${l.valor.toFixed(2)}`, 140, y);
    doc.text(l.pagamento, 165, y);
    y += 5;
  });

  y += 15;
  doc.setFontSize(8);
  doc.text(
    "Documento gerado automaticamente para fins de controle financeiro e arquivamento.",
    15,
    y
  );

  y += 10;
  doc.text("Assinatura do responsável: ________________________________", 15, y);

  doc.save(`Relatorio_Financeiro_${month}.pdf`);
}

loadMonth();
function exportPDFAnual() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const data = getData();
  let y = 20;

  // ===== TÍTULO =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RESUMO FINANCEIRO ANUAL", 105, y, { align: "center" });
  y += 12;

  // ===== CALCULAR TOTAIS =====
  let totalEntradasAno = 0;
  let totalSaidasAno = 0;
  let mesesComMovimento = 0;

  const resumoMensal = months.map(mes => {
    const lanc = data[mes]?.lancamentos || [];

    let ent = 0;
    let sai = 0;

    lanc.forEach(l => {
      if (l.tipo === "entrada") ent += l.valor;
      else sai += l.valor;
    });

    if (ent !== 0 || sai !== 0) mesesComMovimento++;

    totalEntradasAno += ent;
    totalSaidasAno += sai;

    return {
      mes,
      entradas: ent,
      saidas: sai,
      total: ent - sai
    };
  });

  const mediaMensal =
    mesesComMovimento > 0
      ? (totalEntradasAno - totalSaidasAno) / mesesComMovimento
      : 0;

  // ===== MÉDIA MENSAL =====
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Média Mensal: R$ ${mediaMensal.toFixed(2)}`, 15, y);
  y += 8;

  // ===== CABEÇALHO DA TABELA =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Mês", 15, y);
  doc.text("Entradas", 70, y);
  doc.text("Saídas", 115, y);
  doc.text("Total", 155, y);
  y += 4;

  doc.line(15, y, 195, y);
  y += 4;

  // ===== LINHAS =====
  doc.setFont("helvetica", "normal");

  resumoMensal.forEach(l => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.text(l.mes, 15, y);
    doc.text(`R$ ${l.entradas.toFixed(2)}`, 70, y);
    doc.text(`R$ ${l.saidas.toFixed(2)}`, 115, y);
    doc.text(`R$ ${l.total.toFixed(2)}`, 155, y);
    y += 5;
  });

  // ===== ANOTAÇÕES =====
  y += 12;
  doc.setFontSize(9);
  doc.text("ANOTAÇÕES", 15, y);
  y += 10;
  doc.line(15, y, 195, y);

  // ===== ASSINATURA =====
  y += 20;
  doc.text("Assinatura do responsável: ________________________________", 15, y);

  // ===== SALVAR =====
  doc.save("Resumo_Financeiro_Anual.pdf");
}

window.exportPDFAnual = exportPDFAnual;
window.exportPDF = exportPDF;

