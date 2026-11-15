import { useToast } from "vue-toastification";

class NotificationUtils {
  public static showError(message: string) {
    const toast = useToast();
    toast.error(message);
  }
}

export default NotificationUtils;
