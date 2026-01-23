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

// ELEMENTOS DE TELA
const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const monthSelect = document.getElementById("monthSelect");

// --- AUTENTICAÇÃO ---
document.getElementById("btnRegister").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e) { alert("Erro ao cadastrar: " + e.message); }
});

document.getElementById("btnLogin").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) { alert("Erro ao entrar: " + e.message); }
});

window.logout = () => signOut(auth);

onAuthStateChanged(auth, user => {
    if (user) {
        authSection.style.display = "none";
        appSection.style.display = "block";
        carregarDadosIniciais();
    } else {
        authSection.style.display = "block";
        appSection.style.display = "none";
    }
});

// --- LÓGICA DE NEGÓCIO ---
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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

monthSelect.addEventListener("change", carregarLancamentos);

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
        alert("Lançamento adicionado!");
    } catch (e) { console.error(e); }
};

async function carregarLancamentos() {
    const mesAtual = monthSelect.value;
    const q = query(collection(db, "lancamentos"), 
              where("userId", "==", auth.currentUser.uid), 
              where("mes", "==", mesAtual));

    const snap = await getDocs(q);
    const entradas = [];
    const saidas = [];
    let totE = 0, totS = 0;

    document.getElementById("entradaBody").innerHTML = "";
    document.getElementById("saidaBody").innerHTML = "";

    snap.forEach(d => {
        const item = { id: d.id, ...d.data() };
        const row = `<tr><td>${item.data}</td><td>${item.cliente}</td><td>R$ ${item.valor.toFixed(2)}</td>
                     <td><button onclick="deletar('${item.id}')">Excluir</button></td></tr>`;
        
        if (item.tipo === "entrada") {
            totE += item.valor;
            document.getElementById("entradaBody").innerHTML += row;
            entradas.push(item);
        } else {
            totS += item.valor;
            document.getElementById("saidaBody").innerHTML += row;
            saidas.push(item);
        }
    });

    document.getElementById("totalEntrada").textContent = totE.toFixed(2);
    document.getElementById("totalSaida").textContent = totS.toFixed(2);
    document.getElementById("lucro").textContent = (totE - totS).toFixed(2);
}

window.deletar = async (id) => {
    if(confirm("Deseja excluir?")) {
        await deleteDoc(doc(db, "lancamentos", id));
        carregarLancamentos();
    }
};

window.saveMeta = async () => {
    const meta = document.getElementById("metaInput").value;
    await setDoc(doc(db, "metas", auth.currentUser.uid + "_" + monthSelect.value), {
        valor: parseFloat(meta),
        mes: monthSelect.value,
        userId: auth.currentUser.uid
    });
    alert("Meta salva!");
};

