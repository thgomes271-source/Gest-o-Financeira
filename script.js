import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7ugVILO8olKtzkCJI_7BRlzY6Qe0-rCM",
    authDomain: "gst-financeira.firebaseapp.com",
    projectId: "gst-financeira"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const monthSelect = document.getElementById("monthSelect");
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
let editId = null;

// --- AUTENTICAÇÃO ---
onAuthStateChanged(auth, user => {
    if (user) {
        authSection.setAttribute("style", "display: none !important");
        appSection.style.display = "block";
        carregarDadosIniciais();
    } else {
        authSection.style.display = "flex";
        appSection.style.display = "none";
    }
});

document.getElementById("btnLogin").onclick = async () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    try { await signInWithEmailAndPassword(auth, email, pass); } catch (e) { alert("Erro: " + e.message); }
};

document.getElementById("btnRegister").onclick = async () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    try { await createUserWithEmailAndPassword(auth, email, pass); } catch (e) { alert("Erro: " + e.message); }
};

window.logout = () => signOut(auth);

// --- LÓGICA DE NEGÓCIO ---
function carregarDadosIniciais() {
    monthSelect.innerHTML = "";
    months.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m; opt.textContent = m;
        monthSelect.appendChild(opt);
    });
    monthSelect.value = months[new Date().getMonth()];
    carregarLancamentos();
}

monthSelect.onchange = carregarLancamentos;

window.addLancamento = async () => {
    const dados = {
        userId: auth.currentUser.uid,
        mes: monthSelect.value,
        data: document.getElementById("data").value,
        cliente: document.getElementById("cliente").value,
        descricao: document.getElementById("descricao").value,
        valor: parseFloat(document.getElementById("valor").value) || 0,
        tipo: document.getElementById("tipo").value,
        pagamento: document.getElementById("pagamento").value,
        status: document.getElementById("status").value,
        ajudante: parseFloat(document.getElementById("ajudante").value) || 0
    };
    try {
        await addDoc(collection(db, "lancamentos"), dados);
        carregarLancamentos();
        ["data","cliente","descricao","valor","ajudante"].forEach(id => document.getElementById(id).value = "");
    } catch (e) { console.error(e); }
};

