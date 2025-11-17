// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDWyX6DXg5APApHznIwe_4l6W_D9HA7_JI",
    authDomain: "clientes-prompt-e83cb.firebaseapp.com",
    projectId: "clientes-prompt-e83cb",
    storageBucket: "clientes-prompt-e83cb.firebasestorage.app",
    messagingSenderId: "36358707713",
    appId: "1:36358707713:web:a3d97276a327123233fe00"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// CONFIGURAÇÃO GOOGLE SHEETS
const SHEET_ID = '1pWubFAN2r6V8XwOT_QAN1MWsYAPq2K0Ar2Sq412cTjc';
const SHEET_ID_VAGAS = '1bR9lW1oy6XH1Lg7cTVUtupXQBEsLKta1hfDAhyVkMQ0';
const API_KEY = 'AIzaSyCNjAwMWIYyBrBLm0P8DG2Lbre7HypmGdw';
const RANGE = 'A:L'; // Colunas de A até L
const RANGE_VAGAS = 'Interno!A:S'; // Colunas A até F da aba "Interno"

let currentUser = null;
let employees = [];
let sortDirection = {};
let userEmpresa = '';
let isPromptServicos = false;

// Função para converter salário do formato BR para número
function converterSalarioBR(salarioTexto) {
    if (!salarioTexto) return 0;
    
    // Remove "R$", espaços e pontos (separadores de milhar)
    let limpo = salarioTexto.toString()
        .replace('R$', '')
        .replace(/\./g, '')  // Remove pontos
        .replace(/\s/g, '')  // Remove espaços
        .trim();
    
    // Substitui vírgula por ponto (para decimal)
    limpo = limpo.replace(',', '.');
    
    // Converte para número
    const numero = parseFloat(limpo);
    
    console.log(`💰 Conversão: "${salarioTexto}" → "${limpo}" → ${numero}`);
    
    return isNaN(numero) ? 0 : numero;
}

// Verificar autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        carregarDadosUsuario(user);
    }
});

// Carregar dados do usuário
async function carregarDadosUsuario(user) {
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            document.getElementById('headerUserName').textContent = userData.nome;
            document.getElementById('headerUserRole').textContent = userData.cargo;
            document.getElementById('headerUserCompany').textContent = userData.empresa;
            
            // Define a empresa para filtrar no Google Sheets
            userEmpresa = userData.empresa;
            
            // Verifica se é PROMPT SERVIÇOS para acesso completo
            isPromptServicos = userEmpresa.toUpperCase().includes('PROMPT SERVIÇOS') || 
                              userEmpresa.toUpperCase().includes('PROMPT SERVICOS');
            
            // Atualiza o título da seção
            if (isPromptServicos) {
                document.getElementById('sectionTitle').innerHTML = 'Lista de Funcionários - <span id="empresaNome">TODAS AS EMPRESAS</span>';
            } else {
                document.getElementById('empresaNome').textContent = userEmpresa;
            }
            
            // Carrega dados do Google Sheets (funcionários E vagas)
            await carregarDadosSheets();
            await carregarVagasAbertas();
            
        } else {
            document.getElementById('headerUserName').textContent = 'Usuário não cadastrado';
            document.getElementById('headerUserRole').textContent = 'Contate o administrador';
            document.getElementById('headerUserCompany').textContent = 'Prompt Serviços';
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('headerUserName').textContent = 'Erro ao carregar';
        document.getElementById('headerUserRole').textContent = 'Tente novamente';
        document.getElementById('headerUserCompany').textContent = 'Prompt Serviços';
    }
}

