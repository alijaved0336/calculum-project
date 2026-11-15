/**
 * Repairs double quotes inside Vue bound attributes that were broken by
 * the pug-to-html conversion (pug encoded " as &quot;, then we decoded
 * &quot; → " which terminates the HTML attribute delimiter).
 *
 * Fixes applied:
 *   1. $t("key") → $t('key')  inside attribute values
 *   2. === "word" / !== "word" → === 'word' / !== 'word' inside attribute values
 *   3. Template literals with embedded " → use ' instead
 *
 * Usage: node scripts/fix-inner-quotes.cjs <file1.vue> [file2.vue ...]
 */

const fs = require('node:fs')
const path = require('node:path')

const files = process.argv.slice(2)
if (!files.length) { console.error('No files provided.'); process.exit(1) }

let fixed = 0

for (const filePath of files) {
  const absPath = path.resolve(filePath)
  let content = fs.readFileSync(absPath, 'utf-8')
  const original = content

  // 1. $t("some.key") → $t('some.key') — safe globally, semantically identical
  content = content.replace(/\$t\("([\w.]+)"\)/g, (_, key) => `$t('${key}')`)

  // 2. === "literal" and !== "literal" — safe globally
  content = content.replace(/(===\s*)"([^"<>\n]+)"/g, "$1'$2'")
  content = content.replace(/(!==\s*)"([^"<>\n]+)"/g, "$1'$2'")

  // 3. Template literal with embedded " inside a double-quoted attribute:
  //    :title="`Search: "${searchQuery}"`" → :title="`Search: '${searchQuery}'`"
  //    Pattern: inside `:attr="` ... `"` boundaries, replace " inside template literals
  //    This handles the specific pattern `"${...}"` → `'${...}'`
  content = content.replace(/(`[^`"]*)"(\$\{[^}]+\})"/g, "$1'$2'")

  if (content !== original) {
    fs.writeFileSync(absPath, content, 'utf-8')
    console.log(`Fixed: ${filePath}`)
    fixed++
  } else {
    console.log(`No change: ${filePath}`)
  }
}

console.log(`\nDone: ${fixed} files updated.`)
