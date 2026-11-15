/**
 * @fileoverview
 * Utility class for API interactions in Playwright E2E tests.
 * 
 * Provides helper methods for API requests, response processing, and
 * user/session management for automated end-to-end testing scenarios.
 * 
 * Exports:
 * - Api2: Main utility class for API operations.
 * - IprocessedResponse, Iuserdata, IactiveCompany, IactiveSpendFile: Type interfaces for API data structures.
 * 
 * Created By Rolando Abel Bravo Cabrera (RABC)
 * Created: 01/03/2023
 */

import {
  APIRequestContext,
  APIResponse,
  expect,
  Page,
  TestInfo,
} from "@playwright/test";
import ApiProgram2 from "./ApiProgram2";
import ApiSpendFile2 from "./ApiSpendFile2";
import { loginByUser, logout } from "./Utils";
import uuidRandom from "uuid-random";
import { StringUtils } from ".";

const CONSOLE_WIDTH = 115;

export interface IactiveCompany {
  name: string | null;
  id: string | null;
  spendFileVersions: any[];
}
export interface IactiveSpendFile {
  name: string | null;
  version: number;
  id: string | null;
}
export interface Iuserdata {
  activeCompany: IactiveCompany;
  activeSpendFileVersion: IactiveSpendFile;
  availableCompanies: [];
}
export interface IprocessedResponse {
  data:
    | []
    | { spendFile: null; spendFileVersion: null; version: null; name: null }
    | { status?: string; statusDescription?: string }
    | { name?: string; "@id"?: string }
    | { programId?: string }
    | { "hydra:member"?: [] }
    | Iuserdata
    | { "hydra:member": { "@id": string; name: string }[] }
    | any
    | null;
  status?: number | null;
  result?: boolean;
  body?: any | null;
}

export default class Api2 {
  // Mains Vars
  public request: APIRequestContext | null = null;
  public page: Page | null = null;
  public apiUrl = "";
  initialized = false;

  // Sub-Apies
  private _program: ApiProgram2 | null = null;
  private _spendFile: ApiSpendFile2 | null = null;

  // After Loging Data
  public email = "";
  public password = "";
  public isAdmin = false;
  public userUUid = "";
  public userIri = "";

  // Active Company
  public activeCompany: IactiveCompany | null = {
    name: "-",
    id: "-",
    spendFileVersions: [],
  };

  public activeCompanyName = "";
  public activeCompanyUUid = "";
  public activeCompanyIri = "";

  // Active Spend file
  public activeSpendFileVersion: IactiveSpendFile | null = {
    name: "-",
    version: 0,
    id: "-",
  };

  public activeSpendFileVersionNameVersion = "-";
  public activeSpendFileVersionName = "-";
  public activeSpendFileVersionUUid = "-";
  public activeSpendFileVersionIri = "-";
  public activeSpendFileVersionVersion = 0;

  // Active Program
  public ActiveProgramName = "-";
  public ActiveProgramUUid = "-";
  public ActiveProgramIri = "-";

  public companies = new Array(0);

  constructor() {
    console.log("Creating a new Api2 instance...");
  }

  public async setRequest(request: APIRequestContext) {
    this.request = request;

    // From Enviroment
    this.email = process.env.E2E_AUTH_CURRENT_USER_EMAIL ?? "";
    this.password = process.env.E2E_AUTH_CURRENT_USER_PASSWORD ?? "";
    this.apiUrl = process.env.E2E_BASE_URL_API ?? "";
  }

  public async setPage(page: Page) {
    this.page = page;
    await this.setRequest(page.request);
  }

  public _dispose() {
    this.request = null;
    this.page = null;
    this.apiUrl = "";
    this.initialized = false;
  }

  public static async getInstance(page: Page | null = null): Promise<Api2> {
    if (page === null || page === undefined) {
      throw new Error(
        "An instance of Page is required, none API object created for this session",
      );
    }

    console.log("** getInstance get in");

    // @ts-ignore
    const savedInstance = page!._objects.get("Api2-Instance");
    if (savedInstance !== null && savedInstance !== undefined) {
      return savedInstance;
    }

    // Create a new instance
    const newApi = new Api2();

    console.log("** newApi get in");

    // Restoring From Enviroment
    newApi.email = process.env.E2E_AUTH_CURRENT_USER_EMAIL ?? "";
    newApi.password = process.env.E2E_CURRENT_USER_PASSWORD ?? "";
    newApi.apiUrl = process.env.E2E_BASE_URL_API ?? "";

    // @ts-ignore
    page!._objects.set("Api2-Instance", newApi);

    // Update API instance browser page
    await newApi.setPage(page);

    // console.log("** newApi",newApi)

    return newApi;
  }

