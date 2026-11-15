/**
 * Created By Rolando Abel Bravo Cabrera (RABC)
 * Created: 01/03/2023
 */

import { expect } from '@playwright/test'
import Api2, { IprocessedResponse } from './APi2'
import {StringUtils} from '.'

export default class ApiSpendFile {
  private api:Api2

  constructor(api: Api2) {
    this.api = api
  }

  public async getSpendFileVersions() {
    console.log('')
    console.log('Called: ApiSpendFile.getSpendFileVersions()')

    // Test if login is required
    await this.api.checkAuthentication()

    const response = await this.api.doGet('/api/analyze/spend_file_versions')
    const processResult : IprocessedResponse = { data: [], result: false, status:null, body: null }
    expect(await Api2.processApiResponse(response, 'Getting SpendFile List', processResult)).toBeTruthy()

    const programs = new Array(0)
    const dataCast = <{'hydra:member'?: {'@id':string, name:string}[]}>processResult.data
    const hydraMember =dataCast['hydra:member']
    if (hydraMember !== null) {
        hydraMember!.forEach((element) => {
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
}
