<template>
  <main class="auth-error">
    <section class="auth-error__card" role="alert" aria-labelledby="auth-error-title">
      <h1 id="auth-error-title" class="auth-error__title">{{ t('auth.signInError.title') }}</h1>

      <p class="auth-error__body">{{ reason }}</p>

      <a class="auth-error__action" :href="signInUrl">{{ t('auth.signInError.retry') }}</a>

      <!--
        Subordinate on purpose, and below the action rather than above it. Everything in here is
        diagnostic: it exists for a support conversation, not for the person trying to get in, and
        the one thing they can act on has to come first.
      -->
      <div v-if="hasDetails" class="auth-error__details">
        <h2 class="auth-error__details-heading">{{ t('auth.signInError.detailsHeading') }}</h2>

        <dl class="auth-error__facts">
          <template v-if="providerCode">
            <dt>{{ t('auth.signInError.providerCode') }}</dt>
            <dd><code>{{ providerCode }}</code></dd>
          </template>

          <template v-if="reference">
            <dt>{{ t('auth.signInError.reference') }}</dt>
            <dd><code>{{ reference }}</code></dd>
          </template>
        </dl>

        <p class="auth-error__hint">{{ t('auth.signInError.detailsHint') }}</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getBaseApi } from '@/utils/getBaseApi'

/**
 * Where a failed sign-in lands (G-349, UC-ENT-15).
 *
 * <b>The route is public, and that is load bearing rather than convenient.</b> Every other AR route
 * is behind the auth guard, and a caller arriving here has just failed to get a session — so a
 * guarded landing page would call `/api/session/info`, get 401, call `authLogin()` and start the
 * redirect chain again. That loop is why the API used to answer refusals with a JSON body instead
 * of redirecting anywhere, and it is what `meta.public` on this route removes.
 *
 * <b>Nothing displayed here comes from the URL as prose.</b> The address carries a slug and an
 * opaque reference, and the wording is looked up in the locale files by slug. A slug we do not
 * recognise renders the generic sentence rather than itself, so a crafted link cannot put chosen
 * words on this screen. That is the defect G-350 records in payables, whose errors route takes the
 * message as a path segment.
 */
const { t, te } = useI18n({ useScope: 'global' })
const route = useRoute()

/** B2C's own code, when the server recorded one. Shape-checked again here — see below. */
const providerCode = ref<string | null>(null)

/**
 * The reference AS THE SERVER ECHOES IT BACK, never as the address carries it.
 *
 * <b>This was `route.query.ref` rendered directly, and that was the same defect this whole view
 * exists to avoid</b> (caught in review of PR 14050). `providerCode` was gated behind a shape check
 * so an address could not put chosen words on the screen, and then the reference beside it was
 * printed verbatim — so `?ref=Call+1-555-0100+to+unlock+your+account` reached a real sign-in error
 * page on a real domain. G-350 under a different query key, in the change written to prevent it.
 *
 * Reading it from the response rather than the URL is not a narrower filter, it is the same rule as
 * everything else here: what is displayed comes from the server that recorded it. A reference the
 * lookup does not resolve is also a reference support cannot use, so showing nothing is right.
 */
const reference = ref<string | null>(null)

/**
 * The lookup key, which is all the address is trusted for.
 *
 * Shape-checked before it is sent: the server mints 32 random bytes as base64url, so anything that
 * is not 43 characters of that alphabet was never issued here and there is no request worth making.
 */
const ACCEPTABLE_REFERENCE = /^[A-Za-z0-9_-]{43}$/

const lookupKey = computed(() => {
  const value = route.query.ref
  return typeof value === 'string' && ACCEPTABLE_REFERENCE.test(value) ? value : null
})

/**
 * The sentence the user reads, chosen by slug and never taken from the address.
 *
 * `te` rather than a try/catch: vue-i18n returns the KEY itself for a miss, so without this check
 * an unknown slug would render `auth.signInError.reasons.<whatever arrived>` — the attacker's text
 * with a prefix, which is precisely the failure mode this design exists to avoid.
 *
 * <b>The character check in front of it is belt and braces, and the review claim it answers did not
 * reproduce.</b> PR 14050 suggested a dotted slug could address arbitrary translations; measured, it
 * cannot — the key is always prefixed, so a slug only ever reaches DEEPER under `reasons.`, where
 * nothing lives but the seven leaf strings. `title`, `../title`, `reasons.link_spent` and
 * `auth.signInError.title` all miss and render the generic sentence. The check is kept anyway
 * because it costs one line and it is what stops that from changing the day somebody nests
 * something under `reasons`.
 */
