/**
 * @fileoverview
 * E2E test for Peer Group and Supplier Standard custom adjustments (Admin > Upload Data).
 *
 * Feature (@us-8248): an admin can override the calculated Peer Group / Supplier Standard
 * strategy values for an individual entity by downloading the strategies data, editing the
 * "[Custom]" columns and re-uploading the file. The customized values must then be persisted
 * and surfaced back in the strategies data.
 *
 * This test drives the real, deployed pipeline end to end via API:
 *   1. Download the current strategies data (`get-strategies-data`).
 *   2. Re-upload the full file with custom Peer Group + Supplier Standard values set for one
 *      entity (`data-customization/file/{spendFileVersionUuid}`) — same payload the UI sends.
 *   3. Assert the customized values are persisted (polling the strategies data).
 *   4. Reset the entity back to non-customized (best-effort cleanup) so the test is idempotent.
 *
 * Note: the upload re-sends the *whole* file (every column/row), exactly like the UI's
 * download → edit → upload flow; a partial file is rejected by the parser.
 */

import { test, expect, Page } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin, loginAsSuperAdmin } from "../../utils/Utils";
import Api2 from "../../utils/APi2";
import uuidRandom from "uuid-random";

const spendFileVersionID = "57115435-dea5-4848-9cfc-20f3ced5d9ec";
const spendFileName = "Pagero_34Spends_DownloadUploadPeerSupplier.xlsx (Ver. 1)";

// Exact CSV column headers (must match the backend StrategiesCustomizationManager::COLUMN_*
// constants — note the Supplier Q3 header has no closing paren in the source).
const COL = {
  uuid: "uuid",
  supCustomized: "Supplier Standard Strategy [Customized]",
  supAvg: "Supplier Standard Strategy [Custom] (Avg)",
  supQ3: "Supplier Standard Strategy [Custom] (Q3",
  supMax: "Supplier Standard Strategy [Custom] (Max)",
  supOcc: "Supplier Standard Strategy [Custom] (Occurrences)",
  pgCustomized: "Peer Group Strategy [Customized]",
  pgAvg: "Peer Group Strategy [Custom] (Avg)",
  pgQ3: "Peer Group Strategy [Custom] (Q3)",
  pgMax: "Peer Group Strategy [Custom] (Max)",
  pgOcc: "Peer Group Strategy [Custom] (Occurrences)"
};

// Custom values to apply (must satisfy 0 <= avg <= q3 <= max <= 360 and occurrences >= 1).
const SUPPLIER = { avg: 55, q3: 60, max: 70, occ: 20 };
const PEER_GROUP = { avg: 45, q3: 50, max: 55, occ: 10 };

async function getStrategiesRows(api: Api2): Promise<any[]> {
  const response = await api.doGet(
    `/api/spend-file-versions/get-strategies-data/${spendFileVersionID}`
  );
  expect(response.ok(), "get-strategies-data should respond OK").toBeTruthy();
  return JSON.parse(await response.text());
}

function toCsv(rows: any[]): string {
  const headers: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }
  const escape = (value: any) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }
  return lines.join("\n") + "\n";
}

/** Re-uploads the whole strategies file (the UI's download → edit → upload flow). */
async function uploadStrategiesFile(api: Api2, rows: any[]): Promise<void> {
  const apiUrl = (api as any).apiUrl as string;
  const response = await (api as any).request.post(
    `${apiUrl}/api/data-customization/file/${spendFileVersionID}`,
    {
      // The endpoint requires an idempotency key (sent by Api2.doPost as `idk`).
      // The backend's IdempotencySubscriber rejects any key that is not a UUID v4
      // with 400 "Idempotency key must be a UUID v4." — a timestamp-based key
      // used to pass; mirror Api2.doPost and send a random UUID.
      headers: { idk: uuidRandom() },
      multipart: {
        file: {
          name: "peer-group-supplier-adjustments.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(toCsv(rows))
        }
      }
    }
  );
  expect(
    response.ok(),
    `Upload failed (status ${response.status()}): ${(await response.text()).slice(0, 200)}`
  ).toBeTruthy();
}

/** Polls the strategies data until `predicate` holds for the target row, or times out. */
async function waitForRow(
  api: Api2,
  page: Page,
  uuid: string,
  predicate: (row: any) => boolean,
  { tries = 30, intervalMs = 5000 } = {}
): Promise<any> {
  let lastRow: any = null;
  for (let i = 0; i < tries; i++) {
    await page.waitForTimeout(intervalMs);
    try {
      lastRow = (await getStrategiesRows(api)).find((r) => r.uuid === uuid);
    } catch (e) {
      // Dev can drop a connection mid-recalculation; keep polling.
      console.log("poll transient error:", (e as Error).message);
      continue;
    }
    if (lastRow && predicate(lastRow)) return lastRow;
  }
  return lastRow;
}

