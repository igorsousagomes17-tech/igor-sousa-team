// Tradução do que o Igor digita (nome do treino, nome do exercício, repetições, dicas) pra quem usa o app em outra língua.
// 1º procura a frase inteira (EXATO, preenchido com os treinos reais); senão troca termo a termo pelo glossário de academia.
// A chave continua sendo o português: histórico de carga, vídeo e bi-set seguem ligados pelo nome original.
// Colunas: [en, es, zh, hi, fr]
const COL = { en: 0, es: 1, zh: 2, hi: 3, fr: 4 };

// Série de reconhecimento (aquecimento no próprio exercício): o Igor marca no exercício e o app cria uma série leve antes das válidas.
// Fica guardada na dica como [aq:15] (sem mexer no banco); o app tira da dica na hora de mostrar.
const AQ = /\s*\[aq:([^\]]*)\]\s*/i;
export const aqDe = d => { const m = String(d || '').match(AQ); return m ? (m[1].trim() || '15') : null; };
export const semAq = d => { const r = String(d || '').replace(AQ, ' ').trim(); return r || null; };
export const comAq = (d, reps) => { const base = semAq(d); const r = String(reps || '').trim(); return r ? ((base ? base + ' ' : '') + `[aq:${r}]`) : base; };

// Frases inteiras (nomes de treino e exercícios que já existem nos planos)
export const EXATO = {
  'Quadríceps': ['Quads', 'Cuádriceps', '股四头肌', 'क्वाड्स', 'Quadriceps'],
  'Peito, Ombro e Tríceps': ['Chest, Shoulders & Triceps', 'Pecho, Hombro y Tríceps', '胸、肩和三头肌', 'छाती, कंधे और ट्राइसेप्स', 'Pectoraux, Épaules et Triceps'],
  'Peito, ombro e tríceps': ['Chest, Shoulders & Triceps', 'Pecho, Hombro y Tríceps', '胸、肩和三头肌', 'छाती, कंधे और ट्राइसेप्स', 'Pectoraux, Épaules et Triceps'],
  'Glúteos/posterior': ['Glutes / Hamstrings', 'Glúteos / Femorales', '臀部/腘绳肌', 'ग्लूट्स / हैमस्ट्रिंग', 'Fessiers / Ischios'],
  'Posterior e Glúteo': ['Hamstrings & Glutes', 'Femorales y Glúteo', '腘绳肌和臀部', 'हैमस्ट्रिंग और ग्लूट्स', 'Ischios et Fessiers'],
  'Costas e Bíceps': ['Back & Biceps', 'Espalda y Bíceps', '背和二头肌', 'पीठ और बाइसेप्स', 'Dos et Biceps'],
  'Costas e bíceps': ['Back & Biceps', 'Espalda y Bíceps', '背和二头肌', 'पीठ और बाइसेप्स', 'Dos et Biceps'],
  'Full Body': ['Full Body', 'Cuerpo completo', '全身', 'फुल बॉडी', 'Full Body'],
  'Inferior': ['Lower body', 'Tren inferior', '下肢', 'लोअर बॉडी', 'Bas du corps'],
  'Superior': ['Upper body', 'Tren superior', '上肢', 'अपर बॉडी', 'Haut du corps'],
  'HIIT (opcional)': ['HIIT (optional)', 'HIIT (opcional)', 'HIIT（可选）', 'HIIT (वैकल्पिक)', 'HIIT (facultatif)'],
  'Dead Bug': ['Dead Bug', 'Dead Bug', '死虫式', 'डेड बग', 'Dead Bug'],
  'Face Pull': ['Face Pull', 'Face Pull', '面拉', 'फेस पुल', 'Face Pull'],
  'Pallof Press': ['Pallof Press', 'Press Pallof', '帕洛夫推', 'पैलॉफ़ प्रेस', 'Pallof Press'],
  'Gato-camelo': ['Cat-cow', 'Gato-camello', '猫牛式', 'कैट-काउ', 'Chat-vache'],
  '90/90': ['90/90', '90/90', '90/90', '90/90', '90/90'],
  'Goblet com anilha no calcanhar': ['Goblet squat with plate under heels', 'Goblet con disco bajo los talones', '脚跟垫片高脚杯深蹲', 'एड़ी के नीचे प्लेट रखकर गॉबलेट स्क्वाट', 'Goblet avec disque sous les talons'],
  'Leg Press 45 pés mais fechados': ['45° leg press, feet closer together', 'Prensa 45° con pies más juntos', '45°腿举（双脚并拢些）', '45° लेग प्रेस, पैर पास-पास', 'Presse à 45°, pieds plus serrés'],
  'Abdução de Quadril Máquina com Tronco à Frente': ['Hip abduction machine, torso leaning forward', 'Abducción de cadera en máquina con tronco inclinado', '髋外展机（身体前倾）', 'हिप एब्डक्शन मशीन, धड़ आगे झुका', 'Abduction de hanche machine, buste penché'],
  'Cadeira Extensora Unilateral + Parciais Alongadas': ['Single-leg extension + lengthened partials', 'Extensión de piernas unilateral + parciales en estiramiento', '单腿腿屈伸 + 拉伸位半程', 'सिंगल-लेग एक्सटेंशन + स्ट्रेच पार्शियल', 'Leg extension unilatéral + partielles en étirement'],
  'Panturrilha em Pé + Parciais Alongadas': ['Standing calf raise + lengthened partials', 'Gemelos de pie + parciales en estiramiento', '站姿提踵 + 拉伸位半程', 'खड़े होकर काफ़ रेज़ + स्ट्रेच पार्शियल', 'Mollets debout + partielles en étirement'],
  'Cadeira Flexora com Tronco Inclinado': ['Seated leg curl, torso leaning forward', 'Curl femoral sentado con tronco inclinado', '坐姿腿弯举（身体前倾）', 'सीटेड लेग कर्ल, धड़ आगे झुका', 'Leg curl assis, buste penché'],
  'Caminhada Lateral com Mini Band': ['Mini band lateral walk', 'Caminata lateral con mini banda', '迷你弹力带侧向行走', 'मिनी बैंड लेटरल वॉक', 'Marche latérale avec mini band'],
  'Elevação Lateral em Y': ['Y lateral raise', 'Elevación lateral en Y', 'Y字侧平举', 'Y लेटरल रेज़', 'Élévation latérale en Y'],
  'Tríceps Acima da Cabeça na Polia': ['Overhead cable triceps extension', 'Tríceps sobre la cabeza en polea', '绳索过头臂屈伸', 'ओवरहेड केबल ट्राइसेप्स एक्सटेंशन', 'Extension triceps au-dessus de la tête à la poulie'],
  'Tríceps polia barra reta': ['Cable triceps pushdown, straight bar', 'Tríceps en polea con barra recta', '直杆绳索下压', 'स्ट्रेट बार केबल पुशडाउन', 'Triceps poulie barre droite'],
  'Abdominal Infra Solo': ['Floor reverse crunch', 'Abdominal inferior en el suelo', '地面反向卷腹', 'फ़र्श पर रिवर्स क्रंच', 'Relevé de jambes au sol'],
  'Abs infra no banco declinado': ['Reverse crunch on decline bench', 'Abdominal inferior en banco declinado', '下斜凳反向卷腹', 'डिक्लाइन बेंच पर रिवर्स क्रंच', 'Relevé de jambes sur banc décliné']
};

