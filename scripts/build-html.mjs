// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { argv, exit } from "node:process";

if (argv.length !== 8) {
  console.error("Invalid arguments.");
  console.error(
    "Usage: %s %s TEMPLATE_PATH OUTPUT_PATH CSS_URL JS_URL LOGO_URL LISTSERVER_ADMIN_ROOT_URL",
    argv[0],
    argv[1]
  );
  exit(2);
}

const templatePath = argv[2];
const outputPath = argv[3];
const cssUrl = argv[4];
const jsUrl = argv[5];
const logoUrl = argv[6];
const listserverAdminRootUrl = argv[7];

function readTemplate() {
  return readFileSync(templatePath, { encoding: "utf-8" });
}

function getCss() {
  return `<link rel="stylesheet" href="${cssUrl}" />`;
}

function getJs() {
  return `<script src="${jsUrl}"></script>`;
}

function getElement() {
  return `<drawpile-webui logo="${logoUrl}" listserver="${listserverAdminRootUrl}"></drawpile-webui>`;
}

function process(template) {
  const replacements = new Map([
    ["CSS", getCss],
    ["JS", getJs],
    ["ELEMENT", getElement],
  ]);
  const keysRe = [...replacements.keys()].join("|");
  const templateRe = new RegExp(`{{{\\s*(${keysRe})\\s*}}}`, "g");
  return template.replace(templateRe, (_, key) => {
    return replacements.get(key)();
  });
}

writeFileSync(outputPath, process(readTemplate()), { encoding: "utf-8" });
