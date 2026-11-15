/**
 * Created By Rolando Abel Bravo Cabrera (RABC)
 * Created: 01/03/2023
 */

import { expect } from '@playwright/test'
import Api2, { IprocessedResponse } from './APi2'
import { generateRandomString } from './Utils';
import uuidRandom from 'uuid-random';
import { StringUtils } from '.';

export default class ApiProgram2 {
  programToDeleteName : string|null = null
  programToDeleteUUid : string|null = null

  private api:Api2

  constructor(api: Api2) {
    this.api = api
  }

  public async getAvailablePrograms() {
    console.log('')
    console.log('Called: ApiProgram.getPrograms()')

    // Test if login is required
    await this.api.checkAuthentication()

    const response = await this.api.doGet('/api/spend_file_versions/' + this.api.activeSpendFileVersionUUid + '/analyze_programs')
    const processResult : IprocessedResponse = { data: {}, result: false }
    expect(await Api2.processApiResponse(response, 'Getting Program List for Active SpendFileVersion', processResult)).toBeTruthy()

    const programs = new Array(0)
    const dataCast = <{'hydra:member':{'@id':string, name:string}[]}>processResult.data
    const hydraMember = dataCast['hydra:member']
    if (hydraMember !== null) {
        hydraMember.forEach(element => {
        const id = element['@id']
        const uuid = StringUtils.removeIRI(id)
        const name = element.name

        const item = {
          id,
          uuid,
          name
        }
        programs.push(item)
      })
    }
    return programs
  }

  public async getProgramUIByName(name: string): Promise<void> {
    console.log('')
    console.log('Called: ApiProgram.getProgramUIByName()')

    // Test if login is required
    await this.api.checkAuthentication()

    const url = process.env.E2E_BASE_URL_API
    console.log(`URL: ${url}/api/analyze/programs`)

    const postRequest = await this.api.request!.get(url + '/api/analyze/programs', {
      headers: {
        ContentType: 'application/json'
      }
    })

    if (!postRequest.ok()) {
      throw new Error('Error to get Programs')
    }
  }

  // target : 'cashFlow' | 'dynamicDiscount' |'costReduction' | 'holistic' | 'harmonization'

  public async createProgram(name:string, target = 'cashFlow') {
    console.log('*** function Called: ApiProgram.CreateProgram()')

    // Test if login is required
    await this.api.checkAuthentication()

    const newProgramData = {
      programName: '',
      financingGroups : [{
        baseRate: 5,
        baseRateType: 'EURIBOR',
        color: '#ff2c4f',
        financingName: '1',
        fundingSpread: 0.6,
        name: 'F1, 5.60%, 1',
        periodInMonths: 12
      },
      {
        baseRate: 5,
        baseRateType: 'EURIBOR',
        color: 'ff2c4f',
        financingName: '2',
        fundingSpread: 0.6,
        name: 'F1, 5.60%, 2',
        periodInMonths: 12
      }],
      target: target,
      externalFinancingEnabled: true,
      byExclusionRules: false,
      inclusiveExclusiveRules: [],
      automateFinancingTerms: false,
      termHarmonizationEnabled: true,
      harmonizationGroups: [],
      basedOn: 'P',
      automateHarmonizationTerms: true,
      maxNumOfGroups: 10,
      multiplier: 15,
      roundOn: 'U',
      marked: false,
      cashDiscountEnabled: false,
      periodInMonths: 12
    }

    switch (target) {
      case 'cashFlow' :
        newProgramData.programName = `TEST: CF: ${name} runs: ${generateRandomString(6)}`
        break

      case 'dynamicDiscount' :
        newProgramData.programName = `TEST: DD: ${name} runs: ${generateRandomString(6)}`
        break
    }

    this.programToDeleteName = newProgramData.programName

    const processResult : IprocessedResponse = { data: {}, status: null, result: false, body: null }
    const postResponse = await this.api.doPost('/api/analyze/create-program', newProgramData, 'application/json', 500000)
    expect(await Api2.processApiResponse(postResponse, 'Creating new Program', processResult)).toBeTruthy()
    console.log('Program created.')

    const dataCast = <{programId?:string|null}>processResult.data
    if (dataCast !== null) {
      this.programToDeleteUUid = dataCast.programId ?? null
      expect(this.programToDeleteUUid).toBeTruthy()
      console.log('Program added')
    }
  }

  public async updateAliasSpends() {
    console.log('')
    console.log('Called: ApiProgram.updateAliasSpends()')

    // Test if login is required
    await this.api.checkAuthentication()

    const url = process.env.E2E_BASE_URL_API
    const fullUrl = url + '/test/spendfileversion/update-alias-by-volumen'
    console.log('URL: ' + fullUrl)

    const postRequest = await this.api.request!.post(fullUrl, {
      headers: {
        ContentType: 'application/json',
        idk : uuidRandom()
      },
      data: {
        spendFileVersionUuid: this.api.activeSpendFileVersionUUid
      }
    })
    console.log(await postRequest.text())
    if (postRequest.ok()) {
      console.log('updating alias by volumen successfully')
    } else {
      throw new Error('Error to updated alias by volumen')
    }
  }

  public async ensureProgram(programName: string) {
    const programs = this.getAvailablePrograms()
  }
}