async function carregarLancamentos() {
    if (!auth.currentUser) return;
    const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid), where("mes", "==", monthSelect.value));
    const snap = await getDocs(q);
    let itens = [];
    snap.forEach(d => itens.push({ id: d.id, ...d.data() }));
    itens.sort((a, b) => a.data.localeCompare(b.data));

    let totE = 0, totS = 0;
    const eBody = document.getElementById("entradaBody");
    const sBody = document.getElementById("saidaBody");
    eBody.innerHTML = ""; sBody.innerHTML = "";

    itens.forEach(item => {
        const v = parseFloat(item.valor) || 0;
        const row = `<tr>
            <td>${item.data.split("-").reverse().join("-")}</td>
            <td>${item.cliente || "-"}</td>
            <td>${item.descricao || "-"}</td>
            <td>R$ ${v.toFixed(2)}</td>
            <td>R$ ${Number(item.ajudante || 0).toFixed(2)}</td>
            <td>${item.pagamento || "-"}</td>
            <td><span class="status-${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span></td>
            <td>
                <button class="btn-edit" onclick="prepararEdicao('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deletar('${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
        if (item.tipo === "entrada") { totE += v; eBody.innerHTML += row; }
        else { totS += v; sBody.innerHTML += row; }
    });
    document.getElementById("totalEntrada").innerText = totE.toFixed(2);
    document.getElementById("totalSaida").innerText = totS.toFixed(2);
    document.getElementById("lucro").innerText = (totE - totS).toFixed(2);
}

window.prepararEdicao = async (id) => {
    const snap = await getDoc(doc(db, "lancamentos", id));
    if (snap.exists()) {
        const d = snap.data();
        editId = id;
        document.getElementById("editData").value = d.data;
        document.getElementById("editCliente").value = d.cliente;
        document.getElementById("editDescricao").value = d.descricao;
        document.getElementById("editValor").value = d.valor;
        document.getElementById("editTipo").value = d.tipo;
        document.getElementById("editPagamento").value = d.pagamento;
        document.getElementById("editStatus").value = d.status;
        document.getElementById("editAjudante").value = d.ajudante;
        document.getElementById("editModal").style.display = "flex";
    }
};

window.salvarEdicao = async () => {
    const dados = {
        userId: auth.currentUser.uid,
        mes: monthSelect.value,
        data: document.getElementById("editData").value,
        cliente: document.getElementById("editCliente").value,
        descricao: document.getElementById("editDescricao").value,
        valor: parseFloat(document.getElementById("editValor").value) || 0,
        tipo: document.getElementById("editTipo").value,
        pagamento: document.getElementById("editPagamento").value,
        status: document.getElementById("editStatus").value,
        ajudante: parseFloat(document.getElementById("editAjudante").value) || 0
    };
    await setDoc(doc(db, "lancamentos", editId), dados);
    window.fecharModal();
    carregarLancamentos();
};

window.fecharModal = () => { document.getElementById("editModal").style.display = "none"; editId = null; };

window.deletar = async (id) => {
    if (confirm("Excluir?")) { await deleteDoc(doc(db, "lancamentos", id)); carregarLancamentos(); }
};

// --- PDF (MENSAL E ANUAL COMPLETOS) ---
window.pdf = {
    mensal: async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF("p", "mm", "a4");
        const mes = monthSelect.value;
        const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid), where("mes", "==", mes));
        const snap = await getDocs(q);
        let entradas = [], saidas = [], totalE = 0, totalS = 0;
        snap.forEach(d => {
            const item = d.data();
            if (item.tipo === "entrada") { entradas.push(item); totalE += item.valor; }
            else { saidas.push(item); totalS += item.valor; }
        });
        let y = 20;
        docPDF.setFont("helvetica", "bold"); docPDF.setFontSize(14);
        docPDF.text("RELATÓRIO FINANCEIRO MENSAL", 105, y, { align: "center" });
        y += 12; docPDF.setFontSize(10); docPDF.setFont("helvetica", "normal");
        docPDF.text(`Mês de Referência: ${mes}`, 15, y); y += 12;
        docPDF.setFont("helvetica", "bold"); docPDF.text("RESUMO FINANCEIRO", 15, y);
        y += 8; docPDF.setFont("helvetica", "normal");
        docPDF.text(`Faturamento Total: R$ ${totalE.toFixed(2)}`, 15, y); y += 6;
        docPDF.text(`Total de Despesas: R$ ${totalS.toFixed(2)}`, 15, y); y += 6;
        docPDF.text(`Lucro Líquido: R$ ${(totalE - totalS).toFixed(2)}`, 15, y);
        y += 10; docPDF.line(15, y, 195, y); y += 10;
        docPDF.setFont("helvetica", "bold"); docPDF.text("ENTRADAS", 15, y);
        y += 7; docPDF.setFontSize(9); docPDF.text("Data", 15, y); docPDF.text("Cliente", 40, y); docPDF.text("Descrição", 85, y); docPDF.text("Valor", 145, y);
        y += 3; docPDF.line(15, y, 195, y); y += 6; docPDF.setFont("helvetica", "normal");
        entradas.forEach(item => { docPDF.text(item.data || "-", 15, y); docPDF.text(item.cliente || "-", 40, y); docPDF.text(item.descricao || "-", 85, y); docPDF.text(`R$ ${item.valor.toFixed(2)}`, 145, y); y += 6; });
        y += 10; docPDF.setFont("helvetica", "bold"); docPDF.text("SAÍDAS", 15, y);
        y += 7; docPDF.text("Data", 15, y); docPDF.text("Origem", 40, y); docPDF.text("Descrição", 85, y); docPDF.text("Valor", 145, y);
        y += 3; docPDF.line(15, y, 195, y); y += 6; docPDF.setFont("helvetica", "normal");
        saidas.forEach(item => { docPDF.text(item.data || "-", 15, y); docPDF.text(item.cliente || "-", 40, y); docPDF.text(item.descricao || "-", 85, y); docPDF.text(`R$ ${item.valor.toFixed(2)}`, 145, y); y += 6; });
        docPDF.save(`Relatorio_${mes}.pdf`);
    },

    anual: async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF("p", "mm", "a4");
        const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid));
        const snap = await getDocs(q);
        const resumo = {};
        months.forEach(m => resumo[m] = { e: 0, s: 0 });
        snap.forEach(d => {
            const data = d.data();
            if (resumo[data.mes]) {
                if (data.tipo === "entrada") resumo[data.mes].e += data.valor;
                else resumo[data.mes].s += data.valor;
            }
        });
        let y = 20;
        docPDF.setFont("helvetica", "bold"); docPDF.setFontSize(14);
        docPDF.text("RESUMO FINANCEIRO ANUAL", 105, y, { align: "center" });
        y += 15;
        let mesesComDados = 0;
        Object.values(resumo).forEach(v => { if(v.e > 0 || v.s > 0) mesesComDados++; });
        const somaTotal = Object.values(resumo).reduce((acc, val) => acc + (val.e - val.s), 0);
        const media = mesesComDados > 0 ? somaTotal / mesesComDados : 0;
        docPDF.setFontSize(10); docPDF.setFont("helvetica", "normal");
        docPDF.text(`Média Mensal Líquida: R$ ${media.toFixed(2)}`, 15, y); y += 10;
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Mês", 15, y); docPDF.text("Entradas", 70, y); docPDF.text("Saídas", 115, y); docPDF.text("Total", 160, y);
        y += 3; docPDF.line(15, y, 195, y); y += 7;
        docPDF.setFont("helvetica", "normal");
        months.forEach(m => {
            const totalMes = resumo[m].e - resumo[m].s;
            docPDF.text(m, 15, y);
            docPDF.text(`R$ ${resumo[m].e.toFixed(2)}`, 70, y);
            docPDF.text(`R$ ${resumo[m].s.toFixed(2)}`, 115, y);
            docPDF.text(`R$ ${totalMes.toFixed(2)}`, 160, y);
            y += 6;
        });
        y += 10; docPDF.setFont("helvetica", "bold"); docPDF.text("ANOTAÇÕES E OBSERVAÇÕES", 15, y);
        y += 5;
        for (let i = 0; i < 4; i++) { y += 8; docPDF.line(15, y, 195, y); }
        y += 20; docPDF.text("Assinatura do responsável: __________________________________________", 15, y);
        docPDF.save("Resumo_Financeiro_Anual.pdf");
    }
};
