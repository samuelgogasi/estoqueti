// Inicialização das variáveis
let produtos = [];
let ultimoID = 0;
let movimentacoes = [];
let ultimosIDs = {};

// Função para gerar ID baseado na categoria
function gerarIDPorCategoria(categoria) {
  const prefixo = categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .substring(0, 3);

  if (!ultimosIDs[prefixo]) {
    ultimosIDs[prefixo] = 0;
  }

  ultimosIDs[prefixo]++;
  localStorage.setItem("ultimosIDs", JSON.stringify(ultimosIDs));

  return `${prefixo}${String(ultimosIDs[prefixo]).padStart(4, "0")}`;
}

// Função para gerar novo ID
function gerarNovoID() {
  ultimoID++;
  localStorage.setItem("ultimoID", ultimoID);
  return `ITEM${String(ultimoID).padStart(4, "0")}`;
}

// Função para salvar dados no localStorage
function salvarDados() {
  localStorage.setItem("produtos", JSON.stringify(produtos));

  localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
}

// Função para exibir mensagens de feedback
function exibirMensagem(elemento, mensagem, tipo) {
  elemento.innerHTML = `
    <i class="fas ${
      tipo === "sucesso" ? "fa-check-circle" : "fa-exclamation-circle"
    }"></i>
    ${mensagem}
  `;
  elemento.className = `mensagem ${tipo}`;
  setTimeout(() => {
    elemento.style.opacity = "0";
    setTimeout(() => {
      elemento.innerHTML = "";
      elemento.style.opacity = "1";
    }, 300);
  }, 3000);
}

function exportarProdutosCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";

  // Cabeçalho do CSV

  csvContent += "Nome,Categoria,Marca,Número de Série,Quantidade\n";

  // Adicionar cada produto ao CSV

  for (let chave in produtos) {
    let { categoria, marca, serie, quantidade } = produtos[chave];

    csvContent += `${
      chave.split("-")[0]
    },${categoria},${marca},${serie},${quantidade}\n`;
  }

  // Criar um link para download do arquivo CSV

  let encodedUri = encodeURI(csvContent);

  let link = document.createElement("a");

  link.setAttribute("href", encodedUri);

  link.setAttribute("download", "produtos.csv");

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link); // Remover o link após o download
}

// Função para carregar categorias
async function carregarCategorias() {
  try {
    const response = await fetch("/api/categorias");
    if (!response.ok) throw new Error("Erro ao buscar categorias");

    const categorias = await response.json();

    // Substituir "Hardware" por "Computador"
    categorias.forEach(categoria => {
      if (categoria.nome === "Hardware") {
        categoria.nome = "Computador";
      }
    });

    const preencherSelect = (selectId, categorias) => {
      const select = document.getElementById(selectId);
      if (!select) return;

      select.innerHTML = '<option value="">Selecione uma categoria</option>';
      categorias.forEach((categoria) => {
        const option = document.createElement("option");
        option.value = categoria.nome; // Mantemos o nome como value para a interface
        option.textContent = categoria.nome;
        option.dataset.categoriaId = categoria.id; // Guardamos o ID como data attribute
        select.appendChild(option);
      });
    };

    preencherSelect("categoria", categorias);
    preencherSelect("categoria-mov", categorias);
    preencherSelect("filtro-categoria", categorias);
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      "Erro ao carregar categorias",
      "erro"
    );
  }
}