const ACCEPTABLE_SLUG = /^[a-z_]+$/

const reason = computed(() => {
  const slug = route.query.code

  if (typeof slug !== 'string' || !ACCEPTABLE_SLUG.test(slug)) {
    return t('auth.signInError.genericBody')
  }

  const key = `auth.signInError.reasons.${slug}`

  return te(key) ? t(key) : t('auth.signInError.genericBody')
})

const hasDetails = computed(() => Boolean(providerCode.value || reference.value))

/** Straight back into the API's sign-in, which mints a fresh state rather than replaying one. */
const signInUrl = computed(() => `${getBaseApi()}/api/auth/login`)

/**
 * `AADB2C` and five digits, or one of the OAuth family names. The server already reads B2C's
 * description by shape before storing it, so this is a second gate on the same value.
 *
 * <b>Deliberately not trusted-because-it-came-from-us.</b> The check costs one regex and it means
 * the rule survives somebody later deciding to read this from the query string, which is the edit
 * that would quietly reintroduce G-350.
 */
const ACCEPTABLE_PROVIDER_CODE = /^(AADB2C\d{5}|access_denied|server_error|temporarily_unavailable|invalid_request|unauthorized_client|invalid_grant)$/

onMounted(async () => {
  if (!lookupKey.value) return

  try {
    // A bare fetch, NOT `src/api/http.ts`. That client turns a 401 into `authLogin()`, and the one
    // caller guaranteed to have no session is this page: using it here would rebuild the loop the
    // public route was added to break.
    const response = await fetch(
      `${getBaseApi()}/api/auth/error-detail?ref=${encodeURIComponent(lookupKey.value)}`,
      { credentials: 'include' },
    )

    if (!response.ok) return

    const payload = await response.json()
    const code = payload?.detail?.providerCode
    const echoed = payload?.detail?.reference

    if (typeof code === 'string' && ACCEPTABLE_PROVIDER_CODE.test(code)) {
      providerCode.value = code
    }

    // Shape-checked even though the server minted it, for the same reason the provider code is:
    // the rule has to survive somebody later pointing this at the query string again.
    if (typeof echoed === 'string' && ACCEPTABLE_REFERENCE.test(echoed)) {
      reference.value = echoed
    }
  } catch {
    // The screen is already rendered and readable; the details are an extra. A failed lookup shows
    // no technical block rather than replacing a sign-in error with a fetch error.
  }
})
</script>

<style scoped>
.auth-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.auth-error__card {
  max-width: 32rem;
  width: 100%;
  padding: 2.5rem;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgb(16 24 40 / 10%), 0 1px 2px rgb(16 24 40 / 6%);
}

.auth-error__title {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #101828;
}

.auth-error__body {
  margin: 0 0 1.75rem;
  color: #475467;
  line-height: 1.5;
}

.auth-error__action {
  display: inline-block;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  /* The design system's red, not an invented one: #e63946 appeared nowhere else in the repository
     and gave white 4.17:1, under the 4.5:1 AA asks (css:S7924). #c11a36 is 6.05:1 and is the red
     the rest of the system already uses. */
  background: #c11a36;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
}

.auth-error__action:hover {
  background: #a81630;
}

/* Separated by a rule and set smaller: diagnostic, and visibly not part of what to do next. */
.auth-error__details {
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid #eaecf0;
}

.auth-error__details-heading {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  /* #98a2b3 gave 2.58:1 on white, under the 4.5:1 AA needs for text this size (css:S7924).
     #667085 is 4.97:1 and is already the grey the definition list beside it uses. */
  color: #667085;
}

.auth-error__facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
  font-size: 0.8125rem;
}

.auth-error__facts dt {
  color: #667085;
}

.auth-error__facts dd {
  margin: 0;
}

.auth-error__facts code {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  color: #344054;
  word-break: break-all;
}

.auth-error__hint {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  /* #98a2b3 gave 2.58:1 on white, under the 4.5:1 AA needs for text this size (css:S7924).
     #667085 is 4.97:1 and is already the grey the definition list beside it uses. */
  color: #667085;
}
</style>
