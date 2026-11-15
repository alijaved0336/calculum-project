<template>
  <section class="page-content">
    <CalculumLoading v-if="isAdjustmentsBusy" :modal="true"></CalculumLoading>
    <div class="col-12">
      <div class="row mb-4">
        <!-- UC-ENT-12 A3. Named as unconfigured rather than shown as an empty dropdown. -->
        <div class="col-6" v-if="hasNoReceivablesCompany">
          <p class="m-0 text-muted">
            {{ $t('adminBackend.adminUploadData.noReceivablesCompany') }}
          </p>
        </div>
        <div class="col-4" v-else>
          <SearchableDropdown
            v-model="companySelectedId"
            :items="companiesDropdownItems"
            :placeholder="$t('company.selectCompany')"
          ></SearchableDropdown>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <div class="card p-4">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <h5 class="m-0 d-flex gap-2 align-items-center"><span>{{ $t('adminBackend.adminDataController.tab.uploadDataReceivables') }}</span>
                <ButtonIconStandard :ignorePopOver="true" @click="fetchGrid">
                  <IconSync class="w-5"></IconSync>
                </ButtonIconStandard>
              </h5>
              <div>
                <input
                  class="d-none"
                  id="fileInputSale"
                  ref="fileInputSale"
                  type="file"
                  @change="onFileSelected"
                  @click="resetFileInput"
                />
                <button
                  class="btn btn-primary font-md px-8 w-unset"
                  id="upload-sale-file"
                  :disabled="!canUpload || isUploading"
                  @click="triggerFileDialog"
                >
                  {{ isUploading ? $t('global.loading') : $t('adminBackend.adminUploadData.uploadFile') }}
                </button>
              </div>
            </div>

            <CalculumGrid
              :columnsLocalName="'AdminUploadSaleFiles'"
              :gridColumns="defaultSaleFilesGridColumns"
              :gridData="saleFilesGridData"
              :defaultPageSize="5"
              :pagingSizeCustomArray="[5,10,25,50,100]"
              :hideColumnSelector="true"
              :showToolbar="false"
              :selectable="false"
              :allowExportExcel="false"
              :buttonText="$t('button.recalculate')"
              @button-action-clicked="onGridButtonAction"
              @download-adjustments="onDownloadAdjustments"
              @upload-adjustments="onUploadAdjustments"
              @outcome-adjustments="onOutcomeAdjustments"
              :key="keyGrid"
            ></CalculumGrid>
          </div>
        </div>
      </div>
    </div>

    <!--
      AB#20259 — what the last uploaded adjustments file actually did.

      Every one of Receivables' three answers gets its own sentence. "Nobody has uploaded" and
      "Receivables has never heard of this version" both arrive without a report and are NOT the
      same thing: the second means the sale file never reached Receivables, which is somebody's to
      act on. A shared empty state would bury it.
    -->
    <CalculumModal
      v-if="outcomeModalOpen"
      :size="'lg'"
      :showClose="true"
      :title="$t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.title')"
      @close="closeOutcomeModal"
    >
      <template v-slot:modalContent>
        <p class="text-gray-600 font-sm mb-1">
          {{ outcomeRow?.saleFileName }} · {{ $t('adminBackend.adminUploadData.table.version') }} {{ outcomeRow?.version }}
        </p>

        <!-- Which file this result belongs to. Two columns now open this same panel, and the
             counters below look identical for either — without this line an administrator reading
             "no adjustments file has been uploaded" cannot tell which of the two it is about.

             Spelled as two literal keys rather than one lookup through the behaviour table.
             `ReceivablesAdjustmentsOutcomeI18n.spec.ts` scans this file for the keys it uses and
             fails on any it cannot resolve, precisely so a key that exists in no catalog cannot
             ship — and a key read out of a table is one it cannot see.

             They are the two column titles, reused rather than restated: a second pair of catalog
             entries holding the same strings would be two more values to keep in step with these
             every time either file is renamed. -->
        <!-- The ternary's second arm is the Peer Group title rather than a third case because
             `onOutcomeAdjustments` refuses a behaviour the table does not name, so `outcomeBehavior`
             is only ever one of these two by the time the panel opens. -->
        <p v-if="outcomeBehavior" class="text-gray-900 font-sm fw-bold mb-3">
          {{ outcomeBehavior === CREDIT_RATING_BEHAVIOR
            ? $t('global.creditRatingAdjustments')
            : $t('global.peerGroupAndBuyerStandardAdjustments') }}
        </p>

        <p v-if="outcomeState === ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET" class="mb-0">
          {{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.noUploadYet') }}
        </p>

        <p v-else-if="outcomeState === ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN" class="mb-0">
          {{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.versionUnknown') }}
        </p>

        <div v-else-if="outcomeState === ADJUSTMENTS_OUTCOME_REPORTED && outcomeReport">
          <!--
            The four counters stay four. "31 values recorded" would hide that 6 were written, 25
            cleared and 2 rows matched nothing, and one success figure is exactly what makes an
            upload that quietly did nothing look like one that worked.
          -->
          <div class="d-flex flex-wrap gap-4 mb-3">
            <div>
              <div class="font-sm text-gray-600">{{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.rowsMatched') }}</div>
              <div class="font-lg">{{ outcomeReport.rowsMatched }}</div>
            </div>
            <div>
              <div class="font-sm text-gray-600">{{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.valuesWritten') }}</div>
              <div class="font-lg">{{ outcomeReport.valuesWritten }}</div>
            </div>
            <div>
              <div class="font-sm text-gray-600">{{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.valuesCleared') }}</div>
              <div class="font-lg">{{ outcomeReport.valuesCleared }}</div>
            </div>
            <div>
              <div class="font-sm text-gray-600">{{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.valuesUnchanged') }}</div>
              <div class="font-lg">{{ outcomeReport.valuesUnchanged }}</div>
            </div>
          </div>

          <p class="font-sm text-gray-600 mb-3">{{ outcomeSummaryLine }}</p>

          <!--
            Rejections carried whole rather than counted: "2 rows rejected" cannot be found in the
            file the administrator still has open, and a line number and a key can.
          -->
          <div v-if="outcomeReport.rejections?.length">
            <table class="w-100 font-sm">
              <thead>
                <tr class="text-gray-600">
                  <th class="pe-3">{{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.line') }}</th>
                  <th class="pe-3">{{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.uniqueId') }}</th>
                  <th>{{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.reason') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(rejection, index) in outcomeReport.rejections" :key="index">
                  <td class="pe-3">{{ rejection.lineNumber }}</td>
                  <td class="pe-3">{{ rejection.sourceUniqueId }}</td>
                  <td>{{ rejection.reason }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mb-0 font-sm text-gray-600">
            {{ $t('adminBackend.adminUploadData.receivablesAdjustmentsOutcome.noRejections') }}
          </p>
        </div>
      </template>
    </CalculumModal>

    <!-- AB#20871. The payables grid's own confirmation, reused so both deletes read alike. -->
    <CalculumDeleteModal
      v-if="deleteCandidate"
      :for-delete-spend-file="true"
      :loading="isDeleting"
      @delete-spend-file="confirmDelete"
      @hide="cancelDelete"
    ></CalculumDeleteModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import { CalculumLoading, SearchableDropdown } from "@ada/design-system";
import { saveAs } from "@progress/kendo-file-saver";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumDeleteModal from "@/modules/components/CalculumDeleteModal.vue";
import ButtonIconStandard from "@/modules/components/ButtonIconStandard.vue";
import IconSync from "@/resources/assets/images/icons/IconSync.vue";
import { useAdminBackendStore } from "@/stores/adminBackend";
import { filterReceivablesCompanies } from "@/modules/adminBackend/utils/CompaniesUtils";
import { StringUtils } from "@/utils";
import { extensionForContentType } from "@/utils/contentDisposition";
import { defaultSaleFilesGridColumns } from "@/modules/adminBackend/data/columns";
import {
  ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET,
  ADJUSTMENTS_OUTCOME_REPORTED,
  ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN,
  ADJUSTMENTS_KIND_CREDIT_RATING,
  ADJUSTMENTS_KIND_STRATEGY,
  deleteSaleFileVersion,
  downloadAdjustments,
  fetchAdjustmentsOutcome,
  postSaleFile,
  recalculateSaleFileVersion,
  saleFilesVersionsAPIReadAll,
  saleFilesVersionsByCompanyAPIReadAll,
  uploadAdjustments
} from "@/modules/home/saleFiles/api";

const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
const toast = useToast();
const adminBackendStore = useAdminBackendStore();

const ALL = "all";
const companySelectedId = ref<string>(ALL);
const isUploading = ref<boolean>(false);
const fileInputSale = ref<HTMLInputElement | null>(null);
const saleFilesGridData = ref<any[]>([]);
const keyGrid = ref<number>(0);

/** The version whose recalculation request is in flight, or null. One at a time, deliberately. */
const recalculatingUuid = ref<string | null>(null);

const RECALCULATE_I18N = "adminBackend.adminUploadData.receivablesRecalculate";

const DELETE_I18N = "adminBackend.adminUploadData.receivablesDelete";

/** The row the delete confirmation is open for (AB#20871), or null while it is closed. */
const deleteCandidate = ref<any | null>(null);

/** The delete request is in flight: the modal's own spinner, and a guard against a second click. */
const isDeleting = ref<boolean>(false);

/**
 * The grid's own adjustments cell (UC-SET-07, AB#19711). CalculumGrid emits `download-adjustments`
 * / `upload-adjustments` for every DownloadUpload column it renders, payables ones included, so the
 * behavior string is what tells this view the event is its own rather than a payables sibling's.
 */
const ADJUSTMENTS_BEHAVIOR = "peerGroupAndBuyerStandardAdjustments";

/** UC-SET-08 / AB#19911. The Credit Rating file's own column, queue and outcome record. */
const CREDIT_RATING_BEHAVIOR = "creditRatingAdjustments";

/**
 * Everything that differs between the two adjustments columns, in one place.
 *
 * The three handlers below are shared: the files travel the same envelope, answer the same 202 and
 * report the same three outcome states, so branching inside each handler would have spread the one
 * real difference — which endpoint and which row flag — across three `if`s that must agree. A
 * behaviour the table does not name is not ours: the grid emits these events for the payables
 * columns too, so an unknown key must fall through rather than be routed anywhere.
 *
 * **Data, not functions.** An earlier draft held the three api calls per row, which dereferenced
 * them while the component set up and broke every component spec that mocks this api module with
 * only the exports it exercises. Holding the url segment instead means the handlers call the one
 * parameterised function each, and a spec still only has to mock what it uses.
 */
const ADJUSTMENTS = {
  [ADJUSTMENTS_BEHAVIOR]: {
    kind: ADJUSTMENTS_KIND_STRATEGY,
    fileNameInfix: "strategyAdjustments",
  },
  [CREDIT_RATING_BEHAVIOR]: {
    kind: ADJUSTMENTS_KIND_CREDIT_RATING,
    fileNameInfix: "creditRatingAdjustments",
  },
} as const;

type AdjustmentsBehavior = keyof typeof ADJUSTMENTS;

function adjustmentsFor(behavior: string) {
  return ADJUSTMENTS[behavior as AdjustmentsBehavior] ?? null;
}

/** Blocks the screen while the export is being proxied or the edited file uploaded. */
const isAdjustmentsBusy = ref<boolean>(false);

/**
 * The adjustments outcome detail (AB#20259). `outcomeState` is one of Receivables' three answers
 * and is kept as its own value rather than inferred from `outcomeReport` being null — "nobody has
 * uploaded against this version" and "Receivables has never heard of this version" both arrive with
 * no report, and the second is a finding about the sale file rather than an absence of adjustments.
 */
const outcomeModalOpen = ref<boolean>(false);
const outcomeState = ref<string | null>(null);
const outcomeReport = ref<any | null>(null);
const outcomeRow = ref<any | null>(null);
/** Which of the two files the open detail is reporting on, so the panel can name it. */
const outcomeBehavior = ref<string | null>(null);

const HTTP_ACCEPTED = 202;

/**
 * Companies enabled for receivables, i.e. holding MODULE_AR (UC-ENT-12 A2).
 *
 * Read off `roles`, which `/api/companies` already serialises — the same source the admin grid
 * reads to paint its checkboxes, so this needs no endpoint of its own.
 */
const receivablesCompanies = computed<any[]>(() =>
  filterReceivablesCompanies(adminBackendStore.getCompanies)
);

/**
 * Whether the companies list has actually been read, as opposed to merely being empty.
 *
 * The store is empty until its first fetch resolves and stays empty if that fetch fails, so an
 * empty list on its own cannot tell "nobody is enabled" from "nobody has been asked yet". Without
 * this the screen told an administrator to go and tick a checkbox that may already be ticked, on
 * every initial render and permanently after a failed fetch — a false instruction is worse than the
 * bare dropdown A3 set out to replace.
 */
const companiesLoaded = ref<boolean>(false);

/** No company has been enabled for receivables, and we have read the list to know it. */
const hasNoReceivablesCompany = computed(
  () => companiesLoaded.value && receivablesCompanies.value.length === 0
);

const companiesDropdownItems = computed(() => {
  const allOption = { value: ALL, label: translate.t("company.allCompanies") };
  const companyOptions = receivablesCompanies.value
    .map((company: any) => ({ value: company["@id"], label: company.name }))
    .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label)));

  return [allOption, ...companyOptions];
});

// A concrete company (not "all") is required to upload a sale file.
const canUpload = computed(
  () =>
    !StringUtils.isNullUndefinedOrEmpty(companySelectedId.value) &&
    companySelectedId.value !== ALL
);

function triggerFileDialog(): void {
  fileInputSale.value?.click();
}

function resetFileInput(event: any): void {
  if (event?.target) event.target.value = "";
}

async function fetchGrid(): Promise<void> {
  try {
    const response =
      companySelectedId.value === ALL
        ? await saleFilesVersionsAPIReadAll()
        : await saleFilesVersionsByCompanyAPIReadAll(
            StringUtils.removeIRI(companySelectedId.value)
          );

    saleFilesGridData.value = response?.success && Array.isArray(response.data) ? response.data : [];
    keyGrid.value++;
  } catch (error) {
    if (import.meta.env.DEV) console.error("** (fetchGrid AR)", error);
    saleFilesGridData.value = [];
  }
}

async function onFileSelected(event: any): Promise<void> {
  const file = event?.target?.files?.[0];
  if (!file || !canUpload.value) return;

  isUploading.value = true;
  try {
    const companyUUID = StringUtils.removeIRI(companySelectedId.value);
    const response = await postSaleFile(file, companyUUID);

    if (response?.success) {
      toast.success(translate.t("adminBackend.adminUploadData.uploadFile"));
      await fetchGrid();
    } else {
      toast.error(response?.data?.message || "Error");
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error("** (onFileSelected AR)", error);
    toast.error("Error");
  } finally {
    isUploading.value = false;
  }
}

/**
 * Recalculation (AB#20095). The endpoint no longer re-publishes the upload event — it asks AR to
 * recalculate — and the difference this view has to honour is that AR ANSWERS.
 *
 * A refusal carries AR's own sentence ("another process is using this file version"), which tells
 * the administrator to wait; an unreachable AR carries the proxy's, which tells them to call
 * somebody. Both used to be impossible: a published event reports nothing but success. So the
 * server's message is shown whenever there is one, and the fallback names the failure rather than
 * saying "Error".
 *
 * The row is marked in flight because the grid still shows it as `ready` until the refresh lands,
 * and a second click on a claimed version is answered 409.
 */
async function onGridButtonAction(payload: { action: string; dataItem: any }): Promise<void> {
  if (payload?.action === "delete") {
    requestDelete(payload.dataItem);
    return;
  }

  if (payload?.action !== "recalculate") return;

  const uuid = payload?.dataItem?.uuid;
  if (StringUtils.isNullUndefinedOrEmpty(uuid)) return;
  if (recalculatingUuid.value !== null) return;

  markRecalculating(uuid, true);

  try {
    const response = await recalculateSaleFileVersion(uuid);
    if (response?.success) {
      toast.success(translate.t(`${RECALCULATE_I18N}.queued`));
      await fetchGrid();
    } else {
      toast.error(response?.data?.message || translate.t(`${RECALCULATE_I18N}.failed`));
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error("** (onGridButtonAction AR)", error);
    toast.error(translate.t(`${RECALCULATE_I18N}.failed`));
  } finally {
    markRecalculating(uuid, false);
    recalculatingUuid.value = null;
  }
}

/** Opens the confirmation for one row; nothing is asked of the server until it is confirmed. */
function requestDelete(dataItem: any): void {
  if (StringUtils.isNullUndefinedOrEmpty(dataItem?.uuid)) return;

  deleteCandidate.value = dataItem;
}

function cancelDelete(): void {
  if (isDeleting.value) return;

  deleteCandidate.value = null;
}

/**
 * The confirmed delete (AB#20871). Reports acceptance, not removal: the server answers once AR has
 * claimed the version, and AR's worker removes it afterwards, so the refreshed grid shows the row as
 * `deleteClaimed` until it is gone.
 *
 * Offered in every status, a parse or a calculation in flight included: AR lets the delete win over
 * the run. A refusal (a version already gone, a user without access) carries the server's own
 * reason and is shown as it is, for the reason the Recalculate handler gives.
 */
async function confirmDelete(): Promise<void> {
  const uuid = deleteCandidate.value?.uuid;
  if (StringUtils.isNullUndefinedOrEmpty(uuid) || isDeleting.value) return;

  isDeleting.value = true;
  try {
    const response = await deleteSaleFileVersion(uuid);
    if (response?.success) {
      toast.success(translate.t(`${DELETE_I18N}.queued`));
      await fetchGrid();
    } else {
      toast.error(response?.data?.message || translate.t(`${DELETE_I18N}.failed`));
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error("** (confirmDelete AR)", error);
    toast.error(translate.t(`${DELETE_I18N}.failed`));
  } finally {
    isDeleting.value = false;
    deleteCandidate.value = null;
  }
}

/**
 * Flags the rows the cell reads, on the array the grid is handed rather than on a copy — a new
 * array so the grid re-renders, the same way fetchGrid replaces it wholesale.
 *
 * **Two flags, because the guard above is one request per view while only one row is running.**
 * `recalculating` marks the row that was clicked; `busy` marks every row, so the others disable
 * themselves and explain that another recalculation is in flight. Without it the grid would keep
 * offering enabled buttons whose clicks the guard silently drops — an enabled control that does
 * nothing. AR's dashboard disables its whole Actions column for the same reason.
 */
function markRecalculating(uuid: string, value: boolean): void {
  recalculatingUuid.value = value ? uuid : null;
  saleFilesGridData.value = saleFilesGridData.value.map((row: any) => ({
    ...row,
    recalculating: value && row?.uuid === uuid,
    busy: value
  }));
}

/**
 * The proxy answers 502 with AR's own reason in `message`, and that reason is the only thing that
 * distinguishes "this version has not been calculated yet" from "AR is down" — the difference the
 * administrator is the one who can act on. Falls back to a generic line rather than showing
 * `undefined` when the body is not the shape we expect.
 */
function errorMessageFrom(body: any): string {
  // The download reads its response as an arraybuffer, which axios also uses for the *error*
  // body, so the JSON has to be decoded before it can be read. Without this every proxy failure
  // fell through to the generic line and AR's reason — the useful half — was discarded.
  const decoded = decodedErrorBody(body);

  return decoded?.message || decoded?.error?.message || translate.t("global.noty.error.tryAgainLater");
}

/** Flattened out of errorMessageFrom: a nested ternary there tripped Sonar typescript:S3358. */
function decodedErrorBody(body: any): any {
  if (isBinaryBody(body)) {
    return safeParseJson(new TextDecoder("utf-8").decode(body));
  }

  if (typeof body === "string") {
    return safeParseJson(body);
  }

  return body;
}

/**
 * Deliberately a shape test rather than `body instanceof ArrayBuffer`.
 *
 * `instanceof` compares prototypes, and a buffer that crossed a realm boundary — jsdom under
 * vitest, a worker, an iframe — carries that realm's `ArrayBuffer.prototype` and fails the check
 * while being a perfectly ordinary buffer. Measured: `instanceof` is false for a genuine
 * ArrayBuffer in this app's test environment, so the instanceof version discarded AR's message in
 * exactly the case it was written to preserve it.
 */
function isBinaryBody(body: any): boolean {
  return body !== null && typeof body === "object" && typeof body.byteLength === "number";
}

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Names the saved file after the sale file and version it was exported for, so two downloads from
 * two versions of the same file do not collide in a downloads folder. Used only when the proxy
 * served no Content-Disposition of its own.
 *
 * **The extension is not optional.** An earlier version left it off on the reasoning that the format
 * is AR's to choose — but a file with no extension is one the OS cannot associate, so the
 * administrator cannot reopen it to edit and upload it back, which is the entire point of the
 * column. It is derived from the Content-Type the proxy passed through instead, so the format is
 * still AR's decision and the file is still openable.
 */
function adjustmentsFileName(dataItem: any, infix: string, contentType?: string): string {
  const baseName = String(dataItem?.saleFileName ?? "saleFile").replace(/\.[^.]+$/, "");

  return `${baseName}-${infix}-Version${dataItem?.version ?? ""}${extensionForContentType(contentType)}`;
}

/**
 * An adjustments export — either file, picked by the behaviour the grid emits (UC-SET-07
 * AB#19711; UC-SET-08 AB#19911).
 *
 * The monolith proxies AR's export and streams the bytes back, so this saves what it received and
 * converts nothing: the payables sibling decodes JSON and builds a CSV in the browser because its
 * endpoint answers JSON, and reproducing that here would put a second opinion on the file's shape
 * in the one place the use case says must not have one.
 *
 * A failed proxy is a 502 whose body names AR's own reason, and that reason is what the user sees.
 * Saving the error body as a file would download cleanly and be indistinguishable from a version
 * with nothing to adjust.
 */
async function onDownloadAdjustments(dataItem: any, behavior: string): Promise<void> {
  const adj = adjustmentsFor(behavior);
  if (!adj) return;

  const uuid = dataItem?.uuid;
  if (StringUtils.isNullUndefinedOrEmpty(uuid)) return;

  isAdjustmentsBusy.value = true;
  try {
    const response = await downloadAdjustments(uuid, adj.kind);

    if (!response?.success) {
      toast.error(errorMessageFrom(response?.data));
      return;
    }

    // The proxy's own filename wins; the Blob carries the served type so the OS can associate it.
    saveAs(
      new Blob([response.data], response.contentType ? { type: response.contentType } : {}),
      response.fileName || adjustmentsFileName(dataItem, adj.fileNameInfix, response.contentType)
    );
  } catch (error) {
    if (import.meta.env.DEV) console.error("** (onDownloadAdjustments AR)", error);
    toast.error(translate.t("global.noty.error.download.file"));
  } finally {
    isAdjustmentsBusy.value = false;
  }
}

/**
 * An edited adjustments file — either one, picked by the behaviour the grid emits (UC-SET-07
 * AB#19711; UC-SET-08 AB#19911).
 *
 * Reports acceptance, not success. The endpoint answers 202 because the file is stored and the
 * event published; whether the adjustments applied is AR's to report, and saying "saved" here would
 * tell the administrator their figures landed when only the file did.
 */
async function onUploadAdjustments(dataItem: any, file: any, behavior: string): Promise<void> {
  const adj = adjustmentsFor(behavior);
  if (!adj || !file) return;

  const uuid = dataItem?.uuid;
  if (StringUtils.isNullUndefinedOrEmpty(uuid)) return;

  isAdjustmentsBusy.value = true;
  try {
    const response = await uploadAdjustments(file, uuid, adj.kind);

    // `giveAnswer` counts 200/201/204 as success and nothing else, so the 202 this endpoint
    // answers with reads as a failure through it. Widened here rather than in the shared helper:
    // every other caller in the app would inherit that change, and 202 is deliberately the status
    // for this one — the file is stored and the event published, and AR reports the rest.
    if (response?.success || response?.code === HTTP_ACCEPTED) {
      toast.success(translate.t("adminBackend.adminUploadData.adjustmentsAccepted"));
    } else {
      toast.error(errorMessageFrom(response?.data));
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error("** (onUploadAdjustments AR)", error);
    toast.error(translate.t("global.noty.error.upload.file"));
  } finally {
    isAdjustmentsBusy.value = false;
  }
}

/**
 * What became of the last adjustments file uploaded against one version (AB#20259, UC-SET-07).
 *
 * **Asked for one version at a time, when somebody asks.** The grid holds every version, so a
 * column that showed each row's outcome would fan out one call to Receivables per row on every
 * render. The cost is that the column cannot be scanned — see `AdjustmentsOutcomeColumn`.
 *
 * **A failed proxy is not an answer about the version.** It reaches the user as Receivables' own
 * reason and the detail stays shut: showing "nothing has been uploaded" for a platform that could
 * not be asked would report a broken conversation as calm, which is the one thing this column
 * exists to stop.
 */
async function onOutcomeAdjustments(dataItem: any, behavior: string): Promise<void> {
  const adj = adjustmentsFor(behavior);
  if (!adj) return;

  const uuid = dataItem?.uuid;
  if (StringUtils.isNullUndefinedOrEmpty(uuid)) return;

  // **One entry per column, because both can be in flight at once.** A plain `true` could not say
  // whose button to grey out, and a single marker holding the last behaviour clicked could not
  // either: the moment the administrator opens the second column, the first would un-grey while
  // its own call was still running. Replaced rather than mutated so the row's reactivity fires
  // whichever way the grid holds it.
  dataItem.outcomeLoading = { ...dataItem.outcomeLoading, [behavior]: true };
  outcomeRow.value = dataItem;
  outcomeBehavior.value = behavior;
  try {
    const response = await fetchAdjustmentsOutcome(uuid, adj.kind);

    // Two rows asked for in a row, the first answering last, would put row B's file name and
    // version above row A's counters — one version's adjustments report attributed to another,
    // which is the confusion this column exists to prevent. The per-row `outcomeLoading` guard
    // does not cover it: it blocks a second click on the SAME row, not a click on a different one.
    // Also rejects an answer for the other COLUMN of the same row: both buttons address the same
    // uuid, so comparing uuid alone would let a Peer Group answer that came back late overwrite a
    // Credit Rating panel the administrator opened after it — the same misattribution one row
    // down, and the reason the behaviour is compared as well.
    if (outcomeRow.value?.uuid !== uuid || outcomeBehavior.value !== behavior) return;

    // `giveAnswer` exposes only success/code/data, so the proxy's 502 body — which carries
    // Receivables' own reason — arrives inside `data`. Read through the same helper the upload
    // uses, or every failure would collapse into the generic line and the useful half be discarded.
    if (!response?.success) {
      toast.error(errorMessageFrom(response?.data));
      return;
    }

    // A state the detail cannot render is a non-answer, and opening on it would show the file name
    // over an empty panel — reporting "we asked and all is well" when nothing was actually said.
    // `reported` with no report is the same non-answer wearing a known state's name.
    if (!isRenderableOutcome(response.state, response.report)) {
      toast.error(translate.t("global.noty.error.tryAgainLater"));
      return;
    }

    outcomeState.value = response.state ?? null;
    outcomeReport.value = response.report ?? null;
    outcomeModalOpen.value = true;
  } catch (error) {
    if (import.meta.env.DEV) console.error("** (onOutcomeAdjustments AR)", error);
    toast.error(translate.t("global.noty.error.tryAgainLater"));
  } finally {
    // This column's entry only. A Peer Group request that settles while Credit Rating is still
    // open must leave Credit Rating greyed out, and vice versa.
    //
    // The `?? {}` here is load-bearing where its twin above is not: object spread ignores null and
    // undefined, but destructuring either throws.
    const { [behavior]: _settled, ...stillWaiting } = dataItem.outcomeLoading ?? {};
    dataItem.outcomeLoading = stillWaiting;
  }
}

/**
 * Whether the detail has a sentence to show for this answer.
 *
 * The three states the modal renders, and nothing else. Kept beside the handler rather than left
 * implicit in the template's `v-if` chain, because the template failing to match is silent — it
 * draws an empty panel — while this refuses to open and says why.
 */
function isRenderableOutcome(state: string | undefined, report: any): boolean {
  if (state === ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET || state === ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN) {
    return true;
  }

  return state === ADJUSTMENTS_OUTCOME_REPORTED && !!report;
}

/**
 * AR reports `completedAt` as an ISO instant carrying microseconds and an offset
 * (`2026-09-11T19:03:26.734166+00:00`). Printed as it arrives it is the only unreadable thing in
 * the panel, so it is rendered in the reader's own locale and time zone.
 */
function formatCompletedAt(value: string | null | undefined): string {
  if (StringUtils.isNullUndefinedOrEmpty(value)) return "";

  const instant = new Date(value as string);


  // An instant this browser cannot parse is shown as it arrived. The raw value is worth more
  // than a blank: it is the only trace of what Receivables actually reported. Formatted here
  // rather than through DateUtils.formatDate, which answers "" for both cases and so cannot
  // tell an absent timestamp from an unreadable one.
  if (Number.isNaN(instant.getTime())) return value as string;

  return new Intl.DateTimeFormat(translate.locale.value, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(instant);
}

/**
 * The line under the counters: what AR did with the file, who uploaded it, and when.
 *
 * Joined from the parts that are there rather than interpolated around fixed separators, because
 * `uploadedByEmail` is null by AR's own contract — a file applied by a job rather than a person —
 * and a fixed layout would leave a dangling separator with nothing on one side of it.
 */
const outcomeSummaryLine = computed<string>(() => {
  const report = outcomeReport.value;
  if (!report) return "";

  return [report.status, report.uploadedByEmail, formatCompletedAt(report.completedAt)]
    .filter((part) => !StringUtils.isNullUndefinedOrEmpty(part))
    .join(" · ");
});

function closeOutcomeModal(): void {
  outcomeModalOpen.value = false;
}

watch(companySelectedId, () => {
  fetchGrid();
});

onMounted(async () => {
  const companies = adminBackendStore.getCompanies;
  if (Array.isArray(companies) && companies.length > 0) {
    companiesLoaded.value = true;
  } else {
    adminBackendStore.fetchCompanies({
      // Not awaited, so the empty state must wait for this rather than for the first render.
      callbackSuccess: () => {
        companiesLoaded.value = true;
      },
      // Deliberately leaves companiesLoaded false: a failed read is not evidence that no company
      // holds the module, so the screen shows the selector rather than asserting a configuration
      // problem the administrator does not have.
      callbackError: (err: unknown) => {
        if (import.meta.env.DEV) console.error("** (fetchCompanies AR)", err);
      }
    });
  }
  await fetchGrid();
});
</script>

<style lang="scss" scoped>
@import "@/resources/assets/styles/variables/_colors.scss";

.gap-2 {
  gap: 0.5rem;
}
</style>
