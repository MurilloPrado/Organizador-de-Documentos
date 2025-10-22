const nome = document.getElementById('nome');
const tel = document.getElementById('tel');
const email  = document.getElementById('email');    
const cadastroLabel = document.getElementById('cadastro-label');
const cadastroGeral = document.getElementById('cadastro-geral');     
const tipoFisica = document.getElementById('tipo-fisica'); 
const tipoJuridica = document.getElementById('tipo-juridica');
const cep = document.getElementById('cep');
const cidade = document.getElementById('cidade');
const bairro = document.getElementById('bairro');
const numero = document.getElementById('numero');
const complemento = document.getElementById('complemento');
const saveButton = document.getElementById('save-button');

//evita campos com espaços
function norm(value) {
  return String(value ?? '').trim();
}

const onlyDigits = (v) => norm(v).replace(/\D+/g, '');

// desabilita/habilita botão
function setSaving(isSaving) {
  if (!saveButton) return;
  saveButton.disabled = isSaving;
  saveButton.textContent = isSaving ? 'Salvando…' : 'Salvar cliente';
}

//alerta de erro
function showError(msg) {
  alert(msg);
}

function getTipoSelecionado() {
  if (tipoFisica?.checked) return 'fisica';
  if (tipoJuridica?.checked) return 'juridica';
  return '';
}

// mascaras
function maskCPF(v) {
  const d = onlyDigits(v).slice(0,11);
  const a = [];

  if(d.length > 3) a.push (d.slice(0,3), d.slice(3,6), d.slice(6,9), d.slice(9,11));
  else if(d.length) a.push(d);
  return d.length <= 3
    ? d
    : d.length <= 6
      ? `${d.slice(0,3)}.${d.slice(3)}`
      : d.length <= 9
        ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
        : `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

function maskCNPJ(v) {
  const d = onlyDigits(v).slice(0,14);
  if(d.length <= 2) return d;
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
}

function maskCEP(v) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5,8)}`;
}

function maskPhoneBR(v) {
  // Aceita DDD + 8/9 dígitos
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6,10)}`; // fixo
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`; // celular
  // fallback parcial
  if (d.length > 6 && d.length < 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length > 6 && d.length < 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return d;
}

function applyCadastroMask() {
  const tipo = getTipoSelecionado();
  if (tipo === 'fisica') {
    cadastroGeral.value = maskCPF(cadastroGeral.value);
  } else if (tipo === 'juridica') {
    cadastroGeral.value = maskCNPJ(cadastroGeral.value);
  }
}

function updateCadastroLabelAndPlaceholder() {
  const tipo = getTipoSelecionado();
  if (cadastroLabel) {
    cadastroLabel.textContent = (tipo === 'juridica') ? 'CNPJ' : 'CPF';
  }
  if (cadastroGeral) {
    cadastroGeral.placeholder = (tipo === 'juridica') ? '00.000.000/0000-00' : '000.000.000-00';
    applyCadastroMask();
  }
}

async function fillAddressFromCEP(cepStr) {
  const digits = onlyDigits(cepStr);
  if (digits.length !== 8) return;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.erro) return;

    // Mapeamentos básicos: cidade (localidade), bairro, complemento
    if (cidade && !norm(cidade.value))  cidade.value  = norm(data.localidade);
    if (bairro && !norm(bairro.value))  bairro.value  = norm(data.bairro);
    if (complemento && !norm(complemento.value)) complemento.value = norm(data.complemento);
    // numero é intencionalmente manual
  } catch (e) {
    console.warn('[viacep] falhou:', e);
  }
}

function wireMasks() {
  // Tipo altera label + máscara do cadastro
  tipoFisica?.addEventListener('change', updateCadastroLabelAndPlaceholder);
  tipoJuridica?.addEventListener('change', updateCadastroLabelAndPlaceholder);

  // CPF/CNPJ
  cadastroGeral?.addEventListener('input', () => {
    applyCadastroMask();
  });
  cadastroGeral?.addEventListener('blur', () => {
    applyCadastroMask();
  });

  // Telefone
  tel?.addEventListener('input', () => {
    tel.value = maskPhoneBR(tel.value);
  });

  // CEP
  cep?.addEventListener('input', () => {
    cep.value = maskCEP(cep.value);
  });
  // Buscar no blur (ou poderia ser quando completa 8 dígitos)
  cep?.addEventListener('blur', () => {
    fillAddressFromCEP(cep.value);
  });
}

async function handleSalvar() {
  const nomeValue = norm(nome?.value);
  const telValue  = onlyDigits(tel?.value);
  const emailValue = norm(email?.value);
  const cadastroGeralValue = onlyDigits(cadastroGeral?.value);
  const tipoValue = getTipoSelecionado();
  console.log (tipoValue);

  const cepValue = onlyDigits(cep?.value);
  const cidadeValue = norm(cidade?.value);
  const bairroValue = norm(bairro?.value);
  const numeroValue = norm(numero?.value);
  const complementoValue = norm(complemento?.value);

  if (!nomeValue) {
    showError('Informe o nome do cliente.');
    nome?.focus();
    return;
  }

  try {
    setSaving(true);
    // Chamada ao backend (ipcMain.handle('clientes:create', ...))
    await window.api.clientes.create({ 
      cliente: {
        nome: nomeValue,
        tipo: tipoValue, 
        cadastroGeral: cadastroGeralValue,
        email: emailValue,
        tel: telValue,
      },
      endereco: {
        cep: cepValue,
        cidade: cidadeValue,
        bairro: bairroValue,
        numero: numeroValue,
        complemento: complementoValue,
      }
    });
    // Redireciona para a lista de clientes
    window.location.href = 'clientes.html';
  } catch (err) {
    console.error('[clientes] erro ao salvar:', err);
    showError('Falha ao salvar cliente. Tente novamente.');
  } finally {
    setSaving(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCadastroLabelAndPlaceholder();
  wireMasks();

  if (!saveButton) {
    console.warn('[clientes] Botão #btnSalvar não encontrado.');
    return;
  }
  saveButton.addEventListener('click', (e) => {
    e.preventDefault(); // evita submit padrão, já que não estamos usando <form>
    handleSalvar();
  });
});
