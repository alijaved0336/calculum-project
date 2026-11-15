<template>
  <div class="row mt-3">
    <div class="col-12">
      <div class="card" style="min-height: auto; height: auto">
        <div class="card-body text-center py-5">
          <h5 class="mb-2">{{ $t('adminBackend.adminProcess.programs.title') }}</h5>
          <p class="text-muted m-0">{{ $t('adminBackend.adminProcess.programs.comingSoon') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: "AdminProcessPrograms"
};
</script>
