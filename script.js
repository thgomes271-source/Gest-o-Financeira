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

window.db = db;
window.getDocs = getDocs;
window.collection = collection;

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
    if (!auth.currentUser) return;
    
    const mesAtual = monthSelect.value;
    const q = query(collection(db, "lancamentos"), 
              where("userId", "==", auth.currentUser.uid), 
              where("mes", "==", mesAtual));

    try {
        const snap = await getDocs(q);
        let totE = 0; // Acumulador de Entradas
        let totS = 0; // Acumulador de Saídas

        const entradaBody = document.getElementById("entradaBody");
        const saidaBody = document.getElementById("saidaBody");
        entradaBody.innerHTML = "";
        saidaBody.innerHTML = "";

        snap.forEach(d => {
            const item = { id: d.id, ...d.data() };
            
            // GARANTIA: Converte para número. Se for inválido, vira 0.
            const valorNumerico = parseFloat(item.valor) || 0;

            const row = `
                <tr>
                    <td>${formatarData(item.data)}</td>
                    <td>${item.cliente || "-"}</td>
                    <td>${item.descricao || "-"}</td>
                    <td>R$ ${valorNumerico.toFixed(2)}</td>
                    <td>R$ ${Number(item.ajudante || 0).toFixed(2)}</td>
                    <td>${item.pagamento || "-"}</td>
                    <td><span class="status-${item.status.toLowerCase().replace(" ", "-")}">${item.status}</span></td>
                    <td>
                        <button class="btn-edit" onclick="prepararEdicao('${item.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-delete" onclick="deletar('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;

            if (item.tipo === "entrada") {
                totE += valorNumerico; // Soma aqui
                entradaBody.innerHTML += row;
            } else {
                totS += valorNumerico; // Soma aqui
                saidaBody.innerHTML += row;
            }
        });

        // ATUALIZAÇÃO DOS CARDS (Fora do loop forEach)
        // Usamos .innerText para garantir que o valor apareça no <span> correto
        document.getElementById("totalEntrada").innerText = totE.toFixed(2);
        document.getElementById("totalSaida").innerText = totS.toFixed(2);
        
        const lucroTotal = totE - totS;
        const elLucro = document.getElementById("lucro");
        elLucro.innerText = lucroTotal.toFixed(2);

        // Ajuste de cor automático do Lucro
        elLucro.style.color = lucroTotal >= 0 ? "#2ecc71" : "#e74c3c";
        elLucro.parentElement.style.color = corLucro;

    } catch (error) {
        console.error("Erro ao somar cards:", error);
    }
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
// Variável global para saber se estamos editando
let editId = null;

// 1. Função para carregar os dados no formulário
window.prepararEdicao = async (id) => {
    try {
        const docRef = doc(db, "lancamentos", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            editId = id; // Armazena o ID que estamos editando

            // Preenche os campos do formulário
            document.getElementById("data").value = dados.data;
            document.getElementById("cliente").value = dados.cliente;
            document.getElementById("descricao").value = dados.descricao;
            document.getElementById("valor").value = dados.valor;
            document.getElementById("tipo").value = dados.tipo;
            document.getElementById("pagamento").value = dados.pagamento;
            document.getElementById("status").value = dados.status;
            document.getElementById("ajudante").value = dados.ajudante;

            // Muda o texto do botão para "Atualizar"
            const btnAdd = document.querySelector(".form button");
            btnAdd.textContent = "Atualizar Lançamento";
            btnAdd.style.background = "#f39c12"; // Cor de alerta/edição

            // Rola a página para o topo (formulário)
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        console.error("Erro ao carregar edição:", e);
    }
};

// 2. Modificar a função addLancamento para suportar atualização
window.addLancamento = async () => {
    try {
        if (!auth.currentUser) return alert("Sessão expirada!");

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

        if (editId) {
            // Se houver editId, estamos ATUALIZANDO
            await setDoc(doc(db, "lancamentos", editId), dados);
            alert("Lançamento atualizado com sucesso!");
            editId = null; // Reseta o estado de edição
            
            // Restaura o botão original
            const btnAdd = document.querySelector(".form button");
            btnAdd.textContent = "Adicionar";
            btnAdd.style.background = ""; 
        } else {
            // Se não houver editId, estamos CRIANDO NOVO
            await addDoc(collection(db, "lancamentos"), dados);
            alert("Lançamento adicionado!");
        }

        // Limpa o formulário e recarrega a tabela
        limparFormulario();
        carregarLancamentos();
    } catch (e) {
        console.error("Erro:", e);
    }
};

function limparFormulario() {
    document.getElementById("data").value = "";
    document.getElementById("cliente").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("ajudante").value = "";
}
function formatarData(dataISO) {
    if (!dataISO || dataISO === "") return "-";
    const partes = dataISO.split("-");
    
    // Se a data não tiver 3 partes (ano, mes, dia), retorna ela mesma
    if (partes.length !== 3) return dataISO;
    
    const [ano, mes, dia] = partes;
    return `${dia}-${mes}-${ano}`;
};

// Use formatarData(item.data) na hora de criar a linha da tabela
function abrirEdicao(id) {
    const modal = document.getElementById('editModal');
    modal.style.display = 'block';
    // Aqui você deve buscar os dados do item pelo ID e preencher o formulário do modal
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

window.prepararEdicao = async (id) => {
    try {
        const docRef = doc(db, "lancamentos", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            editId = id; // Guarda o ID globalmente

            // Preenche os campos do MODAL
            document.getElementById("editData").value = dados.data;
            document.getElementById("editCliente").value = dados.cliente;
            document.getElementById("editDescricao").value = dados.descricao;
            document.getElementById("editValor").value = dados.valor;
            document.getElementById("editTipo").value = dados.tipo;
            document.getElementById("editPagamento").value = dados.pagamento;
            document.getElementById("editStatus").value = dados.status;
            document.getElementById("editAjudante").value = dados.ajudante;

            // Mostra o modal
            document.getElementById("editModal").style.display = "block";
        }
    } catch (e) { console.error("Erro ao carregar edição:", e); }
};

window.fecharModal = () => {
    document.getElementById("editModal").style.display = "none";
    editId = null;
};

// Função para salvar o que foi editado no Modal
window.salvarEdicao = async () => {
    if (!editId) return;

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

    try {
        await setDoc(doc(db, "lancamentos", editId), dados);
        alert("Atualizado com sucesso!");
        fecharModal();
        carregarLancamentos(); // Recarrega a lista
    } catch (e) { console.error("Erro ao salvar:", e); }
};
