# SonarQube Integration with Azure DevOps

## Overview
This document explains how to integrate SonarQube analysis with code coverage into your Azure DevOps pipeline.

## Prerequisites
- SonarQube server running at: `https://sonar.hello-ada.com/`
- Access to Azure DevOps project settings
- **One SonarQube project per app** (see "Monorepo layout" below):

| App | Properties file | Project key | Analysed by |
|---|---|---|---|
| AP | `apps/ap/sonar-project.properties` | `ADA_Front-End_AYqAasuhutDbsRQ9ANWo` | defs 207 (PR) and 208 (deploy) |
| AR | `apps/ar/sonar-project.properties` | `Front-End-AR` | defs 209 (PR) and 210 (deploy) |
| APV2 | `apps/apv2/sonar-project.properties` | `ADA_Front-End_APV2` | nothing yet - no pipeline |

> The keys **must stay distinct**. Until 2026-08 the AR file was a byte-for-byte copy of
> AP's, key included, so both apps published into the AP project and whichever pipeline
> finished last overwrote the other's analysis - making `ncloc` flip between ~5,900 and
> ~236,000 between runs. See WI 19546. Distinct keys fix the analyses; they do not separate
> the pull request badge - see point 3 of Monorepo layout for why.

## Monorepo layout

This repository holds several apps (`apps/ap`, `apps/ar`, `apps/apv2`) plus shared
packages (`packages/auth`, `packages/core`, `packages/design-system`). The rules are:

1. **One Sonar project per deployable app**, each with its own `projectKey`. A single
   project spanning both apps would merge their new-code periods, coverage and Quality
   Gate, so an AR change could fail on AP's debt.
2. **`sonar.projectBaseDir` is set by the pipeline, never in the properties file.** Each
   `SonarQubePrepare@7` step passes:

   ```yaml
   configFile: 'apps/<app>/sonar-project.properties'
   extraProperties: |
     sonar.projectBaseDir=$(Build.SourcesDirectory)/apps/<app>
   ```

   Keeping it out of the file means the file stays portable: a scan launched from inside
   `apps/ap` (SonarLint, a local run) still resolves correctly, which a hardcoded
   `sonar.projectBaseDir=apps/ap` would break.
3. **Pull request decoration is shared, and this server cannot separate it.** Both projects
   bind to the same Azure DevOps repository (Project Settings -> General Settings -> DevOps
   Platform Integration), and both publish their pull request status under the same Azure
   DevOps context (genre `SonarQube`, name `quality gate`), so **the pipeline that finishes
   last owns the badge**. SonarQube's mono repository support, which would give each project
   its own status, is an Enterprise Edition feature; this server runs **Developer Edition
   v2026.2.1**, so the option is simply absent from the binding page.

   Consequence: an AP-only pull request can display AR's quality gate, and vice versa. The
   *analyses* are correct and separate - only the badge is ambiguous, so read the result in
   the SonarQube project rather than trusting the pull request status. The fix available on
   this edition is to stop each PR pipeline from running when its own app was not touched
   (path filters on the `pr:` trigger **and** on the branch policy's build validation, which
   is configured separately). Tracked as a follow-up to WI 19546.

**Not covered by any project:** `packages/*` (~25,000 lines). A pull request touching only
`packages/**` is analysed by nobody, so it passes the gate with zero files in scope.
Tracked as a follow-up to WI 19546.

## 1. Configure Service Connection in Azure DevOps

