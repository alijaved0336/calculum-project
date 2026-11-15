import { useToast } from 'vue-toastification'

export const errorNotification = (message: string) => {
  if (import.meta.env.DEV) console.warn("** DEPRECATED. Use NotificationUtils.showError instead.")
  const toast = useToast();
  toast.error(message);
}