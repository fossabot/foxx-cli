"use strict";
const { bold, white, gray } = require("chalk");
const { common } = require("../../util/cli");
const { info, fatal } = require("../../util/log");
const { comma, inline: il, mask } = require("../../util/text");
const { load: loadIni } = require("../../ini");

const command = (exports.command = "show <name>");
const description = (exports.description = "Show server information");
const aliases = (exports.aliases = ["info"]);

const describe = description;

const args = [["name", "Server name to show details of"]];

exports.builder = yargs =>
  common(yargs, { command, sub: "server", aliases, describe, args }).describe(
    "verbose",
    "Include passwords and tokens"
  );

exports.handler = async function handler(argv) {
  try {
    const ini = await loadIni();
    const servers = Object.keys(ini.server);
    if (!servers.length) {
      fatal("No servers defined.");
    }
    if (!servers.includes(argv.name)) {
      fatal(il`
        No such server: "${white(argv.name)}".
        Known servers: ${comma(servers.sort().map(name => bold(name)))}
      `);
    }
    const server = ini.server[argv.name];
    info(`URL: ${server.url}`);
    if (server.version !== undefined) {
      info(`Version: ${server.version}`);
    }
    if (server.username !== undefined) {
      info(`Username: ${server.username}`);
    }
    if (argv.verbose) {
      if (server.password !== undefined) {
        info(`Password: ${server.password}`);
      }
      if (server.token !== undefined) {
        info(`Token: ${server.token}`);
      }
    } else {
      if (server.password !== undefined) {
        info(
          `Password: ${
            server.password ? mask(server.password) : gray("(empty)")
          }`
        );
      }
      if (server.token !== undefined) {
        info(`Token: ${mask(server.token)}`);
      }
    }
  } catch (e) {
    fatal(e);
  }
};