// Função para atualizar tabela de produtos
async function atualizarTabelaProdutos() {
  try {
    const response = await fetch("/api/produtos");
    if (!response.ok) throw new Error("Erro ao buscar produtos");

    const produtos = await response.json();
    const listaProdutos = document.getElementById("lista-produtos");
    listaProdutos.innerHTML = "";

    produtos.forEach((produto) => {
      let newRow = listaProdutos.insertRow();
      newRow.innerHTML = `
                <td>${produto.id}</td>
                <td>${produto.categoria_nome}</td>
                <td>${produto.tipo}</td>
                <td>${produto.modelo}</td>
                <td>${produto.numero_serie || "N/A"}</td>
                <td>${produto.patrimonio || "N/A"}</td>
                <td class="${produto.quantidade <= 5 ? "baixo-estoque" : ""}">${
        produto.quantidade
      }</td>
                <td class="acoes">
                    <button onclick="editarProduto('${produto.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="excluirProduto('${produto.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
    });

    await atualizarTotalEstoque();
  } catch (error) {
    console.error("Erro ao atualizar tabela:", error);
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      "Erro ao atualizar tabela",
      "erro"
    );
  }
}

// Função para atualizar tabela de movimentações
async function atualizarTabelaMovimentacoes() {
  try {
    const response = await fetch("/api/movimentacoes");
    if (!response.ok) throw new Error("Erro ao buscar movimentações");

    const movimentacoes = await response.json();
    const listaMovimentacoes = document.getElementById("lista-movimentacoes");
    listaMovimentacoes.innerHTML = "";

    movimentacoes.forEach((mov) => {
      let newRow = listaMovimentacoes.insertRow();
      newRow.innerHTML = `
                <td>${new Date(mov.data_movimentacao).toLocaleString()}</td>
                <td>${mov.usuario}</td>
                <td>${mov.categoria_nome}</td>
                <td>${mov.tipo_produto}</td>
                <td>${mov.modelo}</td>
                <td>${mov.numero_serie || "N/A"}</td>
                <td>${mov.quantidade}</td>
                <td>${mov.tipo_movimentacao}</td>
                <td>${mov.destino}</td>
                <td>${mov.chamado || "N/A"}</td>
            `;
    });
  } catch (error) {
    console.error("Erro ao atualizar movimentações:", error);
    exibirMensagem(
      document.getElementById("mensagem-movimentacao"),
      "Erro ao atualizar movimentações",
      "erro"
    );
  }
}

// Event Listener para o formulário de produtos
document
  .getElementById("produto-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const categoriaSelect = document.getElementById("categoria");
    const categoria = categoriaSelect.value;
    const tipo = document.getElementById("tipo").value.trim();
    const modelo = document.getElementById("modelo").value.trim();
    const serie = document.getElementById("serie").value.trim();
    const patrimonio = document.getElementById("patrimonio").value.trim();
    const quantidade = parseInt(document.getElementById("quantidade").value);

    try {
      const response = await fetch("/api/produtos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: gerarIDPorCategoria(categoria),
          categoria,
          tipo,
          modelo,
          serie,
          patrimonio,
          quantidade,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao adicionar produto");
      }

      await atualizarTabelaProdutos();
      this.reset();
      exibirMensagem(
        document.getElementById("mensagem-produto"),
        "Produto adicionado com sucesso!",
        "sucesso"
      );
    } catch (error) {
      console.error("Erro:", error);
      exibirMensagem(
        document.getElementById("mensagem-produto"),
        "Erro ao adicionar produto!",
        "erro"
      );
    }
  });

// Event Listener para o formulário de movimentações
document
  .getElementById("movimentacao-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const categoria = document.getElementById("categoria-mov").value;
    const tipoProd = document.getElementById("tipo-prod").value;
    const modelo = document.getElementById("modelo-mov").value;
    const serie = document.getElementById("serie-mov").value;
    const patrimonio = document.getElementById("patrimonio-mov").value;
    const destino = document.getElementById("destino").value;
    const quantidade = parseInt(
      document.getElementById("quantidade-mov").value
    );
    const tipo = document.getElementById("tipo-mov").value;
    const chamado = document.getElementById("chamado").value;

    try {
      const response = await fetch("/api/movimentacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario,
          categoria,
          tipoProd,
          modelo,
          serie,
          patrimonio,
          destino,
          quantidade,
          tipo,
          chamado,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao registrar movimentação");
      }

      await atualizarTabelaMovimentacoes();
      await atualizarTabelaProdutos();  
      this.reset();
      exibirMensagem(
        document.getElementById("mensagem-movimentacao"),
        "Movimentação registrada com sucesso!",
        "sucesso"
      );
    } catch (error) {
      console.error("Erro:", error);
      exibirMensagem(
        document.getElementById("mensagem-movimentacao"),
        error.message,
        "erro"
      );
    }
  });

// Função para atualizar o total de estoque
async function atualizarTotalEstoque() {
  try {
    const response = await fetch("/api/produtos");
    if (!response.ok) throw new Error("Erro ao buscar produtos");

    const produtos = await response.json();
    const totalQuantidade = produtos.reduce(
      (total, produto) => total + produto.quantidade,
      0
    );

    document.getElementById("total-items").textContent = produtos.length;
    document.getElementById("total-produtos").textContent = totalQuantidade;
  } catch (error) {
    console.error("Erro ao atualizar total:", error);
  }
}

// Inicializar a interface
window.addEventListener("load", () => {
  carregarCategorias();
  atualizarTabelaProdutos();
  atualizarTabelaMovimentacoes();
});

// Função para editar produto
async function editarProduto(id) {
  try {
    const response = await fetch(`/api/produtos/${id}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar produto");
    }

    const produto = await response.json();

    showModal(`
            <h3>Editar Produto</h3>
            <form id="editar-produto-form" onsubmit="salvarEdicaoProduto(event, '${id}')">
                <div class="form-group">
                    <label>Tipo:</label>
                    <input type="text" id="edit-tipo" value="${
                      produto.tipo
                    }" required>
                    
                    <label>Categoria:</label>
                    <select id="edit-categoria" required>
                        ${await carregarOpcoesCategoria(produto.categoria_id)}
                    </select>
                    
                    <label>Modelo:</label>
                    <input type="text" id="edit-modelo" value="${
                      produto.modelo
                    }" required>
                    
                    <label>Número de Série:</label>
                    <input type="text" id="edit-serie" value="${
                      produto.numero_serie || ""
                    }">
                    
                    <label>Patrimônio:</label>
                    <input type="text" id="edit-patrimonio" value="${
                      produto.patrimonio || ""
                    }">
                    
                    <label>Quantidade:</label>
                    <input type="number" id="edit-quantidade" value="${
                      produto.quantidade
                    }" required min="0">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-save">Salvar</button>
                    <button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        `);
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao carregar produto para edição", "error");
  }
}

// Função para salvar a edição do produto
async function salvarEdicaoProduto(event, id) {
  event.preventDefault();

  const dadosAtualizados = {
    tipo: document.getElementById("edit-tipo").value,
    categoria_id: document.getElementById("edit-categoria").value,
    modelo: document.getElementById("edit-modelo").value,
    numero_serie: document.getElementById("edit-serie").value,
    patrimonio: document.getElementById("edit-patrimonio").value,
    quantidade: parseInt(document.getElementById("edit-quantidade").value),
  };

  try {
    const response = await fetch(`/api/produtos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosAtualizados),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao atualizar produto");
    }

    closeModal();
    await buscarProdutos();
    showToast("Produto atualizado com sucesso!", "success");
  } catch (error) {
    console.error("Erro:", error);
    showToast(error.message, "error");
  }
}

// Função para excluir produto
async function excluirProduto(id) {
  console.log("Tentando excluir produto com ID:", id);

  try {
    // Confirmação antes de excluir
    if (
      !confirm(
        `Tem certeza que deseja excluir o produto ${id}? \nIsso também excluirá todas as movimentações relacionadas a este produto.`
      )
    ) {
      return;
    }

    // Primeiro, exclui todas as movimentações relacionadas
    const responseMovimentacoes = await fetch(
      `/api/produtos/${id}/movimentacoes`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!responseMovimentacoes.ok) {
      const errorData = await responseMovimentacoes.json();
      throw new Error(errorData.error || "Erro ao excluir movimentações");
    }

    // Depois, exclui o produto
    const responseProduto = await fetch(`/api/produtos/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!responseProduto.ok) {
      const errorData = await responseProduto.json();
      throw new Error(errorData.error || "Erro ao excluir produto");
    }

    // Atualiza a tabela
    await buscarProdutos();
    await atualizarTabelaMovimentacoes(); // Atualiza também a tabela de movimentações

    // Mostra mensagem de sucesso
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      "Produto e suas movimentações foram excluídos com sucesso!",
      "sucesso"
    );
  } catch (error) {
    console.error("Erro ao excluir:", error);
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      `Erro ao excluir: ${error.message}`,
      "erro"
    );
  }
}

// Função auxiliar para carregar opções de categoria
async function carregarOpcoesCategoria(categoriaAtual) {
  try {
    const response = await fetch("/api/categorias");
    if (!response.ok) throw new Error("Erro ao carregar categorias");

    const categorias = await response.json();
    return categorias
      .map(
        (cat) => `
            <option value="${cat.id}" ${
          cat.id === categoriaAtual ? "selected" : ""
        }>
                ${cat.nome}
            </option>
        `
      )
      .join("");
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
    return '<option value="">Erro ao carregar categorias</option>';
  }
}

// Função para mostrar toast
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) {
    const toastDiv = document.createElement("div");
    toastDiv.id = "toast";
    document.body.appendChild(toastDiv);
  }

  const toastElement = document.getElementById("toast");
  toastElement.className = `toast ${type}`;
  toastElement.textContent = message;
  toastElement.style.display = "block";

  setTimeout(() => {
    toastElement.style.display = "none";
  }, 3000);
}

// Filtros
function filtrarProdutos() {
  let busca = document.getElementById("busca-produto").value.toLowerCase();

  let linhas = document.querySelectorAll("#lista-produtos tr");

  linhas.forEach((linha) => {
    let nome = linha.cells[0].textContent.toLowerCase();

    let categoria = linha.cells[1].textContent.toLowerCase();

    let marca = linha.cells[2].textContent.toLowerCase();

    let serie = linha.cells[3].textContent.toLowerCase();

    if (
      nome.includes(busca) ||
      categoria.includes(busca) ||
      marca.includes(busca) ||
      serie.includes(busca)
    ) {
      linha.style.display = "";
    } else {
      linha.style.display = "none";
    }
  });
}

