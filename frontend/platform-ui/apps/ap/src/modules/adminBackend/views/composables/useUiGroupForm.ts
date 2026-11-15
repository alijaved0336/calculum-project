import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { ObjectUtils, StringUtils } from '@/utils';
import * as Validator from '@/utils/validators';
import {
  DEFAULT_PRIMARY_COLOR,
  MIN_USERS_ALLOWED,
  MAX_USERS_ALLOWED,
  DEFAULT_LIMIT_USER,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
} from './constants';


function onClickModifyLogo(): void {
  const fileDOM = document.getElementById('company-logo') as HTMLInputElement | null;
  fileDOM?.click();
}


export function useUiGroupForm() {
  const { t } = useI18n({ useScope: 'global' });
  const toast = useToast();

  const file = ref<File | null>(null);
  const groupNameInput = ref('');
  const nameIsEmpty = ref(false);
  const colors = reactive({ primary: DEFAULT_PRIMARY_COLOR });
  const limitUser = ref(DEFAULT_LIMIT_USER);
  const allowedDomains = ref('');
  const imageUrl = ref<string | boolean>('');
  const selectedImage = ref(false);
  const fileSizeTooBig = ref(false);
  const isSavingUiGroup = ref(false);
  const removeAdaCalculumReferences = ref(false);

  const showLogo = computed(() => {
    if (file.value) return URL.createObjectURL(file.value);
    if (imageUrl.value && typeof imageUrl.value === 'string') return imageUrl.value;
    return null;
  });

  const checkingDomains = computed(() => {
    if (allowedDomains.value == null || StringUtils.isNullUndefinedOrEmpty(allowedDomains.value)) {
      return [];
    }
    return StringUtils.getDomains(allowedDomains.value);
  });

  function checkDomains(): boolean {
    if (checkingDomains.value.length === 0) return false;
    return checkingDomains.value.some((domain: string) => !Validator.isValidDomain(domain));
  }

  function checkInputError(modelValue: unknown): void {
    const num = Number(modelValue);
    if (num < MIN_USERS_ALLOWED || num > MAX_USERS_ALLOWED) {
      toast.error(t('adminBackend.uiGroupsAdmin.errorUserLimit'));
    }
  }

  async function onChangeLogo(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const selectedFile = target.files?.[0];
    file.value = selectedFile ?? null;

    if (file.value) {
      const isValid = await ObjectUtils.validateFileType(file.value, ALLOWED_MIME_TYPES);
      if (!isValid) {
        toast.error(t('global.invalidFileTypeLogo'));
        file.value = null;
        return;
      }
    }

    if (selectedFile) {
      imageUrl.value = selectedFile.name;
      selectedImage.value = selectedFile.name.length > 0;
      const fileSizeMb = Number((selectedFile.size / (1024 * 1024)).toFixed(2));
      fileSizeTooBig.value = fileSizeMb >= MAX_FILE_SIZE_MB;
    }
  }


  function setColor(color: string): void {
    colors.primary = color;
  }

  function resetForm(): void {
    groupNameInput.value = '';
    file.value = null;
    selectedImage.value = false;
    imageUrl.value = '';
    colors.primary = DEFAULT_PRIMARY_COLOR;
    limitUser.value = DEFAULT_LIMIT_USER;
    allowedDomains.value = '';
    nameIsEmpty.value = false;
    fileSizeTooBig.value = false;
    removeAdaCalculumReferences.value = false;
  }

  function fillFromUiGroup(uiGroup: any): void {
    groupNameInput.value = uiGroup.name ?? '';
    colors.primary = uiGroup.primaryColor ?? DEFAULT_PRIMARY_COLOR;
    limitUser.value = uiGroup.maxNumberOfUsers ?? DEFAULT_LIMIT_USER;
    allowedDomains.value = Array.isArray(uiGroup.allowedDomains)
      ? uiGroup.allowedDomains.join(', ')
      : (uiGroup.allowedDomains ?? '');
    removeAdaCalculumReferences.value = uiGroup.removeAdaCalculumReferences ?? false;
  }

  watch(limitUser, (newValue) => {
    if (!StringUtils.isNullUndefinedOrEmpty(newValue) && typeof newValue === 'number') {
      checkInputError(newValue);
    }
  });

  return {
    file,
    groupNameInput,
    nameIsEmpty,
    colors,
    limitUser,
    allowedDomains,
    imageUrl,
    selectedImage,
    fileSizeTooBig,
    isSavingUiGroup,
    removeAdaCalculumReferences,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    minUsersAllowed: MIN_USERS_ALLOWED,
    maxUsersAllowed: MAX_USERS_ALLOWED,
    showLogo,
    checkingDomains,
    checkDomains,
    checkInputError,
    onChangeLogo,
    onClickModifyLogo,
    setColor,
    resetForm,
    fillFromUiGroup,
  };
}
