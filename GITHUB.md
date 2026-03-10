# Como subir o projeto para o GitHub

## 1. Instalar o Git (se ainda não tiver)

Baixe em: https://git-scm.com/download/win

## 2. Configurar o Git (primeira vez)

Abra o terminal e execute:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

## 3. Criar o repositório no GitHub

1. Acesse [github.com](https://github.com)
2. Clique em **+** → **New repository**
3. Nome: `chonline` (ou outro)
4. Deixe **público**
5. **Não** marque "Add a README" (o projeto já tem arquivos)
6. Clique em **Create repository**

## 4. Subir o projeto

No terminal, dentro da pasta do projeto (`e:\ChOnline`):

```bash
# Inicializar o Git
git init

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "Aero Chamados - Sistema de chamados com Supabase"

# Renomear branch para main (padrão do GitHub)
git branch -M main

# Conectar ao repositório
git remote add origin https://github.com/k1ngdantas/chonline.git

# Enviar para o GitHub
git push -u origin main
```

## 5. Se pedir usuário e senha

O GitHub não aceita mais senha comum. Use um **Personal Access Token**:

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. **Generate new token** → marque `repo`
3. Copie o token
4. Quando o Git pedir senha, use o token no lugar da senha

Ou use o **GitHub Desktop**: https://desktop.github.com

---

## Arquivos que NÃO serão enviados (por segurança)

- `.env` – suas chaves do Supabase
- `data.json` – dados locais
- `node_modules/` – dependências (são instaladas com `npm install`)
