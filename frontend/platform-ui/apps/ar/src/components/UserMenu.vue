<template>
<div class="user-menu-wrapper" ref="userMenuRef">
    <button class="btn icons-topbar link" :class="{ active: isUserMenuOpen }" @click="toggleUserMenu">
        <IconUser class="navBarIcon" />
    </button>
    <Transition name="user-menu-fade">
        <div class="user-menu-popup" v-if="isUserMenuOpen">
            <div class="user-menu-header">
                <div class="user-menu-avatar">{{ userInitial }}</div>
                <div class="user-menu-email" :title="userEmail">{{ userEmail }}</div>
            </div>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item" type="button" @click="onLogout">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Log out</span>
            </button>
        </div>
    </Transition>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onBeforeUnmount } from 'vue'
import IconUser from '@ada/design-system/assets/icons/iconUser.vue'
import { authLogout } from '@ada/auth'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'

export default defineComponent({
    name: 'UserMenu',
    components: { IconUser },
    setup() {
        const arCurrentUserStore = useArCurrentUserStore()

        const userMenuRef = ref<HTMLElement | null>(null)
        const isUserMenuOpen = ref(false)

        const userEmail = computed(() => arCurrentUserStore.user?.email ?? '')
        const userInitial = computed(() => (userEmail.value ? userEmail.value.charAt(0).toUpperCase() : ''))

        function toggleUserMenu() {
            isUserMenuOpen.value = !isUserMenuOpen.value
        }

        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
                isUserMenuOpen.value = false
            }
        }

        /**
         * Signs out from HERE rather than by routing to `/signout`, and the difference is a defect
         * rather than a preference (UC-ENT-09).
         *
         * `/signout` is where B2C sends the browser BACK after ending its session
         * (`post_logout_redirect_uri`), and it used to be where sign-out was started as well: a
         * click routed there, the view called `authLogout()` on mount, and B2C returned the browser
         * to the same view, which called it again. The second call had no cookies left to read, so
         * the API built B2C's logout URL with no `id_token_hint` and B2C answered **AADB2C90272 —
         * the id_token_hint parameter has not been specified**. Signing out ended on an error page.
         *
         * Payables keeps the two apart and does not have the bug: its trigger lives in
         * `CookieSessionsFns` and its `/signout` view only cleans up locally. This is the same split.
         */
        function onLogout() {
            isUserMenuOpen.value = false

            // Not awaited, and nothing is queued behind it: `authLogout` sets `location.href`, so
            // this document is on its way out and anything after it may never run.
            //
            // The rejection is caught rather than dropped, and what it can and cannot catch is
            // worth being exact about, because review read it as the other thing. `authLogout` does
            // not make a request — it assigns `location.href` — so there is no network failure and
            // no non-2xx here to reject on; the sign-out endpoint's answer is the browser's to
            // follow, and a failure there is a browser error page rather than a promise. What this
            // does catch is the assignment itself throwing, which a sandboxed context can do, and
            // an `authLogout` that one day does more than navigate. Either way the user clicked
            // sign out and is still here, so it leaves a trace instead of nothing.
            authLogout().catch((logoutError) => {
                console.warn('The sign-out redirect did not happen.', logoutError)
            })
        }

        watch(isUserMenuOpen, (open) => {
            if (open) {
                document.addEventListener('click', handleClickOutside)
            } else {
                document.removeEventListener('click', handleClickOutside)
            }
        })

        onBeforeUnmount(() => {
            document.removeEventListener('click', handleClickOutside)
        })

        return {
            userMenuRef,
            isUserMenuOpen,
            userEmail,
            userInitial,
            toggleUserMenu,
            onLogout,
        }
    }
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.user-menu-wrapper {
    position: relative;
}

.icons-topbar.active {
    background: $color-brand-light;

    .navBarIcon {
        fill: $color-red !important;
        color: $color-red;
    }
}

.user-menu-popup {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 260px;
    background: #ffffff;
    border: 1px solid $color-gray-100;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(16, 24, 40, 0.16), 0 2px 8px rgba(16, 24, 40, 0.06);
    overflow: hidden;
    z-index: 1000;
}

.user-menu-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px;
}

.user-menu-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: $color-primary-500;
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
}

.user-menu-email {
    overflow: hidden;
    color: $color-gray-700;
    font-size: 0.8125rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-menu-divider {
    height: 1px;
    background: $color-gray-100;
}

.user-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: none;
    color: $color-gray-700;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
        background: $color-primary-50;
        color: $color-primary-600;

        .user-menu-icon {
            color: $color-primary-600;
        }
    }
}

.user-menu-icon {
    flex: none;
    width: 18px;
    height: 18px;
    color: $color-gray-500;
}

.user-menu-fade-enter-active,
.user-menu-fade-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.user-menu-fade-enter-from,
.user-menu-fade-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
</style>
