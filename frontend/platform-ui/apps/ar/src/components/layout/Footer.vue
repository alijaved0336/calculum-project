<template>
<footer class="container-footer">
  <div class="row">
    <div class="col-6 d-flex">
      <a class="text-xs text-gray-500 me-4" href="https://www.calculum.ai" target="_blank">{{ $t('global.calculumName') }}</a>
      <div class="text-xs text-gray-500 me-4">{{ $t('global.copyright') }}</div>
      <div class="text-xs text-gray-500">{{ appVersion }}</div>
    </div>
    <div class="col-6 d-flex links-footer">
      <div class="text-xs text-gray-500 me-4"><a class="href-link text-xs text-gray-500" id="terms-of-service" href="/Calculum_Terms_of_Service.pdf" target="_blank">{{ $t('global.termsOfService') }}</a></div>
      <div class="text-xs text-gray-500"><a class="href-link text-xs text-gray-500" id="privacy-policy" href="/Privacy_Policy_Calculum.pdf" target="_blank">{{ $t('global.privacyPolicy') }}</a></div>
    </div>
  </div>
</footer>
</template>

<script lang="ts">
export default {
  name: 'ARFooter',
  setup() {
    const appVersion = `Version: ${process.env.PACKAGE_VERSION} - ${process.env.PACKAGE_VERSION_DATE}`

    return {
      appVersion
    }
  }
}
</script>

<style lang="scss" scoped>
@import "components/footer";
@import "utilities/bs5-utilities";
</style>
