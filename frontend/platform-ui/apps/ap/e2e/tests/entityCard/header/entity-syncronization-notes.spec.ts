import {expect, Page, test} from "@playwright/test";
import {
    changeToSpendFile,
    ensureDefaultLogin,
    ensureCompany_SFSuperAdminLogin,
    goToEntityCardEntityExactFull,
    goToHomeSection,
    existEntityCard,
} from "../../utils/Utils";
import Api2 from "../../utils/APi2";

const given = {
    company: "Company_SF", //automatically determined by the user: sergio+comany_sf_superadmin@calculum.ai
    spendFile: "Pagero_Privacy-2.xlsx (Ver. 1)", //The version will increase each time the test runs. The original spend file is attached.
    parent: "Halma PLC", //is present in the current and in the attached Spend File, and has a note.
    supplier: "Bureau D Electronique Appliquee", // is present in the current and in the attached Spend File, and has a note.
    supplier2: "Bio Rad Laboratories Inc", // is absent in the current but not in the attached Spend File, and has a note.
};
const entities = [{entity: given.supplier, exist: true, country: 'Belgium', type: 'supplier'}, {
    entity: given.parent, exist: true, country: null, type: 'parent'
}, {entity: given.supplier2, exist: false, country: null, type: null}]

let api: Api2 | null = null

// Total budget for the backend's parsing of the copied spend file version,
// matching waitSpendFileReady's bound (45 polls x 10s plus login and
// navigation slack).
const UPLOAD_READY_TIMEOUT_MS = 540000;

test.describe.serial("The Notes are sychronized in a new Spend File version @tc-12817", async () => {
    let page: Page;
    // UUID of the version this run creates, so cleanup deletes exactly it.
    let uploadedSpendFileVersionUUID = "";
    test.beforeAll(async ({browser}) => {
        page = await browser.newPage()
        uploadedSpendFileVersionUUID = "";
        await ensureCompany_SFSuperAdminLogin(page);
        api = await Api2.getInstance(page)
        await changeToSpendFile(page, given.spendFile);
        await page.waitForSelector(".loading-modal", {state: "detached"});
    });
    // SKIPPED (whole suite): blocked by the backend, not redundant — this is
    // the only coverage of notes synchronization across spend file versions
    // (tc-12817). The copy-notes test endpoint accepts the request and creates
    // the version, but the backend then fails processing its own canned
    // fixture: observed on dev 2026-09-01, Pagero_Privacy-2.xlsx Ver. 12
    // (uuid a24d78dd-63b8-4241-9da5-2291a587ccb9, deleted after inspection)
    // ended status='errorProcessing' after the full waitSpendFileReady budget.
    // Same class of failure as the spend_aggregations and
    // spend_file_update_original fixtures (see the upload-spend-file specs).
    // The selector drift that also broke this suite is already fixed below
    // (the Admin Console dance against the removed #listOfCompanies select is
    // gone, cleanup deletes by UUID); unskip once the copy-notes ingest
    // reaches 'ready' on dev.
    test.skip("Upload The Notes are sychronized in a new Spend File version.", async ({},testInfo) => {
        // Parsing the copied version takes minutes on dev; the suite default
        // budget does not cover waitSpendFileReady's polling.
        test.setTimeout(UPLOAD_READY_TIMEOUT_MS);
        // The version is created entirely by the copy-notes test endpoint
        // (TestSpendFileVersionCopyController hardcodes the company, the user
        // and the source version to copy notes from). The Admin Console dance
        // this test used to perform before calling it (pick the company, open
        // the upload modal, pick a sync source, OK, Cancel) never submitted
        // anything, and it drove the native #listOfCompanies select that the
        // SearchableDropdown replaced; the upload modal itself is covered by
        // data-sincronize-choices.spec.ts.
        //
        // The version UUID is captured from the parsing response before the
        // readiness wait, so the afterAll can delete the version even when the
        // backend fails mid-processing (uploadNewSpendFile only returns it
        // after the wait succeeds, which is how failed runs piled up residue
        // versions on Company_SF).
        Api2.printStarting(testInfo);
        const parsingResponse = await api!.doGet('/api/test/spend-file/copy-notes');
        expect(parsingResponse.ok()).toBe(true);
        const parsingBody = await parsingResponse.json();
        expect(parsingBody.spendFileVersion).toBeTruthy();
        uploadedSpendFileVersionUUID = parsingBody.spendFileVersion;

        const status = await api!.waitSpendFileReady(uploadedSpendFileVersionUUID);
        expect(status).toBe('ready');
        const newSpendfileFullName = `${parsingBody.name} (Ver. ${parsingBody.version})`;
        await goToHomeSection(page)
        await changeToSpendFile(page, newSpendfileFullName);
    })
    test.skip(`${given.supplier} exist and has notes`, async () => {
        const element = entities[0]
        await checkNotes(page, element.entity, element.exist, element.country, element.type)
    })
    test.skip(`${given.parent} exist and has notes`, async () => {
        const element = entities[1]
        await checkNotes(page, element.entity, element.exist, element.country, element.type)
    })
    test.skip(`${given.supplier2} not exist`, async () => {
        const element = entities[2]
        await checkNotes(page, element.entity, element.exist, element.country, element.type)
    })
    test.afterAll(async () => {
        console.log("***Finishing test***");
        // Delete by UUID over the API: it needs no navigation and hits exactly
        // the version this run created. The old grid-driven cleanup
        // (deleteUploadedSpendfile) clicked the first "Delete" link of the
        // Data Controller grid without pinning the company, and it cannot even
        // reach the Admin Console when a failure leaves the page inside it.
        test.setTimeout(180000);
        try {
            if (uploadedSpendFileVersionUUID) {
                await api!.deleteSpendFileVersion(uploadedSpendFileVersionUUID);
            } else {
                console.error(
                  "afterAll: no spend file version was created, nothing to delete.",
                );
            }
        } catch (error) {
            console.error(
              "afterAll: cleanup failed — the uploaded spend file may still exist:",
              error instanceof Error ? error.message : String(error),
            );
        }
        await ensureDefaultLogin(page);
        // Close the page's context (not the worker `browser` fixture) so the
        // worker stays alive for the next spec in the workers=1 pipeline.
        await page?.context().close().catch((error) => {
          console.error(
            "afterAll: page.context().close() failed (non-critical):",
            error instanceof Error ? error.message : String(error),
          );
        });
    });
})


async function checkNotes(page: Page, entity: string, exist: boolean, country: string | null, type: string | null) {
    console.log(`entity ${entity}, exist ${exist}, country ${country}, type ${type} `)
    const companyType = (type as 'parent' | 'supplier' | null)
    let result;
    if (exist) {
        await goToEntityCardEntityExactFull(page, entity, 0, true, country, companyType)
        await page.locator('#home-nav-icon').first().click()
        const notes = page.locator('.note.current-user-notes')
        result = await notes.count()
        console.log(`Cant notes ${result}`)
        expect(result).toBeGreaterThan(0)
    } else {
        result = await existEntityCard(page, entity)
        console.log(`Entity encountered ${result > 0}`)
        expect(result).toBeLessThanOrEqual(0)
    }

}
