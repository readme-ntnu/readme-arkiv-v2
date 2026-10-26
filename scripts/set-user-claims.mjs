#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { styleText } from "node:util";
import nextEnv from "@next/env";
import admin from "firebase-admin";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const ENVIRONMENTS = new Set(["emulator", "production"]);

/** Explains how users, claims, and the target Firebase environment are selected. */
function printHelp() {
  console.log(`Usage:
  yarn users:set-claims (--email <email> | --uid <uid>)... <action> [options]

Manages readme claims for one or more Firebase Authentication users. Unrelated
custom claims are preserved. Changes are dry-run by default.

Actions:
  --member                  Set readmeMember=true and remove readmeRole.
  --admin                   Set readmeMember=true and readmeRole=admin.
  --remove                  Remove readmeMember and readmeRole.
  --list                    List the current readmeMember and readmeRole.

User selection:
  --email <email>           Select a user by email. May be repeated.
  --uid <uid>               Select a user by Firebase UID. May be repeated.

Options:
  --project <id>            Firebase project (defaults to .firebaserc/env).
  --environment <target>    Use emulator (default) or production Auth.
  --apply                   Write the claims. Runs are dry-run by default.
  --confirm-project <id>    Required with --apply in production.
  --help                    Show this help.

Examples:
  yarn users:set-claims --email user@readme.no --member
  yarn users:set-claims --email user@readme.no --admin --apply
  yarn users:set-claims --email user@readme.no --remove --apply
  yarn users:set-claims --email user@readme.no --list
  yarn users:set-claims --environment production --project readme-arkiv \\
    --email user@readme.no --admin --apply --confirm-project readme-arkiv

Emulator mode uses FIREBASE_AUTH_EMULATOR_HOST when set, otherwise
127.0.0.1:9099. Users must refresh their ID token or sign in again before new
claims appear in the application.`);
}

/** Reads the default Firebase project ID from `.firebaserc`. */
function readFirebaseProject() {
  try {
    const firebaseRc = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
    return firebaseRc.projects?.default;
  } catch {
    return undefined;
  }
}

/** Points Firebase Admin at either the Auth emulator or production. */
function configureEnvironment(environment, projectId) {
  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;

  if (environment === "emulator") {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
  } else {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  }
}

/** Uses configured service-account credentials, with ADC as a fallback. */
function getProductionCredential(projectId) {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail && !privateKey) {
    return admin.credential.applicationDefault();
  }
  if (!clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must both be set.",
    );
  }

  return admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  });
}

