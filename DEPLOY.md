# Como colocar o Aero Chamados online

## Opções de hospedagem

### 1. **Render** (recomendado – gratuito)
1. Crie conta em [render.com](https://render.com)
2. Clique em **New** → **Web Service**
3. Conecte seu repositório GitHub (ou faça upload do projeto)
4. Configure:
   - **Build Command:** (deixe vazio)
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
5. Clique em **Create Web Service**
6. Aguarde o deploy – sua URL será algo como `https://seu-app.onrender.com`

### 2. **Railway**
1. Crie conta em [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub** (ou upload)
3. Railway detecta o Node.js e usa `node server.js` automaticamente
4. Gera uma URL pública automaticamente

### 3. **Glitch**
1. Acesse [glitch.com](https://glitch.com)
2. **New Project** → **Import from GitHub** (ou crie novo)
3. Cole os arquivos do projeto
4. O arquivo `package.json` com `"start": "node server.js"` já é suficiente
5. Clique em **Show** para ver a URL pública

### 4. **VPS próprio** (DigitalOcean, Hostinger, etc.)
1. Contrate um servidor Linux (Ubuntu)
2. Instale Node.js: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
3. Envie os arquivos (FTP, SCP ou Git)
4. Execute: `node server.js` (ou use PM2 para manter rodando)
5. Configure um proxy reverso (Nginx) e domínio se quiser

---

## Antes de publicar

### 1. Coloque o projeto no GitHub
```bash
cd e:\ChOnline
git init
git add .
git commit -m "Sistema Aero Chamados"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/chonline.git
git push -u origin main
```

### 2. Crie um `.gitignore` (para não subir dados sensíveis)
```
node_modules/
.env
*.log
```

### 3. Variáveis de ambiente
O servidor já usa `process.env.PORT` – as plataformas definem isso automaticamente.

---

## Acesso após o deploy

- **Login:** use a URL gerada (ex: `https://seu-app.onrender.com/login.html`)
- **Dados:** o `data.json` é criado/atualizado no servidor
- **Importante:** no plano gratuito, o servidor pode “dormir” após inatividade; a primeira requisição pode demorar alguns segundos

---

## Dica de segurança em produção

Para uso real, considere:
1. Usar HTTPS (a maioria das plataformas já oferece)
2. Trocar senhas padrão dos usuários admin
3. Em cenários maiores, migrar de `data.json` para um banco de dados (SQLite, PostgreSQL, etc.)