  public async checkAuthenticationAsSingle(refresh = false) {
    if (
      process.env.E2E_AUTH_USERNAME_SINGLE !==
        process.env.E2E_AUTH_CURRENT_USER_EMAIL ||
      process.env.E2E_AUTH_PASSWORD_SINGLE !==
        process.env.E2E_AUTH_CURRENT_USER_PASSWORD
    ) {
      process.env.E2E_AUTH_CURRENT_USER_EMAIL =
        process.env.E2E_AUTH_USERNAME_SINGLE ?? "";
      process.env.E2E_AUTH_CURRENT_USER_PASSWORD =
        process.env.E2E_AUTH_PASSWORD_SINGLE ?? "";
      await this.checkAuthentication(true, false);
      return;
    }
    await this.checkAuthentication(refresh);
  }

  public async checkAuthenticationAsAdmin(refresh = false) {
    if (
      process.env.E2E_AUTH_USERNAME_ADMIN !==
        process.env.E2E_AUTH_CURRENT_USER_EMAIL ||
      process.env.E2E_AUTH_PASSWORD_ADMIN !==
        process.env.E2E_AUTH_CURRENT_USER_PASSWORD
    ) {
      process.env.E2E_AUTH_CURRENT_USER_EMAIL =
        process.env.E2E_AUTH_USERNAME_ADMIN ?? "";
      process.env.E2E_AUTH_CURRENT_USER_PASSWORD =
        process.env.E2E_AUTH_PASSWORD_ADMIN ?? "";
      await this.checkAuthentication(true, false);
      return;
    }
    await this.checkAuthentication(refresh);
  }

  public async checkAuthenticationAsAdminException1(refresh = false) {
    if (
      process.env.E2E_AUTH_USERNAME_EXCEPTION1 !==
        process.env.E2E_AUTH_CURRENT_USER_EMAIL ||
      process.env.E2E_AUTH_PASSWORD_EXCEPTION1 !==
        process.env.E2E_AUTH_CURRENT_USER_PASSWORD
    ) {
      process.env.E2E_AUTH_CURRENT_USER_EMAIL =
        process.env.E2E_AUTH_USERNAME_EXCEPTION1 ?? "";
      process.env.E2E_AUTH_CURRENT_USER_PASSWORD =
        process.env.E2E_AUTH_PASSWORD_EXCEPTION1 ?? "";
      await this.checkAuthentication(true, false);
      return;
    }
    await this.checkAuthentication(refresh);
  }

  public async checkAuthenticationAsSuperAdmin(refresh = false) {
    if (
      process.env.E2E_AUTH_USERNAME_SUPER_ADMIN !==
        process.env.E2E_AUTH_CURRENT_USER_EMAIL ||
      process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN !==
        process.env.E2E_AUTH_CURRENT_USER_PASSWORD
    ) {
      process.env.E2E_AUTH_CURRENT_USER_EMAIL =
        process.env.E2E_AUTH_USERNAME_SUPER_ADMIN ?? "";
      process.env.E2E_AUTH_CURRENT_USER_PASSWORD =
        process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN ?? "";
      await this.checkAuthentication(true, false);
      return;
    }
    await this.checkAuthentication(refresh);
  }

  public async checkAuthentication(
    refresh = false,
    quite = false,
  ): Promise<void> {
    let newToken = false;

    if (
      refresh ||
      this.email !== process.env.E2E_AUTH_CURRENT_USER_EMAIL ||
      this.password !== process.env.E2E_AUTH_CURRENT_USER_PASSWORD
    ) {
      // Persisting new values
      this.email = process.env.E2E_AUTH_CURRENT_USER_EMAIL ?? this.email;
      this.password =
        process.env.E2E_AUTH_CURRENT_USER_PASSWORD ?? this.password;
      await logout(this.page!);
      await loginByUser(this.page!, this.email, this.password);
    } else {
      if (!this.initialized) {
        await this.refreshWhoAmI(quite);
      }

      if (!quite) {
        if (newToken) {
          console.log("  Now logged as:");
          console.log("    User Name: " + this.email);
          console.log("    User Password: " + this.password);
          console.log("  User UUID : " + this.userUUid);
          console.log("  Company UUID: " + this.activeCompanyUUid);
          console.log("  SpendFile UUID : " + this.activeSpendFileVersionUUid);
        } else {
          console.log("  Already logged as: " + this.email);
        }
      }
    }
  }

