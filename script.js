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
      <td><button onclick="removeLancamento(${i})">X</button></td>
    `;

    if (l.tipo === "entrada") {
      entradaBody.appendChild(tr);
    } else {
      saidaBody.appendChild(tr);
    }
  });

  calculate();
}

function addLancamento() {
  const month = monthSelect.value;
  const data = getData();

  if (!data[month]) {
    data[month] = { meta: 0, lancamentos: [] };
  }

  if (!tipo.value) {
    alert("Selecione Entrada ou Saída");
    return;
  }

  data[month].lancamentos.push({
    data: dataInput.value,
    cliente: cliente.value,
    descricao: descricao.value,
    valor: Number(valor.value),
    tipo: tipo.value,
    pagamento: pagamento.value,
    status: status.value,
    ajudante: Number(ajudante.value || 0)
  });

  saveData(data);
  clearForm();
  loadMonth();
}

function removeLancamento(index) {
  const data = getData();
  data[monthSelect.value].lancamentos.splice(index, 1);
  saveData(data);
  loadMonth();
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
    if (l.tipo === "entrada") {
      entrada += l.valor;
    } else {
      saida += l.valor;
    }
  });

  totalEntrada.textContent = entrada.toFixed(2);
  totalSaida.textContent = saida.toFixed(2);

  // ✅ lucro NÃO desconta ajudante
  lucro.textContent = (entrada - saida).toFixed(2);
}

function clearForm() {
  dataInput.value = "";
  cliente.value = "";
  descricao.value = "";
  valor.value = "";
  ajudante.value = "";
  tipo.value = "entrada";
}
// Exporta PDF mensal
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let entradas = document.getElementById("entradaBody").innerText;
  let saidas = document.getElementById("saidaBody").innerText;
  let totalEntrada = document.getElementById("totalEntrada").innerText;
  let totalSaida = document.getElementById("totalSaida").innerText;
  let lucro = document.getElementById("lucro").innerText;

  doc.setFontSize(16);
  doc.text("Resumo Mensal", 10, 10);

  doc.setFontSize(12);
  doc.text(`Entradas:\n${entradas}`, 10, 20);
  doc.text(`Saídas:\n${saidas}`, 10, 60);
  doc.text(`Faturamento: R$ ${totalEntrada}`, 10, 100);
  doc.text(`Despesas: R$ ${totalSaida}`, 10, 110);
  doc.text(`Lucro Líquido: R$ ${lucro}`, 10, 120);

  doc.save("resumo_mensal.pdf");
}

// Exporta PDF anual
function exportPDFAnual() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Aqui você pode iterar sobre os meses se tiver os dados separados por mês
  doc.setFontSize(16);
  doc.text("Resumo Anual", 10, 10);

  doc.save("resumo_anual.pdf");
}


