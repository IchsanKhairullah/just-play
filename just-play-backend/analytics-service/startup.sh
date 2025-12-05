#!/bin/bash

# Log awal sebelum memulai node
echo "--- STARTUP DIAGNOSTIC: Attempting to start Node Worker ---"

# Jalankan perintah node Anda
# $FUNCTIONS_WORKER_DIRECTORY adalah /home/site/wwwroot
cd $FUNCTIONS_WORKER_DIRECTORY 
/usr/local/bin/node src/index.js # Gunakan path node yang eksplisit jika perlu, atau cukup 'node'

# Log jika node worker keluar (berarti crash)
echo "--- STARTUP DIAGNOSTIC: Node Worker process exited! ---"