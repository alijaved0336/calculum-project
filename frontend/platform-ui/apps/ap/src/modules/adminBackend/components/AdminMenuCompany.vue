<template>
<nav class="menu menu--account">
  <ul class="menu__ul">
    <li class="menu__item">
      <a class="menu__link link link--icon link--special2" :class="currentPage === 'CompanyInfo' ? 'active' : ''" @click="AdminCompanyRouting.openAdminCompanyInfo()">
        <span>{{ $t('home.components.menuAccount.companyInfo') }}</span>
      </a>
    </li>
  </ul>
</nav>
</template>
  
<script lang="ts">
import * as AdminCompanyRouting from '../AdminRouting'
import * as Routing from '@/services/router/Routing'
import { computed, ref } from 'vue'
import { fontIcons, images } from '@/resources/assets/assets'
import { useUser } from '@/composables'
import { useUserStore } from '@/stores/user'

export default {
  name: 'AdminMenuCompany',
  props: {
    currentPage: { type: String, required: true }
  },
  setup() {
    const userStore = useUserStore()

    const admin = ref(false)
    
    const { user } = useUser();

    adminrole()

    function adminrole() {
      if (user.value?.roles){
        const arrayRoles = Object.values(user.value.roles);
        const role = arrayRoles.find((x: any) => x === 'ROLE_COMPANY_ADMIN')
        admin.value = !!role
      } else {
        admin.value = false
      }
    }


    function goToCompanyInfo() {
      AdminCompanyRouting.openAdminCompanyInfo()
    }     

    const showMenu = computed(() => userStore.getShowMenu)

    return {
      goToCompanyInfo,
      admin,
      Routing,
      fontIcons,
      images,
      showMenu,
      AdminCompanyRouting
    }
  }
}
</script>

<style lang='scss' scoped>
@import "src/resources/assets/styles/variables/colors";

nav {
  background: $color-white;
}

.link--special2 {
  display: flex;
  align-items: center;
  font-weight: 400;
  cursor: pointer;
  span { color: $color-black; }
  transition: all ease 0.3s;
  &:hover {
    span {
      color: $color-red;
      &:hover {
        color: $color-red !important;
      }
    }
  }
}
.active {
  span {
    color: $color-red;
    &:hover {
      color: $color-red !important;
    }
  }
}
</style>
