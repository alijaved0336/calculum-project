import { APIRequestContext } from '@playwright/test'
import Api from './APi'
export default class ApiProgram {
    public request: APIRequestContext
    public api: Api
    public programID:string|null = null
    public programName:string|null = null
    constructor(request: APIRequestContext) {
      this.request = request
      this.api = new Api(this.request)
    }

    public async getPrograms(refreshToken = false) {
      console.log('')
      console.log('Called: ApiProgram.getPrograms()')
      await this.api.token(refreshToken)

      const url = process.env.E2E_BASE_URL_API

      const postRequest = await this.request.get(url! + '/api/analyze/programs', {
        headers: {
          ContentType: 'application/json'
        }
      })

      if (!postRequest.ok()) {
        throw new Error('Error to get Programs')
      }
    }

    public async getProgramUIByName(name: string, refreshToken = false) {
      console.log('')
      console.log('Called: ApiProgram.getProgramUIByName()')
      await this.api.token(refreshToken)
      const url = process.env.E2E_BASE_URL_API

      const postRequest = await this.request.get(url! + '/api/analyze/programs', {
        headers: {
          ContentType: 'application/json'
        }
      })

      if (!postRequest.ok()) {
        throw new Error('Error to get Programs')
      }
    }

    public async createProgram(name:string, refreshToken = false) {
      console.log('')
      console.log('Called: ApiProgram.CreateProgram()')

      await this.api.token(refreshToken)

      const url = process.env.E2E_BASE_URL_API
      console.log(`URL: ${url!}/api/analyze/programs`)

      this.programName = name

      const postRequest = await this.request.post(url! + '/api/analyze/create-program', {
        headers: {
          ContentType: 'application/json'
        },
        data: {
          programName: name,
          target: 'cashFlow',
          externalFinancingEnabled: true,
          financingGroups: [{
            baseRate: 5,
            baseRateType: 'EURIBOR',
            color: 'ff2c4f',
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
      })
      console.log(await postRequest.text())
      if (postRequest.ok()) {
        const body = await postRequest.body()
        const data = JSON.parse(body.toString())
        this.programID = data.programId
        console.log('Program addded')
      } else {
        throw new Error('Error to add Program')
      }
    }

    public async updateAliasSpends(refreshToken = false) {
      console.log('')
      console.log('Called: ApiProgram.updateAliasSpends()')

      await this.api.token(refreshToken)

      console.log('spendFileVersionUuid:', this.api.spendFileUUid)

      const url = process.env.E2E_BASE_URL_API
      console.log(`URL: ${url!}/test/spendfileversion/update-alias-by-volumen`)

      const postRequest = await this.request.post(url! + '/test/spendfileversion/update-alias-by-volumen', {
        headers: {
          ContentType: 'application/json'
        },
        data: {
          spendFileVersionUuid: this.api.spendFileUUid
        }
      })
      // console.log(await postRequest.text())
      if (postRequest.ok()) {
        const body = await postRequest.body()
        const data = JSON.parse(body.toString())
        console.log('Spend File Version updated')
      } else {
        throw new Error('Error to updated Spend File Version')
      }
    }
}
