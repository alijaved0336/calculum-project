/**
 * Created By Rolando Abel Bravo Cabrera (RABC)
 * Test for Feature: 4061 (Test: 5675)
 * Reviewed: 10/03/2023 by RABC
 */
import { test, expect } from '@playwright/test'
import Api2, { IprocessedResponse } from '../utils/APi2'
import { changeToSpendFile, goToAnalyzeSection, ensureDefaultLogin, loginAsSuperAdmin } from '../utils/Utils'

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
test.skip('Upload SpendFile with Spends/Suppliers/Parents Updates from API @data-ingestion @api @us-4061 @tc-5675 @heavy', async({ page }, testInfo) => {
  // Starting
  Api2.printStarting(testInfo)

  // Uploading Original Spend file to be updated
  const parsingResponseOriginal = await api!.doGet('/api/spendfile/add-new-test-file/spend_file_update_original')
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
  Api2.printSuccess('Original Spend File Parsed.')
 
// Uploading Updating Spend file to update Original


const parsingResponseUpdater = await api!.doGet('/api/spendfile/update-test-file/' + spendFileUUIDOriginal)
  const parseResponseProcessedUpdater : IprocessedResponse = { data: null, status: null, result: false, body: null }
  await Api2.processApiResponse(parsingResponseUpdater, 'Upload and Parsing SpendFile', parseResponseProcessedUpdater)

  expect(parseResponseProcessedUpdater.data).toBeDefined()
  const dataCastedUpdater = <{spendFile:null, spendFileVersion:null, version:null, name:null }>parseResponseProcessedUpdater.data
  expect(dataCastedUpdater.spendFile).toBeDefined()
  expect(dataCastedUpdater.spendFileVersion).toBeDefined()  
  expect(dataCastedUpdater.version).toBeDefined()  
  expect(dataCastedUpdater.name).toBeDefined()


  // check updated and result of updating are same SpendfileVersion

  expect(dataCastedUpdater.spendFileVersion).toBe(dataCastedOriginal.spendFileVersion)
  expect(dataCastedUpdater.version).toBe(dataCastedOriginal.version)
  expect(dataCastedUpdater.name).toBe(dataCastedOriginal.name)

  page.waitForTimeout(2000);

  // Wait SpendFile is ready (Original)
  const statusUpdater = await api!.waitSpendFileReady(spendFileUUIDOriginal)
  expect(statusUpdater).toBe('ready')
  Api2.printSuccess('Updater Spend File Parsed.')

  //Api2.print('Verifiying ...')

  await loginAsSuperAdmin(page)

  await changeToSpendFile(page, `${spendFileNameOriginal} (Ver. ${spendFileVersionOriginal})`)

  await expect(page).toHaveURL(/.*\/home\/home-dashboard/)
  const spendsListResponse = await goToAnalyzeSection(page, 'List', true, 'Spends')

  const parseResponseProcessed2 : IprocessedResponse = { data: null, status: null, result: false, body: null }
  // @ts-ignore
  await Api2.processApiResponse(spendsListResponse, 'Upload and Parsing SpendFile', parseResponseProcessed2)

  expect(parseResponseProcessed2.data).toBeDefined()
  const dataCasted2 = <{data:{spends:{edges:[]}}}[]>parseResponseProcessed2.data

  // First Check, Consolidated
  expect(dataCasted2[0].data.spends.edges).toHaveLength(6)
  
  Api2.printSuccess('6 spends Found as result of update spendFile.')
})

test.afterEach(async ({ page }) => {
  Api2.printHeader('Cleaning Enviroment...')
  const response = await api!.doDelete('/api/spend_file_versions/' + spendFileUUIDOriginal)
  expect(response.ok()).toBeTruthy()
  Api2.printHeader('Enviroment cleaned.')
  await ensureDefaultLogin(page)
})
