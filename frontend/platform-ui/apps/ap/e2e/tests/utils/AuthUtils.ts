import { Page } from "@playwright/test";
import { loginByUser, logout } from "./Utils";
import StringUtils from "./StringUtils";

export default class AuthUtils {
  static async ensureLoginByUser(
    page: Page,
    user: {
      email: string;
      password: string;
    },
  ): Promise<boolean> {
    if (
      StringUtils.isNullUndefinedOrEmpty(user.email) ||
      StringUtils.isNullUndefinedOrEmpty(user.password)
    ) {
      return false;
    }

    if (user.email === process.env.E2E_AUTH_CURRENT_USER_EMAIL) {
      return false;
    }

    await logout(page);

    await loginByUser(page, user.email, user.password);

    return true;
  }
}
