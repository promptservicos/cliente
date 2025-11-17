// Firebase - Versão sem módulos ES6
document.addEventListener('DOMContentLoaded', function() {
    // Configurações do Firebase
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

    let currentUser = null;

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
                
                // Preenche automaticamente o nome do parceiro e representante
                document.getElementById('nome_parceiro').value = userData.empresa;
                document.getElementById('representante').value = userData.nome;
                
                // Se não for PROMPT SERVIÇOS, deixa os campos readonly
                const userEmpresa = userData.empresa;
                const isPromptServicos = userEmpresa.toUpperCase().includes('PROMPT SERVIÇOS');
                
                if (!isPromptServicos) {
                    document.getElementById('nome_parceiro').readOnly = true;
                    document.getElementById('representante').readOnly = true;
                }
                
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

    // URL do Google Apps Script Web App - USE A SUA URL
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0mTk4AW8Oj0pFAGAEKp-WF_LrXtxPNtokMu8eIcq1XveQEq04_LzEa4M7_IpAltZG/exec';

    // Manipular envio do formulário
    document.getElementById('vagaForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        
        // Desabilitar botão e mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        this.classList.add('loading');
        
        try {
            const formData = new FormData(this);
            const data = {
                // Mapeamento exato para as colunas da planilha
                timestamp: new Date().toISOString(), // Coluna A
                parceiro_novo_ou_ativo: formData.get('parceiro_novo_ou_ativo'), // Coluna B
                tratativa_com: formData.get('tratativa_com'), // Coluna C
                nome_parceiro: formData.get('nome_parceiro'), // Coluna D
                representante: formData.get('representante'), // Coluna E
                motivo_abertura: formData.get('motivo_abertura'), // Coluna F
                cargo: formData.get('cargo'), // Coluna G
                quantidade_vagas: formData.get('quantidade_vagas'), // Coluna H
                faixa_etaria: formData.get('faixa_etaria'), // Coluna I
                preferencia_sexo: formData.get('preferencia_sexo'), // Coluna J
                fumante: formData.get('fumante'), // Coluna K
                escolaridade: formData.get('escolaridade'), // Coluna L
                curso_superior: formData.get('curso_superior'), // Coluna M
                vaga_pcd: formData.get('vaga_pcd'), // Coluna N
                local_trabalho: formData.get('local_trabalho'), // Coluna O
                descricao_cargos: formData.get('descricao_cargos'), // Coluna P
                jornada_trabalho: formData.get('jornada_trabalho'), // Coluna Q
                tipo_contrato: formData.get('tipo_contrato'), // Coluna R
                requisitos_obrigatorios: formData.get('requisitos_obrigatorios'), // Coluna S
                salario_beneficios: formData.get('salario_beneficios'), // Coluna T
                uniforme: formData.get('uniforme'), // Coluna U
                exames_medicos: formData.get('exames_medicos'), // Coluna V
                contato: formData.get('contato'), // Coluna W
                tipo_deficiencia: formData.get('tipo_deficiencia') // Coluna X
            };
            
            console.log('📤 Enviando dados para a planilha:', data);
            
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            console.log('✅ Resposta do servidor:', result);
            
            if (result.status === 'success') {
                mostrarMensagemSucesso('Vaga cadastrada com sucesso na planilha "Abertura de Vagas"!');
                this.reset();
                
                // Restaurar campos automáticos
                const nomeParceiroField = document.getElementById('nome_parceiro');
                const representanteField = document.getElementById('representante');
                if (nomeParceiroField.readOnly) {
                    const userEmpresa = document.getElementById('headerUserCompany').textContent;
                    const userName = document.getElementById('headerUserName').textContent;
                    nomeParceiroField.value = userEmpresa;
                    representanteField.value = userName;
                }
                
            } else {
                throw new Error(result.message || 'Erro desconhecido');
            }
            
        } catch (error) {
            console.error('❌ Erro ao enviar formulário:', error);
            mostrarMensagemErro('Erro ao cadastrar vaga: ' + error.message);
        } finally {
            // Reabilitar botão
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            this.classList.remove('loading');
        }
    });

    // Função para mostrar mensagem de sucesso
    function mostrarMensagemSucesso(mensagem) {
        let successDiv = document.querySelector('.success-message');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            document.querySelector('.form-header').after(successDiv);
        }
        
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <strong>${mensagem}</strong>
        `;
        successDiv.style.display = 'block';
        
        // Esconder após 5 segundos
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }

    // Função para mostrar mensagem de erro
    function mostrarMensagemErro(mensagem) {
        alert(mensagem);
    }

    // Limpar formulário
    window.limparFormulario = function() {
        if (confirm('Tem certeza que deseja limpar todos os campos?')) {
            document.getElementById('vagaForm').reset();
            
            // Restaurar campos automáticos
            const nomeParceiroField = document.getElementById('nome_parceiro');
            const representanteField = document.getElementById('representante');
            if (nomeParceiroField.readOnly) {
                const userEmpresa = document.getElementById('headerUserCompany').textContent;
                const userName = document.getElementById('headerUserName').textContent;
                nomeParceiroField.value = userEmpresa;
                representanteField.value = userName;
            }
        }
    }

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

    // Mostrar/ocultar campo de tipo de deficiência baseado na seleção de PCD
    document.getElementById('vaga_pcd').addEventListener('change', function(e) {
        const tipoDeficienciaGroup = document.querySelector('.form-row:has(#tipo_deficiencia)');
        if (e.target.value === 'Sim') {
            tipoDeficienciaGroup.style.display = 'grid';
        } else {
            tipoDeficienciaGroup.style.display = 'none';
            document.getElementById('tipo_deficiencia').value = '';
        }
    });

    // Inicializar visibilidade do campo de tipo de deficiência
    document.getElementById('vaga_pcd').dispatchEvent(new Event('change'));

    // Mostrar/ocultar campo de curso superior baseado na escolaridade
    document.getElementById('escolaridade').addEventListener('change', function(e) {
        const cursoSuperiorGroup = document.querySelector('.form-group:has(#curso_superior)');
        if (e.target.value === 'Ensino Superior') {
            cursoSuperiorGroup.style.display = 'block';
        } else {
            cursoSuperiorGroup.style.display = 'none';
            document.getElementById('curso_superior').value = '';
        }
    });

    // Inicializar visibilidade do campo de curso superior
    document.getElementById('escolaridade').dispatchEvent(new Event('change'));
});