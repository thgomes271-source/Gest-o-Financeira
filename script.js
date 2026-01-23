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

// --- PDF ---
window.pdf = {
    mensal: async () => {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();
        docPDF.text(`Relatório Financeiro - ${monthSelect.value}`, 10, 10);
        docPDF.text(`Faturamento: R$ ${document.getElementById("totalEntrada").textContent}`, 10, 20);
        docPDF.save(`Relatorio_${monthSelect.value}.pdf`);
    },
    anual: () => alert("Função anual requer processamento de todos os meses.")
};
