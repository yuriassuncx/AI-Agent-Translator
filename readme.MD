# Shopify JSON Translator 🛍️🌍

Traduza arquivos JSON da plataforma **Shopify** de forma automática, rápida e segura usando **IA local** com [Ollama](https://ollama.com) e o runtime ultrarrápido [Bun](https://bun.sh/). O projeto garante **100% de preservação da estrutura original** do JSON, traduzindo apenas o conteúdo textual relevante para humanos.

---

## ✨ Visão Geral

Este utilitário foi criado para desenvolvedores, agências e lojistas que precisam internacionalizar lojas Shopify sem perder a integridade dos arquivos de configuração. Ele utiliza modelos de linguagem locais (LLMs) para garantir privacidade e controle total sobre os dados.

---

## 🚀 Principais Funcionalidades

- **Tradução automática** de strings, arrays e objetos mantendo a estrutura original do JSON.
- **Detecção inteligente** de valores que não devem ser traduzidos (URLs, HTML, identificadores, números, etc.).
- **Cache local** para evitar retradução de textos já processados, acelerando execuções futuras.
- **Barra de progresso** para acompanhamento em tempo real.
- **Configuração flexível** via linha de comando.
- **Compatível** com múltiplos modelos de IA suportados pelo Ollama.

---

## 📦 Requisitos

Antes de começar, instale:

- [Bun](https://bun.sh/) (runtime JavaScript ultrarrápido)
- [Ollama](https://ollama.com/) (servidor local de modelos de linguagem)
- Um modelo de linguagem suportado pelo Ollama (recomendado: `mistral`, mas também funciona com `llama3`, `gemma`, `deepseek-r1`, etc.)

---

## ⚡ Instalação

1. **Instale o Bun**  
    Siga as instruções em: [bun.sh/docs/installation](https://bun.sh/docs/installation)

2. **Instale o Ollama**  
    Baixe e instale em: [ollama.com/download](https://ollama.com/download)

3. **Baixe o modelo de IA desejado**  
    Exemplo para o modelo `mistral`:
    ```bash
    ollama pull mistral
    ```

4. **Clone este repositório e instale as dependências**  
    ```bash
    git clone https://github.com/seu-usuario/json-translator.git
    cd json-translator
    bun install
    ```

---

## 🛠️ Como Usar

Execute o script de tradução via linha de comando:

```bash
bun run translate.ts --lang=pt-PT --input=input.json --output=results/pt-PT.json --model=mistral
```

### Parâmetros da CLI

| Parâmetro   | Obrigatório | Padrão                | Descrição                                                      |
|-------------|:-----------:|-----------------------|----------------------------------------------------------------|
| `--lang`    | ✅          | -                     | Código do idioma de destino (ex: `pt-PT`, `es`, `fr`)          |
| `--input`   | ✅          | -                     | Caminho do arquivo JSON de entrada                             |
| `--output`  | ❌          | `results/{lang}.json` | Caminho do arquivo de saída (padrão: pasta `results/`)         |
| `--model`   | ❌          | `mistral`             | Nome do modelo usado pelo Ollama                               |

---

## 💡 Exemplos

### Traduzir para Espanhol

```bash
bun run translate.ts --lang=es --input=input.json --output=es.json --model=llama3
```

### Traduzir para Francês (usando modelo padrão)

```bash
bun run translate.ts --lang=fr --input=input.json
```

---

## 📝 Observações

- O script **não traduz** valores que parecem ser URLs, HTML, identificadores ou números.
- O cache é salvo localmente para acelerar traduções repetidas.
- O Ollama deve estar em execução antes de rodar o script.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
