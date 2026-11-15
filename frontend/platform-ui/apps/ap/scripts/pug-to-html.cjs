/**
 * Converts <template lang="pug"> blocks to plain HTML in Vue files.
 * Usage: node scripts/pug-to-html.cjs <file1.vue> [file2.vue ...]
 */

const pug = require('pug')
const fs = require('node:fs')
const path = require('node:path')

const files = process.argv.slice(2)

if (!files.length) {
  console.error('No files provided.')
  process.exit(1)
}

let converted = 0
let errors = 0

for (const filePath of files) {
  const absPath = path.resolve(filePath)
  const content = fs.readFileSync(absPath, 'utf-8')

  const match = content.match(/<template\s+lang=["']pug["']>([\s\S]*?)<\/template>/)
  if (!match) {
    console.log(`SKIP (no pug template): ${filePath}`)
    continue
  }

  const pugContent = match[1]

  // Dedent: some templates have their root element indented (e.g. 2 spaces).
  // PUG requires root elements at column 0, so strip the common leading indent.
  const lines = pugContent.split('\n')
  const firstNonBlank = lines.find(l => l.trim().length > 0)
  const baseIndent = firstNonBlank ? firstNonBlank.match(/^(\s*)/)[1] : ''
  const dedented = baseIndent
    ? lines.map(l => l.startsWith(baseIndent) ? l.slice(baseIndent.length) : l).join('\n')
    : pugContent

  let html
  try {
    // pug.render compiles PUG indentation syntax to HTML.
    // Vue directives (:attr, @event, v-*) are preserved as literal attributes.
    html = pug.render(dedented, { pretty: '  ', filename: absPath }) // NOSONAR
  } catch (e) {
    console.error(`ERROR: ${filePath}\n  ${e.message}`)
    errors++
    continue
  }

  // Pug converts any valueless attribute `foo` to `foo="foo"` in HTML output.
  // Vue directives that are always valueless must be stripped back to bare attrs,
  // otherwise Vue's compiler tries to evaluate "v-else" etc. as JS expressions.
  let fixedHtml = html
    // Valueless Vue directives
    .replace(/\bv-else="v-else"/g, 'v-else')
    .replace(/\bv-pre="v-pre"/g, 'v-pre')
    .replace(/\bv-once="v-once"/g, 'v-once')
    .replace(/\bv-cloak="v-cloak"/g, 'v-cloak')
    // Event listeners used as modifiers-only (no handler): @click.stop="@click.stop"
    .replace(/@([\w.]+)="@\1"/g, '@$1')
    // v-slot: template(v-slot:name) → v-slot:name="v-slot:name"
    .replace(/v-slot:([a-zA-Z0-9_.-]+)="v-slot:\1"/g, 'v-slot:$1')
    .replace(/#([a-zA-Z0-9_.-]+)="#\1"/g, '#$1')

  // Unescape HTML entities inside Vue expression attributes (:attr, @event, v-*).
  // Pug HTML-encodes & < > in attribute values; Vue expressions need raw JS operators.
  fixedHtml = fixedHtml.replace(
    /((?:v-[\w:.-]+|[:@][\w:.-]+)=")((?:[^"\\]|\\.)*?)(")/g,
    (_, prefix, value, suffix) => {
      const decoded = value
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&#39;', "'")
        .replaceAll('&quot;', "'")
      return prefix + decoded + suffix
    }
  )

  // Trim trailing whitespace per line
  const cleanHtml = fixedHtml
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim()

  const newContent = content.replace(
    /<template\s+lang=["']pug["']>[\s\S]*?<\/template>/,
    `<template>\n${cleanHtml}\n</template>`
  )

  fs.writeFileSync(absPath, newContent, 'utf-8')
  console.log(`OK: ${filePath}`)
  converted++
}

console.log(`\nDone: ${converted} converted, ${errors} errors.`)
