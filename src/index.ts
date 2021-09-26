import { promises as fs } from 'fs'
import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { getOctokit, context } from '@actions/github'
import { compareVersions, isRepoClean } from './lib'
import axios from 'axios'
import { WPReleaseAPIResponse } from './types'
;(async () => {
  const token = core.getInput('github_token')
  const targets = core.getMultilineInput('targets', { required: true })
  const checkCore = core.getBooleanInput('check_core')

  const tasks: Promise<unknown>[] = []

  if (checkCore) {
    const testPattern =
      /https:\/\/downloads\.wordpress.org\/release(?:\/[^/]+)?\/wordpress-([0-9.]+)\.(zip|tar\.gz)/gi

    const locale = core.getInput('core_locale') || ''

    const { data: releases }: { data: WPReleaseAPIResponse } = await axios.get(
      'https://api.wordpress.org/core/version-check/1.7/',
      {
        params: {
          locale,
        },
      }
    )

    const [offer] = releases.offers
    const latestVersion = offer.version
    core.info(`Latest core version: ${latestVersion}`)

    const getLatestURL = (ext: string) => offer.download.replace(/zip$/, ext)

    for (const target of targets) {
      // Read the contents of targets
      const task = async () => {
        const content = await fs.readFile(target, 'utf8')
        if (content.match(testPattern)) {
          const versionStr = RegExp.$1
          const ext = RegExp.$2

          switch (compareVersions(versionStr, latestVersion)) {
            case -1: {
              core.info(`${target}: ${versionStr} -> ${latestVersion}`)
              await fs.writeFile(
                target,
                content.replace(testPattern, getLatestURL(ext))
              )
              break
            }
            case 0: {
              core.info(`${target}: ${versionStr} [latest]`)
              break
            }
            case 1: {
              core.info(`${target}: ${versionStr} [newer?]`)
              break
            }
          }
        }
      }

      tasks.push(task())

      if (!(await isRepoClean())) {
        const octokit = getOctokit(token)

        const branchName = `upgrade-wp-${latestVersion}-${Math.floor(
          Math.random() * 10000
        )}`

        await exec(`git config --global user.email "robot@nandenjin.com"`)
        await exec(`git config --global user.name "WP Updater Actions"`)
        await exec(`git switch -c ${branchName}`)
        await exec(`git add .`)
        await exec(`git commit -m "Upgrade WordPress to ${latestVersion}"`)
        await exec(`git push`)

        octokit.rest.pulls.create({
          ...context.repo,
          title: `Upgrade WordPress to ${latestVersion}`,
          base: context.ref,
          head: `refs/heads/${branchName}`,
        })

        await exec(`git checkout ${context.ref}`)
      }
    }
  }

  return Promise.all(tasks)
})().catch(e => {
  core.setFailed(e)
})