  public async processAuthenticationEventFromBrowser(
    page: Page,
    fromLogin: boolean,
  ) {
    // console.log("** Moving to enviroment in order to persist between API2 rebuildings")

    // Moving to enviroment in order to persist between API2 rebuildings
    this.email = process.env.E2E_AUTH_CURRENT_USER_EMAIL ?? this.email;
    this.password = process.env.E2E_AUTH_CURRENT_USER_PASSWORD ?? this.password;
    // Timeout for the post-login bootstrap waiters below (/api/users/<uuid> and
    // who_am_i). E2E_CUSTOM_TIME_OUT is 30s, but on a loaded dev the bootstrap
    // routinely takes longer than that while the B2C redirect waiters above are
    // allowed 50s — so the 30s waiter would fire first and fail a login that was
    // in fact still completing (the failure snapshot showed a fully-loaded app).
    // Give the bootstrap at least 60s. Together with loginByUser pairing the
    // submit click and this method in a single Promise.all (so these listeners
    // are live before the click), this removes both halves of the intermittent
    // "Timeout ... waiting for response" login failure on dev.
    const timeout = Math.max(60000, Number(process.env.E2E_CUSTOM_TIME_OUT ?? 60000));

    let whoAmIData = null;
    if (fromLogin) {
      const [, , responseForWhoAmI] = await Promise.all([
        page.waitForURL("**/?signin_success=true", { timeout: 50000 }),

        page.waitForResponse(
          (response) =>
            response.url().includes("/api/session/info") && response.ok(),
          { timeout: 50000 },
        ),

        page.waitForResponse(
          function (response) {
            const match = response
              .url()
              .match(
                /.*\/api\/users\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
              ); // /.*\/api\/users\/[\w,\d]{8}-[\w,\d]{4}-[\w,\d]{4}-[\w,\d]{4}-[\w,\d]{12}$
            return match !== null;
          },
          { timeout: timeout },
        ),
        // if invalid User, handler this error
        page.waitForResponse(
          function (response) {
            //console.log(response.url())
            const match = response.url().match(/.*\/api\/user\/who_am_i$/);
            if (match != null) {
              //Check Result
              if (!response.ok() && response.status() !== 302) {
                Api2.printSeparator();
                Api2.printSeparator();
                Api2.printSeparator();
                Api2.printHeader("Authentication Error for current User");

                Api2.printSeparator();
                Api2.printSeparator();
                Api2.printSeparator();
                throw new Error("Authentication Error for current User");
              }
            }
            return match !== null;
          },
          { timeout: timeout },
        ),
        // page.waitForResponse(
        //   (response) =>
        //     response.url().includes("/api/countries") && response.ok(),
        //   { timeout: timeout },
        // ),
      ]);
      expect(responseForWhoAmI.status()).toBe(200);

      const bodyForWhoAmI = await responseForWhoAmI.body();
      whoAmIData = JSON.parse(bodyForWhoAmI.toString());
      expect(whoAmIData).toBeTruthy();
      // Init User Session Manager
      this.processWhoIam(whoAmIData!);
    } else {
      console.log("**  before taken token");

      // Taking Token
      //  const response2 = await page.waitForResponse(function(response) {
      //    return response
      //      .url()
      //      .includes("/stats_suppliers_negotiated");
      //  });
      //  expect(response2.status()).toBe(200);
      await this.refreshWhoAmI();
    }

    await page.context().storageState({ path: "e2e/state.json" });
  }

  public processWhoIam(data: Iuserdata | null) {
    Api2.printHeader("Processing WhoAmI response...");

    if (data === null) {
      return;
    }

    // @ts-ignore
    this.userIri = data["@id"];
    this.userUUid = StringUtils.removeIRI(this.userIri);

    this.activeCompany = data.activeCompany ?? {
      name: "-",
      id: "-",
      spendFiles: [],
    };
    this.activeCompanyName = this.activeCompany.name ?? "-";

    // @ts-ignore
    this.activeCompanyIri = this.activeCompany["@id"] ?? "-";
    this.activeCompanyUUid = StringUtils.removeIRI(
      this.activeCompanyIri ?? "-",
    );

    this.activeSpendFileVersion = data.activeSpendFileVersion ?? {
      name: "-",
      version: 0,
      id: "-",
    };
    this.activeSpendFileVersionName = this.activeSpendFileVersion.name ?? "-";
    this.activeSpendFileVersionNameVersion =
      this.activeSpendFileVersion.name +
      ` (Ver. ${this.activeSpendFileVersion.version})`;

    // @ts-ignore
    this.activeSpendFileVersionIri = this.activeSpendFileVersion["@id"] ?? "-";
    this.activeSpendFileVersionUUid = StringUtils.removeIRI(
      this.activeSpendFileVersionIri,
    );

    this.activeSpendFileVersionVersion = this.activeSpendFileVersion.version;
    this.companies = data.availableCompanies ?? new Array(0);

    console.log("- User: '" + this.email + "' with UUID: " + this.userUUid);
    console.log(
      "- On Company: '" +
        this.activeCompanyName +
        "' with UUID: " +
        this.activeCompanyUUid,
    );
    console.log(
      "- Active SpendFileVersion: '" +
        this.activeSpendFileVersionName +
        "' ver: " +
        this.activeSpendFileVersionVersion +
        " with UUID: " +
        this.activeSpendFileVersionUUid,
    );
    console.log(
      "- Active Program : '" +
        this.ActiveProgramName +
        "' with UUID: " +
        this.ActiveProgramUUid,
    );
    console.log("WhoAmI response processed successfully.");
    Api2.printFooter();
  }