// Carregar dados do Google Sheets (Funcionários)
async function carregarDadosSheets() {
    try {
        console.log('📊 Carregando dados do Google Sheets...');
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Dados recebidos do Sheets:', data);
        
        if (data.values && data.values.length > 0) {
            processarDadosSheets(data.values);
        } else {
            throw new Error('Planilha vazia ou sem dados');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar do Sheets:', error);
        document.getElementById('loadingMessage').innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Erro ao carregar dados: ${error.message}</p>
            <button onclick="carregarDadosSheets()" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Tentar Novamente
            </button>
        `;
    }
}

// Carregar vagas abertas
async function carregarVagasAbertas() {
    try {
        console.log('📋 Carregando vagas abertas...');
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_VAGAS}/values/${RANGE_VAGAS}?key=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro na API de vagas: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Dados de vagas recebidos:', data);
        
        if (data.values && data.values.length > 0) {
            const vagasCount = contarVagasAbertas(data.values);
            document.getElementById('vagasAbertas').textContent = vagasCount;
            console.log(`🎯 ${vagasCount} vagas abertas encontradas`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar vagas:', error);
        document.getElementById('vagasAbertas').textContent = '0';
    }
}

// Contar vagas abertas - VERSÃO CORRIGIDA
function contarVagasAbertas(vagasData) {
    try {
        const headers = vagasData[0];
        console.log('📋 Cabeçalhos da planilha de vagas:', headers);
        
        // Encontra os índices das colunas
        const colunaAIndex = 0; // Coluna A - Carimbo de data/hora
        const fechadaIndex = headers.indexOf('VAGA FECHADA'); // Coluna C
        const empresaEIndex = 4; // Coluna E (índice 4)
        const empresaFIndex = 5; // Coluna F (índice 5)
        
        console.log('🎯 Índices das colunas de vagas:', {
            colunaA: colunaAIndex,
            fechada: fechadaIndex,
            empresaE: empresaEIndex,
            empresaF: empresaFIndex
        });
        
        let vagasCount = 0;
        
        for (let i = 1; i < vagasData.length; i++) {
            const row = vagasData[i];
            const colunaA = row[colunaAIndex]; // Carimbo de data/hora
            const fechada = row[fechadaIndex]; // Checkbox VAGA FECHADA
            const empresaE = row[empresaEIndex];
            const empresaF = row[empresaFIndex];
            
            // REGRA 1: Coluna A não pode estar vazia (tem que ter carimbo de data/hora)
            const temCarimboData = colunaA && colunaA.trim() !== '';
            
            // REGRA 2: Coluna C (VAGA FECHADA) deve ser FALSE ou vazia
            // Seguindo a mesma lógica do primeiro HTML
            const vagaAberta = fechada !== 'TRUE' && fechada !== 'true' && fechada !== true;
            
            // REGRA 3: Verifica se pertence à empresa
            const pertenceEmpresa = isPromptServicos || 
                                empresaE === userEmpresa || 
                                empresaF === userEmpresa;
            
            // CONTA se: Tem carimbo NA coluna A + Vaga está ABERTA + Pertence à empresa
            if (temCarimboData && vagaAberta && pertenceEmpresa) {
                vagasCount++;
                console.log(`✅ Vaga aberta encontrada: Linha ${i + 1}`, { 
                    colunaA, 
                    fechada, 
                    empresaE, 
                    empresaF 
                });
            } else {
                console.log(`❌ Vaga não contabilizada: Linha ${i + 1}`, { 
                    temCarimboData, 
                    vagaAberta, 
                    pertenceEmpresa 
                });
            }
        }
        
        console.log(`🎯 Total de vagas abertas: ${vagasCount}`);
        return vagasCount;
        
    } catch (error) {
        console.error('❌ Erro ao contar vagas:', error);
        return 0;
    }
}

// Processar dados do Sheets - VERSÃO MODIFICADA PARA PROMPT SERVIÇOS
function processarDadosSheets(sheetData) {
    try {
        // A primeira linha são os cabeçalhos
        const headers = sheetData[0];
        console.log('📋 Cabeçalhos encontrados:', headers);
        
        // CORREÇÃO: A empresa está na coluna E "Nome Cliente"
        const empresaIndex = headers.indexOf('Nome Cliente'); // COLUNA E
        const nomeIndex = headers.indexOf('Nome');
        const funcaoIndex = headers.indexOf('NomeFuncao');
        const salarioIndex = headers.indexOf('Salario Mes');
        const cpfIndex = headers.indexOf('CPF');
        const admissaoIndex = headers.indexOf('Admissao');
        const vinculoIndex = headers.indexOf('Vinculo');
        
        console.log('🎯 Índices das colunas:', {
            empresa: empresaIndex,
            nome: nomeIndex,
            funcao: funcaoIndex,
            salario: salarioIndex,
            cpf: cpfIndex,
            admissao: admissaoIndex,
            vinculo: vinculoIndex
        });
        
        console.log(`🔍 Buscando funcionários para: "${userEmpresa}"`);
        console.log(`🔑 Acesso completo: ${isPromptServicos}`);
        
        // Filtra as linhas conforme o tipo de usuário
        employees = [];
        let empresasEncontradas = new Set();
        
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            const empresaNaLinha = row[empresaIndex];
            
            if (empresaNaLinha) {
                empresasEncontradas.add(empresaNaLinha);
                
                // DEBUG: Mostrar as primeiras empresas encontradas
                if (i < 5) {
                    console.log(`Linha ${i}: Nome Cliente = "${empresaNaLinha}"`);
                }
                
                // Verifica se deve incluir o funcionário
                const deveIncluir = isPromptServicos || 
                                  (empresaNaLinha.trim() === userEmpresa.trim() && row[nomeIndex] && row[nomeIndex].trim() !== '');
                
                if (deveIncluir) {
                    employees.push({
                        nome: row[nomeIndex] || '',
                        funcao: row[funcaoIndex] || '',
                        salario: converterSalarioBR(row[salarioIndex]),
                        cpf: row[cpfIndex] || '',
                        admissao: row[admissaoIndex] || '',
                        vinculo: row[vinculoIndex] || '',
                        empresa: empresaNaLinha || ''
                    });
                }
            }
        }
        
        console.log('🏢 Todas as empresas encontradas na coluna "Nome Cliente":', Array.from(empresasEncontradas));
        console.log(`✅ ${employees.length} funcionários encontrados`);
        
        // Atualiza a interface
        atualizarEstatisticas();
        renderizarConteudo();
        
        // Esconde loading
        document.getElementById('loadingMessage').style.display = 'none';
        
    } catch (error) {
        console.error('❌ Erro ao processar dados:', error);
        document.getElementById('loadingMessage').innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Erro ao processar dados: ${error.message}</p>
            <p>Verifique o console para mais detalhes</p>
        `;
    }
}

// Atualizar estatísticas
function atualizarEstatisticas() {
    document.getElementById('totalFuncionarios').textContent = employees.length;
    // Vagas Abertas já é atualizado pela função carregarVagasAbertas
}

// Renderizar conteúdo conforme o dispositivo
function renderizarConteudo() {
    if (window.innerWidth > 768) {
        // Desktop - mostrar tabela
        renderizarTabela();
        document.getElementById('employeesTable').style.display = 'table';
        document.getElementById('employeesCards').style.display = 'none';
    } else {
        // Mobile - mostrar cards
        renderizarCards();
        document.getElementById('employeesTable').style.display = 'none';
        document.getElementById('employeesCards').style.display = 'flex';
    }
}

// Renderizar tabela (Desktop)
function renderizarTabela() {
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = '';

    if (employees.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-users" style="font-size: 32px; margin-bottom: 10px; display: block; color: #dc3545;"></i>
                ${isPromptServicos ? 'Nenhum funcionário encontrado' : `Nenhum funcionário encontrado para ${userEmpresa}`}
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    employees.forEach(funcionario => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${funcionario.nome}</td>
            <td>${funcionario.funcao}</td>
            <td class="salary">R$ ${funcionario.salario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="cpf">${funcionario.cpf}</td>
            <td class="admission">${funcionario.admissao}</td>
            <td>${funcionario.vinculo}</td>
            <td class="empresa">${isPromptServicos ? funcionario.empresa : ''}</td>
        `;
        tbody.appendChild(row);
    });
}

// Renderizar cards (Mobile)
function renderizarCards() {
    const cardsContainer = document.getElementById('employeesCards');
    cardsContainer.innerHTML = '';

    if (employees.length === 0) {
        cardsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-users" style="font-size: 32px; margin-bottom: 10px; display: block; color: #dc3545;"></i>
                ${isPromptServicos ? 'Nenhum funcionário encontrado' : `Nenhum funcionário encontrado para ${userEmpresa}`}
            </div>
        `;
        return;
    }

    employees.forEach(funcionario => {
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.innerHTML = `
            <div class="employee-card-header">
                <div>
                    <div class="employee-name">${funcionario.nome}</div>
                    <div class="employee-role">${funcionario.funcao}</div>
                    ${isPromptServicos ? `<div class="employee-company">${funcionario.empresa}</div>` : ''}
                </div>
            </div>
            <div class="employee-details">
                <div class="detail-item">
                    <span class="detail-label">Salário</span>
                    <span class="detail-value salary">R$ ${funcionario.salario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">CPF</span>
                    <span class="detail-value">${funcionario.cpf}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Admissão</span>
                    <span class="detail-value">${funcionario.admissao}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Vínculo</span>
                    <span class="detail-value">${funcionario.vinculo}</span>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}

// Ordenar tabela
window.sortTable = function(columnIndex) {
    const headers = document.querySelectorAll('.employees-table th');
    const currentHeader = headers[columnIndex];
    
    // Remove ícones de todos os headers
    headers.forEach(header => {
        const icon = header.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-sort';
        }
    });

    // Define direção da ordenação
    if (!sortDirection[columnIndex]) {
        sortDirection[columnIndex] = 'asc';
    } else {
        sortDirection[columnIndex] = sortDirection[columnIndex] === 'asc' ? 'desc' : 'asc';
    }

    // Atualiza ícone
    const icon = currentHeader.querySelector('i');
    icon.className = sortDirection[columnIndex] === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';

    // Ordena os dados
    employees.sort((a, b) => {
        let valueA, valueB;
        
        switch(columnIndex) {
            case 0: // Nome
                valueA = a.nome.toLowerCase();
                valueB = b.nome.toLowerCase();
                break;
            case 1: // Função
                valueA = a.funcao.toLowerCase();
                valueB = b.funcao.toLowerCase();
                break;
            case 2: // Salário
                valueA = a.salario;
                valueB = b.salario;
                break;
            case 3: // CPF
                valueA = a.cpf;
                valueB = b.cpf;
                break;
            case 4: // Admissão
                valueA = new Date(a.admissao.split('/').reverse().join('-'));
                valueB = new Date(b.admissao.split('/').reverse().join('-'));
                break;
            case 5: // Vínculo
                valueA = a.vinculo.toLowerCase();
                valueB = b.vinculo.toLowerCase();
                break;
            case 6: // Empresa
                valueA = a.empresa.toLowerCase();
                valueB = b.empresa.toLowerCase();
                break;
        }

        if (valueA < valueB) return sortDirection[columnIndex] === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection[columnIndex] === 'asc' ? 1 : -1;
        return 0;
    });

    renderizarConteudo();
}

// Buscar funcionários
document.getElementById('searchInput').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm === '') {
        // Recarrega os dados originais do Google Sheets
        carregarDadosSheets();
    } else {
        const filteredEmployees = employees.filter(funcionario => 
            funcionario.nome.toLowerCase().includes(searchTerm) ||
            funcionario.funcao.toLowerCase().includes(searchTerm) ||
            funcionario.cpf.includes(searchTerm) ||
            funcionario.vinculo.toLowerCase().includes(searchTerm) ||
            (isPromptServicos && funcionario.empresa.toLowerCase().includes(searchTerm))
        );
        
        // Atualiza a tabela com os resultados filtrados
        employees = filteredEmployees;
        atualizarEstatisticas();
        renderizarConteudo();
    }
});

// Sair
window.sair = function() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
}

// Navegação da sidebar
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

// Redimensionamento da janela - atualizar conteúdo conforme necessário
window.addEventListener('resize', function() {
    renderizarConteudo();
});