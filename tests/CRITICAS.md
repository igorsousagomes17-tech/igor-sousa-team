# Histórico das alunas críticas

## 2026-10-22 (rodada manual, 2 críticas: Júlia e Carla)
Corrigido e no ar:
- [x] Treino em andamento salvo no celular a cada toque; recarregar/fechar retoma de onde parou; "Pausar" em vez de "Sair sem salvar".
- [x] Voltar do celular navega entre telas (histórico com #hash); voltar fecha pop-up primeiro.
- [x] App real abre sem internet (biblioteca do Supabase empacotada em js/vendor e no cache); última carga guardada no celular.
- [x] "Exercício anterior" não duplica séries nem a contagem.
- [x] Bi-set conduzido na mesma tela (A1/A2, "✓ emenda", descanso só depois do A2).
- [x] Carga da última vez como sugestão (placeholder), kg digitado copia pras séries seguintes, só séries marcadas são salvas; reps da pirâmide por série; "reps/lado".
- [x] Exercício de tempo (min/s) com cronômetro próprio, sem campos de kg/reps.
- [x] Trocar exercício vale só na sessão, busca a carga da alternativa e dá pra voltar pro original.
- [x] Encerrar pede confirmação; sem exercício feito descarta e não dá ponto (gatilho do banco também exige exercicios_feitos > 0).
- [x] Feedback sem nota pré-marcada, botões maiores, "Voltar pro treino".
- [x] Cronômetro calculado pelo horário de término, +15s corrigido, "✎ anotar" minimiza pra barra no rodapé; tela fica acesa durante o treino (Wake Lock); toque numa série feita desfaz.
- [x] Sequência em semanas (não total de dias); aba Treino abre o treino do dia; card do story 9:16 e "+50" só quando conta.
- [x] Resposta do Igor aparece na Início; recado sem mídia não mostra play falso; pop-up de vídeo sem vídeo mostra "como fazer".
- [x] Datas sem voltar um dia no fuso, peso com vírgula, foto de evolução aceita galeria.
- [x] Troca de senha obrigatória no 1º acesso (coluna senha_trocada) e aluna não consegue alterar role/plano/ativa/pontos do próprio perfil.
Pendente:
- [ ] Link real da Kiwify e WhatsApp do Igor em js/config.js (Igor precisa passar).
- [ ] Fotos dos prêmios do trimestre; vídeos dos exercícios (Igor gravando).
- [x] Aviso no fim do descanso com app em segundo plano/tela apagada (service worker, Android; permissão pedida no 1º descanso). iPhone: só com Web Push do servidor (fase 2) — por ora a tela fica acesa no treino.

## 2026-10-22 (ideias do protótipo FITCONSULT do Gemini, pedidas pelo Igor)
- [x] Aba "Vídeos": biblioteca com busca de todos os exercícios (treino do mês + programas extras), marca "em gravação" quando ainda não tem vídeo.
- [x] Lista do treino mostra "Última: X kg × reps" de cada exercício (cache no celular + atualização do banco).
