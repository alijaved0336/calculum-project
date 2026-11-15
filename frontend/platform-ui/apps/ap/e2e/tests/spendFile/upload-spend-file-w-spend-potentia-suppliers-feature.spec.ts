/**
 * Created By Rolando Abel Bravo Cabrera (RABC)
 * Test for Feature: 4061 (Test: 5675)
 * Reviewed: 10/03/2023 by RABC
 */
import { test, expect } from '@playwright/test'
import Api2, { IprocessedResponse } from '../utils/APi2'
import { changeToSpendFile, ensureDefaultLogin, loginAsSuperAdmin } from '../utils/Utils'

let spendFileNameOriginal = ''
let spendFileVersionOriginal = 0
let spendFileUUIDOriginal = ''

let api: Api2|null = null



test.beforeEach(async ({ page }) => {
  
  await loginAsSuperAdmin(page)
  api = await Api2.getInstance(page)
  await page.goto('/')
  await page.waitForSelector('.loading-modal', { state: 'detached' })
})

// Load Spend File
test('Upload SpendFile with Potential Suppliers from API @data-ingestion @api @us-6518 @heavy', async({ page }, testInfo) => {
  // Starting
  Api2.printStarting(testInfo)

  // Uploading Original Spend file to be updated
  const parsingResponseOriginal = await api!.doGet('/api/spendfile/add-new-test-file/spend_file_potential_suppliers')
  const parseResponseProcessedOriginal : IprocessedResponse = { data: null, status: null, result: false, body: null }
  await Api2.processApiResponse(parsingResponseOriginal, 'Upload and Parsing SpendFile', parseResponseProcessedOriginal)

  expect(parseResponseProcessedOriginal.data).toBeDefined()
  const dataCastedOriginal = <{spendFile:null, spendFileVersion:null, version:null, name:null }>parseResponseProcessedOriginal.data
  expect(dataCastedOriginal.spendFile).toBeDefined()
  expect(dataCastedOriginal.spendFileVersion).toBeDefined()  
  expect(dataCastedOriginal.version).toBeDefined()  
  expect(dataCastedOriginal.name).toBeDefined()

  spendFileUUIDOriginal = dataCastedOriginal.spendFileVersion!
  spendFileVersionOriginal = dataCastedOriginal.version!
  spendFileNameOriginal = dataCastedOriginal.name!

  // Wait SpendFile is ready
  const status = await api!.waitSpendFileReady(spendFileUUIDOriginal)
  expect(status).toBe('ready')
  Api2.printSuccess('Potential Suppliers Spend File Parsed.')
 
  await loginAsSuperAdmin(page)

  await changeToSpendFile(page, `${spendFileNameOriginal} (Ver. ${spendFileVersionOriginal})`)

  await expect(page).toHaveURL(/.*\/home\/home-dashboard/)

  

  const parsingResponseOriginalSpend = await api!.doGet(`/api/spend_file_versions/${spendFileUUIDOriginal}`)
  const parseResponseProcessedOriginalSpend : IprocessedResponse = { data: null, status: null, result: false, body: null }
  await Api2.processApiResponse(parsingResponseOriginalSpend, 'Get Data Spend File Version', parseResponseProcessedOriginalSpend)

  expect(parseResponseProcessedOriginalSpend.data).toBeDefined()
  const dataCastedOriginalSpend = <{providerPotentialCount:null}>parseResponseProcessedOriginalSpend.data
  // Check
  let countPotentialSupplier = dataCastedOriginalSpend.providerPotentialCount

  expect(countPotentialSupplier).toBeGreaterThan(0)
})

test.afterEach(async ({ page }) => {
  Api2.printHeader('Cleaning Enviroment...')
  const response = await api!.doDelete('/api/spend_file_versions/' + spendFileUUIDOriginal)
  expect(response.ok()).toBeTruthy()
  Api2.printHeader('Enviroment cleaned.')
  await ensureDefaultLogin(page)
})
