/**
 * ==============================================================================
 * QUADRO DE CONTROLE DE VERSÃO - SISTEMAS iPeC
 * ==============================================================================
 * © Prof. Esp. Marcelo Xavier Travassos - SISTEMAS iPeC.
 * Programa Código.gs. Versão do Código: v.1.5.005
 * Data de atualização: 18/09/2026 - 01:35
 * Descrição das Alterações:
 * - Inclusão de Logger.log para auditoria em tempo real e blindagem absoluta contra duplicidade.
 * ==============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Garante concorrência multiusuário segura

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({status: "erro", message: "Payload vazio ou inválido."}))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    Logger.log("Ação recebida: " + action);

    // --- GESTÃO DE USUÁRIOS ---
    if (action === 'cadastrar' || action === 'atualizar') {
      var sheetUsr = ss.getSheetByName("Usuarios");
      var rowsUsr = sheetUsr.getDataRange().getValues();
      var nome = data.nome;
      var username = data.username ? data.username.toLowerCase() : "";
      var senha = data.senha;
      var tipo = data.tipo;
      var foto = data.foto;
      
      var rowIdxUsr = -1;
      for (var i = 1; i < rowsUsr.length; i++) {
        if (rowsUsr[i][1].toString().toLowerCase() === username) {
          rowIdxUsr = i + 1;
          break;
        }
      }
      
      if (rowIdxUsr === -1) {
        sheetUsr.appendRow([nome, username, senha, tipo, foto]);
      } else {
        sheetUsr.getRange(rowIdxUsr, 1, 1, 5).setValues([[nome, username, senha, tipo, foto]]);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "sucesso"}))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    // --- MÓDULO DE TRIAGEM E RECEPÇÃO ---
    if (action === 'salvarTriagem') {
      var sheet = ss.getSheetByName("Triagem");
      if (!sheet) {
        throw new Error("Aba 'Triagem' não encontrada na planilha.");
      }

      var nomeNovo = data.nomeCompleto ? data.nomeCompleto.trim().toLowerCase().replace(/\s+/g, ' ') : "";
      var cpfNovo = data.cpf ? data.cpf.trim().replace(/\D/g, '') : "";

      Logger.log("Nome a ser validado: [" + nomeNovo + "]");

      if (nomeNovo === "") {
        return ContentService.createTextOutput(JSON.stringify({
          status: "erro",
          message: "O Nome Completo é obrigatório para o cadastro."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var ultimaLinha = sheet.getLastRow();
      if (ultimaLinha > 1) {
        // Pega todos os nomes da Coluna C (a partir da linha 2)
        var valoresColunaC = sheet.getRange(2, 3, ultimaLinha - 1, 1).getValues();
        
        for (var j = 0; j < valoresColunaC.length; j++) {
          var nomeExistente = valoresColunaC[j][0] ? valoresColunaC[j][0].toString().trim().toLowerCase().replace(/\s+/g, ' ') : "";
          Logger.log("Comparando com existente na linha " + (j + 2) + ": [" + nomeExistente + "]");

          if (nomeExistente !== "" && nomeExistente === nomeNovo) {
            Logger.log("DUPLICIDADE DETECTADA! Nome idêntico encontrado.");
            return ContentService.createTextOutput(JSON.stringify({
              status: "duplicado",
              message: "Atenção: Já existe um cadastro ativo registrado com este Nome Completo (" + data.nomeCompleto + ") no sistema."
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }

      // 2. Geração da Matrícula Única no formato PBS-AAMM-XXXX
      var agora = new Date();
      var ano = agora.getFullYear().toString().slice(-2);
      var mes = ('0' + (agora.getMonth() + 1)).slice(-2);
      var prefixo = "PBS-" + ano + mes + "-";
      
      var sequencial = 1;
      if (ultimaLinha > 1) {
        var matriculas = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
        for (var k = 0; k < matriculas.length; k++) {
          var matCadastrada = matriculas[k][0] ? matriculas[k][0].toString() : "";
          if (matCadastrada.indexOf(prefixo) === 0) {
            var seqAtual = parseInt(matCadastrada.split("-")[2], 10);
            if (!isNaN(seqAtual) && seqAtual >= sequencial) {
              sequencial = seqAtual + 1;
            }
          }
        }
      }
      var matriculaGerada = prefixo + ('0000' + sequencial).slice(-4);
      var dataHoraFormatada = Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM/yyyy, HH:mm:ss");

      // 3. Montagem do Vetor Posicional exato (29 Colunas)
      var novaLinha = [
        matriculaGerada,                 // Col A: Nº Matrícula
        dataHoraFormatada,               // Col B: Data/Hora
        data.nomeCompleto,               // Col C: Nome Completo
        data.nomeSocial,                 // Col D: Nome Social
        data.dataNascimento,             // Col E: Data de Nascimento
        data.idade,                      // Col F: Idade
        data.sexo,                       // Col G: Sexo
        data.escolaridade,               // Col H: Escolaridade
        data.naturalidade,               // Col I: Naturalidade
        data.rg,                         // Col J: RG
        data.cpf,                        // Col K: CPF
        data.corRaca,                    // Col L: Cor / Raça
        data.filiacaoMae,                // Col M: Filiação (Mãe)
        data.filiacaoPai,                // Col N: Filiação (Pai)
        data.endereco,                   // Col O: Endereço
        data.cidade,                     // Col P: Cidade
        data.telefone,                   // Col Q: Telefone / Contato
        data.residenciaUnaí,             // Col R: Residência ou familiares em Unaí
        data.tipoUsuario,                // Col S: Tipo de usuário
        data.tempoRua,                   // Col T: Tempo de Rua
        data.tempoUnaí,                  // Col U: Tempo em Unaí
        data.motivosPermanencia,         // Col V: Motivos da permanência
        data.outrosMotivos,              // Col W: Outros motivos
        data.passouAtendimento,          // Col X: Passou por atendimento
        data.recebeAuxilio,              // Col Y: Recebe auxílio benefício
        data.qualBeneficio,              // Col Z: Qual benefício
        data.possuiDocumentos,           // Col AA: Possui documentos
        data.documentosFaltam,           // Col AB: Documentos que faltam
        data.carteiraTrabalho            // Col AC: Carteira de trabalho
      ];

      sheet.appendRow(novaLinha);

      return ContentService.createTextOutput(JSON.stringify({
        status: "sucesso",
        matricula: matriculaGerada
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({status: "erro", message: "Ação desconhecida."}))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Erro capturado: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({status: "erro", message: error.toString()}))
                         .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}