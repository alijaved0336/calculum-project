import { APIRequestContext } from '@playwright/test'

export default class Api {
    private request: APIRequestContext
    constructor(request: APIRequestContext) {
      this.request = request
    }

  public apiUrl = ''
  public email = ''
  public password =''
  public logedAsAdmin = false
  public isAdmin = false
  public spendFileUUid = ''
  public userUUid = ''
  public companyUUid = ''
  public spendFileIri = ''
  public userIri = ''
  public companyIri = ''

  public async token(refresh = true, quite = false, asAdmin = true) {
    const methPath = '/security/request_token'
    if (!quite) {
      console.log('function Called :token()')
    }

    if (refresh || asAdmin !== this.logedAsAdmin) {
      // Persisting values
      this.logedAsAdmin = asAdmin
      this.apiUrl = process.env.E2E_BASE_URL_API ?? ''
      this.email = (asAdmin ? process.env.E2E_USERNAME : process.env.E2E_USERNAME_SINGLE) ?? ''
      this.password = (asAdmin ? process.env.E2E_PASSWORD : process.env.E2E_PASSWORD_SINGLE) ?? ''

      if (!quite) {
        console.log('Trying as Admin: ' + (this.logedAsAdmin ? 'Yes' : 'No'))
        console.log('User Name: ' + this.email)
        console.log('User Password: ' + this.password)
      }

      const postRequest = await this.request.post(this.apiUrl + methPath, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          ContentType: 'multipart/form-data'
        },
        multipart: {
          email: this.email,
          password: this.password
        }
      })

      if (postRequest.ok()) {
        // Parsing response
        const body = await postRequest.body()
        const data = JSON.parse(body.toString())
        console.log('Logged sucessfully as: ' + this.email)
        console.log('Trying as Admin: ' + (this.logedAsAdmin ? 'Yes' : 'No'))
        console.log('User Name: ' + this.email)
        console.log('User Password: ' + this.password)

        // Calling Who AmI
        await this.refreshWhoAmI(quite)
      } else {
        console.log('Fail access token With:')
        console.log('  Trying as Admin: ' + (this.logedAsAdmin ? 'Yes' : 'No'))
        console.log('  User Name: ' + this.email)
        console.log('  User Password: ' + this.password)

        throw new Error('Error to get access token With:')
      }
    } else {
      if (!quite) {
        console.log('Already logged with:')
        console.log('  Trying as Admin: ' + (this.logedAsAdmin ? 'Yes' : 'No'))
        console.log('  User Name: ' + this.email)
        console.log('  User Password: ' + this.password)
        // Current Context
        console.log('User UUID : ' + this.userUUid)
        console.log('Company UUID: ' + this.companyUUid)
        console.log('SpendFile UUID : ' + this.spendFileUUid)
      }
    }
  }

  public async refreshWhoAmI(quite = false) {
    console.log('Called Who Am I for user: ' + this.email)
    const methPath = '/api/user/who_am_i'
    if (!quite) {
      console.log(`URL: ${this.apiUrl}${methPath}`)
    }

    const getRequest = await this.request.get(this.apiUrl + methPath, {
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    })

    if (getRequest.ok()) {
      // OK
      const body = await getRequest.body()
      const data = JSON.parse(body.toString())
      // Parsing response
      this.userUUid = this.removeIRI(data['@id'])
      this.companyUUid = this.removeIRI(data.company['@id'])
      this.spendFileUUid = this.removeIRI(data.activeSpendFileVersion['@id'])
      this.userIri = data['@id']
      this.companyIri = data.company['@id']
      this.spendFileIri = data.activeSpendFileVersion['@id']

      if (!quite) {
        console.log('User UUID : ' + this.userUUid)
        console.log('Company UUID: ' + this.companyUUid)
        console.log('SpendFile UUID : ' + this.spendFileUUid)
      }
    } else {
      throw new Error('Error calling who_am_i on API:' + methPath)
    }
  }

  public removeIRI(iri : string) {
    if (iri === null || iri === undefined) { return iri }
    const indexOfLastSlash = iri.lastIndexOf('/')
    if (indexOfLastSlash < 0) { return iri }
    if (indexOfLastSlash >= iri.length + 1) { return '' }
    return iri.substring(indexOfLastSlash + 1)
  }
}
