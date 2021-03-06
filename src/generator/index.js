"use strict";
const { render } = require("ejs");
const { join } = require("path");
const { readFile } = require("fs");
const I = require("i");

const TEMPLATE_PATH = join(__dirname, "..", "..", "templates");

function generateManifest(options) {
  const manifest = {
    name: options.name,
    version: options.version,
    engines: {
      arangodb: options.engineVersion
    },
    main: options.mainFile
  };

  if (options.license) manifest.license = options.license.id;
  else if (options.generateLicense) manifest.license = "SEE LICENSE IN LICENSE";

  if (options.description) manifest.description = options.description;
  if (options.configuration) manifest.configuration = options.configuration;
  if (options.dependencies) manifest.dependencies = options.dependencies;
  if (options.provides) manifest.provides = options.provides;

  if (options.authorEmail) {
    manifest.author = `${options.authorName ||
      options.authorEmail.split("@")[0]} <${options.authorEmail}>`;
  } else if (options.authorName) manifest.author = options.authorName;

  if (options.generateSetup || options.generateTeardown) {
    manifest.scripts = {};
    if (options.generateSetup) manifest.scripts.setup = "setup.js";
    if (options.generateTeardown) manifest.scripts.teardown = "teardown.js";
  }

  return JSON.stringify(manifest, null, 2);
}

async function generateFile(name, data) {
  const template = await readFile(join(TEMPLATE_PATH, `${name}.ejs`), "utf-8");
  return render(template, data);
}

async function generateLicense(options) {
  if (!options.license) return generateFile("LICENSE", options);
  const path = require.resolve(
    `spdx-license-list/licenses/${options.license.id}.txt`
  );
  return (await readFile(path, "utf-8"))
    .replace(/<<var;name=[^;]+;original=([^;]+);match=[^>]+>>/g, "$1")
    .replace(/<<beginOptional;name=[^>]+>>/g, "")
    .replace(/<<endOptional>>/g, "");
}

module.exports = async function generateFiles(options) {
  const inflect = I();
  const files = [];
  files.push({
    name: "manifest.json",
    content: generateManifest(options)
  });
  if (options.generateReadMe) {
    files.push({
      name: "README.md",
      content: await generateFile("README.md", options)
    });
  }
  if (options.generateLicense) {
    files.push({
      name: "LICENSE",
      content: await generateLicense(options)
    });
  }
  if (options.generateExampleRouters) {
    const collections = [];
    for (const collection of options.documentCollections) {
      collections.push([collection, false]);
    }
    for (const collection of options.edgeCollections) {
      collections.push([collection, true]);
    }
    for (const [collection, isEdgeCollection] of collections) {
      let singular = inflect.singularize(collection);
      if (singular === collection) singular += "Item";
      let plural = inflect.pluralize(singular);
      if (plural === singular) plural = collection;
      files.push({
        name: `api/${collection}.js`,
        content: await generateFile("router.js", {
          collection,
          isEdgeCollection,
          singular,
          plural
        })
      });
    }
    if (options.generateSetup) {
      files.push({
        name: "setup.js",
        content: await generateFile("setup.js", options)
      });
    }
    if (options.generateTeardown) {
      files.push({
        name: "teardown.js",
        content: await generateFile("teardown.js", options)
      });
    }
  }
  return files;
};
