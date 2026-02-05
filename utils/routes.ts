const HOME = "/";
const EDITION = "/edition/:id.pdf";
const SEARCH = "/search";
const ADMIN = "/admin";
const LOGIN = "/login";
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