// Termos de academia, do mais longo pro mais curto (o primeiro que casa vence)
const TERMOS = [
  ['agachamento búlgaro', ['Bulgarian split squat', 'Sentadilla búlgara', '保加利亚分腿蹲', 'बल्गेरियन स्प्लिट स्क्वाट', 'Squat bulgare']],
  ['agachamento sumô', ['Sumo squat', 'Sentadilla sumo', '相扑深蹲', 'सूमो स्क्वाट', 'Squat sumo']],
  ['agachamento livre', ['Barbell back squat', 'Sentadilla libre', '杠铃深蹲', 'बारबेल स्क्वाट', 'Squat libre']],
  ['agachamento', ['Squat', 'Sentadilla', '深蹲', 'स्क्वाट', 'Squat']],
  ['levantamento terra', ['Deadlift', 'Peso muerto', '硬拉', 'डेडलिफ़्ट', 'Soulevé de terre']],
  ['stiff', ['Stiff-leg deadlift', 'Peso muerto rumano', '直腿硬拉', 'स्टिफ़-लेग डेडलिफ़्ट', 'Soulevé de terre jambes tendues']],
  ['elevação de quadril', ['Hip thrust', 'Hip thrust', '臀推', 'हिप थ्रस्ट', 'Hip thrust']],
  ['elevação pélvica', ['Hip thrust', 'Hip thrust', '臀推', 'हिप थ्रस्ट', 'Hip thrust']],
  ['elevação lateral', ['Lateral raise', 'Elevación lateral', '侧平举', 'लेटरल रेज़', 'Élévation latérale']],
  ['elevação frontal', ['Front raise', 'Elevación frontal', '前平举', 'फ़्रंट रेज़', 'Élévation frontale']],
  ['elevação de panturrilha', ['Calf raise', 'Elevación de talones', '提踵', 'काफ़ रेज़', 'Extension des mollets']],
  ['ponte de glúteo', ['Glute bridge', 'Puente de glúteo', '臀桥', 'ग्लूट ब्रिज', 'Pont fessier']],
  ['ponte', ['Glute bridge', 'Puente', '臀桥', 'ब्रिज', 'Pont']],
  ['cadeira extensora', ['Leg extension', 'Extensión de piernas', '腿屈伸', 'लेग एक्सटेंशन', 'Leg extension']],
  ['cadeira flexora', ['Seated leg curl', 'Curl femoral sentado', '坐姿腿弯举', 'सीटेड लेग कर्ल', 'Leg curl assis']],
  ['mesa flexora', ['Lying leg curl', 'Curl femoral tumbado', '俯卧腿弯举', 'लाइंग लेग कर्ल', 'Leg curl allongé']],
  ['cadeira abdutora', ['Hip abduction machine', 'Abductora', '髋外展机', 'हिप एब्डक्शन मशीन', 'Abducteurs machine']],
  ['cadeira adutora', ['Hip adduction machine', 'Aductora', '髋内收机', 'हिप एडक्शन मशीन', 'Adducteurs machine']],
  ['abdução de quadril', ['Hip abduction', 'Abducción de cadera', '髋外展', 'हिप एब्डक्शन', 'Abduction de hanche']],
  ['adução de quadril', ['Hip adduction', 'Aducción de cadera', '髋内收', 'हिप एडक्शन', 'Adduction de hanche']],
  ['leg press', ['Leg press', 'Prensa de piernas', '腿举', 'लेग प्रेस', 'Presse à cuisses']],
  ['afundo', ['Lunge', 'Zancada', '弓步', 'लंज', 'Fente']],
  ['passada', ['Walking lunge', 'Zancada caminando', '行进弓步', 'वॉकिंग लंज', 'Fentes marchées']],
  ['avanço', ['Lunge', 'Zancada', '弓步', 'लंज', 'Fente']],
  ['coice', ['Glute kickback', 'Patada de glúteo', '臀部后踢', 'ग्लूट किकबैक', 'Kickback fessier']],
  ['panturrilha', ['Calf raise', 'Gemelos', '提踵', 'काफ़ रेज़', 'Mollets']],
  ['supino inclinado', ['Incline press', 'Press inclinado', '上斜推举', 'इनक्लाइन प्रेस', 'Développé incliné']],
  ['supino reto', ['Bench press', 'Press de banca', '平板卧推', 'बेंच प्रेस', 'Développé couché']],
  ['supino', ['Chest press', 'Press de pecho', '卧推', 'चेस्ट प्रेस', 'Développé']],
  ['crucifixo inverso', ['Reverse fly', 'Aperturas invertidas', '反向飞鸟', 'रिवर्स फ़्लाई', 'Oiseau']],
  ['crucifixo', ['Chest fly', 'Aperturas', '飞鸟', 'चेस्ट फ़्लाई', 'Écarté']],
  ['flexão de braço', ['Push-up', 'Flexión de brazos', '俯卧撑', 'पुश-अप', 'Pompe']],
  ['voador', ['Pec deck', 'Contractora de pecho', '蝴蝶机夹胸', 'पेक डेक', 'Pec deck']],
  ['desenvolvimento', ['Shoulder press', 'Press de hombro', '肩推', 'शोल्डर प्रेस', 'Développé épaules']],
  ['remada curvada', ['Bent-over row', 'Remo inclinado', '俯身划船', 'बेंट-ओवर रो', 'Rowing buste penché']],
  ['remada baixa', ['Seated cable row', 'Remo bajo', '坐姿划船', 'सीटेड केबल रो', 'Rowing assis']],
  ['remada alta', ['Upright row', 'Remo al mentón', '直立划船', 'अपराइट रो', 'Rowing menton']],
  ['remada unilateral', ['Single-arm row', 'Remo a una mano', '单臂划船', 'सिंगल-आर्म रो', 'Rowing unilatéral']],
  ['remada', ['Row', 'Remo', '划船', 'रो', 'Rowing']],
  ['serrote', ['Single-arm dumbbell row', 'Remo con mancuerna', '单臂哑铃划船', 'सिंगल-आर्म डम्बल रो', 'Rowing haltère']],
  ['puxada', ['Lat pulldown', 'Jalón', '高位下拉', 'लैट पुलडाउन', 'Tirage vertical']],
  ['pulldown', ['Pulldown', 'Pulldown', '下拉', 'पुलडाउन', 'Pulldown']],
  ['pullover', ['Pullover', 'Pullover', '仰卧上拉', 'पुलओवर', 'Pull-over']],
  ['barra fixa', ['Pull-up', 'Dominada', '引体向上', 'पुल-अप', 'Traction']],
  ['rosca direta', ['Biceps curl', 'Curl de bíceps', '二头弯举', 'बाइसेप्स कर्ल', 'Curl biceps']],
  ['rosca martelo', ['Hammer curl', 'Curl martillo', '锤式弯举', 'हैमर कर्ल', 'Curl marteau']],
  ['rosca scott', ['Preacher curl', 'Curl predicador', '牧师椅弯举', 'प्रीचर कर्ल', 'Curl pupitre']],
  ['rosca', ['Curl', 'Curl', '弯举', 'कर्ल', 'Curl']],
  ['tríceps testa', ['Skull crusher', 'Press francés', '仰卧臂屈伸', 'स्कल क्रशर', 'Barre au front']],
  ['tríceps francês', ['Overhead triceps extension', 'Tríceps francés', '过头臂屈伸', 'ओवरहेड ट्राइसेप्स एक्सटेंशन', 'Extension triceps nuque']],
  ['tríceps corda', ['Rope pushdown', 'Tríceps con cuerda', '绳索下压', 'रोप पुशडाउन', 'Triceps à la corde']],
  ['mergulho', ['Dips', 'Fondos', '臂屈伸', 'डिप्स', 'Dips']],
  ['prancha lateral', ['Side plank', 'Plancha lateral', '侧平板支撑', 'साइड प्लैंक', 'Gainage latéral']],
  ['prancha', ['Plank', 'Plancha', '平板支撑', 'प्लैंक', 'Gainage']],
  ['abdominal infra', ['Reverse crunch', 'Abdominal inferior', '反向卷腹', 'रिवर्स क्रंच', 'Relevé de jambes']],
  ['abdominal', ['Crunch', 'Abdominal', '卷腹', 'क्रंच', 'Crunch']],
  ['mobilidade', ['Mobility', 'Movilidad', '灵活性', 'मोबिलिटी', 'Mobilité']],
  ['alongamento', ['Stretch', 'Estiramiento', '拉伸', 'स्ट्रेच', 'Étirement']],
  ['reconhecimento', ['Warm-up set', 'Serie de reconocimiento', '热身组', 'वार्म-अप सेट', 'Série de reconnaissance']],
  ['aquecimento', ['Warm-up', 'Calentamiento', '热身', 'वार्म-अप', 'Échauffement']],
  ['ativação', ['Activation', 'Activación', '激活', 'एक्टिवेशन', 'Activation']],
  ['caminhada lateral', ['Lateral walk', 'Caminata lateral', '侧向行走', 'लेटरल वॉक', 'Marche latérale']],
  ['caminhada', ['Walk', 'Caminata', '步行', 'वॉक', 'Marche']],
  ['esteira', ['Treadmill', 'Cinta', '跑步机', 'ट्रेडमिल', 'Tapis']],
  ['bicicleta', ['Bike', 'Bicicleta', '单车', 'बाइक', 'Vélo']],
  ['escada', ['Stair climber', 'Escaladora', '爬楼机', 'स्टेयर क्लाइंबर', 'Stepper']],
  ['polichinelo', ['Jumping jacks', 'Jumping jacks', '开合跳', 'जंपिंग जैक', 'Jumping jacks']],
  ['corrida', ['Run', 'Carrera', '跑步', 'दौड़', 'Course']],
  ['pegada supinada', ['underhand grip', 'agarre supino', '反握', 'अंडरहैंड ग्रिप', 'prise supination']],
  ['pegada pronada', ['overhand grip', 'agarre prono', '正握', 'ओवरहैंड ग्रिप', 'prise pronation']],
  ['pegada neutra', ['neutral grip', 'agarre neutro', '对握', 'न्यूट्रल ग्रिप', 'prise neutre']],
  ['pegada aberta', ['wide grip', 'agarre abierto', '宽握', 'वाइड ग्रिप', 'prise large']],
  ['pegada fechada', ['close grip', 'agarre cerrado', '窄握', 'क्लोज़ ग्रिप', 'prise serrée']],
  ['parciais alongadas', ['lengthened partials', 'parciales en estiramiento', '拉伸位半程', 'स्ट्रेच पार्शियल', 'partielles en étirement']],
  ['unilateral', ['single-leg', 'unilateral', '单侧', 'सिंगल', 'unilatéral']],
  ['inclinado', ['incline', 'inclinado', '上斜', 'इनक्लाइन', 'incliné']],
  ['inclinada', ['incline', 'inclinado', '上斜', 'इनक्लाइन', 'incliné']],
  ['declinado', ['decline', 'declinado', '下斜', 'डिक्लाइन', 'décliné']],
  ['sentado', ['seated', 'sentado', '坐姿', 'बैठकर', 'assis']],
  ['em pé', ['standing', 'de pie', '站姿', 'खड़े होकर', 'debout']],
  ['deitado', ['lying', 'tumbado', '卧姿', 'लेटकर', 'allongé']],
  ['com halteres', ['with dumbbells', 'con mancuernas', '哑铃', 'डम्बल से', 'aux haltères']],
  ['com halter', ['with dumbbell', 'con mancuerna', '哑铃', 'डम्बल से', 'à l’haltère']],
  ['halteres', ['dumbbells', 'mancuernas', '哑铃', 'डम्बल', 'haltères']],
  ['halter', ['dumbbell', 'mancuerna', '哑铃', 'डम्बल', 'haltère']],
  ['com barra', ['with barbell', 'con barra', '杠铃', 'बारबेल से', 'à la barre']],
  ['barra reta', ['straight bar', 'barra recta', '直杆', 'स्ट्रेट बार', 'barre droite']],
  ['barra', ['barbell', 'barra', '杠铃', 'बारबेल', 'barre']],
  ['anilha', ['plate', 'disco', '杠铃片', 'प्लेट', 'disque']],
  ['kettlebell', ['kettlebell', 'kettlebell', '壶铃', 'केटलबेल', 'kettlebell']],
  ['mini band', ['mini band', 'mini banda', '迷你弹力带', 'मिनी बैंड', 'mini band']],
  ['elástico', ['resistance band', 'banda elástica', '弹力带', 'रेज़िस्टेंस बैंड', 'élastique']],
  ['na polia', ['on cable', 'en polea', '绳索', 'केबल पर', 'à la poulie']],
  ['polia', ['cable', 'polea', '绳索', 'केबल', 'poulie']],
  ['no cabo', ['on cable', 'en polea', '绳索', 'केबल पर', 'à la poulie']],
  ['na máquina', ['on machine', 'en máquina', '器械', 'मशीन पर', 'à la machine']],
  ['na maquina', ['on machine', 'en máquina', '器械', 'मशीन पर', 'à la machine']],
  ['máquina', ['machine', 'máquina', '器械', 'मशीन', 'machine']],
  ['maquina', ['machine', 'máquina', '器械', 'मशीन', 'machine']],
  ['smith', ['Smith machine', 'Smith', '史密斯机', 'स्मिथ मशीन', 'Smith']],
  ['no banco', ['on bench', 'en banco', '凳上', 'बेंच पर', 'sur banc']],
  ['banco', ['bench', 'banco', '凳', 'बेंच', 'banc']],
  ['no solo', ['on the floor', 'en el suelo', '地面', 'फ़र्श पर', 'au sol']],
  ['solo', ['floor', 'suelo', '地面', 'फ़र्श', 'sol']],
  ['step', ['step', 'step', '踏板', 'स्टेप', 'step']],
  ['acima da cabeça', ['overhead', 'sobre la cabeza', '过头', 'सिर के ऊपर', 'au-dessus de la tête']],
  ['tronco à frente', ['torso forward', 'tronco adelante', '身体前倾', 'धड़ आगे', 'buste en avant']],
  ['quadril', ['hip', 'cadera', '髋', 'हिप', 'hanche']],
  ['glúteos', ['glutes', 'glúteos', '臀部', 'ग्लूट्स', 'fessiers']],
  ['glúteo', ['glutes', 'glúteo', '臀部', 'ग्लूट्स', 'fessiers']],
  ['posterior de coxa', ['hamstrings', 'femorales', '腘绳肌', 'हैमस्ट्रिंग', 'ischios']],
  ['posterior', ['hamstrings', 'femorales', '腘绳肌', 'हैमस्ट्रिंग', 'ischios']],
  ['quadríceps', ['quads', 'cuádriceps', '股四头肌', 'क्वाड्स', 'quadriceps']],
  ['pernas', ['legs', 'piernas', '腿', 'पैर', 'jambes']],
  ['perna', ['leg', 'pierna', '腿', 'पैर', 'jambe']],
  ['costas', ['back', 'espalda', '背', 'पीठ', 'dos']],
  ['peito', ['chest', 'pecho', '胸', 'छाती', 'pectoraux']],
  ['ombros', ['shoulders', 'hombros', '肩', 'कंधे', 'épaules']],
  ['ombro', ['shoulders', 'hombro', '肩', 'कंधे', 'épaules']],
  ['bíceps', ['biceps', 'bíceps', '二头肌', 'बाइसेप्स', 'biceps']],
  ['tríceps', ['triceps', 'tríceps', '三头肌', 'ट्राइसेप्स', 'triceps']],
  ['braços', ['arms', 'brazos', '手臂', 'बाहें', 'bras']],
  ['abdômen', ['abs', 'abdomen', '腹部', 'एब्स', 'abdos']],
  ['abdomen', ['abs', 'abdomen', '腹部', 'एब्स', 'abdos']],
  ['core', ['core', 'core', '核心', 'कोर', 'gainage']],
  ['lombar', ['lower back', 'lumbar', '下背', 'लोअर बैक', 'lombaires']],
  ['panturrilhas', ['calves', 'gemelos', '小腿', 'पिंडलियाँ', 'mollets']],
  ['cardio', ['cardio', 'cardio', '有氧', 'कार्डियो', 'cardio']],
  ['inferior', ['lower body', 'tren inferior', '下肢', 'लोअर बॉडी', 'bas du corps']],
  ['superior', ['upper body', 'tren superior', '上肢', 'अपर बॉडी', 'haut du corps']],
  ['iniciante', ['beginner', 'principiante', '初学者', 'शुरुआती', 'débutant']],
  ['opcional', ['optional', 'opcional', '可选', 'वैकल्पिक', 'facultatif']],
  // pedaços de repetição e dica
  ['cada lado', ['each side', 'cada lado', '每侧', 'हर तरफ़', 'de chaque côté']],
  ['cada perna', ['each leg', 'cada pierna', '每条腿', 'हर पैर', 'chaque jambe']],
  ['cada braço', ['each arm', 'cada brazo', '每只手臂', 'हर हाथ', 'chaque bras']],
  ['até a falha', ['to failure', 'hasta el fallo', '力竭', 'फ़ेल्योर तक', 'jusqu’à l’échec']],
  ['falha', ['failure', 'fallo', '力竭', 'फ़ेल्योर', 'échec']],
  ['segura', ['hold', 'mantén', '保持', 'रोकें', 'tiens']],
  ['segundos', ['seconds', 'segundos', '秒', 'सेकंड', 'secondes']],
  ['embaixo', ['at the bottom', 'abajo', '在底部', 'नीचे', 'en bas']],
  ['em cima', ['at the top', 'arriba', '在顶部', 'ऊपर', 'en haut']],
  ['a cada', ['every', 'cada', '每', 'हर', 'toutes les']],
  ['pico de contração', ['peak contraction', 'pico de contracción', '顶峰收缩', 'पीक कॉन्ट्रैक्शन', 'contraction maximale']],
  ['descida lenta', ['slow lowering', 'bajada lenta', '慢速下放', 'धीरे नीचे', 'descente lente']],
  ['devagar', ['slowly', 'despacio', '慢慢', 'धीरे', 'lentement']],
  ['pausa', ['pause', 'pausa', '停顿', 'रुकें', 'pause']],
  ['forte', ['hard', 'fuerte', '快', 'तेज़', 'fort']],
  ['leve', ['easy', 'suave', '慢', 'हल्का', 'léger']],
  ['joelho', ['knee', 'rodilla', '膝盖', 'घुटना', 'genou']],
  ['pés', ['feet', 'pies', '脚', 'पैर', 'pieds']],
  ['mais fechados', ['closer together', 'más juntos', '并拢些', 'पास-पास', 'plus serrés']],
  ['mais abertos', ['wider', 'más abiertos', '分开些', 'चौड़े', 'plus écartés']],
  ['ou', ['or', 'o', '或', 'या', 'ou']],
  ['com', ['with', 'con', '', 'के साथ', 'avec']],
  ['sem', ['without', 'sin', '不用', 'बिना', 'sans']],
  ['de', ['', 'de', '', '', 'de']],
  ['da', ['', 'de la', '', '', 'de']],
  ['do', ['', 'del', '', '', 'du']],
  ['na', ['on', 'en', '', '', 'sur']],
  ['no', ['on', 'en', '', '', 'sur']],
  ['em', ['on', 'en', '', '', 'en']],
  ['e', ['&', 'y', '和', 'और', 'et']]
];
const sem = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Regex única: termos sem acento, casando palavra inteira (\b não serve com acento, então usa limites próprios)
const ORD = TERMOS.map(([pt, tr]) => [sem(pt), tr]).sort((a, b) => b[0].length - a[0].length);
const RE = new RegExp(`(^|[^a-z0-9])(${ORD.map(([p]) => esc(p)).join('|')})(?=$|[^a-z0-9])`, 'g');
const MAPA = new Map(ORD);
const EXATO_N = new Map(Object.entries(EXATO).map(([k, v]) => [sem(k.trim()), v]));
const cache = new Map();
// Traduções feitas pela IA no servidor (frases livres: dicas, recados, respostas do Igor). Ficam guardadas no celular.
const CH = 'trad-v1'; let REM = {}; try { REM = JSON.parse(localStorage.getItem(CH) || '{}') || {}; } catch {}
let remotoFn = null; export const ligarTradutor = fn => { remotoFn = fn; };
const fila = new Map(), tentados = new Set(); let timer = null;
const PT_SOBRA = /[ãõçâêôáéíóú]|\b(de|do|da|com|que|não|nao|pra|mais|tudo|você|voce|seu|sua|bem|até|ate|faz|fica|sempre|anota|carga|mês|mes|treino|sem|mantém|mantem|tensão|tempo|todo)\b/i;
function pedir(id, s) {
  if (!remotoFn || tentados.has(id + '|' + s) || s.length < 3 || s.length > 600 || !/\p{L}{3}/u.test(s)) return;
  tentados.add(id + '|' + s); if (!fila.has(id)) fila.set(id, new Set()); fila.get(id).add(s);
  clearTimeout(timer); timer = setTimeout(enviar, 500);
}
async function enviar() {
  for (const [id, set] of fila) {
    const lista = [...set]; fila.delete(id);
    for (let i = 0; i < lista.length; i += 40) {
      try {
        const r = await remotoFn(id, lista.slice(i, i + 40)); if (!r || typeof r !== 'object') continue;
        REM[id] = { ...(REM[id] || {}), ...r };
        const ks = Object.keys(REM[id]); if (ks.length > 1500) ks.slice(0, ks.length - 1500).forEach(k => delete REM[id][k]);
        try { localStorage.setItem(CH, JSON.stringify(REM)); } catch {}
        Object.keys(r).forEach(k => cache.delete(id + '|' + k));
        window.dispatchEvent(new CustomEvent('traducoes'));
      } catch { /* sem sinal: fica a tradução por glossário */ }
    }
  }
}

