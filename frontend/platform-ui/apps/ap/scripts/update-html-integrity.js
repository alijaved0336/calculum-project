#!/usr/bin/env node

/**
 * Script para actualizar archivos HTML con atributos integrity
 * basado en los hashes calculados previamente
 */

const fs = require('fs');
const path = require('path');

// Mapeo de entornos a rutas
const ENV_MAP = {
  dev: 'b2cDev',
  pro: 'b2cPro',
  pre: 'b2cPre'
};

// Mapeo de rutas de CloudFront a entornos
const CLOUDFRONT_ENV_MAP = {
  '/d/': 'dev',
  '/p/': 'pro',
  '/s/': 'pre'
};

/**
 * Obtiene el entorno basado en la URL de CloudFront
 */
function getEnvironmentFromUrl(url) {
  for (const [path, env] of Object.entries(CLOUDFRONT_ENV_MAP)) {
    if (url.includes(path)) {
      return env;
    }
  }
  return null;
}

/**
 * Obtiene el nombre del script desde la URL
 */
function getScriptNameFromUrl(url) {
  const match = url.match(/\/([^/]+\.js)$/);
  return match ? match[1] : null;
}

/**
 * Actualiza un archivo HTML agregando el atributo integrity
 */
function updateHtmlFile(filePath, hashes) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Buscar todos los tags <script> con src remoto (incluyendo múltiples líneas)
  // Patrón que captura desde <script hasta >, incluyendo saltos de línea
  const scriptRegex = /<script\s+([\s\S]*?)src=["'](https:\/\/[^"']+)["']([\s\S]*?)>/gi;
  
  content = content.replace(scriptRegex, (match, beforeSrc, url, afterSrc) => {
    // Verificar si ya tiene integrity
    if (match.includes('integrity=')) {
      return match; // Ya tiene integrity, no modificar
    }

    // Obtener entorno y nombre del script
    const env = getEnvironmentFromUrl(url);
    const scriptName = getScriptNameFromUrl(url);

    if (!env || !scriptName || !hashes[scriptName] || !hashes[scriptName][env]) {
      console.warn(`⚠️  No se encontró hash para ${url} en ${path.basename(filePath)}`);
      return match;
    }

    const integrity = hashes[scriptName][env];
    modified = true;

    // Preservar el formato original (múltiples líneas)
    // Agregar integrity en una nueva línea después de src
    const lines = match.split('\n');
    let newMatch = '';
    let srcLineFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      newMatch += line;
      
      // Si encontramos la línea con src, agregar integrity en la siguiente línea
      if (line.includes(`src="${url}"`) && !srcLineFound) {
        srcLineFound = true;
        // Agregar integrity en la siguiente línea, manteniendo la indentación
        const indent = line.match(/^(\s*)/)[1];
        newMatch += '\n' + indent + `integrity="${integrity}"`;
      }
      
      if (i < lines.length - 1) {
        newMatch += '\n';
      }
    }

    console.log(`✅ Agregado integrity a ${scriptName} (${env}) en ${path.basename(filePath)}`);
    return newMatch;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

/**
 * Función principal
 */
function main() {
  const hashesPath = path.join(__dirname, '..', 'integrity-hashes.json');
  
  if (!fs.existsSync(hashesPath)) {
    console.error('❌ No se encontró integrity-hashes.json. Ejecuta primero calculate-integrity-hashes.js');
    process.exit(1);
  }

  const hashes = JSON.parse(fs.readFileSync(hashesPath, 'utf8'));
  const publicDir = path.join(__dirname, '..', 'public');

  const htmlFiles = [
    // b2cDev
    'b2cDev/signin.html',
    'b2cDev/signup.html',
    'b2cDev/change_pwd.html',
    'b2cDev/forgot_pwd.html',
    'b2cDev/signup_email.html',
    'b2cDev/signup_social.html',
    'b2cDev/totp.html',
    'b2cDev/email_idpselector.html',
    // b2cPro
    'b2cPro/signin.html',
    'b2cPro/signup.html',
    'b2cPro/change_pwd.html',
    'b2cPro/forgot_pwd.html',
    'b2cPro/signup_email.html',
    'b2cPro/signup_social.html',
    'b2cPro/totp.html',
    'b2cPro/email_idpselector.html',
    // b2cPre
    'b2cPre/signin.html',
    'b2cPre/signup.html',
    'b2cPre/change_pwd.html',
    'b2cPre/forgot_pwd.html',
    'b2cPre/signup_email.html',
    'b2cPre/signup_social.html',
    'b2cPre/totp.html',
    'b2cPre/email_idpselector.html'
  ];

  console.log('=== Actualizando archivos HTML con atributos integrity ===\n');

  let updatedCount = 0;
  for (const htmlFile of htmlFiles) {
    const filePath = path.join(publicDir, htmlFile);
    if (fs.existsSync(filePath)) {
      if (updateHtmlFile(filePath, hashes)) {
        updatedCount++;
      }
    } else {
      console.warn(`⚠️  Archivo no encontrado: ${filePath}`);
    }
  }

  console.log(`\n✅ Proceso completado. ${updatedCount} archivos actualizados.`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { updateHtmlFile };

