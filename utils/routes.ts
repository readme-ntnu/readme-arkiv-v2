const HOME = "/";
const EDITION = "/edition/:id";
const SEARCH = "/search";
const ADMIN = "/admin";
const LOGIN = "/login";
const LOGIN_WITH_PASSWORD = LOGIN + "/withpassword";
const LOGIN_COMPLETE = LOGIN + "/complete";
const LOGIN_ERROR = LOGIN + "/error";
const PASSWORD_FORGET = "/pw-forget";
const EDITION_LIST = ADMIN + "/editions";
const ARTICLE_LIST = ADMIN + "/articles";
const SETTINGS = ADMIN + "/settings";
const NEW_EDITION = EDITION_LIST + "/new";
const NEW_ARTICLE = ARTICLE_LIST + "/new";
const EDIT_ARTICLE = ARTICLE_LIST + "/:id";

export const ROUTES = {
  HOME,
  EDITION,
  SEARCH,
  ADMIN,
  LOGIN,
  LOGIN_WITH_PASSWORD,
  LOGIN_COMPLETE,
  LOGIN_ERROR,
  PASSWORD_FORGET,
  NEW_EDITION,
  NEW_ARTICLE,
  EDIT_ARTICLE,
  EDITION_LIST,
  ARTICLE_LIST,
  SETTINGS,
};

export function getEditionRoute(editionId: string) {
  return ROUTES.EDITION.replace(":id", editionId);
}

// API routes
const API = "/api";
const LEGO_AUTH = API + "/auth/lego";
const LEGO_LOGIN = LEGO_AUTH + "/login";
const LEGO_CALLBACK = LEGO_AUTH + "/callback";

export const API_ROUTES = {
  API,
  LEGO_LOGIN,
  LEGO_CALLBACK,
};

/**
 * Only allow local app paths to be used as post-login destinations.
 * Parsing against a fixed origin also rejects backslash and protocol-relative
 * variants that browsers can otherwise interpret as cross-origin URLs.
 */
export function getSafeReturnTo(value: string | null | undefined) {
  const defaultRoute = ROUTES.HOME;
  if (!value?.startsWith("/")) return defaultRoute;

  try {
    const url = new URL(value, "https://example.com");

    if (url.origin !== "https://example.com") return defaultRoute;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return defaultRoute;
  }
}

export function addReturnTo(path: string, returnTo?: string | null) {
  if (!returnTo) return path;

  const url = new URL(path, "https://example.com");
  url.searchParams.set("returnTo", getSafeReturnTo(returnTo));
  return `${url.pathname}${url.search}${url.hash}`;
}
