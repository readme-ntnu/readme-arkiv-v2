const HOME = "/";
const EDITION = "/edition/:id.pdf";
const SEARCH = "/search";
const ADMIN = "/admin";
const LOGIN = "/login";
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
  PASSWORD_FORGET,
  NEW_EDITION,
  NEW_ARTICLE,
  EDIT_ARTICLE,
  EDITION_LIST,
  ARTICLE_LIST,
  SETTINGS,
};
