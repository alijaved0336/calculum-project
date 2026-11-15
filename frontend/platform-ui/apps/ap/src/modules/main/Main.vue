<template>
<CalculumLoading :modal="true"></CalculumLoading>
</template>

<script lang="ts">
import * as Routing from '@/services/router/Routing'
import { readProviderErrorCode } from '@/modules/auth/errorMessages'
import { onMounted, defineComponent } from 'vue';
import { CalculumLoading } from '@ada/design-system'
import { getFlowToLogout, getSessionInfo, authLogin } from "@/utils/CookieSessionsFns";
import { StringUtils } from '@/utils';
import { useUserStore } from '@/stores/user'
import { useHomeStore } from '@/stores/home'

export default defineComponent({
  name: 'MainComponent',
  components: { CalculumLoading },
  props: {
    fromErrorResponse403: { type: String, required: false, default: 'false' },
    fromErrorResponse410: { type: String, required: false, default: 'false' }
  },
  setup(props) {
    const userStore = useUserStore()
    const homeStore = useHomeStore()

    const { isNullUndefinedOrEmpty } = StringUtils

    //* Flag to avoid show the content by section until the HomenavBar APIs are finished
    homeStore.setGlobalLoading(true)
    

    const getErrorFromHash = () => {
      const params = new URLSearchParams(window.location.search)

      const signin_success = params.get("signin_success")
      const reset_password_success = params.get("reset_password_success")
      const signup_success = params.get("signup_success")

      const error_description = params.get("error_description")
      const error = params.get("error")

      return { signin_success, reset_password_success, signup_success, error_description, error };
    }


    onMounted(async () => {

     
      /** Get all the possible query params in url */
      const { signin_success, reset_password_success, signup_success, error_description, error } = getErrorFromHash();

      if (import.meta.env.DEV) {
        console.log('** signin_success', signin_success, 'reset_password_success', reset_password_success, 'signup_success', signup_success, 'error_description', error_description, 'error', error)
      }
      

       /**
       * If come from the reset password page and reset password success, log out the user
       */

      if ( !isNullUndefinedOrEmpty(reset_password_success) && reset_password_success === 'true' ) {
        getFlowToLogout()
        return
      }

      /**
       * If come from the reset password page and reset password fail (or cancel action), get the user information
       */

      if ( !isNullUndefinedOrEmpty(reset_password_success) && reset_password_success === 'false' ) {
        getSessionInfo()
        return
      }



      /**
       * if some error exists and the value is server_error, show the error screen
       */

      if (!isNullUndefinedOrEmpty(error) && error_description && error_description.includes('AADB2C90091')) {
        authLogin()
        return
      }


       if ( !isNullUndefinedOrEmpty(error)) {

        /**
         * `error_description` used to travel to the screen whole, and it arrives here from the query
         * string — so `/?error=x&error_description=<chosen text>` printed that text on the sign-in
         * page without the link ever naming the error route (G-350, AB#19509). Only B2C's own code
         * goes on, read by shape; the description itself is in the DEV log above.
         */
        Routing.auth.openErrorScreen({
          errorType: 'error',
          message: 'error-login',
          errorb2c: readProviderErrorCode(error_description) ?? readProviderErrorCode(error)
        })
        return      
      }
      


      /**
       * If come from the login page, get the user information
       */
      if ( !isNullUndefinedOrEmpty(signin_success) ) {
       getSessionInfo()
       return
      }

      /**
       * If come from the signup page, log in the user
       */

      if ( !isNullUndefinedOrEmpty(signup_success) ) {
       getSessionInfo()
       return
      }     
      

      /**
       * If user go to / try to get the session cookie
       */
      userStore.setFromLogin(true)
      getSessionInfo()

    })
     
  }
})

</script>