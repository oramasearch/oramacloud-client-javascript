# Orama Cloud Client Monorepo

See README in individual packages

## Development

* `pnpm i`
* `pnpm build`

To bump version:
* `pnpm run bump-version [version]`
* `git push origin tag v[version]`

To mass publish:
* need to be on main without any uncomitted changes
* `pnpm run publish-all`
