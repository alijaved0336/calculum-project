/**
 * Created By Rolando Abel Bravo Cabrera (RABC)
 * Test for Feature: 6605 (Test: 6813)
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
test('Upload SpendFile with Excluded and Not Matched Lines from API @us-6605 @data-ingestion @api @tc-6977 @heavy', async({ page }, testInfo) => {
  // Starting
  Api2.printStarting(testInfo)

  // Uploading Original Spend file to be updated

  const parsingResponseOriginal = await api!.doGet('/api/spendfile/add-new-test-file/spend_with_excluded_and_not_match')
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
  Api2.printSuccess('Exclude or NotMatch Suppliers Spend File Parsed.')

  await loginAsSuperAdmin(page)

  await changeToSpendFile(page, `${spendFileNameOriginal} (Ver. ${spendFileVersionOriginal})`)

  await expect(page).toHaveURL(/.*\/home\/home-dashboard/)

  const parsingResponseOriginalSpend = await api!.doGet(`/api/tests-helpers/data-match/matches_or_excludes_summary/${spendFileUUIDOriginal}`)
  const parseResponseProcessedOriginalSpend : IprocessedResponse = { data: null, status: null, result: false, body: null }
  await Api2.processApiResponse(parsingResponseOriginalSpend, 'Get Match/Excluded Summary from Spend File Version', parseResponseProcessedOriginalSpend)

  expect(parseResponseProcessedOriginalSpend.data).toBeDefined()
  const dataCastedOriginalSpend = parseResponseProcessedOriginalSpend.data
  expect(dataCastedOriginalSpend !== null).toBeTruthy()

  console.log('Summary:')
  // console.log(dataCastedOriginalSpend)

  // Checking
  const result = dataCastedOriginalSpend['result']
  expect(result).toBe('success')

  const included = dataCastedOriginalSpend['included']

  const match = included['match']
  expect(match).toBe(24)

  const matchAggregated = included['matchAggregated']
  expect(matchAggregated).toBe(29)

  const excluded = dataCastedOriginalSpend['excluded']

  const byReason = excluded['byReason']
  expect(byReason).toBe(21)

  const byReasonAggregated = excluded['byReasonAggregated']
  expect(byReasonAggregated).toBe(27)

  const notMatch = excluded['notMatch']
  expect(notMatch).toBe(6)

  const notMatchAggregated = excluded['notMatchAggregated']
  expect(notMatchAggregated).toBe(6)

  const total = excluded['total']
  expect(total).toBe(27)
  // Success
  Api2.printSuccess('All spected values returned')
})

test.afterEach(async ({ page }) => {
  Api2.printHeader('Cleaning Enviroment...')
  const response = await api!.doDelete('/api/spend_file_versions/' + spendFileUUIDOriginal)
  expect(response.ok()).toBeTruthy()
  Api2.printHeader('Enviroment cleaned.')
  await ensureDefaultLogin(page)
})
