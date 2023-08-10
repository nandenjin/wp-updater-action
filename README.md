# wp-updater-action

Update Wordpress download URLs in repo with using GitHub Actions

![Latest version](https://img.shields.io/github/v/tag/nandenjin/wp-updater-action?style=flat-square)
[![Maintainability](https://api.codeclimate.com/v1/badges/fdbed9f21cd494df1ba4/maintainability)](https://codeclimate.com/github/nandenjin/wp-updater-action/maintainability)
[![Deployed by Ship.js](https://img.shields.io/badge/deploy-🛳%20Ship.js-blue?style=flat-square)](https://github.com/algolia/shipjs)

## What's this

This action detects URLs of `downloads.wordpress.org` and opens PRs to update latest ones.

It can be useful to keep WP updated through `Dockerfile` or so on.

## Usage

What this action do are:

- Fetch latest version of WP from [`api.wordpress.org/core/version-check`](https://api.wordpress.org/core/version-check/1.7)
- Search matching URLs `https://downloads.wordpress.org/releases/({locale}/)?wordpress-{x}.{y}.{z}.{ext}`
- If versions are not latest, replace the URLs and create a PR.

### Example

```yaml
jobs:
  updater:
    runs-on: ubuntu-latest
    steps:
      # Checkout target code
      - uses: actions/checkout@v2

      # Call wp-updater-action
      - uses: nandenjin/wp-updater-action@v0
        with:
          # Give token to create PRs
          github_token: ${{ secrets.GITHUB_TOKEN }}

          # Lists of target files to be checked
          targets: |
            ./Dockerfile
```

### Parameters

|      key       |            example            | description                                                                                                                                                           |
| :------------: | :---------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_token` | `${{ secrets.GITHUB_TOKEN }}` | **Required.** Access token for GitHub API.                                                                                                                            |
|   `targets`    |        `./Dockerfile`         | **Required.** Paths of files to be checked. Multi-line list is allowed.                                                                                               |
| `core_locale`  |             `ja`              | Optional. Locale of Wordpress. The action adds params to WP API URL like `?locale=ja`. The response may contains versions that are not translated for the locale yet. |