function calcularTotalProdutos() {
  let total = 0;

  for (let chave in produtos) {
    total += produtos[chave].quantidade;
  }

  document.getElementById(
    "total-produtos"
  ).textContent = `Total em estoque: ${total}`;
}

function calcularQuantidadePorNomeECategoria(nomeBuscado, categoriaBuscada) {
  let total = 0;

  for (let chave in produtos) {
    let [nomeProduto] = chave.split("-"); // Pegando o nome do produto

    let categoriaProduto = produtos[chave].categoria;

    if (
      nomeProduto.toLowerCase() === nomeBuscado.toLowerCase() &&
      categoriaProduto.toLowerCase() === categoriaBuscada.toLowerCase()
    ) {
      total += produtos[chave].quantidade;
    }
  }

  return total;
}

// Exibir resultado na tela
function exibirQuantidadePorNomeECategoria() {
  let nomeBuscado = document.getElementById("busca-quantidade").value.trim();

  let categoriaBuscada = document
    .getElementById("busca-categoria")
    .value.trim();

  if (!nomeBuscado || !categoriaBuscada) {
    document.getElementById("resultado-quantidade").textContent =
      "Por favor, preencha ambos os campos.";

    return;
  }

  let total = calcularQuantidadePorNomeECategoria(
    nomeBuscado,
    categoriaBuscada
  );

  document.getElementById("resultado-quantidade").textContent =
    total > 0
      ? `Total de "${nomeBuscado}" na categoria "${categoriaBuscada}":
${total}`
      : `Produto não encontrado nesta categoria`;
}

function calcularQuantidadePorNome() {
  let nomeBuscado = document
    .getElementById("busca-quantidade")
    .value.trim()
    .toLowerCase();

  let total = 0;

  for (let chave in produtos) {
    let nomeProduto = chave.split("-")[0].toLowerCase();

    if (nomeProduto === nomeBuscado) {
      total += produtos[chave].quantidade;
    }
  }

  document.getElementById("resultado-quantidade").textContent =
    total > 0
      ? `Total de "${nomeBuscado}": ${total}`
      : `Produto não encontrado`;
}

function filtrarMovimentacoes() {
  let filtro = document.getElementById("filtro-movimentacao").value;

  let linhas = document.querySelectorAll("#lista-movimentacoes tr");

  linhas.forEach((linha) => {
    let tipo = linha.cells[4].textContent.toLowerCase();

    linha.style.display = filtro === "todos" || tipo === filtro ? "" : "none";
  });
}

// Exportar dados
function exportarDados(formato) {
  if (formato === "csv") {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff"; // Adiciona BOM para caracteres especiais

    // Cabeçalho do CSV

    csvContent += "INVENTÁRIO DE PRODUTOS\n\n";
    csvContent +=
      "ID;Categoria;Tipo;Modelo;Número de Série;Quantidade em Estoque\n";

    for (let chave in produtos) {
      let produto = produtos[chave];
      csvContent += `${chave};${produto.categoria};${produto.tipo};${produto.modelo};${produto.serie};${produto.quantidade}\n`;
    }

    // Linha em branco entre seções
    csvContent += "\n\nREGISTRO DE MOVIMENTAÇÕES\n\n";

    // Seção de Movimentações
    csvContent +=
      "Data;Usuário;Categoria;Tipo;Modelo;Número de Série;Quantidade;Tipo Mov.;Destino;Chamado\n";

    movimentacoes.forEach((mov) => {
      csvContent += `${mov.data};${mov.usuario};${mov.categoria};${
        mov.tipoProd
      };${mov.modelo};${mov.serie};${mov.quantidade};${mov.tipo};${
        mov.destino
      };${mov.chamado || "N/A"}\n`;
    });

    // Adiciona resumo ao final
    csvContent += "\n\nRESUMO\n";
    csvContent += `Data de Geração;${new Date().toLocaleString()}\n`;
    csvContent += `Total de Itens Diferentes;${Object.keys(produtos).length}\n`;
    csvContent += `Total de Itens em Estoque;${calcularTotalItensEstoque()}\n`;
    csvContent += `Total de Movimentações;${movimentacoes.length}\n`;
    csvContent += `Saídas Hoje;${calcularMovimentacoesHoje("saida")}\n`;
    csvContent += `Entradas Hoje;${calcularMovimentacoesHoje("entrada")}\n`;

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `inventario_estoque_${new Date()
        .toLocaleDateString()
        .replace(/\//g, "-")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (formato === "json") {
    let data = {
      produtos,
      movimentacoes,
      metadata: {
        dataGeracao: new Date().toLocaleString(),
        totalProdutos: Object.keys(produtos).length,
        totalMovimentacoes: movimentacoes.length,
      },
    };

    let jsonContent = JSON.stringify(data, null, 2);
    let blob = new Blob([jsonContent], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_estoque_${new Date()
      .toLocaleDateString()
      .replace(/\//g, "-")}.json`;
    link.click();
  }
}

// Funções auxiliares para o relatório
function calcularTotalItensEstoque() {
  return Object.values(produtos).reduce(
    (total, produto) => total + produto.quantidade,
    0
  );
}

function calcularMovimentacoesHoje(tipo) {
  const hoje = new Date().toLocaleDateString();
  return movimentacoes.filter(
    (mov) => mov.data.includes(hoje) && mov.tipo === tipo
  ).length;
}

function gerarRelatorio(tipo) {
  let relatorio = [];
  let hoje = new Date();
  let titulo = "";

  switch (tipo) {
    case "diario":
      titulo = `Relatório Diário - ${hoje.toLocaleDateString()}`;
      relatorio = movimentacoes.filter((mov) =>
        mov.data.includes(hoje.toLocaleDateString())
      );
      break;

    case "mensal":
      let mes = hoje.getMonth() + 1;
      let ano = hoje.getFullYear();
      titulo = `Relatório Mensal - ${mes}/${ano}`;
      relatorio = movimentacoes.filter((mov) => {
        let dataMov = new Date(mov.data);
        return dataMov.getMonth() + 1 === mes && dataMov.getFullYear() === ano;
      });
      break;

    case "criticos":
      titulo = "Relatório de Itens Críticos";
      for (let id in produtos) {
        if (produtos[id].quantidade <= 5) {
          relatorio.push({
            id,
            ...produtos[id],
          });
        }
      }
      break;
  }

  // Gera o HTML do relatório
  let conteudoRelatorio = `
        <h2>${titulo}</h2>
        ${
          tipo === "criticos"
            ? gerarTabelaCriticos(relatorio)
            : gerarTabelaMovimentacoes(relatorio)
        }
        ${gerarResumoRelatorio(tipo, relatorio)}
    `;

  // Cria uma nova janela para o relatório
  let win = window.open("", "_blank");
  win.document.write(`
        <html>
            <head>
                <title>${titulo}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                    th { background: #0077cc; color: white; }
                    .baixo-estoque { color: red; font-weight: bold; }
                    .resumo { 
                        background: #f8f9fa; 
                        padding: 15px; 
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    .resumo h3 { margin-top: 0; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${conteudoRelatorio}
                <div class="no-print">
                    <button onclick="window.print()">Imprimir</button>
                </div>
            </body>
        </html>
    `);
}