  public async refreshWhoAmI(quite = false) {
    console.log("*** Calling External Function: WhoAmI()...");
    const methPath = "/api/user/who_am_i";

    if (!quite) {
      console.log(`      URL: ${this.apiUrl}${methPath}`);
    }

    // who_am_i has a transient non-2xx pattern on dev/test (session
    // renewal mid-request, brief 5xx) that surfaces as a flaky test 0ms
    // failure on the first call of a serial suite. A single retry was
    // enough to disambiguate most of the time, but the QA report
    // (2026-05-22 sme-badge / negotiation-harm-by-level-labels) hit a
    // window where two consecutive calls returned non-ok. Bump to four
    // attempts with linear backoff so brief 5xx/auth-renewal windows
    // (typically <2s) do not propagate as test failures.
    const MAX_WHOAMI_ATTEMPTS = 4;
    const WHOAMI_BASE_BACKOFF_MS = 750;
    let processResult: IprocessedResponse = {
      data: null,
      status: null,
      result: false,
      body: null,
    };
    let ok = false;
    for (let attempt = 0; attempt < MAX_WHOAMI_ATTEMPTS && !ok; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter: 1.5s / 3s / 6s + ~0-100ms random.
        const jitter = Math.random() * 100;
        const wait = WHOAMI_BASE_BACKOFF_MS * 2 ** attempt + jitter;
        console.log(
          `*** WhoAmI() attempt ${attempt + 1} after transient non-ok response (prev status: ${processResult.status}); backing off ${Math.round(wait)}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      const getRequest = await this.doGet(methPath, null, {
        Accept: "application/json, text/plain, */*",
      });
      processResult = {
        data: null,
        status: null,
        result: false,
        body: null,
      };
      ok = await Api2.processApiResponse(
        getRequest,
        "Processing WhoAmI Call response",
        processResult,
      );
    }
    expect(ok, {
      message: "Error calling who_am_i on API:" + methPath,
    }).toBeTruthy();

    // Parsing response

    this.processWhoIam(<Iuserdata>processResult.data);
    Api2.printSeparator();
    this.initialized = true;
  }

  public async changeToCompany(companyUUid: string, quite = false) {
    console.log(
      "*** Calling External Function: UpdateToken(changeToCompany)...",
    );
    const methPath = "/security/update_token";

    if (!quite) {
      console.log("    Changing to company With UUID: " + companyUUid);
    }

    // Check authentication
    await this.checkAuthentication();

    const postRequest = await this.request!.post(this.apiUrl + methPath, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "content-type": "multipart/form-data",
      },
      multipart: {
        selectedCompany: "/api/companies/" + companyUUid,
      },
    });

    if (!quite) {
      console.log(await postRequest.text());
    }

    if (postRequest.ok()) {
      // Parsing response
      const body = await postRequest.body();
      const data = JSON.parse(body.toString());
      console.log("Changed Company as: " + this.email);
      console.log("User Name: " + this.email);
      console.log("User Password: " + this.password);

      // Calling Who AmI
      await this.refreshWhoAmI(quite);
    } else {
      const body = await postRequest.body();
      const data = JSON.parse(body.toString());
      console.log("Fail changing to company with UUID:" + companyUUid);
      console.log("Response: ", data);

      throw new Error("Error changing Active Company:");
    }
  }

  public async changeToSpendFileVersion(
    SpendFileVersionUuid: string,
    quite = false,
  ) {
    console.log("*** Calling External Function: ChangeToSpendFileVersion()");
    const methPath = "/api/users/" + this.userUUid;
    const fullUrl = this.apiUrl + methPath;

    if (!quite) {
      console.log("URL: " + fullUrl);
      console.log(
        "Changing to SpendFileVersion With UUID: " + SpendFileVersionUuid,
      );
    }

    // Check authentication
    await this.checkAuthentication();
    const file = {
      activeSpendFileVersion:
        "/api/spend_file_versions/" + SpendFileVersionUuid,
    };

    const response = await this.doPatch(methPath, file);
    const processResult: IprocessedResponse = {
      data: null,
      status: null,
      result: false,
      body: null,
    };
    expect(
      await Api2.processApiResponse(
        response,
        "Changed to ActiveSpendFileVersion",
        processResult,
      ),
    ).toBeTruthy();
    console.log("Changed to ActiveSpendFileVersion: " + SpendFileVersionUuid);

    // Calling Who AmI
    await this.refreshWhoAmI(quite);
  }

  public static async processApiResponse(
    response: APIResponse | Response,
    helpText: string,
    processResult: IprocessedResponse,
    printData = false,
    answerValidator?: (data: any | null, response: APIResponse) => boolean,
  ): Promise<boolean> {
    const responseCast = response as APIResponse;

    try {
      processResult.status = responseCast.status();

      Api2.printSeparator();
      console.log(helpText);
      console.log(
        "  Response Status: " +
          responseCast.status() +
          ": " +
          responseCast.statusText(),
      );

      const body = await responseCast.body();
      if (body === null || body === undefined) {
        console.log("ERROR: None body in response");
        Api2.printSeparator();
        return false;
      }

      // Trying to get data...
      try {
        processResult.data = JSON.parse(body.toString());
      } catch (ff) {
        processResult.data = null;
        processResult.body = body.toString();
        Api2.printHeader("Unparsed body");
      }

      // Check if data ????
      if (processResult.data === null || processResult.data === undefined) {
        console.log("ERROR: None data in response");
        const validation =
          answerValidator !== null &&
          answerValidator !== undefined &&
          answerValidator(null, responseCast);
        Api2.printSeparator();
        processResult.result = false;
        return validation;
      }

      // If data ....
      processResult.result = responseCast.ok();

      const validation =
        (answerValidator !== null &&
          answerValidator !== undefined &&
          answerValidator(processResult.data, responseCast)) ||
        ((answerValidator === null || answerValidator === undefined) &&
          responseCast.ok());
      Api2.printSeparator();

      return validation;
    } catch (ff) {
      console.log(ff);
      Api2.printSeparator();
    }
    return false;
  }

  public async getCurrentUserCompanies(): Promise<any[]> {
    // Check authentication
    await this.checkAuthentication();

    const companies = new Array(0);
    this.companies.forEach((companyItem) => {
      const companyName = companyItem.name;
      const id = companyItem["@id"];
      const uuid = StringUtils.removeIRI(id);
      const item = { companyName, id, uuid };
      companies.push(item);
    });
    return companies;
  }

  public getCurrentCompanySpendFileVersions(): any[] {
    const files = new Array(0);
    if (
      this.activeCompany === null ||
      this.activeCompany === undefined ||
      this.activeCompany.spendFileVersions === null ||
      this.activeCompany.spendFileVersions === undefined ||
      this.activeCompany.spendFileVersions.length === 0
    ) {
      return files;
    }
    this.activeCompany.spendFileVersions.forEach((file) => {
      // console.log("* *file",file)

      const spendFileName = file.name;
      const spendFileId = file["@id"];
      const spendFileUUid = StringUtils.removeIRI(spendFileId);

      const version = file.version;
      const id = file["@id"];
      const versionUUid = StringUtils.removeIRI(id);
      const item = {
        spendFileName,
        spendFileId,
        spendFileUUid,
        version,
        versionUUid,
      };
      files.push(item);
    });
    return files;
  }

  public async ensureCompany(companyName: string) {
    // Check if current, do nothing
    if (companyName === this.activeCompanyName) {
      return;
    }

    // Looking for UUid
    let foundCompanyUUid = "";
    const companies = await this.getCurrentUserCompanies();

    companies.forEach((company) => {
      if (company.companyName === companyName) {
        foundCompanyUUid = company.uuid;
      }
    });

    if (
      foundCompanyUUid === "" ||
      foundCompanyUUid === null ||
      foundCompanyUUid === undefined
    ) {
      throw new Error(
        " Company:''" +
          companyName +
          "' was not found or not avaliable for current User",
      );
    }

    await this.changeToCompany(foundCompanyUUid);
  }

  public async ensureSpendFileVersion(
    spendFileName: string,
    version: number,
  ): Promise<void> {
    // Check if current, do nothing
    if (
      this.activeSpendFileVersionName === spendFileName &&
      this.activeSpendFileVersionVersion === version
    ) {
      return;
    }

    // Looking for UUid
    let foundVersionUuid = "";
    const versions = this.getCurrentCompanySpendFileVersions();

    versions.forEach((ver2) => {
      if (ver2.spendFileName === spendFileName && ver2.version === version) {
        foundVersionUuid = ver2.versionUUid;
      }
    });

    if (
      foundVersionUuid === "" ||
      foundVersionUuid === null ||
      foundVersionUuid === undefined
    ) {
      throw new Error(
        " SpendFile:" +
          spendFileName +
          " version:" +
          version +
          " was not found or not avaliable for current Company and User",
      );
    }

    await this.changeToSpendFileVersion(foundVersionUuid);
  }

  public async doPost(
    url: string,
    data: any | null,
    contextType = "application/json",
    timeout: number | null = null,
    headers: { [key: string]: string } = {},
  ): Promise<APIResponse> {
    const fullUrl = this.apiUrl + url;

    console.log("*** Doing External call(POST) to:" + fullUrl);

    if (headers === null || headers === undefined) {
      headers = {};
    }

    if (
      headers["content-type"] === undefined ||
      headers["content-type"] === null
    ) {
      headers["content-type"] = contextType;
    }

    headers["idk"] = uuidRandom();
    try {
      const response = await this.request!.post(fullUrl, {
        headers: headers,
        timeout: timeout ?? Number(process.env.E2E_CUSTOM_TIME_OUT ?? 30000),
        data: data,
      });
      return response;
    } catch (error) {
      console.log("POST ERROR:", error);
      throw error;
    }
  }

  public async doPatch(
    url: string,
    data: any,
    contextType = "application/merge-patch+json",
    timeout: number | null = null,
    headers: { [key: string]: string } = {},
  ): Promise<APIResponse> {
    console.log("*** Doing External call(PATCH) to:" + url);
    const fullUrl = this.apiUrl + url;

    if (headers === null || headers === undefined) {
      headers = {};
    }

    if (headers.Accept === null || headers.Accept === undefined) {
      headers.Accept = "application/merge-patch+json, text/csv, */*";
    }

    if (
      headers["content-type"] === undefined ||
      headers["content-type"] === null
    ) {
      headers["content-type"] = contextType ?? "application/merge-patch+json";
    }

    headers["idk"] = uuidRandom();
    try {
      const response = await this.request!.patch(fullUrl, {
        headers: headers,
        timeout: timeout ?? Number(process.env.E2E_CUSTOM_TIME_OUT ?? 30000),
        data: data,
      });
      return response;
    } catch (error) {
      console.log("PATCH ERROR:", error);
      throw error;
    }
  }

  public async doGet(
    url: string,
    timeout: number | null = null,
    headers: { [key: string]: string } = {},
  ): Promise<APIResponse> {
    console.log("*** Doing External call(GET) to:" + url);
    const fullUrl = this.apiUrl + url;

    if (headers === null || headers === undefined) {
      headers = {};
    }

    if (headers.Accept === null || headers.Accept === undefined) {
      headers.Accept = "application/merge-patch+json, text/csv, */*";
    }
    try {
      const response = await this.request!.get(fullUrl, {
        headers: headers,
        timeout: timeout ?? Number(process.env.E2E_CUSTOM_TIME_OUT ?? 30000),
      });
      return response;
    } catch (error) {
      console.log("GET ERROR:", error);
      throw error;
    }
  }

  public async doDelete(
    url: string,
    timeout: number | null = null,
    headers: { [key: string]: string } = {},
  ): Promise<APIResponse> {
    console.log("*** Doing External call(DELETE) to:" + url);
    const fullUrl = this.apiUrl + url;
    console.log("*** Doing External call(DELETE) fullUrl to:" + fullUrl);

    if (headers === null || headers === undefined) {
      headers = {};
    }

    try {
      const response = await this.request!.delete(fullUrl, {
        headers: headers,
        timeout: timeout ?? Number(process.env.E2E_CUSTOM_TIME_OUT ?? 30000),
      });
      return response;
    } catch (error) {
      console.log("DELETE ERROR:", error);
      throw error;
    }
  }

  public getApiProgram(): ApiProgram2 {
    if (this._program === null) {
      this._program = new ApiProgram2(this);
    }
    return this._program;
  }

  public getApiSpendFile(): ApiSpendFile2 {
    if (this._spendFile === null) {
      this._spendFile = new ApiSpendFile2(this);
    }
    return this._spendFile;
  }

  public static printSeparator() {
    console.log(Api2.padAll("", CONSOLE_WIDTH, "*"));
  }

  public static printHeader(message: string) {
    console.log(Api2.padAll("", CONSOLE_WIDTH, "-"));
    console.log(Api2.padAll(message, CONSOLE_WIDTH, "-"));
    console.log(Api2.padAll("", CONSOLE_WIDTH, "-"));
  }

  public static printFooter() {
    console.log(Api2.padAll("", CONSOLE_WIDTH, "-"));
  }

  public static printSuccess(
    message: string,
    fixSize = CONSOLE_WIDTH,
    char = "*",
  ) {
    console.log("");
    console.log(Api2.padAll("", fixSize, char));
    console.log(Api2.padAll(" S U C C E S S ", fixSize, char));
    console.log(Api2.padAll(message, fixSize, char));
    console.log(Api2.padAll("", fixSize, char));
    console.log("");
  }

  public static printStarting(testInfo: TestInfo) {
    console.log("");
    console.log(Api2.padAll("", CONSOLE_WIDTH, "#"));
    console.log(Api2.padAll(" T E S T ", CONSOLE_WIDTH, "#"));
    console.log(Api2.padAll(testInfo.title, CONSOLE_WIDTH, "#"));
    console.log(Api2.padAll(testInfo.file, CONSOLE_WIDTH, "#"));
    console.log(Api2.padAll("", CONSOLE_WIDTH, "#"));
    console.log("");
  }

  public static padAll(
    message: string,
    fixSize: number = CONSOLE_WIDTH,
    char = "*",
  ) {
    const messageFix =
      message === "" ? "" : " " + (message ?? "<<None Message>>") + " ";
    const len = messageFix.length;

    return len > fixSize
      ? messageFix
      : messageFix
          .padStart((fixSize - len) / 2 + len, char)
          .padEnd(fixSize, char);
  }

  public static describeObject(object: any, title = "") {
    if (title !== "") {
      Api2.printHeader("Properties on:" + title);
    }
  }

  public async waitSpendFileReady(spendfileUUID: string | null = null) {
    const getSpendFileUrl =
      "/api/spendfile/get-file-version/" +
      (spendfileUUID ?? this.activeSpendFileVersionUUid);
    let status = "unknown";
    let loopCount = 0;
    // Bound the poll so a persistent backend outage fails fast instead of
    // spinning until the test timeout. ~10s per loop → 45 loops ≈ 7.5 min.
    const MAX_LOOPS = 45;

    while (status !== "ready") {
      if (++loopCount > MAX_LOOPS) {
        throw new Error(
          `waitSpendFileReady: spend file ${spendfileUUID} not ready after ${MAX_LOOPS} polls (last status='${status}')`,
        );
      }
      const spvStatus = await this.doGet(getSpendFileUrl);
      const responseProcessed: IprocessedResponse = {
        data: [],
        status: null,
        result: false,
        body: null,
      };
      await Api2.processApiResponse(
        spvStatus,
        "Waiting SpendFile Status=Ready",
        responseProcessed,
      );

      const dataCasted = <{ status?: string; statusDescription?: string }>(
        responseProcessed.data
      );
      // A transient 5xx (e.g. 502 Bad Gateway) yields an HTML error page that
      // fails JSON.parse, so `data` is null. Treat that as "not ready yet" and
      // keep polling instead of crashing on `dataCasted.status`.
      status = dataCasted?.status ?? "-<UNKNOWN>-";
      if (status !== "ready") {
        await this.page!.waitForTimeout(10000);
      } else {
        console.log("Spend File status READY");
      }
    }
    return status;
  }

  /**
   * Bounded, non-throwing variant of {@link waitSpendFileReady}: polls the
   * spend-file status for at most `maxMs` and reports the last status it saw,
   * instead of throwing or looping until the test timeout. A transient 5xx (an
   * HTML error page that fails JSON.parse) is treated as "not ready yet" and
   * keeps polling, matching `waitSpendFileReady`.
   *
   * It reports *why* the file is not ready, not only whether it is: the backend
   * exposes its pipeline progress in `statusDescription` (for example
   * `"Updating Match Pre-Calculated Data [11/15], 0% (Large Processing)"`).
   * Returning that lets a caller put it in the assertion message, so a stalled
   * pipeline is identifiable straight from the HTML report rather than
   * appearing as an opaque `expected true, received false`.
   *
   * Two outcomes are separated from "not ready yet" so a caller can tell a
   * defect from an environment condition:
   *
   * - `failed`: the backend moved the file to one of its `error*` statuses
   *   (`errorProcessing`, `errorCalculating`, `errorUpdating`,
   *   `errorReCalculating`). Post-processing is over and it did not succeed, so
   *   there is nothing left to wait for — the call returns at once.
   * - `stalled`: status and progress description stayed byte-identical for
   *   `stallPolls` consecutive polls. The description carries the step, the
   *   percentage, the chunk counters and an ETA, all of which move while work is
   *   being done, so an unchanged one means the file is making no progress at
   *   all — typically its chunks are queued behind another company's file on a
   *   shared environment. Spending the rest of the budget on it only delays the
   *   report and the cleanup that follows.
   *
   * @param spendfileUUID spend file version UUID (defaults to the active one).
   * @param maxMs maximum time budget for this call; rounded up to whole 10s polls.
   * @param options.stallPolls consecutive polls without any change in status or
   *   progress description before the file is reported as stalled.
   * @returns the last observed status plus whether it reached "ready".
   */
  public async pollSpendFileReadyDetailed(
    spendfileUUID: string | null = null,
    maxMs = 45000,
    options?: Partial<{ stallPolls: number }>,
  ): Promise<{
    ready: boolean;
    failed: boolean;
    stalled: boolean;
    status: string;
    statusDescription: string;
    polls: number;
  }> {
    const { stallPolls = 18 } = options || {};
    const getSpendFileUrl =
      "/api/spendfile/get-file-version/" +
      (spendfileUUID ?? this.activeSpendFileVersionUUid);
    const POLL_INTERVAL_MS = 10000;
    const maxLoops = Math.max(1, Math.ceil(maxMs / POLL_INTERVAL_MS));
    let status = "unknown";
    let statusDescription = "<none>";
    let lastProgress = "";
    let pollsWithoutProgress = 0;

    for (let loop = 0; loop < maxLoops; loop++) {
      const spvStatus = await this.doGet(getSpendFileUrl);
      const responseProcessed: IprocessedResponse = {
        data: [],
        status: null,
        result: false,
        body: null,
      };
      await Api2.processApiResponse(
        spvStatus,
        "Polling SpendFile Status=Ready",
        responseProcessed,
      );

      const dataCasted = <{ status?: string; statusDescription?: string }>(
        responseProcessed.data
      );
      status = dataCasted?.status ?? "-<UNKNOWN>-";
      statusDescription = dataCasted?.statusDescription ?? "<none>";
      if (status === "ready") {
        console.log("Spend File status READY");
        return {
          ready: true,
          failed: false,
          stalled: false,
          status,
          statusDescription,
          polls: loop + 1,
        };
      }

      if (status.startsWith("error")) {
        console.log(
          `pollSpendFileReadyDetailed: ${spendfileUUID} ended in error status '${status}' ('${statusDescription}')`,
        );
        return {
          ready: false,
          failed: true,
          stalled: false,
          status,
          statusDescription,
          polls: loop + 1,
        };
      }

      // Log every poll so a stall is visible as a progress trail in the report,
      // not just as a single line once the budget is spent.
      console.log(
        `pollSpendFileReady: poll ${loop + 1}/${maxLoops} status='${status}' (${statusDescription})`,
      );

      const progress = `${status}|${statusDescription}`;
      pollsWithoutProgress =
        progress === lastProgress ? pollsWithoutProgress + 1 : 0;
      lastProgress = progress;

      if (pollsWithoutProgress >= stallPolls) {
        console.log(
          `pollSpendFileReadyDetailed: ${spendfileUUID} made no progress for ${pollsWithoutProgress} polls ` +
            `(status='${status}', '${statusDescription}') — giving up on the remaining budget`,
        );
        return {
          ready: false,
          failed: false,
          stalled: true,
          status,
          statusDescription,
          polls: loop + 1,
        };
      }

      // Skip the wait after the final check — we are about to return.
      if (loop < maxLoops - 1) {
        await this.page!.waitForTimeout(POLL_INTERVAL_MS);
      }
    }

    console.log(
      `pollSpendFileReadyDetailed: ${spendfileUUID} not ready within ${maxMs}ms (last status='${status}', '${statusDescription}')`,
    );
    return {
      ready: false,
      failed: false,
      stalled: false,
      status,
      statusDescription,
      polls: maxLoops,
    };
  }

  /**
   * Delete a spend file version by UUID.
   *
   * `DELETE /api/spend_file_versions/{uuid}` only flags the version as
   * delete-claimed and enqueues the removal, so it answers immediately and works
   * whatever processing state the version is in. Cleaning up through the API
   * instead of the Admin Console grid targets the version the test created —
   * rather than whichever row the grid happens to show first — and cannot hang
   * on a UI flow while a teardown budget runs out.
   *
   * @param spendFileVersionUUid version to delete
   * @returns true when the backend accepted the deletion
   */
  public async deleteSpendFileVersion(
    spendFileVersionUUid: string,
  ): Promise<boolean> {
    const response = await this.doDelete(
      "/api/spend_file_versions/" + spendFileVersionUUid,
    );

    if (!response.ok()) {
      console.error(
        `deleteSpendFileVersion: ${spendFileVersionUUid} was not deleted — ` +
          `${response.status()} ${response.statusText()}`,
      );

      return false;
    }

    console.log(`deleteSpendFileVersion: ${spendFileVersionUUid} deleted.`);

    return true;
  }

  public async waitCompanyEnhancingFileReady(companyfileUUID: string) {
    const getSpendFileUrl = "/api/company_enhancing_file/" + companyfileUUID;
    let status = "unknown";
    let loopCount = 0;
    // Bound the poll so a persistent backend outage fails fast instead of
    // spinning until the test timeout. ~10s per loop → 45 loops ≈ 7.5 min.
    const MAX_LOOPS = 45;

    while (status !== "ready") {
      if (++loopCount > MAX_LOOPS) {
        throw new Error(
          `waitCompanyEnhancingFileReady: file ${companyfileUUID} not ready after ${MAX_LOOPS} polls (last status='${status}')`,
        );
      }
      const spvStatus = await this.doGet(getSpendFileUrl);
      const responseProcessed: IprocessedResponse = {
        data: [],
        status: null,
        result: false,
        body: null,
      };
      await Api2.processApiResponse(
        spvStatus,
        "Waiting Company Enhanincing Status=Ready",
        responseProcessed,
      );
      const dataCasted = <{ status?: string; statusDescription?: string }>(
        responseProcessed.data
      );
      // Transient 5xx → non-JSON body → null data. Keep polling, don't crash.
      status = dataCasted?.status ?? "-<UNKNOWN>-";
      if (status !== "ready") {
        await this.page!.waitForTimeout(10000);
      } else {
        console.log("Company Enhancing File status READY");
      }
    }
    return status;
  }

  public static registerTokenSupervisor(page: Page) {
    console.log(
      `🔍 ***************✅ Register Handlers To Token API ✅*****************`,
    );
    // page.on("request", async (request) => {
    //   if (
    //     request.url().includes(process.env.E2E_BASE_URL_API + "/api/") &&
    //     !request.url().includes("/who_am_i")
    //   ) {
    //     if (
    //       request.headers()["authorization"] === null ||
    //       request.headers()["authorization"] === undefined
    //     ) {
    //       return;
    //     }
    //     const token = request.headers()["authorization"].split(" ")[1];

    //     if (token !== process.env.E2E_AUTH_ACCESS_TOKEN) {
    //       process.env.E2E_AUTH_ACCESS_TOKEN = token;
    //       console.log(
    //         "Token Updated: ",
    //         process.env.E2E_AUTH_ACCESS_TOKEN?.substring(0, 50),
    //       );
    //     }
    //   }
    // });
  }
}