/** Parses the requested users, action, environment, and write safeguards. */
function parseArgs(argv) {
  const options = {
    environment: "emulator",
    project:
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      readFirebaseProject(),
    apply: false,
    confirmProject: undefined,
    emails: [],
    uids: [],
    accessLevel: undefined,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--apply") {
      options.apply = true;
    } else if (
      argument === "--member" ||
      argument === "--admin" ||
      argument === "--remove" ||
      argument === "--list"
    ) {
      const accessLevel = argument.slice(2);
      if (options.accessLevel && options.accessLevel !== accessLevel) {
        throw new Error(
          "Choose exactly one of --member, --admin, --remove, or --list.",
        );
      }
      options.accessLevel = accessLevel;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (
      argument === "--email" ||
      argument === "--uid" ||
      argument === "--project" ||
      argument === "--environment" ||
      argument === "--confirm-project"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;

      if (argument === "--email") options.emails.push(value);
      if (argument === "--uid") options.uids.push(value);
      if (argument === "--project") options.project = value;
      if (argument === "--environment") options.environment = value;
      if (argument === "--confirm-project") options.confirmProject = value;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (options.help) return options;
  if (!ENVIRONMENTS.has(options.environment)) {
    throw new Error("--environment must be emulator or production.");
  }
  if (!options.project) {
    throw new Error("A Firebase project is required. Pass --project <id>.");
  }
  if (options.emails.length === 0 && options.uids.length === 0) {
    throw new Error("Select at least one user with --email or --uid.");
  }
  if (!options.accessLevel) {
    throw new Error("Choose --member, --admin, --remove, or --list.");
  }
  if (options.accessLevel === "list" && options.apply) {
    throw new Error("--list is read-only and cannot be combined with --apply.");
  }
  if (
    options.apply &&
    options.environment === "production" &&
    options.confirmProject !== options.project
  ) {
    throw new Error(
      `Production writes require --confirm-project ${options.project}.`,
    );
  }

  configureEnvironment(options.environment, options.project);
  return options;
}

/** Resolves all supplied selectors and removes duplicate users by UID. */
async function resolveUsers(auth, { emails, uids }) {
  const users = new Map();

  for (const uid of uids) {
    const user = await auth.getUser(uid);
    users.set(user.uid, user);
  }
  for (const email of emails) {
    const user = await auth.getUserByEmail(email);
    users.set(user.uid, user);
  }

  return [...users.values()];
}

/** Builds the selected readme access while preserving unrelated claims. */
function buildClaims(currentClaims, accessLevel) {
  const nextClaims = { ...currentClaims };
  delete nextClaims.readmeMember;
  delete nextClaims.readmeRole;

  if (accessLevel === "member" || accessLevel === "admin") {
    nextClaims.readmeMember = true;
  }
  if (accessLevel === "admin") {
    nextClaims.readmeRole = "admin";
  }

  return nextClaims;
}

/** Formats both readme claims and shows unset values as null. */
function describeReadmeClaims(claims) {
  return ["readmeMember", "readmeRole"]
    .map(
      (claim) =>
        `${claim}=${claims[claim] === undefined ? "null" : JSON.stringify(claims[claim])}`,
    )
    .join(", ");
}

/** Lists current readme claims without modifying users. */
function listUsers(users) {
  for (const [index, user] of users.entries()) {
    const label = `[User ${(index + 1).toString().padStart(2, "0")}]`;
    const identity = `${user.email || "no email"} (${user.uid})`;
    console.log(
      `${styleText(["blue", "bold"], label)} ${identity}: ` +
        describeReadmeClaims(user.customClaims || {}),
    );
  }

  console.log(
    `${styleText(["blue", "bold"], "[Summary]")} ${users.length} user(s) listed.`,
  );
}

/** Reports and optionally applies claim changes for every selected user. */
async function updateUsers(auth, users, accessLevel, apply) {
  let changed = 0;

  for (const [index, user] of users.entries()) {
    const currentClaims = user.customClaims || {};
    const nextClaims = buildClaims(currentClaims, accessLevel);
    const changes = ["readmeMember", "readmeRole"].filter(
      (claim) => currentClaims[claim] !== nextClaims[claim],
    );
    const label = `[User ${(index + 1).toString().padStart(2, "0")}]`;
    const identity = `${user.email || "no email"} (${user.uid})`;

    if (changes.length === 0) {
      console.log(
        `${styleText(["blue", "bold"], label)} ${identity}: requested claims already set.`,
      );
      continue;
    }

    changed += 1;
    const description = describeReadmeClaims(nextClaims);
    console.log(
      `${styleText(["blue", "bold"], label)} ${identity}: ${description} ` +
        `${styleText("yellow", apply ? "(Updating user)" : "(Would update user)")}`,
    );

    if (apply) {
      await auth.setCustomUserClaims(user.uid, nextClaims);
    }
  }

  console.log(
    `${styleText(["blue", "bold"], "[Summary]")} ${users.length} user(s) checked, ` +
      `${apply ? changed : 0} user(s) updated${apply ? "" : `, ${changed} update(s) pending`}.`,
  );
}

/** Initializes Firebase Admin, resolves users, and performs the requested run. */
async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `${styleText(["red", "bold"], "[Error]", { stream: process.stderr })} ${error.message}`,
    );
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  console.log(
    `${styleText(["blue", "bold"], "[Run]")} User claims: project=${options.project}, ` +
      `environment=${options.environment}, action=${options.accessLevel}, ` +
      `mode=${options.accessLevel === "list" ? "READ ONLY" : options.apply ? "APPLY" : "DRY RUN"}`,
  );

  const appOptions = { projectId: options.project };
  if (options.environment === "production") {
    appOptions.credential = getProductionCredential(options.project);
  }
  admin.initializeApp(appOptions);

  const auth = admin.auth();
  const users = await resolveUsers(auth, options);
  if (options.accessLevel === "list") {
    listUsers(users);
  } else {
    await updateUsers(auth, users, options.accessLevel, options.apply);
  }
  await admin.app().delete();
}

main().catch(async (error) => {
  console.error(
    `${styleText(["red", "bold"], "[Error]", { stream: process.stderr })} User claim script failed.`,
    error,
  );
  if (admin.apps.length > 0) await admin.app().delete();
  process.exitCode = 1;
});