### Step 1: Generate SonarQube Token
1. Log in to SonarQube: `https://sonar.hello-ada.com/`
2. Go to **My Account** → **Security** → **Generate Tokens**
3. Create a token named: `Azure DevOps Frontend`
4. **Copy the token** (you won't see it again)

### Step 2: Create Service Connection
1. In Azure DevOps, go to **Project Settings** (bottom left)
2. Navigate to **Service connections** under **Pipelines**
3. Click **New service connection**
4. Select **SonarQube**
5. Fill in:
   - **Connection name**: `SonarQube`
   - **Server URL**: `https://sonar.hello-ada.com/`
   - **Token**: (paste the token from Step 1)
6. Click **Verify and Save**

**Important:** the connection name must match the `SonarQube:` input of every
`SonarQubePrepare@7` task. Today that value is `SonarQube`, used by:

- `apps/ap/deploy/pr-validation-ap.yml` and `apps/ap/deploy/deploy-frontend-ap.yml`
- `apps/ar/deploy/pr-validation-ar.yml` and `apps/ar/deploy/deploy-frontend-ar.yml`

(There is no `azure-pipelines.yml` in this repository. The root `pr-validation.yml` and
`deploy-frontend.yml` are superseded leftovers, kept for manual runs only.)

## 2. Configuration Files

### sonar-project.properties

There is one file per app. Each is configured with:
- **Project Key**: unique per app - see the table under Prerequisites
- **Project Name**: `Front-End` (AP), `Front-End AR` (AR)
- **Sources**: `src/` (source code to analyze)
- **Tests**: `tests/` and `e2e/` (test files)
- **Coverage Path**: `test-results/coverage/lcov.info`
- **Exclusions**: Test files, node_modules, dist, etc.
- **Security Exclusions**: `docs/`, `*.html`, and `e2e/` folders (excluded from security analysis)

**Important:** every relative path above resolves against **`sonar.projectBaseDir`**, which
the pipeline sets to `$(Build.SourcesDirectory)/apps/<app>` - *not* against the location of
the properties file. So `sonar.sources=src/` means `apps/<app>/src`, and
`sonar.tests=tests/,e2e/` means `apps/<app>/tests` and `apps/<app>/e2e`.

Omitting `projectBaseDir` does not fall back to the properties file's directory: the
scanner runs from the repository root, where `src/` is the near-empty root `src/services`
folder.

### vitest.config.ts
Already configured to generate:
- **LCOV format** for SonarQube: `test-results/coverage/lcov.info`
- **Cobertura format** for Azure DevOps: `test-results/coverage/cobertura-coverage.xml`

## 3. Pipeline Flow

### For Pull Requests
```
1. Install dependencies
2. Prepare SonarQube analysis (with PR decoration)
3. Run tests with coverage
4. Run SonarQube analysis
5. Publish Quality Gate result
6. Publish test results to Azure DevOps
7. Publish coverage to Azure DevOps
```

### For Develop/Master Branches
```
1. Install dependencies
2. Prepare SonarQube analysis
3. Run tests with coverage
4. Run SonarQube analysis
5. Publish Quality Gate result
6. Publish test results to Azure DevOps
7. Publish coverage to Azure DevOps
```

## 4. What Gets Published

### SonarQube Server
- **Code quality metrics** (bugs, vulnerabilities, code smells)
- **Code coverage** from LCOV file
- **Duplications**
- **Security hotspots**
- **Technical debt**

### Azure DevOps
- **Test results** (pass/fail/skipped)
- **Code coverage** visualized in the pipeline
- **Quality Gate status** (visible in PR)

## 5. Pull Request Decoration

When configured correctly, SonarQube will:
- ✅ Add comments to PRs with quality issues
- ✅ Show Quality Gate status in PR checks
- ✅ Block merging if Quality Gate fails (optional)

To enable PR decoration in SonarQube:
1. Go to **Administration** → **Configuration** → **General Settings** → **Pull Requests**
2. Configure Azure DevOps integration
3. Add Personal Access Token with "Code (Read & Write)" permissions

## 6. Verify Integration

### Step 1: Run the pipeline
```bash
git add .
git commit -m "feat: Add SonarQube integration"
git push
```

### Step 2: Check Azure DevOps Pipeline
Look for these steps in the pipeline run:
- ✅ Prepare SonarQube analysis
- ✅ Run tests with coverage
- ✅ Run SonarQube analysis
- ✅ Publish Quality Gate result

### Step 3: Check SonarQube Server
1. Go to `https://sonar.hello-ada.com/`
2. Find the project for the app you changed: **Front-End** (AP) or **Front-End AR** (AR)
3. Verify:
   - Coverage percentage is shown
   - Code quality metrics are updated
   - Last analysis date matches pipeline run
   - **`ncloc` is the size of that app alone.** AP is ~236,000; AR is ~2,000-6,000. An AP
     project reading a few thousand lines means an AR analysis overwrote it - check the
     project keys.

### Step 4: Verify Coverage File
Check pipeline logs for:
```
=== Verifying coverage files for SonarQube ===
✅ LCOV file found
```

## 7. Troubleshooting

### Issue: "ERROR: The folder 'tests/' does not exist" (RESOLVED - pre-monorepo, 2025)
```
ERROR: The folder 'tests/' does not exist for 'ADA_Front-End_AYqAasuhutDbsRQ9ANWo' 
(base directory = /home/ubuntu/myagent/_work/8/s/src)
```

**Cause:** SonarQube was looking for `tests/` inside `src/` because `sonar.projectBaseDir=src/` was being used.

**Solution:** ✅ Already fixed at the time
- Changed `sonar.projectBaseDir=src/` to `sonar.sources=src/`
- The mistake was pointing `projectBaseDir` at the *sources* folder, which made `tests/`
  resolve to `src/tests/`

> ⚠️ **Do not read this as "never set `projectBaseDir`".** Since the monorepo migration
> (2026-07) every live pipeline sets `sonar.projectBaseDir` to the **app root**
> (`apps/<app>`), which is correct and required - `src/`, `tests/` and `e2e/` all resolve
> under it. Removing it would make the scanner analyse the repository root instead.

### Issue: "No LCOV files were found" (RESOLVED)
```
INFO: No LCOV files were found using test-results/coverage/lcov.info
WARN: No coverage information will be saved because all LCOV files cannot be found.
```

**Cause:** The `sonar.exclusions` pattern included `**/test-results/**`, which prevented SonarQube from accessing the LCOV file inside `test-results/coverage/`.

**Solution:** ✅ Already fixed
- Removed `**/test-results/**` from `sonar.exclusions`
- SonarQube can now read the coverage file while still not analyzing test-results as source code
- Added `**/docs/**` to both `sonar.exclusions` and `sonar.coverage.exclusions`

**Current configuration:**
```properties
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/*.spec.ts,**/*.test.ts,**/tests/**,**/e2e/**,**/docs/**
sonar.coverage.exclusions=**/*.spec.ts,**/*.test.ts,**/tests/**,**/e2e/**,**/mockData/**,**/*.d.ts,**/*.config.*,**/docs/**
sonar.security.exclusions=**/docs/**,**/*.html,**/e2e/**
```

**Note:** The `e2e/` folder is excluded from:
- General analysis (`sonar.exclusions`)
- Coverage analysis (`sonar.coverage.exclusions`)
- Security analysis (`sonar.security.exclusions`)

### Issue: "No coverage information" (General)
**Solution:**
1. Check that `test-results/coverage/lcov.info` exists
2. Verify `sonar.javascript.lcov.reportPaths` in `sonar-project.properties`
3. Ensure tests run before SonarQube analysis
4. Verify `test-results/` is NOT in `sonar.exclusions` (it blocks file reading)

### Issue: "Quality Gate failed"
**Solution:**
1. Check SonarQube dashboard for specific issues
2. Review coverage thresholds in SonarQube project settings
3. Fix code quality issues or adjust thresholds

### Issue: "SonarQube service connection not found"
**Solution:**
1. Verify service connection name matches `azure-pipelines.yml`
2. Check token hasn't expired
3. Ensure connection has permission for the project

### Issue: "PR decoration not working"
**Solution:**
1. Configure Azure DevOps integration in SonarQube settings
2. Add Personal Access Token with Code permissions
3. Verify webhook is configured

## 8. Coverage Thresholds

### Current Vitest Configuration
Coverage thresholds are **currently disabled** to allow gradual improvement:
```typescript
// thresholds: {
//   statements: 70,
//   branches: 60,
//   functions: 70,
//   lines: 70
// }
```

### SonarQube Quality Gate
Configure in SonarQube:
- **Administration** → **Quality Gates** → **Your Quality Gate**
- Recommended thresholds:
  - Coverage on New Code: > 80%
  - Overall Coverage: > 70%

## 9. Next Steps

1. **Configure Service Connection** (Step 1 & 2 above)
2. **Update pipeline** if you used a different connection name
3. **Run a test pipeline** to verify integration
4. **Configure PR decoration** (optional but recommended)
5. **Set up Quality Gate** rules in SonarQube
6. **Enable coverage thresholds** gradually in `vitest.config.ts`

## 10. Useful Commands

```bash
# Run the AP tests with coverage, from the monorepo root
pnpm --filter @ada/ap test:ci

# View coverage in browser
open apps/ap/test-results/coverage/index.html

# Check the LCOV file exists (the path Sonar reads, relative to apps/ap)
ls -la apps/ap/test-results/coverage/lcov.info

# View first lines of LCOV file
head -20 apps/ap/test-results/coverage/lcov.info
```

## 11. References

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [Azure DevOps SonarQube Integration](https://docs.sonarqube.org/latest/analysis/azuredevops-integration/)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [LCOV Format](http://ltp.sourceforge.net/coverage/lcov.php)

---

**Note:** Make sure to keep your SonarQube token secure. Never commit it to the repository.

## 12. Issues de Seguridad Resueltos

### Issue: npm ci sin --ignore-scripts (RESUELTO)
**Problema:** SonarQube reporta un issue de seguridad cuando `npm ci` se ejecuta sin el flag `--ignore-scripts` en el Dockerfile.

**Riesgo:** Omitir `--ignore-scripts` puede permitir la ejecución de scripts de shell durante la instalación de dependencias, lo cual representa un riesgo de seguridad en contenedores Docker.

**Solución:** ✅ Ya aplicada
- Agregado el flag `--ignore-scripts` al comando `npm ci` en el Dockerfile
- El comando ahora es: `RUN npm ci --ignore-scripts`
- Esto previene la ejecución automática de scripts durante la instalación de dependencias
- Los scripts del proyecto (como `npm run build`) siguen funcionando normalmente ya que se ejecutan explícitamente

**Ubicación del cambio:**
- `Dockerfile` línea 7: `RUN npm ci --ignore-scripts`

### Issue: Recursos remotos sin verificación de integridad (RESUELTO)
**Problema:** SonarQube reporta un issue de seguridad (Web:S5725) cuando se cargan recursos remotos (scripts, estilos, etc.) sin el atributo `integrity` que verifica la integridad del archivo mediante hash SHA.

**Riesgo:** Sin verificación de integridad, un atacante que comprometa el CDN o realice un ataque Man-in-the-Middle podría inyectar código malicioso en los recursos cargados, comprometiendo la seguridad de la aplicación.

**Solución:** ✅ Ya aplicada
- Calculados hashes SHA-384 para todos los scripts JavaScript cargados desde CloudFront
- Agregado el atributo `integrity="sha384-<hash>"` a todos los tags `<script>` con recursos remotos
- Los hashes se calcularon descargando los archivos actuales desde CloudFront
- Se actualizaron 24 archivos HTML en los tres entornos (b2cDev, b2cPro, b2cPre)

**Scripts actualizados:**
- `script.js` (signin.html, signup.html)
- `reset_pwd.js` / `change_pwd.js`
- `forgot_pwd.js`
- `signup_step_1.js`
- `signup_step_2.js`
- `totp.js`
- `email_idpselector.js`

**Archivos modificados:**
- `public/b2cDev/*.html` (8 archivos)
- `public/b2cPro/*.html` (8 archivos)
- `public/b2cPre/*.html` (8 archivos)

**Scripts creados:**
- `scripts/calculate-integrity-hashes.js`: Descarga archivos desde CloudFront y calcula hashes SHA-384
- `scripts/update-html-integrity.js`: Actualiza archivos HTML con atributos integrity
- `integrity-hashes.json`: Archivo JSON temporal generado automáticamente con los hashes calculados (no se commitea al repositorio, se regenera cuando es necesario)

**Documentación de mantenimiento:**
- Ver `docs/context/resource-integrity-maintenance.md` para instrucciones detalladas sobre cómo recalcular y actualizar los hashes cuando se modifiquen los archivos en CloudFront.

**Nota importante:** Si los archivos en CloudFront se actualizan, será necesario:
1. Re-ejecutar `scripts/calculate-integrity-hashes.js` para obtener nuevos hashes
2. Re-ejecutar `scripts/update-html-integrity.js` para actualizar los archivos HTML
3. Idealmente, los archivos deberían estar versionados (ej: `script.v1.2.3.js`) para evitar cambios inesperados

