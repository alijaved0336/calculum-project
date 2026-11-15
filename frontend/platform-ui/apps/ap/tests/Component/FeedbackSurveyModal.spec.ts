import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import { useFeedbackSurveyStore } from '@/stores/feedbackSurvey'

// Mirrors FeedbackSurveyModal.vue's SESSION_DELAY_MS (TESTING_MODE is hardcoded to
// false in the component, so tests exercise the real 3-minute delay via fake timers
// instead of flipping that flag).
const SESSION_DELAY_MS = 3 * 60 * 1000
const VIDEOASK_SCRIPT_ID = 'videoask-embed-script'
const VIDEOASK_SCRIPT_SRC = 'https://www.videoask.com/embed/embed.js'

const mockUser = ref<any>(null)
const mockUserIri = ref<string>('')

vi.mock('@/services/user/composables/useUser', () => ({
  default: () => ({
    user: mockUser,
    userIri: mockUserIri,
  }),
}))

const patchFeedbackSurveyResponseMock = vi.fn().mockResolvedValue({})
vi.mock('@/services/user/api', () => ({
  patchFeedbackSurveyResponse: (...args: unknown[]) => patchFeedbackSurveyResponseMock(...args),
}))

import FeedbackSurveyModal from '@/modules/components/FeedbackSurveyModal.vue'

function eligibleUser(overrides: Record<string, any> = {}) {
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  return {
    '@id': '/api/users/1',
    activeCompany: { uiGroup: null },
    created: twoMonthsAgo.toISOString(),
    lastFeedbackSurveyAt: null,
    ...overrides,
  }
}

function cleanupVideoAskGlobals(): void {
  document.getElementById(VIDEOASK_SCRIPT_ID)?.remove()
  delete (window as any).VIDEOASK_EMBED_CONFIG
}

describe('FeedbackSurveyModal (VideoAsk widget)', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
    mockUser.value = null
    mockUserIri.value = ''
    patchFeedbackSurveyResponseMock.mockClear()
    cleanupVideoAskGlobals()
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
    cleanupVideoAskGlobals()
  })

  function mountAndAdvance(user: Record<string, any>, delayMs: number = SESSION_DELAY_MS): VueWrapper {
    mockUser.value = user
    mockUserIri.value = user['@id']
    wrapper = mountWithProviders(FeedbackSurveyModal)
    vi.advanceTimersByTime(delayMs)
    return wrapper
  }

  it('does not inject anything before the 3-minute session delay elapses', async () => {
    mountAndAdvance(eligibleUser(), SESSION_DELAY_MS - 1)
    await nextTick()

    expect(document.getElementById(VIDEOASK_SCRIPT_ID)).toBeNull()
    expect((window as any).VIDEOASK_EMBED_CONFIG).toBeUndefined()
  })

  it('sets VIDEOASK_EMBED_CONFIG on window with the correct URL and options once the delay elapses', async () => {
    mountAndAdvance(eligibleUser())
    await nextTick()

    expect((window as any).VIDEOASK_EMBED_CONFIG).toEqual({
      kind: 'widget',
      url: 'https://www.videoask.com/fcpjgc8ki',
      options: {
        widgetType: 'VideoThumbnailSmall',
        text: 'Take a Quick Survey',
        backgroundColor: '#001037',
        position: 'bottom-right',
        dismissible: true,
        videoPosition: 'center center',
      },
    })
  })

  it('appends the VideoAsk embed script to <body> once the delay elapses', async () => {
    mountAndAdvance(eligibleUser())
    await nextTick()

    const script = document.getElementById(VIDEOASK_SCRIPT_ID) as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script?.src).toBe(VIDEOASK_SCRIPT_SRC)
    expect(script?.parentElement).toBe(document.body)
  })

  it('does not call patchFeedbackSurveyResponse merely from injecting the widget', async () => {
    mountAndAdvance(eligibleUser())
    await nextTick()

    expect(patchFeedbackSurveyResponseMock).not.toHaveBeenCalled()
  })

  it('calls patchFeedbackSurveyResponse with "accept" once the user completes the VideoAsk survey', async () => {
    mountAndAdvance(eligibleUser())
    await nextTick()

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://www.videoask.com',
      data: { type: 'videoask_submitted' },
    }))

    expect(patchFeedbackSurveyResponseMock).toHaveBeenCalledWith('/api/users/1', 'accept')
  })

  it('does not inject the widget for internal/demo accounts (uiGroup set)', async () => {
    mountAndAdvance(eligibleUser({ activeCompany: { uiGroup: { name: 'Internal Group' } } }))
    await nextTick()

    expect(document.getElementById(VIDEOASK_SCRIPT_ID)).toBeNull()
    expect(patchFeedbackSurveyResponseMock).not.toHaveBeenCalled()
  })

  it('does not inject the widget for accounts under one month old', async () => {
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

    mountAndAdvance(eligibleUser({ created: fiveDaysAgo.toISOString() }))
    await nextTick()

    expect(document.getElementById(VIDEOASK_SCRIPT_ID)).toBeNull()
    expect(patchFeedbackSurveyResponseMock).not.toHaveBeenCalled()
  })

  it('does not inject the widget when the user already interacted with the survey this month', async () => {
    mountAndAdvance(eligibleUser({ lastFeedbackSurveyAt: new Date().toISOString() }))
    await nextTick()

    expect(document.getElementById(VIDEOASK_SCRIPT_ID)).toBeNull()
    expect(patchFeedbackSurveyResponseMock).not.toHaveBeenCalled()
  })

  it('never renders the old custom accept/decline modal markup', async () => {
    mountAndAdvance(eligibleUser())
    await nextTick()

    expect(wrapper.find('.feedback-survey-modal').exists()).toBe(false)
    expect(wrapper.find('.feedback-survey-modal__accept').exists()).toBe(false)
    expect(wrapper.find('.feedback-survey-modal__decline').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