export function traduzConteudo(txt, id) {
  const s = String(txt ?? '').normalize('NFC'); if (!s.trim() || id === 'pt' || !(id in COL)) return s;
  const k = id + '|' + s; if (cache.has(k)) return cache.get(k);
  const rem = REM[id]?.[s]; if (rem) { cache.set(k, rem); return rem; }
  const c = COL[id], ex = EXATO_N.get(sem(s.trim()));
  let out;
  if (ex) out = ex[c];
  else {
    // troca termo a termo mantendo números, sinais e o que não se conhece (nomes próprios: Smith, Scott, Pallof...)
    const base = sem(s); let res = '', i = 0;
    base.replace(RE, (m, pre, termo, pos) => { const ini = pos + pre.length; res += s.slice(i, ini); const tr = MAPA.get(termo)[c]; res += tr; i = ini + termo.length; return m; });
    res += s.slice(i);
    out = res.replace(/\s+/g, ' ').replace(/\s+([,.)·])/g, '$1').replace(/\(\s+/g, '(').trim();
    if (id === 'zh') out = out.replace(/([一-鿿])\s+(?=[一-鿿])/g, '$1');
    if (out && /[a-zà-ú]/.test(out[0]) && /[A-ZÀ-Ú]/.test(s.trim()[0])) out = out[0].toUpperCase() + out.slice(1);
  }
  if (!ex && (out === s || PT_SOBRA.test(out) || ((id === 'zh' || id === 'hi') && /[a-z]{4,}/i.test(out)))) pedir(id, s); // sobrou português: pede a tradução de verdade
  cache.set(k, out || s); return out || s;
}

