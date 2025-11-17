// Firebase - Versão sem módulos ES6
document.addEventListener('DOMContentLoaded', function() {
    // Configurações globais
    const SHEET_ID_VAGAS = '1bR9lW1oy6XH1Lg7cTVUtupXQBEsLKta1hfDAhyVkMQ0';
    const SHEET_ID_FUNCIONARIOS = '1pWubFAN2r6V8XwOT_QAN1MWsYAPq2K0Ar2Sq412cTjc';
    const API_KEY = 'AIzaSyCNjAwMWIYyBrBLm0P8DG2Lbre7HypmGdw';
    const RANGE_VAGAS = 'Interno!A:S';
    const RANGE_FUNCIONARIOS = 'A:L';

    let currentUser = null;
    let vagas = [];
    let sortDirection = {};
    let userEmpresa = '';
    let isPromptServicos = false;

    // Inicializar Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDWyX6DXg5APApHznIwe_4l6W_D9HA7_JI",
        authDomain: "clientes-prompt-e83cb.firebaseapp.com",
        projectId: "clientes-prompt-e83cb",
        storageBucket: "clientes-prompt-e83cb.firebasestorage.app",
        messagingSenderId: "36358707713",
        appId: "1:36358707713:web:a3d97276a327123233fe00"
    };

    // Verificar se Firebase está carregado
    if (typeof firebase === 'undefined') {
        console.error('Firebase não carregado. Verifique os scripts no HTML.');
        return;
    }

    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Verificar autenticação
    auth.onAuthStateChanged((user) => {
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
            const userDoc = await db.collection('usuarios').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                document.getElementById('headerUserName').textContent = userData.nome;
                document.getElementById('headerUserRole').textContent = userData.cargo;
                document.getElementById('headerUserCompany').textContent = userData.empresa;
                
                // Define a empresa para filtrar no Google Sheets
                userEmpresa = userData.empresa;
                document.getElementById('empresaNome').textContent = userEmpresa;
                
                // Verifica se é da empresa PROMPT SERVIÇOS
                isPromptServicos = userEmpresa.toUpperCase().includes('PROMPT SERVIÇOS');
                
                // Mostra/oculta coluna de empresa na tabela
                const empresaHeader = document.getElementById('empresaHeader');
                if (isPromptServicos) {
                    empresaHeader.style.display = 'table-cell';
                } else {
                    empresaHeader.style.display = 'none';
                }
                
                // Mostra/oculta card de abrir nova vaga
                const abrirVagaCard = document.getElementById('abrirVagaCard');
                if (!isPromptServicos) {
                    abrirVagaCard.style.display = 'block';
                }
                
                // Carrega dados do Google Sheets (vagas E funcionários)
                await carregarVagasDetalhadas();
                await carregarTotalFuncionarios();
                
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

    // Carregar total de funcionários
    async function carregarTotalFuncionarios() {
        try {
            console.log('👥 Carregando total de funcionários...');
            
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_FUNCIONARIOS}/values/${RANGE_FUNCIONARIOS}?key=${API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erro na API de funcionários: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.values && data.values.length > 0) {
                const totalFuncionarios = contarFuncionariosAtivos(data.values);
                document.getElementById('totalFuncionarios').textContent = totalFuncionarios;
                console.log(`✅ ${totalFuncionarios} funcionários ativos encontrados para ${userEmpresa}`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar funcionários:', error);
            document.getElementById('totalFuncionarios').textContent = '0';
        }
    }

    // Contar funcionários ativos
    function contarFuncionariosAtivos(funcionariosData) {
        try {
            const headers = funcionariosData[0];
            const empresaIndex = headers.indexOf('Nome Cliente');
            const nomeIndex = headers.indexOf('Nome');
            
            let totalFuncionarios = 0;
            
            for (let i = 1; i < funcionariosData.length; i++) {
                const row = funcionariosData[i];
                const empresaNaLinha = row[empresaIndex];
                const nomeFuncionario = row[nomeIndex];
                
                // Se for PROMPT SERVIÇOS, conta todos os funcionários
                // Caso contrário, conta apenas funcionários da empresa do usuário
                if (nomeFuncionario && nomeFuncionario.trim() !== '') {
                    if (isPromptServicos || 
                        (empresaNaLinha && empresaNaLinha.trim() === userEmpresa.trim())) {
                        totalFuncionarios++;
                    }
                }
            }
            
            return totalFuncionarios;
            
        } catch (error) {
            console.error('❌ Erro ao contar funcionários:', error);
            return 0;
        }
    }

    // Carregar vagas detalhadas
    async function carregarVagasDetalhadas() {
        try {
            console.log('📋 Carregando vagas detalhadas...');
            
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_VAGAS}/values/${RANGE_VAGAS}?key=${API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erro na API de vagas: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Dados de vagas recebidos:', data);
            
            if (data.values && data.values.length > 0) {
                processarVagasDetalhadas(data.values);
            } else {
                throw new Error('Planilha de vagas vazia ou sem dados');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar vagas:', error);
            document.getElementById('loadingMessage').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar vagas: ${error.message}</p>
                <button onclick="carregarVagasDetalhadas()" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Tentar Novamente
                </button>
            `;
        }
    }

    // Processar vagas detalhadas - VERSÃO MODIFICADA PARA OS NOVOS STATUS
    function processarVagasDetalhadas(vagasData) {
        try {
            const headers = vagasData[0];
            console.log('📋 Cabeçalhos da planilha de vagas:', headers);
            
            // Encontra os índices das colunas
            const aberturaIndex = headers.indexOf('Carimbo de data/hora');
            const cargoIndex = headers.indexOf('CARGOS');
            const modalidadeIndex = headers.indexOf('TIPO DE CONTRATO');
            const statusIndex = headers.indexOf('STATUS'); // Agora é menu suspenso com 5 opções
            const empresaEIndex = 4;
            const empresaFIndex = 5;
            
            console.log('🎯 Índices das colunas de vagas:', {
                abertura: aberturaIndex,
                cargo: cargoIndex,
                modalidade: modalidadeIndex,
                status: statusIndex,
                empresaE: empresaEIndex,
                empresaF: empresaFIndex
            });
            
            vagas = [];
            let totalVagasAbertas = 0;
            
            for (let i = 1; i < vagasData.length; i++) {
                const row = vagasData[i];
                const status = row[statusIndex]; // Agora é string com o status
                const empresaE = row[empresaEIndex];
                const empresaF = row[empresaFIndex];
                const cargo = row[cargoIndex];
                const abertura = row[aberturaIndex];
                const modalidade = row[modalidadeIndex];
                
                // Verifica se a vaga pertence à empresa
                const pertenceEmpresa = isPromptServicos || 
                                      empresaE === userEmpresa || 
                                      empresaF === userEmpresa;
                
                // NOVA LÓGICA: Verifica se a vaga está em status válido
                // Status válidos: "Não iniciada", "Triagem", "Material enviado"
                // Status que NÃO devem aparecer: "Aprovada", "Cancelada pelo cliente"
                const statusValido = status === 'Não iniciada' || 
                                   status === 'Triagem' || 
                                   status === 'Material enviado';
                
                // Só adiciona se pertence à empresa, tem cargo e status é válido
                if (pertenceEmpresa && cargo && statusValido) {
                    totalVagasAbertas++;
                    
                    // Determina qual empresa usar (E ou F)
                    const empresaVaga = empresaE || empresaF || '';
                    
                    vagas.push({
                        abertura: abertura || 'Data não informada',
                        cargo: cargo || '',
                        modalidade: modalidade || 'A definir',
                        status: status || 'Não iniciada',
                        empresa: empresaVaga
                    });
                    
                    console.log(`✅ Vaga adicionada: ${cargo} - Status: ${status}`);
                } else {
                    console.log(`❌ Vaga não adicionada: ${cargo} - Status: ${status} - Pertence: ${pertenceEmpresa}`);
                }
            }
            
            console.log(`✅ ${vagas.length} vagas válidas encontradas para ${userEmpresa} (${totalVagasAbertas} abertas)`);
            
            // Atualiza estatísticas
            document.getElementById('totalVagas').textContent = totalVagasAbertas;
            
            // Renderiza conteúdo conforme dispositivo
            renderizarConteudo();
            
            // Esconde loading
            document.getElementById('loadingMessage').style.display = 'none';
            
        } catch (error) {
            console.error('❌ Erro ao processar vagas:', error);
            document.getElementById('loadingMessage').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao processar vagas: ${error.message}</p>
            `;
        }
    }

    // Função para obter classe CSS baseada no status - VERSÃO BOTÃO
    function getStatusClass(status) {
        // Remove espaços extras e padroniza
        const statusLimpo = status ? status.trim() : 'Não iniciada';
        
        switch(statusLimpo) {
            case 'Aprovada':
                return 'status-badge status-aprovada';
            case 'Cancelada pelo cliente':
                return 'status-badge status-cancelada';
            case 'Material enviado':
                return 'status-badge status-material';
            case 'Triagem':
                return 'status-badge status-triagem';
            case 'Não iniciada':
                return 'status-badge status-nao-iniciada';
            default:
                return 'status-badge status-nao-iniciada';
        }
    }

    // Renderizar conteúdo conforme o dispositivo
    function renderizarConteudo() {
        if (window.innerWidth > 768) {
            // Desktop - mostrar tabela
            renderizarTabelaVagas();
            document.getElementById('vagasTable').style.display = 'table';
            document.getElementById('vagasCards').style.display = 'none';
        } else {
            // Mobile - mostrar cards
            renderizarCardsVagas();
            document.getElementById('vagasTable').style.display = 'none';
            document.getElementById('vagasCards').style.display = 'flex';
        }
    }

    // Renderizar tabela de vagas (Desktop) - VERSÃO COM BOTÕES
    function renderizarTabelaVagas() {
        const tbody = document.getElementById('vagasTableBody');
        tbody.innerHTML = '';

        if (vagas.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="${isPromptServicos ? '5' : '4'}" style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-briefcase" style="font-size: 32px; margin-bottom: 10px; display: block; color: #dc3545;"></i>
                    Nenhuma vaga aberta encontrada ${isPromptServicos ? '' : 'para ' + userEmpresa}
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

        // Ordena por data (mais recentes primeiro)
        vagas.sort((a, b) => {
            return new Date(b.abertura) - new Date(a.abertura);
        });

        vagas.forEach(vaga => {
            const row = document.createElement('tr');
            const statusClass = getStatusClass(vaga.status);
            
            let rowHTML = `
                <td class="no-wrap">${formatarDataApenasData(vaga.abertura)}</td>
                <td>${vaga.cargo}</td>
                <td>${vaga.modalidade}</td>
            `;
            
            // Adiciona coluna de empresa apenas para PROMPT SERVIÇOS
            if (isPromptServicos) {
                rowHTML += `<td>${vaga.empresa}</td>`;
            }
            
            // AGORA COM BOTÃO ARREDONDADO
            rowHTML += `<td class="no-wrap"><span class="${statusClass}">${vaga.status}</span></td>`;
            
            row.innerHTML = rowHTML;
            tbody.appendChild(row);
        });
    }

    // Renderizar cards de vagas (Mobile) - VERSÃO COM BOTÕES
    function renderizarCardsVagas() {
        const cardsContainer = document.getElementById('vagasCards');
        cardsContainer.innerHTML = '';

        if (vagas.length === 0) {
            cardsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-briefcase" style="font-size: 32px; margin-bottom: 10px; display: block; color: #dc3545;"></i>
                    Nenhuma vaga aberta encontrada ${isPromptServicos ? '' : 'para ' + userEmpresa}
                </div>
            `;
            return;
        }

        // Ordena por data (mais recentes primeiro)
        vagas.sort((a, b) => {
            return new Date(b.abertura) - new Date(a.abertura);
        });

        vagas.forEach(vaga => {
            const card = document.createElement('div');
            card.className = 'vaga-card';
            const statusClass = getStatusClass(vaga.status);
            
            let cardHTML = `
                <div class="vaga-card-header">
                    <div>
                        <div class="vaga-cargo">${vaga.cargo}</div>
                        <div class="vaga-data">${formatarDataApenasData(vaga.abertura)}</div>
                    </div>
                </div>
                <div class="vaga-details">
                    <div class="vaga-detail-item">
                        <span class="vaga-detail-label">Modalidade</span>
                        <span class="vaga-detail-value">${vaga.modalidade}</span>
                    </div>
            `;
            
            // Adiciona empresa apenas para PROMPT SERVIÇOS
            if (isPromptServicos) {
                cardHTML += `
                    <div class="vaga-detail-item">
                        <span class="vaga-detail-label">Empresa</span>
                        <span class="vaga-detail-value">${vaga.empresa}</span>
                    </div>
                `;
            }
            
            // AGORA COM BOTÃO ARREDONDADO
            cardHTML += `
                    <div class="vaga-detail-item">
                        <span class="vaga-detail-label">Status</span>
                        <span class="vaga-detail-value ${statusClass}">${vaga.status}</span>
                    </div>
                </div>
            `;
            
            card.innerHTML = cardHTML;
            cardsContainer.appendChild(card);
        });
    }

    // Função para formatar data (APENAS DATA - ignora hora)
    function formatarDataApenasData(dataString) {
        if (!dataString) return 'Data não informada';
        
        try {
            // Extrai apenas a parte da data (antes do espaço)
            const apenasData = dataString.split(' ')[0];
            const data = new Date(apenasData);
            
            if (isNaN(data.getTime())) {
                return dataString;
            }
            
            return data.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dataString;
        }
    }

    // Ordenar tabela
    window.sortTable = function(columnIndex) {
        const headers = document.querySelectorAll('.vagas-table th');
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
        vagas.sort((a, b) => {
            let valueA, valueB;
            
            // Ajusta o índice da coluna para PROMPT SERVIÇOS
            let adjustedColumnIndex = columnIndex;
            if (!isPromptServicos && columnIndex >= 3) {
                adjustedColumnIndex = columnIndex + 1;
            }
            
            switch(adjustedColumnIndex) {
                case 0: // Abertura
                    valueA = new Date(a.abertura.split(' ')[0]);
                    valueB = new Date(b.abertura.split(' ')[0]);
                    break;
                case 1: // Cargo
                    valueA = a.cargo.toLowerCase();
                    valueB = b.cargo.toLowerCase();
                    break;
                case 2: // Modalidade
                    valueA = a.modalidade.toLowerCase();
                    valueB = b.modalidade.toLowerCase();
                    break;
                case 3: // Empresa (apenas para PROMPT SERVIÇOS)
                    valueA = a.empresa.toLowerCase();
                    valueB = b.empresa.toLowerCase();
                    break;
                case 4: // Status
                    valueA = a.status.toLowerCase();
                    valueB = b.status.toLowerCase();
                    break;
            }

            if (valueA < valueB) return sortDirection[columnIndex] === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortDirection[columnIndex] === 'asc' ? 1 : -1;
            return 0;
        });

        renderizarConteudo();
    }

    // Buscar vagas
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm === '') {
            renderizarConteudo();
        } else {
            const vagasFiltradas = vagas.filter(vaga => 
                vaga.cargo.toLowerCase().includes(searchTerm) ||
                vaga.modalidade.toLowerCase().includes(searchTerm) ||
                vaga.status.toLowerCase().includes(searchTerm) ||
                (isPromptServicos && vaga.empresa.toLowerCase().includes(searchTerm))
            );
            
            if (window.innerWidth > 768) {
                // Desktop - atualizar tabela
                const tbody = document.getElementById('vagasTableBody');
                tbody.innerHTML = '';

                if (vagasFiltradas.length === 0) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td colspan="${isPromptServicos ? '5' : '4'}" style="text-align: center; padding: 40px; color: #6c757d;">
                            Nenhuma vaga encontrada para "${searchTerm}"
                        </td>
                    `;
                    tbody.appendChild(row);
                    return;
                }

                vagasFiltradas.forEach(vaga => {
                    const row = document.createElement('tr');
                    const statusClass = getStatusClass(vaga.status);
                    
                    let rowHTML = `
                        <td class="no-wrap">${formatarDataApenasData(vaga.abertura)}</td>
                        <td>${vaga.cargo}</td>
                        <td>${vaga.modalidade}</td>
                    `;
                    
                    if (isPromptServicos) {
                        rowHTML += `<td>${vaga.empresa}</td>`;
                    }
                    
                    rowHTML += `<td class="no-wrap"><span class="${statusClass}">${vaga.status}</span></td>`;
                    
                    row.innerHTML = rowHTML;
                    tbody.appendChild(row);
                });
            } else {
                // Mobile - atualizar cards
                const cardsContainer = document.getElementById('vagasCards');
                cardsContainer.innerHTML = '';

                if (vagasFiltradas.length === 0) {
                    cardsContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #6c757d;">
                            Nenhuma vaga encontrada para "${searchTerm}"
                        </div>
                    `;
                    return;
                }

                vagasFiltradas.forEach(vaga => {
                    const card = document.createElement('div');
                    card.className = 'vaga-card';
                    const statusClass = getStatusClass(vaga.status);
                    
                    let cardHTML = `
                        <div class="vaga-card-header">
                            <div>
                                <div class="vaga-cargo">${vaga.cargo}</div>
                                <div class="vaga-data">${formatarDataApenasData(vaga.abertura)}</div>
                            </div>
                        </div>
                        <div class="vaga-details">
                            <div class="vaga-detail-item">
                                <span class="vaga-detail-label">Modalidade</span>
                                <span class="vaga-detail-value">${vaga.modalidade}</span>
                            </div>
                    `;
                    
                    if (isPromptServicos) {
                        cardHTML += `
                            <div class="vaga-detail-item">
                                <span class="vaga-detail-label">Empresa</span>
                                <span class="vaga-detail-value">${vaga.empresa}</span>
                            </div>
                        `;
                    }
                    
                    cardHTML += `
                            <div class="vaga-detail-item">
                                <span class="vaga-detail-label">Status</span>
                                <span class="vaga-detail-value ${statusClass}">${vaga.status}</span>
                            </div>
                        </div>
                    `;
                    
                    card.innerHTML = cardHTML;
                    cardsContainer.appendChild(card);
                });
            }
        }
    });

    // Sair
    window.sair = function() {
        auth.signOut().then(() => {
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
});