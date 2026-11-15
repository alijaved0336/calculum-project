#!/usr/bin/env node

/**
 * Script para calcular hashes SHA-384 de archivos remotos desde CloudFront
 * y generar el atributo integrity para usar en tags <script>
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuración de archivos y entornos
const CLOUDFRONT_BASE = 'https://d31zvqb0ivkacw.cloudfront.net';
const ENVIRONMENTS = {
  dev: 'd',
  pro: 'p',
  pre: 's'
};

const SCRIPTS = [
  'script.js',
  'reset_pwd.js',
  'forgot_pwd.js',
  'signup_step_1.js',
  'signup_step_2.js',
  'totp.js',
  'email_idpselector.js'
];

/**
 * Descarga un archivo desde una URL
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Calcula el hash SHA-384 de un contenido
 */
function calculateSHA384(content) {
  const hash = crypto.createHash('sha384');
  hash.update(content, 'utf8');
  return hash.digest('base64');
}

/**
 * Procesa un script y calcula su hash
 */
async function processScript(scriptName, environment) {
  const envPath = ENVIRONMENTS[environment];
  const url = `${CLOUDFRONT_BASE}/${envPath}/${scriptName}`;
  
  try {
    console.log(`Descargando ${url}...`);
    const content = await downloadFile(url);
    const hash = calculateSHA384(content);
    const integrity = `sha384-${hash}`;
    
    return {
      scriptName,
      environment,
      url,
      integrity,
      hash
    };
  } catch (error) {
    console.error(`Error procesando ${url}:`, error.message);
    return null;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('=== Calculando hashes de integridad para scripts CloudFront ===\n');
  
  const results = {};
  
  // Procesar cada script en cada entorno
  for (const script of SCRIPTS) {
    results[script] = {};
    
    for (const env of Object.keys(ENVIRONMENTS)) {
      const result = await processScript(script, env);
      if (result) {
        results[script][env] = result.integrity;
        console.log(`✅ ${script} (${env}): ${result.integrity}\n`);
      }
      
      // Pequeña pausa para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Guardar resultados en un archivo JSON
  const outputPath = path.join(__dirname, '..', 'integrity-hashes.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Hashes guardados en: ${outputPath}`);
  console.log('\n=== Resumen ===');
  console.log(JSON.stringify(results, null, 2));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processScript, calculateSHA384 };

