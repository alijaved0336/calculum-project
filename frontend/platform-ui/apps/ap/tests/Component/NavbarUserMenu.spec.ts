import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import NavbarUserMenu from '@/modules/home/components/NavbarUserMenu.vue'

function baseProps(overrides: Record<string, any> = {}) {
  return {
    disabled: false,
    userIsAdmin: false,
    disableElementPilotIsExpired: false,
    showMenu: true,
    userIsSuperAdmin: false,
    userSalesRoleEnabled: false,
    userDataRoleEnabled: false,
    useFeatureValueProposition: false,
    ...overrides,
  }
}

describe('NavbarUserMenu', () => {
  // ─── Permission gating ────────────────────────────────────────────────────

  it('hides admin-only links for a non-admin user', () => {
    const wrapper = mountWithProviders(NavbarUserMenu, { props: baseProps({ userIsAdmin: false }) })
    const links = wrapper.findAll('.dropdown-item')
    expect(links.length).toBe(3) // preferences + help support + logout only
  })

  it('shows the company-info/financial-data/manage-spend-file links for an admin with showMenu', () => {
    const wrapper = mountWithProviders(NavbarUserMenu, {
      props: baseProps({ userIsAdmin: true, showMenu: true }),
    })
    expect(wrapper.text()).toContain('home.components.navbar.user.companyInfo')
    expect(wrapper.text()).toContain('home.components.navbar.user.financialData')
    expect(wrapper.text()).toContain('home.components.navbar.user.manageSpendFile')
  })

  it('hides every link once the pilot account is expired, except manageTeam/valueProposition which only gate on admin/role', () => {
    const wrapper = mountWithProviders(NavbarUserMenu, {
      props: baseProps({ userIsAdmin: true, showMenu: true, disableElementPilotIsExpired: true }),
    })
    expect(wrapper.text()).not.toContain('home.components.navbar.user.companyInfo')
    expect(wrapper.text()).not.toContain('home.components.navbar.user.preferences')
    expect(wrapper.text()).not.toContain('home.components.navbar.user.helpSupport')
  })

  it('shows the admin console link for a super admin', () => {
    const wrapper = mountWithProviders(NavbarUserMenu, {
      props: baseProps({ userIsSuperAdmin: true }),
    })
    expect(wrapper.text()).toContain('home.dashboard.adminConsole')
  })

  it('shows the admin console link for a sales-role user even when not admin/super-admin', () => {
    const wrapper = mountWithProviders(NavbarUserMenu, {
      props: baseProps({ userSalesRoleEnabled: true }),
    })
    expect(wrapper.text()).toContain('home.dashboard.adminConsole')
  })

  it('shows the value-proposition link for an admin with the feature flag on', () => {
    const wrapper = mountWithProviders(NavbarUserMenu, {
      props: baseProps({ userIsAdmin: true, useFeatureValueProposition: true }),
    })
    expect(wrapper.text()).toContain('home.homeCompanySettings.cardGroups.valueProposition')
  })

  it('always shows the logout link regardless of permissions', () => {
    const wrapper = mountWithProviders(NavbarUserMenu, { props: baseProps() })
    expect(wrapper.text()).toContain('home.components.navbar.user.button')
  })

  // ─── Emits ────────────────────────────────────────────────────────────────

  it('emits admin-console when the admin console link is clicked', async () => {
    const wrapper = mountWithProviders(NavbarUserMenu, {
      props: baseProps({ userIsSuperAdmin: true }),
    })
    const links = wrapper.findAll('.dropdown-item')
    const adminLink = links.find((l) => l.text().includes('home.dashboard.adminConsole'))
    await adminLink!.trigger('click')
    expect(wrapper.emitted('admin-console')).toHaveLength(1)
  })

  it('emits logout when the logout link is clicked', async () => {
    const wrapper = mountWithProviders(NavbarUserMenu, { props: baseProps() })
    const links = wrapper.findAll('.dropdown-item')
    const logoutLink = links.find((l) => l.text().includes('home.components.navbar.user.button'))
    await logoutLink!.trigger('click')
    expect(wrapper.emitted('logout')).toHaveLength(1)
  })
})
