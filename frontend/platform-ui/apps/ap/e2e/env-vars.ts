export default class ENV {
  public static E2E_BASE_URL_API = process.env.E2E_BASE_URL_API !== undefined ? process.env.E2E_BASE_URL_API : '<undefined>';
  public static E2E_CUSTOM_TIME_OUT =process.env.E2E_CUSTOM_TIME_OUT !== undefined ? parseInt(process.env.E2E_CUSTOM_TIME_OUT) : 300000;
  public static E2E_ENV_NAME = process.env.E2E_ENV_NAME !== undefined ? process.env.E2E_ENV_NAME : '<undefined>';
  public static E2E_BASE_URL = process.env.E2E_BASE_URL !== undefined ? process.env.E2E_BASE_URL : '<undefined>';

  public static E2E_USERNAME = process.env.E2E_USERNAME !== undefined ? process.env.E2E_USERNAME : '<undefined>';
  public static E2E_PASSWORD = process.env.E2E_PASSWORD !== undefined ? process.env.E2E_PASSWORD : '<undefined>';

  public static E2E_AUTH_USERNAME_ADMIN = process.env.E2E_AUTH_USERNAME_ADMIN !== undefined ? process.env.E2E_AUTH_USERNAME_ADMIN : '<undefined>';
  public static E2E_AUTH_PASSWORD_ADMIN = process.env.E2E_AUTH_PASSWORD_ADMIN !== undefined ? process.env.E2E_AUTH_PASSWORD_ADMIN : '<undefined>';
  public static E2E_AUTH_USERNAME_SINGLE = process.env.E2E_AUTH_USERNAME_SINGLE !== undefined ? process.env.E2E_AUTH_USERNAME_SINGLE : '<undefined>';
  public static E2E_AUTH_PASSWORD_SINGLE = process.env.E2E_AUTH_PASSWORD_SINGLE !== undefined ? process.env.E2E_AUTH_PASSWORD_SINGLE : '<undefined>';
  public static E2E_AUTH_USERNAME_SUPER_ADMIN = process.env.E2E_AUTH_USERNAME_SUPER_ADMIN !== undefined ? process.env.E2E_AUTH_USERNAME_SUPER_ADMIN : '<undefined>';
  public static E2E_AUTH_PASSWORD_SUPER_ADMIN = process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN !== undefined ? process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN : '<undefined>';
  public static E2E_AUTH_USERNAME_EXCEPTION1 = process.env.E2E_AUTH_USERNAME_EXCEPTION1 !== undefined ? process.env.E2E_AUTH_USERNAME_EXCEPTION1 : '<undefined>';
  public static E2E_AUTH_PASSWORD_EXCEPTION1 = process.env.E2E_AUTH_PASSWORD_EXCEPTION1 !== undefined ? process.env.E2E_AUTH_PASSWORD_EXCEPTION1 : '<undefined>';
}
