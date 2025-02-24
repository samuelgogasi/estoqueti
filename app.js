// Substitua o localStorage por chamadas à API
const API_URL = 'http://localhost:5000/api';

// Funções de API
async function fetchProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();
    atualizarTabelaProdutos(products);
    calcularTotalProdutos(products);
    return products;
  } catch (error) {
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      "Erro ao carregar produtos",
      "erro"
    );
  }
}

async function addProduct(productData) {
  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      throw new Error('Erro ao adicionar produto');
    }
    
    const newProduct = await response.json();
    await fetchProducts(); // Atualiza a lista
    return newProduct;
  } catch (error) {
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      error.message,
      "erro"
    );
  }
}

async function deleteProduct(id) {
  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Erro ao excluir produto');
    }
    
    await fetchProducts(); // Atualiza a lista
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      "Produto excluído com sucesso!",
      "sucesso"
    );
  } catch (error) {
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      error.message,
      "erro"
    );
  }
}

async function registerMovement(movementData) {
  try {
    const response = await fetch(`${API_URL}/movements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(movementData)
    });
    
    if (!response.ok) {
      throw new Error('Erro ao registrar movimentação');
    }
    
    const newMovement = await response.json();
    await fetchMovements(); // Atualiza a lista de movimentações
    await fetchProducts(); // Atualiza os produtos
    return newMovement;
  } catch (error) {
    exibirMensagem(
      document.getElementById("mensagem-movimentacao"),
      error.message,
      "erro"
    );
  }
}

async function fetchMovements() {
  try {
    const response = await fetch(`${API_URL}/movements`);
    const movements = await response.json();
    atualizarTabelaMovimentacoes(movements);
    return movements;
  } catch (error) {
    exibirMensagem(
      document.getElementById("mensagem-movimentacao"),
      "Erro ao carregar movimentações",
      "erro"
    );
  }
}

// Event Listeners
document.getElementById("produto-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  
  const productData = {
    name: document.getElementById("nome").value.trim(),
    category: document.getElementById("categoria").value.trim(),
    brand: document.getElementById("marca").value.trim(),
    serialNumber: document.getElementById("serie").value.trim(),
    quantity: parseInt(document.getElementById("quantidade").value)
  };

  if (!productData.name || !productData.category || !productData.brand || 
      !productData.serialNumber || isNaN(productData.quantity) || productData.quantity <= 0) {
    exibirMensagem(
      document.getElementById("mensagem-produto"),
      "Preencha todos os campos corretamente.",
      "erro"
    );
    return;
  }

  await addProduct(productData);
  document.getElementById("serie").value = "";
  document.getElementById("quantidade").value = "";
  document.getElementById("serie").focus();
});

document.getElementById("movimentacao-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  
  const movementData = {
    user: document.getElementById("usuario").value.trim(),
    productId: document.getElementById("produto").value.trim(),
    serialNumber: document.getElementById("serie-mov").value.trim(),
    quantity: parseInt(document.getElementById("quantidade-mov").value),
    type: document.getElementById("tipo-mov").value,
    ticketNumber: document.getElementById("chamado").value.trim()
  };

  await registerMovement(movementData);
  this.reset();
});

// Funções auxiliares
function exibirMensagem(elemento, mensagem, tipo) {
  elemento.innerHTML = mensagem;
  elemento.className = `mensagem ${tipo}`;
  setTimeout(() => (elemento.innerHTML = ""), 3000);
}

function atualizarTabelaProdutos(products) {
  const listaProdutos = document.getElementById("lista-produtos");
  listaProdutos.innerHTML = "";

  products.forEach(product => {
    const newRow = listaProdutos.insertRow();
    newRow.innerHTML = `
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.brand}</td>
      <td>${product.serialNumber}</td>
      <td class="${product.quantity <= 5 ? "baixo-estoque" : ""}">${product.quantity}</td>
      <td class="acoes">
        <button onclick="editarProduto('${product._id}')">Editar</button>
        <button onclick="excluirProduto('${product._id}')">Excluir</button>
      </td>
    `;
  });
}

function atualizarTabelaMovimentacoes(movements) {
  const listaMovimentacoes = document.getElementById("lista-movimentacoes");
  listaMovimentacoes.innerHTML = "";

  movements.forEach(mov => {
    const newRow = listaMovimentacoes.insertRow();
    newRow.innerHTML = `
      <td>${mov.user}</td>
      <td>${mov.product.name}</td>
      <td>${mov.serialNumber}</td>
      <td>${mov.quantity}</td>
      <td>${mov.type}</td>
      <td>${mov.ticketNumber || 'N/A'}</td>
      <td>${new Date(mov.date).toLocaleString()}</td>
    `;
  });
}

function calcularTotalProdutos(products) {
  const total = products.reduce((sum, product) => sum + product.quantity, 0);
  document.getElementById("total-produtos").textContent = `Total em estoque: ${total}`;
}

// Inicialização
window.onload = async () => {
  await fetchProducts();
  await fetchMovements();
};

// Funções de filtro
function filtrarProdutos() {
  const busca = document.getElementById("busca-produto").value.toLowerCase();
  const linhas = document.querySelectorAll("#lista-produtos tr");

  linhas.forEach(linha => {
    const texto = Array.from(linha.cells)
      .slice(0, 4)
      .map(cell => cell.textContent.toLowerCase())
      .join(' ');
    
    linha.style.display = texto.includes(busca) ? "" : "none";
  });
}

function filtrarMovimentacoes() {
  const filtro = document.getElementById("filtro-movimentacao").value;
  const linhas = document.querySelectorAll("#lista-movimentacoes tr");

  linhas.forEach(linha => {
    const tipo = linha.cells[4].textContent.toLowerCase();
    linha.style.display = filtro === "todos" || tipo === filtro ? "" : "none";
  });
} 