// --- PDF (MENSAL E ANUAL) ---
// --- FUNÇÕES DE PDF (MODELO FIEL AOS DOCUMENTOS ENVIADOS) ---
window.pdf = {
    mensal: async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF("p", "mm", "a4");
        const mes = monthSelect.value;
        const meta = parseFloat(document.getElementById("metaInput").value) || 0;

        // 1. Busca os dados atuais do Firestore para garantir precisão
        const q = query(collection(db, "lancamentos"), 
                  where("userId", "==", auth.currentUser.uid), 
                  where("mes", "==", mes));
        const snap = await getDocs(q);
        
        let entradas = [];
        let saidas = [];
        let totalE = 0;
        let totalS = 0;

        snap.forEach(d => {
            const item = d.data();
            if (item.tipo === "entrada") {
                entradas.push(item);
                totalE += item.valor;
            } else {
                saidas.push(item);
                totalS += item.valor;
            }
        });

        let y = 20;

        // Título 
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(14);
        docPDF.text("RELATÓRIO FINANCEIRO MENSAL", 105, y, { align: "center" });
        y += 12;

        // Cabeçalho de Referência 
        docPDF.setFontSize(10);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Mês de Referência: ${mes}`, 15, y);
        y += 6;
        docPDF.text(`Meta Mensal: R$ ${meta.toFixed(2)}`, 15, y);
        y += 6;
        docPDF.line(15, y, 195, y);
        y += 10;

        // Resumo 
        docPDF.setFont("helvetica", "bold");
        docPDF.text("RESUMO FINANCEIRO", 15, y);
        y += 8;
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Faturamento Total: R$ ${totalE.toFixed(2)}`, 15, y);
        y += 6;
        docPDF.text(`Total de Despesas: R$ ${totalS.toFixed(2)}`, 15, y);
        y += 6;
        docPDF.text(`Lucro Líquido: R$ ${(totalE - totalS).toFixed(2)}`, 15, y);
        y += 10;
        docPDF.line(15, y, 195, y);
        y += 10;

        // Tabela Entradas [cite: 11, 12]
        docPDF.setFont("helvetica", "bold");
        docPDF.text("ENTRADAS", 15, y);
        y += 7;
        docPDF.setFontSize(9);
        docPDF.text("Data", 15, y);
        docPDF.text("Cliente", 40, y);
        docPDF.text("Descrição", 85, y);
        docPDF.text("Valor", 145, y);
        docPDF.text("Pagamento", 170, y);
        y += 3;
        docPDF.line(15, y, 195, y);
        y += 6;

        docPDF.setFont("helvetica", "normal");
        entradas.forEach(item => {
            docPDF.text(item.data || "-", 15, y);
            docPDF.text(item.cliente || "-", 40, y);
            docPDF.text(item.descricao || "-", 85, y);
            docPDF.text(`R$ ${item.valor.toFixed(2)}`, 145, y);
            docPDF.text(item.pagamento || "-", 170, y);
            y += 6;
        });

        // Tabela Saídas 
        y += 10;
        docPDF.setFont("helvetica", "bold");
        docPDF.text("SAÍDAS", 15, y);
        y += 7;
        docPDF.text("Data", 15, y);
        docPDF.text("Origem", 40, y);
        docPDF.text("Descrição", 85, y);
        docPDF.text("Valor", 145, y);
        docPDF.text("Pagamento", 170, y);
        y += 3;
        docPDF.line(15, y, 195, y);
        y += 6;

        docPDF.setFont("helvetica", "normal");
        saidas.forEach(item => {
            docPDF.text(item.data || "-", 15, y);
            docPDF.text(item.cliente || "-", 40, y); // Cliente aqui atua como Origem
            docPDF.text(item.descricao || "-", 85, y);
            docPDF.text(`R$ ${item.valor.toFixed(2)}`, 145, y);
            docPDF.text(item.pagamento || "-", 170, y);
            y += 6;
        });

        // Rodapé e Assinatura 
        y = 270;
        docPDF.setFontSize(8);
        docPDF.text("Documento gerado automaticamente para fins de controle financeiro e arquivamento.", 15, y);
        y += 10;
        docPDF.setFontSize(10);
        docPDF.text("Assinatura do responsável: __________________________________________", 15, y);

        docPDF.save(`Relatorio_Financeiro_${mes}.pdf`);
    },

    anual: async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF("p", "mm", "a4");
        
        const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid));
        const snap = await getDocs(q);
        
        const resumo = {};
        months.forEach(m => resumo[m] = { e: 0, s: 0 });

        let mesesComDados = 0;
        let totalAcumulado = 0;

        snap.forEach(d => {
            const data = d.data();
            if (resumo[data.mes]) {
                if (data.tipo === "entrada") resumo[data.mes].e += data.valor;
                else resumo[data.mes].s += data.valor;
            }
        });

        let y = 20;

        // Título [cite: 1]
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(14);
        docPDF.text("RESUMO FINANCEIRO ANUAL", 105, y, { align: "center" });
        y += 15;

        // Média Mensal 
        Object.values(resumo).forEach(v => { if(v.e > 0 || v.s > 0) mesesComDados++; });
        const somaTotal = Object.values(resumo).reduce((acc, val) => acc + (val.e - val.s), 0);
        const media = mesesComDados > 0 ? somaTotal / mesesComDados : 0;

        docPDF.setFontSize(10);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Média Mensal: R$ ${media.toFixed(2)}`, 15, y);
        y += 10;

        // Tabela Anual 
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Mês", 15, y);
        docPDF.text("Entradas", 70, y);
        docPDF.text("Saídas", 115, y);
        docPDF.text("Total", 160, y);
        y += 3;
        docPDF.line(15, y, 195, y);
        y += 7;

        docPDF.setFont("helvetica", "normal");
        months.forEach(m => {
            const totalMes = resumo[m].e - resumo[m].s;
            docPDF.text(m, 15, y);
            docPDF.text(`R$ ${resumo[m].e.toFixed(2)}`, 70, y);
            docPDF.text(`R$ ${resumo[m].s.toFixed(2)}`, 115, y);
            docPDF.text(`R$ ${totalMes.toFixed(2)}`, 160, y);
            y += 6;
        });

        // Anotações 
        y += 10;
        docPDF.setFont("helvetica", "bold");
        docPDF.text("ANOTAÇÕES", 15, y);
        y += 5;
        for (let i = 0; i < 4; i++) {
            y += 8;
            docPDF.line(15, y, 195, y);
        }

        // Assinatura 
        y += 20;
        docPDF.text("Assinatura do responsável: __________________________________________", 15, y);

        docPDF.save("Resumo_Financeiro_Anual.pdf");
    }
};
