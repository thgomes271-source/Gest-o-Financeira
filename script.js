// ===============================
// 🔗 ELEMENTOS
// ===============================

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

const monthSelect = document.getElementById("monthSelect");

// ===============================
// 🔐 AUTH
// ===============================

function checkAuth() {
  if (!window.userId) {
    alert("Faça login primeiro");
    return false;
  }
  return true;
}

// ===============================
// 📅 MESES
// ===============================

const months = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

months.forEach(m => {
  const opt = document.createElement("option");
  opt.value = m;
  opt.textContent = m;
  monthSelect.appendChild(opt);
});

monthSelect.value = months[new Date().getMonth()];
monthSelect.addEventListener("change", () => {
  carregarLancamentos();
  carregarMeta();
});

// ===============================
// 🔥 FIRESTORE
// ===============================

async function carregarLancamentos() {
  if (!checkAuth()) return;

  entradaBody.innerHTML = "";
  saidaBody.innerHTML = "";

  let ent = 0;
  let sai = 0;

  const q = query(
    collection(db, "usuarios", userId, "lancamentos"),
    where("mes", "==", monthSelect.value)
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const l = docSnap.data();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.data || "-"}</td>
      <td>${l.cliente || "-"}</td>
      <td>${l.descricao || "-"}</td>
      <td>R$ ${l.valor.toFixed(2)}</td>
      <td>R$ ${(l.ajudante || 0).toFixed(2)}</td>
      <td>${l.pagamento}</td>
      <td class="${l.status === "Pago" ? "status-pago" : "status-apagar"}">${l.status}</td>
      <td>
        <button class="action-btn" onclick="deletarLancamento('${docSnap.id}')">
          🗑️
        </button>
      </td>
    `;

    if (l.tipo === "entrada") {
      entradaBody.appendChild(tr);
      ent += l.valor;
    } else {
      saidaBody.appendChild(tr);
      sai += l.valor;
    }
  });

  totalEntrada.textContent = ent.toFixed(2);
  totalSaida.textContent = sai.toFixed(2);
  lucro.textContent = (ent - sai).toFixed(2);
}

async function addLancamento() {
  if (!checkAuth()) return;

  const lancamento = {
    data: dataInput.value,
    cliente: cliente.value,
    descricao: descricao.value,
    valor: Number(valor.value),
    tipo: tipo.value,
    pagamento: pagamento.value,
    status: status.value,
    ajudante: Number(ajudante.value || 0),
    mes: monthSelect.value
  };

  await addDoc(
    collection(db, "usuarios", userId, "lancamentos"),
    lancamento
  );

  limparFormulario();
  carregarLancamentos();
}

async function deletarLancamento(id) {
  if (!checkAuth()) return;
  if (!confirm("Excluir lançamento?")) return;

  await deleteDoc(
    doc(db, "usuarios", userId, "lancamentos", id)
  );
