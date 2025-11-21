/* precadastro.js — versão substituta completa
   Inclui:
   - renderização de áreas/serviços (com 'Outros' por área)
   - campos dinâmicos por tipo (cliente, prestador, ong, etc.)
   - validação melhorada: lista o que falta e foca no primeiro inválido
   - envio ao Apps Script (mantive sua lógica de URLSearchParams e base64)
*/

const form = document.getElementById('precadForm');
const msg = document.getElementById('msg');
const limpar = document.getElementById('limpar');
const tipo = document.getElementById('tipo');
const dynamic = document.getElementById('dynamicFields');
const areasContainer = document.getElementById('areasContainer');
const logoWrapper = document.getElementById('logoWrapper');
const descricaoWrapper = document.getElementById('descricaoWrapper');

function capitalizeServiceName(text) {
  const conectivos = [
    'de','da','do','das','dos',
    'em','para','com','por','sem','sob',
    'e','ou','a','o','as','os'
  ];

  return text
    .toLowerCase()
    .split(' ')
    .map((w, i) => {
      return (i !== 0 && conectivos.includes(w))
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

const AREAS = ['SAÚDE','ESTÉTICA','BEM-ESTAR','COMPORTAMENTAL','VIDA','SEGURANÇA','OUTROS'];

const SERVICES = {
  'SAÚDE': ['Vacinas Obrigatórias','Vacinas','Alimento Natural','Fisioterapia','Cirurgia','Exames Laboratoriais','Exame de Imagem','Castração', 'Serviços Ambulatoriais', 'Odontologia Veterinária', 'Internação', 'Atendimento Domiciliar'],
  'ESTÉTICA': ['Grooming', 'Banho e Tosa', 'Higienização', 'Corte de Unhas', 'Limpeza de Ouvidos', 'Hidratação e Tratamentos Especiais'],
  'BEM-ESTAR': ['Spa','Pet Walker','Pet Sitter','Hospedagem','Creche', 'Day Care', 'Fitness e Exercícios', 'Terapias Alternativas'],
  'COMPORTAMENTAL': ['Avaliação Comportamental','Adestramento - Básico','Adestramento - Avançado','Modificação do Comportamento','Treinamento de Filhotes (Puppy Class)','Educação Ambiental','Consultoria Comportamental Especializada','Treinamentos Específicos'],
  'VIDA': ['Seguro Pet','Auxílio Funerário'],
  'SEGURANÇA': ['Identificação e Rastreabilidade','Monitoramento e Rastreio','Controle de Acesso e Proteção em Casa', 'Transporte Seguro', 'Serviço de Busca e Resgate', 'Planos de Emergência'],
  'OUTROS': ['Ensaio Fotográfico Pet']
};

const fieldsByType = {
  prestador: [
    {label: 'CPF ou CNPJ', name: 'documento', type: 'text', placeholder: 'CPF ou CNPJ', required: true},
    {label: 'Serviço principal', name: 'servico_principal', type: 'text', placeholder: 'Ex: Pet sitter / Adestramento', required: true},
    {label: 'Área de cobertura', name: 'area_cobertura', type: 'text', placeholder: 'Ex: macaiba/rn, natal/rn, joao pessoa/pb', required: false},
  ],
  ong: [
    {label: 'CNPJ', name: 'cnpj', type: 'text', placeholder: 'CNPJ da ONG', required: true},
    {label: 'Ano de fundação', name: 'ano_fundacao', type: 'text', placeholder: 'Ex: 2015', required: false},
    {label: 'Número aproximado de animais sob cuidado', name: 'num_animais', type: 'text', placeholder: 'Ex: 25', required: false}
  ],
  lojista: [
    {label: 'CNPJ', name: 'cnpj', type: 'text', placeholder: 'CNPJ da loja', required: true},
    {label: 'Endereço completo', name: 'endereco', type: 'text', placeholder: 'Rua, número, bairro', required: false}
  ],
  protetor: [
    {label: 'Registro / ID (se houver)', name: 'registro', type: 'text', placeholder: 'ID do protetor ou coletivo', required: false},
    {label: 'Regiões de atuação', name: 'regioes', type: 'text', placeholder: 'Cidades / bairros', required: true}
  ],
  parceiro: [
    {label: 'Empresa / Organização responsável', name: 'empresa', type: 'text', placeholder: 'Nome da empresa', required: true},
    {label: 'Proposta de parceria (resumo)', name: 'proposta', type: 'text', placeholder: 'Como pretende colaborar?', required: false}
  ],
  patrocinador: [
    {label: 'Interesse em patrocínio', name: 'interesse_patrocinio', type: 'select', options: ['Patrocínio financeiro','Doações em produtos','Apoio institucional'], required: false},
    {label: 'Faixa de investimento (opcional)', name: 'faixa_investimento', type: 'text', placeholder: 'Ex: R$ 500 - R$ 2.000', required: false}
  ],
  cliente: [
    // tratado separadamente
  ],
  outro: [
    {label: 'Explique o tipo', name: 'tipo_outro', type: 'text', placeholder: 'Descreva brevemente', required: true}
  ]
};

function slugify(text){
  return text.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}

function clearAreasAndServices(){
  areasContainer.innerHTML = '';
  areasContainer.style.display = '';
}

/* Render areas only for non-cliente types */
function renderAreasForType(type){
  // if cliente, hide the whole areasContainer and return
  if (type === 'cliente'){
    areasContainer.innerHTML = '';
    areasContainer.style.display = 'none';
    return;
  }
  areasContainer.style.display = '';
  clearAreasAndServices();
  const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = 'Marque as áreas em que a sua organização atua. Para cada área marcada, selecione os serviços oferecidos.';
  areasContainer.appendChild(hint);

  AREAS.forEach(area =>{
    const areaKey = slugify(area);
    const card = document.createElement('div'); card.className = 'area-card';

    const header = document.createElement('div'); header.className = 'area-header';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.id = `${type}_area_${areaKey}`; chk.name = `${type}_areas[]`; chk.value = area; chk.style.transform='scale(1.05)';
    const title = document.createElement('div'); title.className = 'area-title'; title.textContent = area;

    const actions = document.createElement('div'); actions.className = 'area-toggle';
    const expandBtn = document.createElement('button'); expandBtn.type='button'; expandBtn.className='ghost'; expandBtn.textContent='Ver serviços';
    const selectAllBtn = document.createElement('button'); selectAllBtn.type='button'; selectAllBtn.className='ghost'; selectAllBtn.textContent='Marcar todos';
    actions.appendChild(selectAllBtn); actions.appendChild(expandBtn);

    header.appendChild(chk); header.appendChild(title); header.appendChild(actions);
    card.appendChild(header);

    const servicesWrap = document.createElement('div'); servicesWrap.className = 'services-wrap'; servicesWrap.id = `${type}_services_for_${areaKey}`; servicesWrap.style.display='none';

    const services = SERVICES[area] || [];
    services.forEach(svc =>{
      const svcKey = slugify(svc);

      // label (chip)
      const chip = document.createElement('label');
      chip.className = 'service-chip';
      chip.setAttribute('tabindex','0');

      // native (visually-hidden) checkbox input
      const input = document.createElement('input');
      input.type='checkbox';
      input.name = `${type}_services_${areaKey}[]`;
      input.value = svc;
      input.id = `${type}_service_${areaKey}_${svcKey}`;

      // visible box (visual checkbox)
      const box = document.createElement('span');
      box.className = 'box';
      box.setAttribute('aria-hidden','true');

      // caption
      const span = document.createElement('span');
      span.className='service-caption';
      span.textContent = capitalizeServiceName(svc);

      // structure: label > input + box + caption
      chip.appendChild(input);
      chip.appendChild(box);
      chip.appendChild(span);
      servicesWrap.appendChild(chip);

      // when the native checkbox changes (via label click, keyboard or programmatic), update visual state
      input.addEventListener('change', ()=>{
        chip.classList.toggle('checked', input.checked);
      });

      // keyboard support on the label (space/enter) - delegate to input
      chip.addEventListener('keydown',(ev)=>{
        if (ev.key === ' ' || ev.key === 'Enter'){
          ev.preventDefault();
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change'));
        }
      });
    });

    // --- special: add an "Outros" chip + texto associado (por área) ---
    (function addOutrosField(){
      const outrosKey = 'outros';
      const svcId = `${type}_service_${areaKey}_${outrosKey}`;
      const chip = document.createElement('label');
      chip.className = 'service-chip';
      chip.setAttribute('tabindex','0');

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = `${type}_services_${areaKey}[]`;
      input.value = 'Outros';
      input.id = svcId;

      const box = document.createElement('span');
      box.className = 'box';
      box.setAttribute('aria-hidden','true');

      const span = document.createElement('span');
      span.className = 'service-caption';
      span.textContent = 'Outros';

      // small wrapper for the especificar input (inline with chips)
      const outrosWrapper = document.createElement('div');
      outrosWrapper.style.display = 'none';
      outrosWrapper.style.alignItems = 'center';
      outrosWrapper.style.marginTop = '6px';
      outrosWrapper.style.gridColumn = '1 / -1'; // make it full width within services grid when visible

      const outrosInput = document.createElement('input');
      outrosInput.type = 'text';
      outrosInput.name = `${type}_services_${areaKey}_outros_text`;
      outrosInput.placeholder = 'Descreva outros serviços...';
      outrosInput.style.width = '100%';
      outrosInput.style.padding = '8px';
      outrosInput.style.borderRadius = '8px';
      outrosInput.style.border = '1px solid #e6e9ef';
      outrosInput.style.marginTop = '6px';

      chip.appendChild(input);
      chip.appendChild(box);
      chip.appendChild(span);
      servicesWrap.appendChild(chip);

      // Append the text input wrapper AFTER the chips so it appears below the chips
      outrosWrapper.appendChild(outrosInput);
      servicesWrap.appendChild(outrosWrapper);

      // update checked visual
      input.addEventListener('change', ()=>{
        chip.classList.toggle('checked', input.checked);
        outrosWrapper.style.display = input.checked ? '' : 'none';
        if (!input.checked) outrosInput.value = '';
      });

      chip.addEventListener('keydown',(ev)=>{
        if (ev.key === ' ' || ev.key === 'Enter'){
          ev.preventDefault();
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change'));
        }
      });
    })();
    // --- end 'Outros' special ---

    expandBtn.addEventListener('click', ()=>{
      servicesWrap.style.display = servicesWrap.style.display === 'none' ? 'grid' : 'none';
      expandBtn.textContent = servicesWrap.style.display === 'none' ? 'Ver serviços' : 'Ocultar serviços';
    });

    selectAllBtn.addEventListener('click', ()=>{
      const inputs = servicesWrap.querySelectorAll('input[type=checkbox]');
      const anyUnchecked = Array.from(inputs).some(i=>!i.checked);
      inputs.forEach(i => { i.checked = anyUnchecked; i.dispatchEvent(new Event('change')); });
    });

    chk.addEventListener('change', (e)=>{
      if (e.target.checked){ servicesWrap.style.display='grid'; expandBtn.textContent='Ocultar serviços'; }
      else { servicesWrap.style.display='none'; expandBtn.textContent='Ver serviços'; servicesWrap.querySelectorAll('input[type=checkbox]').forEach(i=>{ i.checked=false; i.dispatchEvent(new Event('change')); }); }
    });

    card.appendChild(servicesWrap);
    areasContainer.appendChild(card);
  });
}

/* Create generic field helper - uses classes 'field' and optional 'full' */
function createField(f){
  const wrapper = document.createElement('div');
  wrapper.className = 'field' + (f.full ? ' full' : '');
  const label = document.createElement('label'); label.textContent = f.label;

  if (f.type === 'select'){
    const sel = document.createElement('select'); sel.name = f.name; sel.id = f.name; if (f.required) sel.required = true;
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Selecione'; sel.appendChild(empty);
    (f.options||[]).forEach(opt=>{ const o = document.createElement('option'); o.value = opt; o.textContent = opt; sel.appendChild(o); });
    wrapper.appendChild(label); wrapper.appendChild(sel);
  } else {
    const input = document.createElement('input'); input.type = f.type || 'text'; input.name = f.name; input.id = f.name;
    if (f.placeholder) input.placeholder = f.placeholder;
    if (f.required) input.required = true;
    wrapper.appendChild(label); wrapper.appendChild(input);
  }
  return wrapper;
}

/* Render the 'other fields' area. Special case: cliente */
function renderOtherFields(type){
  dynamic.innerHTML = '';

  if (type === 'cliente'){
    // Possui pet?
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const label = document.createElement('label');
    label.textContent = 'Possui pet atualmente?';
    const sel = document.createElement('select');
    sel.name = 'cliente_possui_pet';
    sel.id = 'cliente_possui_pet';
    const empty = document.createElement('option'); empty.value=''; empty.textContent='Selecione';
    const optSim = document.createElement('option'); optSim.value='Sim'; optSim.textContent='Sim';
    const optNao = document.createElement('option'); optNao.value='Não'; optNao.textContent='Não';
    sel.appendChild(empty); sel.appendChild(optSim); sel.appendChild(optNao);
    wrapper.appendChild(label); wrapper.appendChild(sel);
    dynamic.appendChild(wrapper);

    // Quantos (hidden until Sim)
    const qtdWrapper = document.createElement('div');
    qtdWrapper.className = 'field';
    qtdWrapper.id = 'cliente_qtd_wrapper';
    qtdWrapper.style.display = 'none';
    const qtdLabel = document.createElement('label');
    qtdLabel.textContent = 'Se sim, quantos?';
    const qtdInput = document.createElement('input');
    qtdInput.type = 'number';
    qtdInput.name = 'cliente_num_pets';
    qtdInput.id = 'cliente_num_pets';
    qtdInput.placeholder = 'Ex: 2';
    qtdInput.min = '0';
    qtdWrapper.appendChild(qtdLabel);
    qtdWrapper.appendChild(qtdInput);
    dynamic.appendChild(qtdWrapper);

    // Como descobriu (select com opções)
    const descWrapper = document.createElement('div');
    descWrapper.className = 'field full';
    const descLabel = document.createElement('label'); descLabel.textContent = 'Como descobriu a plataforma?';
    const descSelect = document.createElement('select');
    descSelect.name = 'cliente_como_descobriu';
    descSelect.id = 'cliente_como_descobriu';
    const emptyDesc = document.createElement('option'); emptyDesc.value=''; emptyDesc.textContent='Selecione';
    descSelect.appendChild(emptyDesc);
    ['instagram','Facebook','twitter','google','tiktok','evento','indicação'].forEach(optVal=>{
      const o = document.createElement('option'); o.value = optVal; o.textContent = optVal.charAt(0).toUpperCase() + optVal.slice(1);
      descSelect.appendChild(o);
    });
    descWrapper.appendChild(descLabel);
    descWrapper.appendChild(descSelect);
    dynamic.appendChild(descWrapper);

    // behavior: show/hide qtdWrapper when select changes
    sel.addEventListener('change', (e)=>{
      if (e.target.value === 'Sim'){
        qtdWrapper.style.display = '';
      } else {
        qtdWrapper.style.display = 'none';
        qtdInput.value = '';
      }
    });

    return;
  }

  // Non-cliente: default behavior (generic fields per fieldsByType)
  const map = fieldsByType[type] || [];
  map.forEach(f=>{
    const el = createField(f);
    dynamic.appendChild(el);
  });
}

/* =================== VALIDAÇÃO AMPLIADA =================== */

/**
 * Tenta achar um rótulo legível para o elemento (label[for], label pai, .area-title, placeholder, name).
 */
function findLabelText(el) {
  try {
    // 1) label[for]
    if (el.id) {
      const lab = form.querySelector(`label[for="${el.id}"]`);
      if (lab && lab.textContent) return lab.textContent.trim();
    }
    // 2) se input estiver dentro de <label>...</label>
    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.textContent) return parentLabel.textContent.trim();
    // 3) se estiver em wrapper .field com um label
    const fieldWrapper = el.closest('.field, .area-card, div');
    if (fieldWrapper) {
      // se for área, pegue .area-title
      const areaTitle = fieldWrapper.querySelector('.area-title');
      if (areaTitle && areaTitle.textContent) return areaTitle.textContent.trim();
      const lab = fieldWrapper.querySelector('label');
      if (lab && lab.textContent) return lab.textContent.trim();
    }
    // 4) fallback para placeholder / aria-label / name
    return el.placeholder || el.getAttribute('aria-label') || el.name || el.type || 'Campo obrigatório';
  } catch (err) {
    return 'Campo obrigatório';
  }
}

/**
 * Retorna array de strings (rótulos) dos campos obrigatórios que estão inválidos / não preenchidos.
 */
function getMissingRequireds(formEl){
  const missing = [];
  const seen = new Set();

  const elements = Array.from(formEl.elements);

  // cria mapa de grupos por name
  const groups = {};
  elements.forEach(el => {
    if (!el.name) return;
    if (!groups[el.name]) groups[el.name] = [];
    groups[el.name].push(el);
  });

  elements.forEach(el => {
    if (el.disabled) return;
    if (!el.required) return;

    // evita duplicar grupo
    if (seen.has(el.name)) return;

    const group = groups[el.name] && groups[el.name].length > 1;

    if (group && (el.type === 'checkbox' || el.type === 'radio')) {
      const anyChecked = groups[el.name].some(g => g.checked);
      if (!anyChecked) {
        // tenta achar label representativa, ex: .area-title ou label do primeiro elemento
        const first = groups[el.name][0];
        let label = 'Selecione uma opção';
        const areaAncestor = first.closest('.area-card');
        if (areaAncestor) {
          const title = areaAncestor.querySelector('.area-title');
          if (title) label = title.textContent.trim();
        } else {
          label = findLabelText(first);
        }
        missing.push(label);
      }
      seen.add(el.name);
      return;
    }

    // caso normal (input/select/textarea)
    if (!el.checkValidity()) {
      missing.push(findLabelText(el));
      seen.add(el.name || el.id || el);
    }
  });

  return missing;
}

/* =================== SUBMIT (COM VALIDAÇÃO AMPLIADA) =================== */

/* === Atualize estes valores === */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrGZi7wbnyRrBx2-kMiVkd6K_GCteJMQmeHiWWjZHYJJKfKtnsahukM8Wn_9q6wId-/exec'; // <<< cole a URL do seu deploy
const CLIENT_TOKEN = 'vG3w7x_9Z'; // <<< cole o token se configurou; se não usar, deixe '' e defina USE_TOKEN=false no Apps Script

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.innerHTML = '';

  // checagem de requireds com lista amigável
  const missing = getMissingRequireds(form);
  if (missing.length > 0) {
    const listHtml = missing.map(m => `<li>${m}</li>`).join('');
    msg.innerHTML = `<div class="error"><strong>Faltam campos obrigatórios:</strong><ul style="margin:8px 0 0 18px;padding:0">${listHtml}</ul></div>`;

    // foca no primeiro campo faltante
    const firstLabelText = missing[0];

    // busca label que comece com esse texto (preferencialmente)
    let firstField = Array.from(form.querySelectorAll('label')).find(l => {
      return l.textContent && l.textContent.trim().startsWith(firstLabelText);
    });

    if (firstField) {
      const forId = firstField.getAttribute('for');
      if (forId) {
        const target = document.getElementById(forId);
        if (target) { target.focus(); return; }
      }
      const innerInput = firstField.querySelector('input,select,textarea');
      if (innerInput) { innerInput.focus(); return; }
    }

    // se não achou por label, tenta achar um elemento inválido no form
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) {
      try { firstInvalid.focus(); } catch (err) {}
    }
    return;
  }

  // --- resto do submit (mantive sua lógica original de envio) ---
  const data = {};
  const fm = new FormData(form);
  for (const [k,v] of fm.entries()){
    if (data[k] === undefined) data[k] = v;
    else if (Array.isArray(data[k])) data[k].push(v);
    else data[k] = [data[k], v];
  }

  const fileInput = document.getElementById('arquivo');
  let filePayload = null;
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      msg.innerHTML = '<div class="error">Arquivo maior que 5MB. Reduza o tamanho.</div>';
      return;
    }
    try {
      filePayload = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64: reader.result.split(',')[1],
          size: file.size
        });
        reader.onerror = () => reject('erro leitura arquivo');
        reader.readAsDataURL(file);
      });
    } catch(err){
      console.error(err);
      msg.innerHTML = '<div class="error">Erro ao ler o arquivo.</div>';
      return;
    }
  }

  data._submitted_at = new Date().toISOString();
  if (filePayload) data.arquivo_base64 = filePayload;
  if (CLIENT_TOKEN && CLIENT_TOKEN.length > 0) data._client_token = CLIENT_TOKEN;

  // === envio (URLSearchParams para evitar preflight) ===
  const submitBtn = form.querySelector('button[type="submit"]');
  try {
    // desabilita botão para evitar envios duplicados
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
    }

    const params = new URLSearchParams();
    params.set('payload', JSON.stringify(data));

    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: params // browser define Content-Type: application/x-www-form-urlencoded; charset=UTF-8
    });

    // reabilita botão
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
    }

    const json = await resp.json().catch(()=>null);

    if (resp.ok) {
      const arquivoUrl = (json && json.arquivoUrl) ? json.arquivoUrl : '';
      let successMsg = '<div class="success">Pré-cadastro enviado com sucesso! Em breve entraremos em contato.</div>';
      if (arquivoUrl) successMsg += `<div style="margin-top:8px"><small>Arquivo salvo: <a href="${arquivoUrl}" target="_blank" rel="noopener">${arquivoUrl}</a></small></div>`;
      msg.innerHTML = successMsg;
      form.reset();
      clearAreasAndServices();
      dynamic.innerHTML = '';
      areasContainer.style.display = '';
      logoWrapper.style.display = '';
    } else {
      console.error('Erro resposta', resp.status, json);
      msg.innerHTML = '<div class="error">Erro ao enviar: '+ (json && json.error ? json.error : resp.status) +'</div>';
    }
  } catch (err) {
    console.error(err);
    // reabilita botão em caso de erro
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
    }
    msg.innerHTML = '<div class="error">Não foi possível conectar ao servidor do Google. Verifique a URL do Apps Script e se você publicou o deploy.</div>';
  }
});
// === fim handler ===

