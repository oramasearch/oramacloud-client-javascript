import { readFile, writeFile } from 'fs/promises'
import { inc, valid } from 'semver'
import { simpleGit } from 'simple-git'
import { fileURLToPath } from 'url'
import clientPackage from '../packages/client/package.json' assert { type: 'json' }
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


const dryRun = process.env.DRY_RUN === 'true'
const skipGit = process.env.SKIP_GIT === 'true'

const packages = await getPackages()

async function updatePackage(path, version) {
  const packageJson = JSON.parse(await readFile(path))

  console.log(
    `\x1b[32mUpdating package \x1b[1m${packageJson.name}\x1b[22m from \x1b[1m${packageJson.version}\x1b[22m to version \x1b[1m${version}\x1b[22m ...\x1b[0m`,
  )
  packageJson.version = version

  if (!dryRun) {
    await writeFile(path, JSON.stringify(packageJson, null, 2), 'utf-8')
  }
}

async function main() {
  if (!process.argv[2]) {
    console.error('\x1b[33mUsage: node version.mjs [VERSION | CHANGE [PRERELEASE]]\x1b[0m')
    process.exit(1)
  }

  // Check if the new version is absolute, otherwise we take it from @oramacloud/client and increase
  let version = process.argv[2]

  if (!valid(version)) {
    version = inc(clientPackage.version, version, process.argv[3])
  }

  if (!valid(version)) {
    console.error(
      `\x1b[31mCannot increase version \x1b[1m${clientPackage.version}\x1b[22m using operator \x1b[1m${process.argv[2]}\x1b[22m.\x1b[0m`,
    )
    process.exit(1)
  }

  // Update the main package.json
  await updatePackage(fileURLToPath(new URL(`../package.json`, import.meta.url)), version)

  // Perform the update
  for (const {path: pkgPath} of packages) {
    console.log(`../${pkgPath}/package.json`)
    await updatePackage(fileURLToPath(new URL(`../${pkgPath}/package.json`, import.meta.url)), version)
  }

  // Make the commit, including the tag
  if (!dryRun && !skipGit) {
    const git = simpleGit({ baseDir: fileURLToPath(new URL('..', import.meta.url)) })
    console.log(`\x1b[32mCommitting changes and creating a tag (pushing is left to you) ...\x1b[0m`)
    await git.commit(
      'chore: Version bump',
      packages.map(({path:p}) => `${p.replace(/\\/g,'/')}/package.json`),
      { '--no-verify': true },
    )

    await git.addTag(`v${version}`)
  }
}

await main()
