import cds from '@sap/cds/eslint.config.mjs'
export default [
  { ignores: ['app/**'] },
  ...cds.recommended
]