function gerarTabelaCriticos(itens) {
  return `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Modelo</th>
                    <th>Número de Série</th>
                    <th>Quantidade</th>
                </tr>
            </thead>
            <tbody>
                ${itens
                  .map(
                    (item) => `
                    <tr>
                        <td>${item.id}</td>
                        <td>${item.categoria}</td>
                        <td>${item.tipo}</td>
                        <td>${item.modelo}</td>
                        <td>${item.serie}</td>
                        <td class="baixo-estoque">${item.quantidade}</td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
    `;
}

function gerarTabelaMovimentacoes(movs) {
  return `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Usuário</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Modelo</th>
                    <th>Quantidade</th>
                    <th>Tipo Mov.</th>
                    <th>Destino</th>
                </tr>
            </thead>
            <tbody>
                ${movs
                  .map(
                    (mov) => `
                    <tr>
                        <td>${mov.data}</td>
                        <td>${mov.usuario}</td>
                        <td>${mov.categoria}</td>
                        <td>${mov.tipoProd}</td>
                        <td>${mov.modelo}</td>
                        <td>${mov.quantidade}</td>
                        <td>${mov.tipo}</td>
                        <td>${mov.destino}</td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
    `;
}

function gerarResumoRelatorio(tipo, dados) {
  let resumo = "";

  if (tipo === "diario" || tipo === "mensal") {
    const entradas = dados
      .filter((m) => m.tipo === "entrada")
      .reduce((total, m) => total + m.quantidade, 0);
    const saidas = dados
      .filter((m) => m.tipo === "saida")
      .reduce((total, m) => total + m.quantidade, 0);

    resumo = `
            <div class="resumo">
                <h3>Resumo do Período</h3>
                <p>Total de Movimentações: ${dados.length}</p>
                <p>Total de Itens Movimentados: ${entradas + saidas}</p>
                <p>Total de Entradas: ${entradas}</p>
                <p>Total de Saídas: ${saidas}</p>
                <p>Usuários Diferentes: ${
                  new Set(dados.map((m) => m.usuario)).size
                }</p>
            </div>
        `;
  } else if (tipo === "criticos") {
    resumo = `
            <div class="resumo">
                <h3>Resumo de Itens Críticos</h3>
                <p>Total de Itens Críticos: ${dados.length}</p>
                <p>Categorias Afetadas: ${
                  new Set(dados.map((i) => i.categoria)).size
                }</p>
            </div>
        `;
  }

  return resumo;
}

function login() {
  const usuario = document.getElementById("usuario").value;

  const senha = document.getElementById("senha").value;

  // Verificação básica (substitua por uma verificação segura no backend)

  if (usuario === "admin" && senha === "admin123") {
    document.getElementById("login").style.display = "none";

    document.getElementById("conteudo").style.display = "block";
  } else {
    alert("Usuário ou senha incorretos!");
  }
}

// Função para inicializar elementos da UI de forma segura
function initializeUI() {
  // Adicionar esta linha no início da função
  carregarCategorias();

  // Modal
  const modal = document.getElementById("modal");
  const closeBtn = document.querySelector(".close");
  if (modal && closeBtn) {
    closeBtn.onclick = () => (modal.style.display = "none");
    window.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };
  }

  // Inicializar tabelas
  atualizarTabelaProdutos();
  atualizarTotalEstoque();
  if (document.getElementById("lista-movimentacoes")) {
    atualizarTabelaMovimentacoes();
  }

  // Inicializar contadores
  if (document.getElementById("total-produtos")) {
    calcularTotalProdutos();
  }

  // Inicializar dashboard
  if (document.getElementById("dashboard")) {
    atualizarDashboard();
  }

  // Inicializar dark mode apenas se o elemento existir
  const darkModeToggle = document.getElementById("darkMode");
  if (darkModeToggle) {
    darkModeToggle.onchange = toggleDarkMode;
  }

  // Verificar notificações apenas se o elemento existir
  const notificationsToggle = document.getElementById("notifications");
  if (notificationsToggle) {
    setInterval(verificarNotificacoes, 300000); // 5 minutos
  }
}

// Modificar o window.onload
window.onload = () => {
  try {
    initializeUI();
    console.log("Inicialização concluída com sucesso");
  } catch (error) {
    console.error("Erro na inicialização:", error);
  }
};

function showTab(tabName) {
  // Esconde todas as tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  // Mostra a tab selecionada
  document.getElementById(tabName).classList.add("active");
  document
    .querySelector(`[onclick="showTab('${tabName}')"]`)
    .classList.add("active");
}

function atualizarDashboard() {
  // Atualiza total de itens
  let totalItems = Object.keys(produtos).length;
  document.getElementById("total-items").textContent = totalItems;

  // Atualiza itens críticos
  let itensCriticos = Object.values(produtos).filter(
    (p) => p.quantidade <= 5
  ).length;
  document.getElementById("items-criticos").textContent = itensCriticos;

  // Atualiza última atualização
  document.getElementById("ultima-atualizacao").textContent =
    new Date().toLocaleTimeString();

  // Atualiza movimentações do dia
  let hoje = new Date().toLocaleDateString();
  let movHoje = movimentacoes.filter((m) => m.data.includes(hoje)).length;
  document.getElementById("movimentacoes-hoje").textContent = movHoje;

  // Calcula tendência
  let tendencia = calcularTendencia();
  document.getElementById("tendencia").textContent = tendencia;
}

function calcularTendencia() {
  let hoje = new Date().toLocaleDateString();
  let movHoje = movimentacoes.filter((m) => m.data.includes(hoje));
  let entradas = movHoje.filter((m) => m.tipo === "entrada").length;
  let saidas = movHoje.filter((m) => m.tipo === "saida").length;

  if (entradas > saidas) return "Em Alta ↑";
  if (saidas > entradas) return "Em Baixa ↓";
  return "Estável →";
}

function logout() {
  if (confirm("Deseja realmente sair?")) {
    window.location.href = "login.html";
  }
}

// Atualizar dashboard a cada minuto
setInterval(atualizarDashboard, 60000);

// Sistema de Notificações
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

// Modal
function showModal(content) {
  const modalHTML = `
        <div id="modal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                ${content}
            </div>
        </div>
    `;

  // Remove modal anterior se existir
  const oldModal = document.getElementById("modal");
  if (oldModal) {
    oldModal.remove();
  }

  // Adiciona novo modal
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("modal");
  const closeBtn = modal.querySelector(".close");

  modal.style.display = "block";

  // Eventos para fechar o modal
  closeBtn.onclick = () => closeModal();
  window.onclick = (event) => {
    if (event.target === modal) {
      closeModal();
    }
  };
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) {
    modal.style.display = "none";
    modal.remove();
  }
}

