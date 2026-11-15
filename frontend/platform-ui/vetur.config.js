// vetur.config.js — tells Vetur about the monorepo project structure
module.exports = {
  projects: [
    {
      root: './apps/ap',
      package: './package.json',
      tsconfig: './tsconfig.json',
    },
    {
      root: './apps/ar',
      package: './package.json',
      tsconfig: './tsconfig.json',
    },
  ],
}