/* Limpar / Reset */
limpar.addEventListener('click', ()=>{
  form.reset();
  clearAreasAndServices();
  dynamic.innerHTML = '';
  areasContainer.style.display = '';
  logoWrapper.style.display = '';
});

/* Política de privacidade (demo) */
document.getElementById('policyLink').addEventListener('click', (ev)=>{
  ev.preventDefault();
  alert('Política de Privacidade: Seus dados serão usados somente para análise de pré-cadastro. Não compartilharemos dados sem consentimento.');
});

/* Inicialização: se já tiver um tipo selecionado */
if (tipo.value === 'cliente') {
  logoWrapper.style.display = 'none';
  descricaoWrapper.style.display = 'none';
} else {
  descricaoWrapper.style.display = '';
}

if (tipo.value){
  renderAreasForType(tipo.value);
  renderOtherFields(tipo.value);
}

/* On type change: show/hide logo, render areas/fields */
tipo.addEventListener('change', (e)=>{
  const t = e.target.value;

  // cliente doesn't see logo & descricao
  if (t === 'cliente') {
    logoWrapper.style.display = 'none';
    descricaoWrapper.style.display = 'none';
  } else {
    logoWrapper.style.display = '';
    descricaoWrapper.style.display = '';
  }

  if (!t){
    clearAreasAndServices();
    dynamic.innerHTML = '';
    areasContainer.style.display = '';
    return;
  }

  renderAreasForType(t);
  renderOtherFields(t);
});
