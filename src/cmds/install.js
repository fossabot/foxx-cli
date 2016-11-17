import {bold, white} from 'chalk'
import {common, validateServiceArgs} from '../util/cli'
import client from '../util/client'
import {fatal} from '../util/log'
import {resolveToFileStream} from '../util/fs'
import {inline as il} from '../util/text'
import resolveMount from '../resolveMount'

export const command = 'install <mount-path> [source]'
export const description = 'Install a service at a given mount path'
export const aliases = ['i']

const describe = description

const args = [
  ['mount-path', 'Database-relative path the service will be mounted on'],
  ['source', `URL or file system path of the service to install. Use ${bold('-')} to pass a zip file from stdin`, '[default: "."]']
]

export const builder = (yargs) => common(yargs, {command, aliases, describe, args})
.options({
  setup: {
    describe: `Run the setup script after installing the service. Use ${bold('--no-setup')} to disable`,
    type: 'boolean',
    default: true
  },
  development: {
    describe: 'Install the service in development mode. You can edit the service\'s files on the server and changes will be reflected automatically',
    alias: 'D',
    type: 'boolean',
    default: false
  },
  legacy: {
    describe: 'Install the service in legacy compatibility mode for legacy services written for ArangoDB 2.8 and earlier',
    type: 'boolean',
    default: false
  },
  remote: {
    describe: `Let the ArangoDB server resolve ${bold('source')} instead of resolving it locally`,
    alias: 'R',
    type: 'boolean',
    default: false
  },
  cfg: {
    describe: 'Pass a configuration option as a name=value pair. This option can be specified multiple times',
    alias: 'c',
    type: 'string'
  },
  dep: {
    describe: 'Pass a dependency option as a name=/mountPath pair. This option can be specified multiple times',
    alias: 'd',
    type: 'string'
  }
})
.example('$0 install /hello', 'Install the current working directory as a Foxx service at the URL "/hello"')
.example('$0 install -D /hello', 'Install the service in development mode')
.example('$0 install dev:/hello', 'Use the "dev" server instead of the default. See the "server" command for details')
.example('$0 install --no-setup /hello', 'Install the service without running the setup script afterwards')
.example('$0 install /hello demo.zip', 'Install the bundle "demo.zip"')
.example('$0 install /hello /tmp/bundle.zip', 'Install the bundle located at "/tmp/bundle.zip" (on the local machine)')
.example('$0 install /hello /tmp/my-service', 'Bundle and install the directory "/tmp/my-service" (on the local machine)')
.example('$0 install /hello -R /tmp/bundle.zip', 'Install the bundle located at "/tmp/bundle.zip" (on the ArangoDB server)')
.example('$0 install /hello http://example.com/foxx.zip', 'Download the bundle from "http://example.com/foxx.zip" locally and install it')
.example('$0 install /hello -R http://example.com/foxx.zip', 'Instruct the ArangoDB server to download the bundle from "http://example.com/foxx.zip" and install it')
.example('$0 install /hello -d mailer=/mymail -d auth=/myauth', 'Install the service and set its "mailer" and "auth" dependencies')
.example('cat foxx.zip | $0 install /hello -', 'Install the bundle read from stdin')

export function handler (argv) {
  const opts = validateServiceArgs(argv)
  resolveMount(argv.mountPath)
  .then((server) => {
    if (!server.mount) {
      fatal(il`
        Not a valid mount path: "${white(argv.mountPath)}".
        Make sure the mount path always starts with a leading slash.
      `)
    }

    if (!server.url) {
      fatal(il`
        Not a valid server: "${white(server.name)}".
        Make sure the mount path always starts with a leading slash.
      `)
    }

    return install(argv, server, opts)
  })
  .catch(fatal)
}

async function install (argv, server, opts) {
  const source = (
    argv.remote
    ? argv.source
    : await resolveToFileStream(argv.source)
  )
  const db = client(server)
  const result = await db.installService(
    server.mount,
    source,
    {...opts, setup: argv.setup}
  )
  console.log(JSON.stringify(result, null, 2))
}
