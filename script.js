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
window.pdf = {
    mensal: async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();
        
        const mes = monthSelect.value;
        const totalE = document.getElementById("totalEntrada").textContent;
        const totalS = document.getElementById("totalSaida").textContent;
        const liq = document.getElementById("lucro").textContent;

        docPDF.setFont("helvetica", "bold");
        docPDF.text(`RELATÓRIO MENSAL - ${mes.toUpperCase()}`, 105, 20, { align: "center" });
        
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Faturamento: R$ ${totalE}`, 20, 40);
        docPDF.text(`Despesas: R$ ${totalS}`, 20, 50);
        docPDF.text(`Lucro Líquido: R$ ${liq}`, 20, 60);
        
        docPDF.save(`Relatorio_Mensal_${mes}.pdf`);
    },

    anual: async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();
        
        // 1. Buscar TODOS os lançamentos do usuário no ano
        const q = query(collection(db, "lancamentos"), 
                  where("userId", "==", auth.currentUser.uid));
        
        const snap = await getDocs(q);
        
        // 2. Criar um objeto para consolidar os valores por mês
        const resumoAno = {};
        months.forEach(m => resumoAno[m] = { e: 0, s: 0 });

        snap.forEach(d => {
            const data = d.data();
            if (resumoAno[data.mes]) {
                if (data.tipo === "entrada") resumoAno[data.mes].e += data.valor;
                else resumoAno[data.mes].s += data.valor;
            }
        });

        // 3. Gerar o PDF
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(16);
        docPDF.text("RESUMO FINANCEIRO ANUAL", 105, 20, { align: "center" });

        docPDF.setFontSize(10);
        let y = 40;
        
        // Cabeçalho da Tabela
        docPDF.text("Mês", 20, y);
        docPDF.text("Entradas", 70, y);
        docPDF.text("Saídas", 120, y);
        docPDF.text("Saldo", 170, y);
        docPDF.line(20, y + 2, 190, y + 2);
        y += 10;

        docPDF.setFont("helvetica", "normal");
        let totalFinal = 0;

        // Linhas dos Meses
        months.forEach(m => {
            const saldo = resumoAno[m].e - resumoAno[m].s;
            totalFinal += saldo;

            docPDF.text(m, 20, y);
            docPDF.text(`R$ ${resumoAno[m].e.toFixed(2)}`, 70, y);
            docPDF.text(`R$ ${resumoAno[m].s.toFixed(2)}`, 120, y);
            docPDF.text(`R$ ${saldo.toFixed(2)}`, 170, y);
            
            y += 8;
            if (y > 280) { docPDF.addPage(); y = 20; } // Quebra de página se necessário
        });

        docPDF.line(20, y, 190, y);
        y += 10;
        docPDF.setFont("helvetica", "bold");
        docPDF.text(`LUCRO ANUAL ACUMULADO: R$ ${totalFinal.toFixed(2)}`, 20, y);

        docPDF.save("Resumo_Anual_Financeiro.pdf");
    }
};