// Dark Mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDarkMode = document.body.classList.contains("dark-mode");
  try {
    localStorage.setItem("darkMode", isDarkMode);
  } catch (error) {
    console.warn("Não foi possível salvar preferência de tema:", error);
  }
}

// Activity Feed
function addActivity(activity) {
  const feed = document.getElementById("activity-feed");
  const item = document.createElement("div");
  item.className = "activity-item";
  item.innerHTML = `
        <i class="fas fa-clock"></i>
        ${activity}
        <small>${new Date().toLocaleTimeString()}</small>
    `;
  feed.insertBefore(item, feed.firstChild);

  if (feed.children.length > 10) {
    feed.removeChild(feed.lastChild);
  }
}

// Backup e Restauração
function backupDados() {
  const dados = {
    produtos,
    movimentacoes,
    configuracoes: {
      darkMode: document.body.classList.contains("dark-mode"),
      alertThreshold: document.getElementById("alertThreshold").value,
    },
  };

  const blob = new Blob([JSON.stringify(dados)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_estoque_${new Date().toISOString().split("T")[0]}.json`;
  a.click();

  showToast("Backup realizado com sucesso!", "success");
}

function restaurarDados() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const dados = JSON.parse(event.target.result);
        produtos = dados.produtos;
        movimentacoes = dados.movimentacoes;

        if (dados.configuracoes) {
          document.body.classList.toggle(
            "dark-mode",
            dados.configuracoes.darkMode
          );
          document.getElementById("alertThreshold").value =
            dados.configuracoes.alertThreshold;
        }

        salvarDados();
        atualizarTabelaProdutos();
        atualizarTabelaMovimentacoes();
        showToast("Dados restaurados com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao restaurar dados!", "error");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

// Gestão de Categorias
function adicionarCategoria() {
  showModal(`
        <h3>Nova Categoria</h3>
        <input type="text" id="nova-categoria" placeholder="Nome da categoria">
        <button onclick="salvarCategoria()">Salvar</button>
    `);
}

function salvarCategoria() {
  const categoria = document.getElementById("nova-categoria").value.trim();
  if (categoria) {
    const categorias = JSON.parse(localStorage.getItem("categorias") || "[]");
    categorias.push(categoria);
    localStorage.setItem("categorias", JSON.stringify(categorias));
    atualizarCategorias();
    closeModal();
    showToast("Categoria adicionada com sucesso!", "success");
  }
}

// Função verificarNotificacoes modificada para ser mais segura
function verificarNotificacoes() {
  const threshold = document.getElementById("alertThreshold");
  const notifications = document.getElementById("notifications");

  if (!threshold || !notifications || !notifications.checked) return;

  const thresholdValue = threshold.value || 5;
  const itensCriticos = Object.entries(produtos).filter(
    ([_, produto]) => produto.quantidade <= thresholdValue
  );

  if (itensCriticos.length > 0) {
    showToast(`${itensCriticos.length} itens com estoque crítico!`, "warning");
  }
}

// Função para buscar produtos
async function buscarProdutos() {
  const tipo = document.getElementById("tipo-busca").value.toLowerCase().trim();
  const modelo = document
    .getElementById("modelo-busca")
    .value.toLowerCase()
    .trim();
  const patrimonio = document
    .getElementById("patrimonio-busca")
    .value.toLowerCase()
    .trim();
  const serie = document
    .getElementById("serie-busca")
    .value.toLowerCase()
    .trim();

  try {
    const response = await fetch("/api/produtos");
    if (!response.ok) throw new Error("Erro ao buscar produtos");

    const produtos = await response.json();
    const resultados = {};

    produtos.forEach((produto) => {
      const produtoTipo = (produto.tipo || "").toLowerCase();
      const produtoModelo = (produto.modelo || "").toLowerCase();
      const produtoPatrimonio = (produto.patrimonio || "").toLowerCase();
      const produtoSerie = (produto.numero_serie || "").toLowerCase();

      if (
        (!tipo || produtoTipo.includes(tipo)) &&
        (!modelo || produtoModelo.includes(modelo)) &&
        (!patrimonio || produtoPatrimonio.includes(patrimonio)) &&
        (!serie || produtoSerie.includes(serie))
      ) {
        const chave = `${produto.tipo}-${produto.modelo}-${produto.patrimonio}-${produto.numero_serie}`;

        if (!resultados[chave]) {
          resultados[chave] = {
            ids: [],
            tipo: produto.tipo || "N/A",
            categoria: produto.categoria_nome || "N/A",
            modelo: produto.modelo || "N/A",
            patrimonio: produto.patrimonio || "N/A",
            numero_serie: produto.numero_serie || "N/A",
            quantidade: 0,
          };
        }

        if (!isNaN(produto.quantidade)) {
          resultados[chave].quantidade += parseInt(produto.quantidade);
        }
        resultados[chave].ids.push(produto.id);
      }
    });

    atualizarTabelaResultados(resultados);
    mostrarResumoResultados(resultados);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      "Erro ao buscar produtos",
      "erro"
    );
  }
}

function atualizarTabelaResultados(resultados) {
  const tbody = document.getElementById("lista-produtos");
  tbody.innerHTML = "";

  for (let chave in resultados) {
    const item = resultados[chave];
    const id = item.ids[0]; // Garantir que temos o ID correto
    console.log("ID do produto na linha:", id); // Log para debug

    const row = tbody.insertRow();
    row.innerHTML = `
            <td>${id}</td>                         <!-- ID -->
            <td>${item.categoria}</td>             <!-- Categoria -->
            <td>${item.tipo}</td>                  <!-- Tipo -->
            <td>${item.modelo}</td>                <!-- Modelo -->
            <td>${item.numero_serie}</td>          <!-- Número de Série -->
            <td>${item.patrimonio}</td>            <!-- Patrimônio -->
            <td class="${item.quantidade <= 5 ? "baixo-estoque" : ""}">${
      item.quantidade
    }</td>  <!-- Quantidade -->
            <td class="acoes">                     <!-- Ações -->
                <button onclick="editarProduto('${id}')" class="btn-edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="excluirProduto('${id}')" class="btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
  }
}

function mostrarResumoResultados(resultados) {
  const totalItens = Object.values(resultados).reduce(
    (sum, item) => sum + item.quantidade,
    0
  );
  const totalModelos = Object.keys(resultados).length;

  document.getElementById("resultado-busca").innerHTML = `
        <div class="resumo-busca">
            <h3>Resumo da Busca</h3>
            <p>Total de Modelos Encontrados: ${totalModelos}</p>
            <p>Quantidade Total de Itens: ${totalItens}</p>
        </div>
    `;
}

function verDetalhes(tipo, modelo, patrimonio) {
  const detalhes = Object.entries(produtos)
    .filter(
      ([_, produto]) =>
        produto.tipo === tipo &&
        produto.modelo === modelo &&
        produto.patrimonio === patrimonio
    )
    .map(([id, produto]) => ({ id, ...produto }));

  let conteudoHTML = `
        <h3>Detalhes: ${tipo} - ${modelo}</h3>
        <p>Patrimônio: ${patrimonio}</p>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Categoria</th>
                    <th>Número de Série</th>
                    <th>Patrimônio</th>
                    <th>Quantidade</th>
                </tr>
            </thead>
            <tbody>
                ${detalhes
                  .map(
                    (item) => `
                    <tr>
                        <td>${item.id}</td>
                        <td>${item.categoria_nome}</td>
                        <td>${item.numero_serie || "N/A"}</td>
                        <td>${item.patrimonio || "N/A"}</td>
                        <td>${item.quantidade}</td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
    `;

  showModal(conteudoHTML);
}

// Adicionar event listeners para busca em tempo real
document.getElementById("tipo-busca").addEventListener("input", buscarProdutos);
document
  .getElementById("modelo-busca")
  .addEventListener("input", buscarProdutos);
document
  .getElementById("patrimonio-busca")
  .addEventListener("input", buscarProdutos);
document
  .getElementById("serie-busca")
  .addEventListener("input", buscarProdutos);

// Adicionar evento para monitorar mudanças no campo de categoria
document.getElementById("categoria").addEventListener("change", function () {
  const categoriaNormalizada = this.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const serieInput = document.getElementById("serie");
  const patrimonioInput = document.getElementById("patrimonio");

  if (categoriaNormalizada === "perifericos") {
    // Se for periférico, remove o required e adiciona placeholder indicando opcional
    serieInput.removeAttribute("required");
    patrimonioInput.removeAttribute("required");
    serieInput.placeholder = "Opcional para periféricos";
    patrimonioInput.placeholder = "Opcional para periféricos";
  } else {
    // Se não for periférico, mantém os campos como opcionais mas atualiza o placeholder
    serieInput.removeAttribute("required");
    patrimonioInput.removeAttribute("required");
    serieInput.placeholder = "Digite o número de série";
    patrimonioInput.placeholder = "Digite o número do patrimônio";
  }
});

// Modificar a validação do formulário
document
  .getElementById("produto-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const categoria = document.getElementById("categoria").value;
    const patrimonio = document.getElementById("patrimonio").value;
    const serie = document.getElementById("serie").value;

    // Se não for periférico, valida que pelo menos um dos campos esteja preenchido
    if (categoria.toLowerCase() !== "perifericos" && !patrimonio && !serie) {
      exibirMensagem(
        document.getElementById("mensagem-produto"),
        "Você deve preencher pelo menos um dos campos: Patrimônio ou Número de Série",
        "erro"
      );
      return;
    }

    // Continua com o resto da lógica de submissão do formulário
    // ... resto do código existente ...
  });

// Adicionar função para filtrar por categoria
function filtrarPorCategoria(categoria) {
  const rows = document.querySelectorAll("#lista-produtos tr");
  rows.forEach((row) => {
    const categoriaCell = row.cells[1]; // Ajuste o índice conforme necessário
    if (categoria === "" || categoriaCell.textContent === categoria) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Adicionar evento de mudança para o filtro de categoria (se existir)
const filtroCategoria = document.getElementById("filtro-categoria");
if (filtroCategoria) {
  filtroCategoria.addEventListener("change", (e) => {
    filtrarPorCategoria(e.target.value);
  });
}

// Adicionar estilos para os botões
const style = document.createElement("style");
style.textContent = `
    .btn-edit, .btn-delete {
        padding: 5px 10px;
        margin: 0 2px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .btn-edit {
        background-color: #2196F3;
        color: white;
    }

    .btn-delete {
        background-color: #f44336;
        color: white;
    }

    .btn-edit:hover, .btn-delete:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(style);

// Função para gerar relatório
async function gerarRelatorio(event) {
  event.preventDefault();

  const tipo = document.getElementById("tipo-relatorio").value;
  const categoria = document.getElementById("filtro-categoria").value;
  const tipoFiltro = document.getElementById("filtro-tipo").value;

  try {
    let url = "/api/relatorios/gerar?";
    if (tipo) url += `tipo=${tipo}&`;
    if (categoria) url += `categoria=${categoria}&`;
    if (tipoFiltro) url += `tipoFiltro=${tipoFiltro}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao gerar relatório");

    const dados = await response.json();
    exibirRelatorio(dados, tipo);
  } catch (error) {
    console.error("Erro:", error);
    exibirMensagem(
      document.getElementById("mensagem-relatorio"),
      "Erro ao gerar relatório",
      "erro"
    );
  }
}

// Função para exibir relatório
function exibirRelatorio(dados, tipo) {
  const container = document.getElementById("resultado-relatorio");
  let html = "";

  if (tipo === "produtos") {
    html = `
            <table>
                <thead>
                    <tr>
                        <th>Categoria</th>
                        <th>Tipo</th>
                        <th>Modelo</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${dados
                      .map(
                        (item) => `
                        <tr>
                            <td>${item.categoria_nome}</td>
                            <td>${item.tipo}</td>
                            <td>${item.modelo}</td>
                            <td>${item.quantidade}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  } else if (tipo === "movimentacoes") {
    html = `
            <table>
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Modelo</th>
                        <th>Quantidade</th>
                        <th>Destino</th>
                    </tr>
                </thead>
                <tbody>
                    ${dados
                      .map(
                        (item) => `
                        <tr>
                            <td>${item.tipo_movimentacao}</td>
                            <td>${item.modelo}</td>
                            <td>${item.quantidade}</td>
                            <td>${item.destino}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  }

  container.innerHTML = html;
}

// Função para exportar para Excel
function exportarExcel() {
  const tabela = document.querySelector("#resultado-relatorio table");
  if (!tabela) {
    alert("Gere um relatório primeiro!");
    return;
  }

  const wb = XLSX.utils.table_to_book(tabela);
  XLSX.writeFile(wb, "relatorio.xlsx");
}

// Função para inicializar os relatórios
async function inicializarRelatorios() {
  await atualizarRelatorios();
  inicializarGrafico();
  setInterval(atualizarRelatorios, 300000); // Atualiza a cada 5 minutos
  atualizarHorario();
  setInterval(atualizarHorario, 60000); // Atualiza o horário a cada minuto
}

// Função para atualizar o horário
function atualizarHorario() {
  const agora = new Date();
  document.getElementById("ultima-atualizacao").textContent =
    agora.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
}

// Função principal para atualizar todos os relatórios
async function atualizarRelatorios() {
  try {
    const response = await fetch("/api/relatorios/dados-completos");
    const dados = await response.json();

    atualizarResumoGeral(dados.resumo);
    atualizarAlertas(dados.alertas);
    atualizarProdutosCriticos(dados.produtosCriticos);
    atualizarUltimasMovimentacoes(dados.ultimasMovimentacoes);
    atualizarDistribuicaoCategorias(dados.distribuicaoCategorias);
    atualizarGrafico(dados.dadosGrafico);

    showToast("Dados atualizados com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao atualizar relatórios:", error);
    showToast("Erro ao atualizar relatórios", "error");
    document.getElementById("status-sistema").className = "status-inativo";
  }
}

// Função para atualizar o resumo geral
function atualizarResumoGeral(dados) {
  document.getElementById("total-produtos-relatorio").textContent =
    dados.totalProdutos.toLocaleString();
  document.getElementById("total-categorias").textContent =
    dados.totalCategorias.toLocaleString();
  document.getElementById("movimentacoes-dia").textContent =
    dados.movimentacoesDia.toLocaleString();
  document.getElementById(
    "valor-total-estoque"
  ).textContent = `R$ ${dados.valorTotalEstoque.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })}`;
}

// Função para atualizar alertas
function atualizarAlertas(alertas) {
  const container = document.getElementById("sistema-alertas");
  container.innerHTML = alertas
    .map(
      (alerta) => `
        <div class="alerta-item ${alerta.tipo}">
            <i class="fas ${
              alerta.tipo === "critico"
                ? "fa-exclamation-circle"
                : "fa-info-circle"
            }"></i>
            <div class="alerta-conteudo">
                <span class="alerta-titulo">${alerta.titulo}</span>
                <span class="alerta-mensagem">${alerta.mensagem}</span>
            </div>
        </div>
    `
    )
    .join("");
}

// Função para atualizar produtos críticos
function atualizarProdutosCriticos(produtos) {
  const container = document.getElementById("produtos-criticos");
  if (produtos.length === 0) {
    container.innerHTML =
      '<div class="sem-dados">Nenhum produto em estado crítico</div>';
    return;
  }

  container.innerHTML = `
        <table class="tabela-dados">
            <thead>
                <tr>
                    <th>Categoria</th>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${produtos
                  .map(
                    (p) => `
                    <tr>
                        <td>${p.categoria_nome}</td>
                        <td>${p.tipo} - ${p.modelo}</td>
                        <td class="quantidade ${
                          p.quantidade <= 3 ? "critico" : "alerta"
                        }">${p.quantidade}</td>
                        <td>
                            <span class="status-badge ${
                              p.quantidade <= 3 ? "critico" : "alerta"
                            }">
                                ${p.quantidade <= 3 ? "CRÍTICO" : "BAIXO"}
                            </span>
                        </td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
    `;
}

// Função para atualizar últimas movimentações
function atualizarUltimasMovimentacoes(movimentacoes) {
  const container = document.getElementById("ultimas-movimentacoes");
  container.innerHTML = `
        <table class="tabela-dados">
            <thead>
                <tr>
                    <th>Data/Hora</th>
                    <th>Tipo</th>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${movimentacoes
                  .map(
                    (m) => `
                    <tr>
                        <td>${new Date(m.data_movimentacao).toLocaleString(
                          "pt-BR"
                        )}</td>
                        <td>
                            <span class="tipo-badge ${m.tipo_movimentacao.toLowerCase()}">
                                ${m.tipo_movimentacao}
                            </span>
                        </td>
                        <td>${m.produto_modelo}</td>
                        <td>${m.quantidade}</td>
                        <td>
                            <span class="status-badge ${m.status.toLowerCase()}">
                                ${m.status}
                            </span>
                        </td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
    `;
}

// Função para inicializar o gráfico
function inicializarGrafico() {
  const ctx = document.getElementById("grafico-movimentacoes").getContext("2d");
  window.graficoMovimentacoes = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Entradas",
          borderColor: "#4CAF50",
          data: [],
        },
        {
          label: "Saídas",
          borderColor: "#f44336",
          data: [],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

// Função para atualizar o gráfico
function atualizarGrafico(dados) {
  window.graficoMovimentacoes.data.labels = dados.labels;
  window.graficoMovimentacoes.data.datasets[0].data = dados.entradas;
  window.graficoMovimentacoes.data.datasets[1].data = dados.saidas;
  window.graficoMovimentacoes.update();
}

// Função para exportar relatório completo
async function exportarRelatorioCompleto() {
  try {
    const response = await fetch("/api/relatorios/dados-completos");
    const dados = await response.json();

    const wb = XLSX.utils.book_new();

    // Adiciona aba de Resumo
    const wsResumo = XLSX.utils.json_to_sheet([
      {
        "Total de Produtos": dados.resumo.totalProdutos,
        "Total de Categorias": dados.resumo.totalCategorias,
        "Movimentações do Dia": dados.resumo.movimentacoesDia,
        "Valor Total em Estoque": dados.resumo.valorTotalEstoque,
      },
    ]);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // Adiciona outras abas
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dados.produtosCriticos),
      "Estoque Crítico"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dados.ultimasMovimentacoes),
      "Movimentações"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dados.distribuicaoCategorias),
      "Categorias"
    );

    // Gera o arquivo
    const dataHora = new Date()
      .toLocaleString("pt-BR")
      .replace(/[\/\s:]/g, "-");
    XLSX.writeFile(wb, `relatorio_estoque_${dataHora}.xlsx`);

    showToast("Relatório exportado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao exportar relatório:", error);
    showToast("Erro ao exportar relatório", "error");
  }
}

// Função para imprimir relatório
function imprimirRelatorio() {
  window.print();
}

// Inicializa os relatórios quando a página carregar
document.addEventListener("DOMContentLoaded", function () {
  console.log("Inicializando relatórios...");

  // Define as datas inicial e final para o último mês
  const hoje = new Date();
  const mesPassado = new Date();
  mesPassado.setMonth(hoje.getMonth() - 1);

  document.getElementById("data-inicio").value = mesPassado
    .toISOString()
    .split("T")[0];
  document.getElementById("data-fim").value = hoje.toISOString().split("T")[0];

  // Adiciona listener para o formulário
  document
    .getElementById("form-relatorio")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      gerarRelatorioMovimentacoes();
    });
});

// Função para gerar relatório de movimentações
async function gerarRelatorioMovimentacoes() {
  console.log("Iniciando geração do relatório...");

  const dataInicio = document.getElementById("data-inicio").value;
  const dataFim = document.getElementById("data-fim").value;

  if (!dataInicio || !dataFim) {
    showToast("Por favor, selecione as datas inicial e final", "error");
    return;
  }

  try {
    const response = await fetch(
      `/api/relatorios/movimentacoes?dataInicio=${dataInicio}&dataFim=${dataFim}`
    );

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const movimentacoes = await response.json();

    if (movimentacoes.length === 0) {
      document.getElementById("resultado-movimentacoes").innerHTML = `
                <div class="sem-dados">
                    Nenhuma movimentação encontrada no período selecionado.
                </div>
            `;
      return;
    }

    const container = document.getElementById("resultado-movimentacoes");
    container.innerHTML = `
            <table class="tabela-dados">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Tipo</th>
                        <th>Categoria</th>
                        <th>Produto</th>
                        <th>Nº Série</th>
                        <th>Patrimônio</th>
                        <th>Qtd</th>
                        <th>Destino</th>
                        <th>Usuário</th>
                        <th>Chamado</th>
                    </tr>
                </thead>
                <tbody>
                    ${movimentacoes
                      .map(
                        (m) => `
                        <tr>
                            <td>${new Date(m.data_movimentacao).toLocaleString(
                              "pt-BR"
                            )}</td>
                            <td>
                                <span class="tipo-badge ${m.tipo_movimentacao.toLowerCase()}">
                                    ${m.tipo_movimentacao}
                                </span>
                            </td>
                            <td>${m.categoria}</td>
                            <td>${m.tipo} - ${m.modelo}</td>
                            <td>${m.numero_serie || "-"}</td>
                            <td>${m.patrimonio || "-"}</td>
                            <td>${m.quantidade}</td>
                            <td>${m.destino || "-"}</td>
                            <td>${m.usuario || "-"}</td>
                            <td>${m.chamado || "-"}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;

    showToast("Relatório gerado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    showToast("Erro ao gerar relatório: " + error.message, "error");
    document.getElementById("resultado-movimentacoes").innerHTML = `
            <div class="erro">
                Erro ao gerar relatório. Por favor, tente novamente mais tarde.
            </div>
        `;
  }
}

// Função para exportar para Excel
function exportarMovimentacoes() {
  const tabela = document.querySelector("#resultado-movimentacoes table");
  if (!tabela) {
    showToast("Gere um relatório primeiro!", "error");
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(tabela);

  // Ajusta largura das colunas
  const wscols = [
    { wch: 20 }, // Data/Hora
    { wch: 10 }, // Tipo
    { wch: 15 }, // Categoria
    { wch: 30 }, // Produto
    { wch: 15 }, // Nº Série
    { wch: 15 }, // Patrimônio
    { wch: 10 }, // Quantidade
    { wch: 20 }, // Destino
    { wch: 20 }, // Usuário
    { wch: 15 }, // Chamado
  ];
  ws["!cols"] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, "Movimentações");

  const dataHora = new Date().toLocaleString("pt-BR").replace(/[\/\s:]/g, "-");
  XLSX.writeFile(wb, `movimentacoes_${dataHora}.xlsx`);
}

// Função para imprimir relatório
function imprimirMovimentacoes() {
  const conteudo = document.getElementById("resultado-movimentacoes").innerHTML;
  const janela = window.open("", "", "height=600,width=800");

  janela.document.write(`
        <html>
            <head>
                <title>Relatório de Movimentações</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; border: 1px solid #ddd; }
                    th { background-color: #f4f4f4; }
                    .tipo-badge {
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.8rem;
                    }
                    .tipo-badge.entrada { background: #e8f5e9; color: #4CAF50; }
                    .tipo-badge.saida { background: #ffebee; color: #f44336; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Relatório de Movimentações</h1>
                <p>Gerado em: ${new Date().toLocaleString("pt-BR")}</p>
                ${conteudo}
            </body>
        </html>
    `);

  janela.document.close();
  janela.focus();
  setTimeout(() => {
    janela.print();
    janela.close();
  }, 1000);
}

// Função para carregar o relatório automaticamente
async function atualizarRelatorio() {
  try {
    console.log("Iniciando busca de movimentações...");
    const response = await fetch("/api/relatorios/todas-movimentacoes");

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const movimentacoes = await response.json();
    console.log("Movimentações recebidas:", movimentacoes.length);

    const container = document.getElementById("tabela-movimentacoes");
    if (!container) {
      console.error("Container de tabela não encontrado");
      return;
    }

    if (movimentacoes.length === 0) {
      container.innerHTML =
        '<div class="sem-dados">Nenhuma movimentação encontrada.</div>';
      return;
    }

    container.innerHTML = `
            <table class="tabela-dados">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Tipo</th>
                        <th>Produto</th>
                        <th>Nº Série</th>
                        <th>Patrimônio</th>
                        <th>Quantidade</th>
                        <th>Usuário</th>
                        <th>Nome</th>
                        <th>Destino</th>
                        <th>Chamado</th>
                    </tr>
                </thead>
                <tbody>
                    ${movimentacoes
                      .map(
                        (m) => `
                        <tr class="${m.tipo_movimentacao.toLowerCase()}-row">
                            <td>${new Date(m.data_movimentacao).toLocaleString(
                              "pt-BR"
                            )}</td>
                            <td>
                                <span class="badge ${m.tipo_movimentacao.toLowerCase()}">
                                    ${m.tipo_movimentacao}
                                </span>
                            </td>
                            <td>${m.tipo} - ${m.modelo}</td>
                            <td>${m.numero_serie || "-"}</td>
                            <td>${m.patrimonio || "-"}</td>
                            <td>${m.quantidade}</td>
                            <td>${m.usuario}</td>
                            <td>${m.nome_usuario || "-"}</td>
                            <td>${m.destino || "-"}</td>
                            <td>${m.chamado || "-"}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  } catch (error) {
    console.error("Erro ao carregar relatório:", error);
    const container = document.getElementById("tabela-movimentacoes");
    if (container) {
      container.innerHTML = `
                <div class="erro">
                    Erro ao carregar o relatório. 
                    <button onclick="atualizarRelatorio()" class="btn-retry">
                        Tentar novamente
                    </button>
                </div>
            `;
    }
  }
}

// Função para exportar para Excel
function exportarRelatorio() {
  const tabela = document.querySelector(".tabela-dados");
  if (!tabela) {
    alert("Nenhum dado para exportar");
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(tabela);
  XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
  XLSX.writeFile(
    wb,
    `relatorio_movimentacoes_${new Date().toLocaleDateString()}.xlsx`
  );
}

// Função para imprimir
function imprimirRelatorio() {
  window.print();
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicializando relatório...");
  atualizarRelatorio();
  // Atualiza a cada 5 minutos
  setInterval(atualizarRelatorio, 300000);
});

// API para buscar categorias
app.get('/api/categorias', async (req, res) => {
  try {
    const categorias = await Categoria.find(); // Supondo que você esteja usando Mongoose

    // Substituir "Hardware" por "Computador"
    categorias.forEach(categoria => {
      if (categoria.nome === 'Hardware') {
        categoria.nome = 'Computador';
      }
    });

    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});
