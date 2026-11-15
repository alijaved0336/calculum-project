# Design System Storybook

Interactive catalog of `@ada/design-system` components.

## Local (developers)

```bash
# from repo root
pnpm storybook
```

Opens the live server (usually `http://localhost:6006`).

### Static build (same output as CI)

```bash
pnpm build-storybook
cd packages/design-system/storybook-static
npx --yes serve .
```

Open the URL printed in the terminal (usually `http://localhost:3000`).

> On the root URL you may see **No Preview** until you select a component in the sidebar. That is expected.

## CI artifact (whole team)

CI builds Storybook and publishes a ZIP artifact named **`storybook-design-system`**.

- **Azure DevOps:** [ADA → Pipelines](https://dev.azure.com/calculum/ADA/_build)  
  Look for the pipeline that uses [`deploy/build-storybook.yml`](./deploy/build-storybook.yml)  
  (suggested name: **Design System Storybook**; run names look like `storybook.design-system-storybook.*`).
- **YAML:** [`deploy/build-storybook.yml`](./deploy/build-storybook.yml)
- **Triggers:** automatic on pushes to `master` that touch the design system; manual runs supported (use branch `feat/design-system-storybook` until this is merged).

First successful run was verified on `feat/design-system-storybook` (artifact published).

### How to open the artifact

1. Azure DevOps → **Pipelines** → Storybook pipeline → latest **successful** run.
2. Open **1 artifact** / **Artifacts** → download **`storybook-design-system`**.
3. Unzip the archive anywhere on your machine.
4. In a terminal, go into the unzipped folder and run:

   ```bash
   npx --yes serve .
   ```

5. Open the URL from the terminal (usually `http://localhost:3000`).
6. Pick a component in the left sidebar.

Stop the server with `Ctrl+C`.

You need Node.js installed only to run `npx serve` — you do **not** need to clone the repo or run `pnpm install`.

### Rename the pipeline (optional)

If Azure DevOps saved it under a generic name (e.g. **Front-End**):

1. Open the pipeline → **⋯** / **Edit** → **⋯** → **Rename / Move**.
2. Name: **Design System Storybook**.
3. Optionally move it into the **Deploy Frontend** folder.