let api: Api2;

test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
  await changeToSpendFile(page, spendFileName);
  api = await Api2.getInstance(page);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("Admin can apply Peer Group & Supplier Standard custom adjustments via Upload Data @admin @integrated @us-8248", async ({
  page
}) => {
  const rows = await getStrategiesRows(api);
  expect(rows.length, "spend file should have strategy rows").toBeGreaterThan(0);

  const target = rows[0];
  const uuid = target.uuid;
  console.log(`Target entity: ${target["Supplier Name"]} (${uuid})`);

  // --- Apply custom adjustments for the target entity ---
  target[COL.supCustomized] = "true";
  target[COL.supAvg] = SUPPLIER.avg;
  target[COL.supQ3] = SUPPLIER.q3;
  target[COL.supMax] = SUPPLIER.max;
  target[COL.supOcc] = SUPPLIER.occ;
  target[COL.pgCustomized] = "true";
  target[COL.pgAvg] = PEER_GROUP.avg;
  target[COL.pgQ3] = PEER_GROUP.q3;
  target[COL.pgMax] = PEER_GROUP.max;
  target[COL.pgOcc] = PEER_GROUP.occ;

  await uploadStrategiesFile(api, rows);
  console.log("Uploaded adjustments; waiting for them to be applied...");

  const applied = await waitForRow(
    api,
    page,
    uuid,
    (r) =>
      String(r[COL.supCustomized]) === "true" && Number(r[COL.supAvg]) === SUPPLIER.avg
  );

  expect(applied, "target row should still exist after upload").toBeTruthy();
  // Supplier Standard custom values persisted.
  expect(String(applied[COL.supCustomized])).toBe("true");
  expect(Number(applied[COL.supAvg])).toBe(SUPPLIER.avg);
  expect(Number(applied[COL.supQ3])).toBe(SUPPLIER.q3);
  expect(Number(applied[COL.supMax])).toBe(SUPPLIER.max);
  expect(Number(applied[COL.supOcc])).toBe(SUPPLIER.occ);
  // Peer Group custom values persisted.
  expect(String(applied[COL.pgCustomized])).toBe("true");
  expect(Number(applied[COL.pgAvg])).toBe(PEER_GROUP.avg);
  expect(Number(applied[COL.pgQ3])).toBe(PEER_GROUP.q3);
  expect(Number(applied[COL.pgMax])).toBe(PEER_GROUP.max);
  expect(Number(applied[COL.pgOcc])).toBe(PEER_GROUP.occ);
  console.log("Custom Peer Group & Supplier Standard adjustments persisted.");

  // --- Cleanup: reset the entity back to non-customized (best-effort) ---
  try {
    const resetRows = await getStrategiesRows(api);
    const resetTarget = resetRows.find((r) => r.uuid === uuid);
    // The upload's recalculation can transiently drop the row (or change its
    // uuid), so `find` may return undefined. Guard before writing the reset
    // columns — otherwise the property assignments throw a cryptic
    // `Cannot set properties of undefined`, which the catch below would swallow
    // as a misleading "best-effort reset" failure.
    if (!resetTarget) {
      console.log(
        `Best-effort reset skipped: row ${uuid} not present in reset rows ` +
          `(likely removed by the upload recalculation).`
      );
      return;
    }
    resetTarget[COL.supCustomized] = "false";
    resetTarget[COL.supAvg] = resetTarget[COL.supQ3] = resetTarget[COL.supMax] = resetTarget[COL.supOcc] = "";
    resetTarget[COL.pgCustomized] = "false";
    resetTarget[COL.pgAvg] = resetTarget[COL.pgQ3] = resetTarget[COL.pgMax] = resetTarget[COL.pgOcc] = "";

    await uploadStrategiesFile(api, resetRows);
    const reset = await waitForRow(
      api,
      page,
      uuid,
      (r) => String(r[COL.supCustomized]) === "false",
      { tries: 6 }
    );
    console.log(
      reset && String(reset[COL.supCustomized]) === "false"
        ? "Reset entity back to non-customized."
        : "Reset upload sent; values may settle after recalculation."
    );
  } catch (e) {
    console.log("Best-effort reset did not complete:", (e as Error).message);
  }
});
