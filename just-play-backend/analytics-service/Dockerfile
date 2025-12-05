# 1. Base image (gunakan base image Azure Functions Node.js)
FROM mcr.microsoft.com/azure-functions/node:4-node18-appservice

# 2. Atur Working Directory
WORKDIR /home/site/wwwroot

# 3. Salin file package.json dan install dependensi
COPY package*.json ./
RUN npm install

# 4. Salin semua file project (termasuk host.json dan src)
COPY . .

# 5. [KRITIS] Set environment variable untuk Custom Handler
# Ini memastikan host Functions tahu cara menjalankan worker Anda
ENV AzureWebJobsScriptRoot=/home/site/wwwroot