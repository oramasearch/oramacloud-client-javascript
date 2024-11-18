import { spawn } from 'node:child_process'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'url'

import { exec } from 'child_process'


const getPackages = () => {
    return new Promise((resolve, reject) => {
    exec('pnpm turbo ls --output=json', (error, stdout, stderr) => {
        if (error) {
            return reject(error);
        }
        const result = JSON.parse(stdout);
        
        return resolve(result.packages.items);
    });
    })
};


const rootDir = fileURLToPath(new URL('../', import.meta.url))

const packages = await getPackages()

function step(message) {
  console.log(`\x1b[1m\x1b[32m--- ${message}\x1b[0m`)
}

async function execute(command, args, cwd) {
  if (!Array.isArray(args)) {
    args = [args]
  }

  let success, fail
  const promise = new Promise((resolve, reject) => {
    success = resolve
    fail = reject
  })

    const rFolder = relative(rootDir, cwd)
    step(`Executing: ${command} ${args.join(' ')} (from folder ${rFolder.trim() ? rFolder : '.'}) ...`)


  const childProcess = spawn(command, args, { cwd, stdio: 'inherit', shell: true })

  childProcess.on('error', e=>{
    console.log(e)
  })
  childProcess.on('message', e=>{
    console.log(e)
  }
  )

  childProcess.on('close', code => {
    if (code !== 0) {
      fail(new Error(`Process failed with status code ${code}.`))
    }

    success()
  })

  return promise
}

async function main() {
  process.env.BUILD_TOKENIZERS = '1'
  await execute('pnpm',  'build', rootDir)

  for (const {path:pkgPath} of packages) {
    const cwd = resolve(rootDir,  pkgPath)
    await execute('pnpm', 'publish', cwd)
  }
}

await main()
