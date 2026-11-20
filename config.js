// ==============================================================================
// QUADRO DE CONTROLE DE VERSÃO - SISTEMAS iPeC
// ==============================================================================
// © Prof. Esp. Marcelo Xavier Travassos - SISTEMAS iPeC.
// Programa: config.js. Versão do Módulo: v.1.3.1
// Data de atualização: 20/11/2026 - 09:17
// Descrição: Configuração da API e guardião central de login e permissões.
// ==============================================================================

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbzsoG3sB74IZMl3-xB2m3Sy240ihTWi3nrERzuDBpZp_68I8SY6sf6UQD4Pw4gXEsdyyQ/exec"
};

const PBS_ACESSO = (function () {
    const MODULOS_PROTEGIDOS = {
        "perfil_voluntario.html": { cod: "1.2", nome: "1.2 - Meu Perfil de Voluntário" },
        "cadastro.html": { cod: "2.1", nome: "2.1 - Cadastro de Assistidos" },
        "consulta.html": { cod: "2.2", nome: "2.2 - Consulta de Assistidos" },
        "galeria.html": { cod: "2.3", nome: "2.3 - Galeria da Dignidade" },
        "atendimentos.html": { cod: "3.1", nome: "3.1 - Registro de Atendimentos" },
        "relatorio_atendimentos.html": { cod: "3.2", nome: "3.2 - Relatórios & Fichas" },
        "relatorios.html": { cod: "3.2", nome: "3.2 - Relatórios & Fichas" },
        "ficha_impressao.html": { cod: "3.2", nome: "3.2 - Relatórios & Fichas" },
        "admin.html": { cod: "4.1", nome: "4.1 - Painel Administrativo" }
    };

    function normalizarArquivo(href) {
        if (!href) return "";
        const limpo = String(href).split("#")[0].split("?")[0].trim();
        if (!limpo) return "";
        const partes = limpo.split("/");
        return (partes[partes.length - 1] || "").toLowerCase();
    }

    function obterSessaoUsuario() {
        let ativo = {};
        try {
            ativo = JSON.parse(localStorage.getItem("usuario_ativo") || "{}");
        } catch (e) {
            ativo = {};
        }

        const username = String(ativo.username || "").trim().toLowerCase();
        const tipo = String(ativo.tipo || "").trim().toLowerCase();
        const ehAdmin = (tipo === "admin" || tipo === "administrador");
        const permissoes = String(ativo.permissoes || "")
            .split(",")
            .map(p => p.trim())
            .filter(Boolean);

        return {
            autenticado: Boolean(username),
            username,
            tipo,
            ehAdmin,
            permissoes
        };
    }

    function podeAcessarModulo(arquivo, rotuloLink) {
        const texto = String(rotuloLink || "").toLowerCase();
        if (texto.includes("1.1- inscrição") || texto.includes("1.1 - inscrição") || arquivo.includes("inscricao")) {
            return { permitido: true, motivo: "publico", modulo: null };
        }

        const modulo = MODULOS_PROTEGIDOS[arquivo];
        if (!modulo) {
            if (!arquivo || arquivo === "#") {
                return {
                    permitido: false,
                    motivo: "sem_permissao",
                    modulo: { cod: "", nome: (rotuloLink || "Módulo Restrito").trim() }
                };
            }
            return { permitido: true, motivo: "publico", modulo: null };
        }

        const sessao = obterSessaoUsuario();
        if (!sessao.autenticado) {
            return { permitido: false, motivo: "sem_login", modulo };
        }

        if (sessao.ehAdmin || sessao.permissoes.includes(modulo.cod)) {
            return { permitido: true, motivo: "autorizado", modulo };
        }

        return { permitido: false, motivo: "sem_permissao", modulo };
    }

    function exigirAcessoNaPagina(arquivoAtual) {
        const arquivo = normalizarArquivo(arquivoAtual || window.location.pathname);
        const resultado = podeAcessarModulo(arquivo, "");

        if (resultado.permitido) {
            return true;
        }

        if (resultado.motivo === "sem_login") {
            sessionStorage.setItem("pbs_destino", arquivo);
            window.location.replace("login.html");
            return false;
        }

        alert(`Acesso Negado: Você não possui autorização para utilizar o módulo [${resultado.modulo.nome}].`);
        window.location.replace("index.html");
        return false;
    }

    function interceptarCliqueLink(event, elementoLink) {
        const href = elementoLink ? elementoLink.getAttribute("href") : "";
        const arquivo = normalizarArquivo(href);
        const rotulo = elementoLink ? elementoLink.textContent : "";

        const resultado = podeAcessarModulo(arquivo, rotulo);
        if (resultado.permitido) {
            return true;
        }

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (resultado.motivo === "sem_login") {
            if (arquivo) {
                sessionStorage.setItem("pbs_destino", arquivo);
            }
            window.location.href = "login.html";
            return false;
        }

        alert(`Acesso Negado: Você não possui autorização para utilizar o módulo [${resultado.modulo.nome}].`);
        return false;
    }

    function vincularMenu() {
        const linksMenu = document.querySelectorAll(".side-menu a, .menu-link-item, .menu-sublink-item");
        linksMenu.forEach(link => {
            if (link.dataset.pbsGuardiaoVinculado === "1") return;
            link.dataset.pbsGuardiaoVinculado = "1";
            link.addEventListener("click", function (ev) {
                interceptarCliqueLink(ev, this);
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", vincularMenu);
    } else {
        vincularMenu();
    }

    return {
        MODULOS_PROTEGIDOS,
        normalizarArquivo,
        obterSessaoUsuario,
        podeAcessarModulo,
        exigirAcessoNaPagina,
        interceptarCliqueLink,
        vincularMenu
    };
})();
// © Prof. Esp. Marcelo Xavier Travassos - SISTEMAS iPeC.