// Aparelho ocupado: exercícios equivalentes (mesmo movimento, outro equipamento). A alternativa que o Igor cadastrou vem sempre primeiro.
const EQUIV = [
  // Mesmo movimento em outro aparelho da academia (elástico/peso livre só quando não tem outro jeito)
  [/puxada|pulldown|pull ?down|barra fixa/i, ['Puxada articulada', 'Pulldown na polia com pegada neutra', 'Puxada com elástico']],
  [/remada (baixa|sentada|cavalinho)|remada na polia/i, ['Remada articulada (máquina)', 'Remada cavalinho', 'Remada unilateral com halter']],
  [/remada (m[aá]quina|articulada)/i, ['Remada baixa na polia', 'Remada cavalinho', 'Remada unilateral com halter']],
  [/remada/i, ['Remada baixa na polia', 'Remada articulada (máquina)', 'Remada unilateral com halter']],
  [/supino inclinado/i, ['Supino inclinado articulado', 'Supino inclinado com halteres', 'Flexão de braço com pés elevados']],
  [/supino|peitoral|chest press/i, ['Supino articulado (máquina)', 'Supino com halteres', 'Flexão de braço']],
  [/crucifixo|voador|peck|crossover/i, ['Voador (peck deck)', 'Crossover na polia', 'Crucifixo com halteres']],
  [/leg press|leg 45/i, ['Hack machine', 'Agachamento no Smith', 'Agachamento goblet', 'Agachamento livre']],
  [/extensora/i, ['Leg press', 'Agachamento no Smith', 'Afundo', 'Agachamento livre', 'Extensão de joelho com caneleira']],
  [/flexora/i, ['Flexora em pé', 'Flexora sentada', 'Stiff com halteres']],
  [/hack/i, ['Leg press 45', 'Agachamento no Smith', 'Agachamento goblet']],
  [/smith|agachamento/i, ['Hack machine', 'Leg press 45', 'Agachamento goblet']],
  [/abdutora|abdu[cç][aã]o/i, ['Abdução na polia', 'Abdução com mini band', 'Caminhada lateral com mini band']],
  [/adutora|adu[cç][aã]o/i, ['Adução na polia', 'Agachamento sumô com halter']],
  [/eleva[cç][aã]o p[eé]lvica|hip ?thrust|ponte/i, ['Elevação pélvica na máquina', 'Elevação pélvica na barra', 'Ponte de glúteo com halter']],
  [/coice|glute kick|kickback/i, ['Coice na polia', 'Coice na máquina', 'Coice com caneleira']],
  [/panturrilha|g[eê]meos/i, ['Panturrilha no leg press', 'Panturrilha em pé na máquina', 'Panturrilha no degrau']],
  [/desenvolvimento/i, ['Desenvolvimento articulado (máquina)', 'Desenvolvimento com halteres', 'Elevação lateral com halteres']],
  [/eleva[cç][aã]o lateral/i, ['Elevação lateral na máquina', 'Elevação lateral na polia', 'Elevação lateral com halteres']],
  [/tr[ií]ceps/i, ['Tríceps na polia com corda', 'Tríceps na máquina', 'Tríceps testa com halteres']],
  [/rosca/i, ['Rosca na polia', 'Rosca Scott na máquina', 'Rosca direta com halteres']],
  [/afundo|passada|b[uú]lgaro/i, ['Passada com halteres', 'Agachamento no Smith', 'Agachamento sumô com halter']],
  [/stiff|terra|romeno/i, ['Stiff no Smith', 'Stiff com halteres', 'Bom dia com halter']],
];
// Família do exercício: sinônimos viram a mesma chave (Agachamento hack = Hack machine; búlgaro = afundo = passada)
export function familia(n) {
  const s = String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, ' ');
  if (/panturrilha|gemeos/.test(s)) return 'panturrilha';
  if (/hack/.test(s)) return 'hack';
  if (/leg ?press|leg 45|prensa/.test(s)) return 'legpress';
  if (/bulgaro|afundo|passada|lunge/.test(s)) return 'afundo';
  if (/goblet/.test(s)) return 'goblet';
  if (/smith/.test(s)) return 'smith:' + (/stiff|terra/.test(s) ? 'stiff' : /supino/.test(s) ? 'supino' : 'agach');
  return s.replace(/\b(com|na|no|nos|de|da|do|em|e|o|a)\b/g, ' ').replace(/\s+/g, ' ').trim();
}
export function equivalentes(nome, alternativa, original, jaNoTreino = []) {
  const base = original || nome, tem = new Set([nome, ...jaNoTreino].map(x => String(x).toLowerCase()));
  // a alternativa do Igor vale como ele escreveu; as genéricas não repetem o exercício de agora (nem sinônimo dele) nem o que já está no treino
  const fams = new Set([nome, original, ...jaNoTreino].filter(Boolean).map(familia)), vistos = new Set(), out = [];
  if (alternativa && !tem.has(alternativa.toLowerCase())) { out.push(alternativa); vistos.add(familia(alternativa)); }
  for (const x of (EQUIV.find(([r]) => r.test(base)) || [])[1] || []) { if (out.length === 2) break; const f = familia(x); if (fams.has(f) || vistos.has(f)) continue; vistos.add(f); out.push(x); }
  return out;
}
