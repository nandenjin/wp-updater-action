import { promises as fs } from 'fs'
import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { getOctokit, context } from '@actions/github'
import { compareVersions, createPullByCurrentChanges, isRepoClean } from './lib'
import axios from 'axios'
import { WPReleaseAPIResponse } from './types'
;(async () => {
  const token = core.getInput('github_token')
  const targets = core.getMultilineInput('targets', { required: true })
  const checkCore = core.getBooleanInput('check_core')

  // Init git client
  await exec(
    `git config --global user.email "github-actions[bot]@users.noreply.github.com"`
  )
  await exec(`git config --global user.name "github-actions[bot]"`)

  const tasks: Promise<unknown>[] = []

  // Check core updates
  if (checkCore) {
    const testPattern =
      /https:\/\/downloads\.wordpress.org\/release(?:\/[^/]+)?\/wordpress-([0-9.]+)\.(zip|tar\.gz)/gi

    const locale = core.getInput('core_locale') || ''

    // Acquire latest core version
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

        // Search matching URL
        if (content.match(testPattern)) {
          const versionStr = RegExp.$1
          const ext = RegExp.$2
          switch (compareVersions(versionStr, latestVersion)) {
            // If newer version is found, update the file
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

      // If somethings are changed, commit them
      if (!(await isRepoClean())) {
        const octokit = getOctokit(token)

        await createPullByCurrentChanges({
          branch: `upgrade-wp/wp-core-${latestVersion}`,
          message: `chore: Upgrade WordPress core to ${latestVersion}`,
          title: `Upgrade WordPress core to ${latestVersion}`,
          base: context.ref,
          context,
          octokit,
        })

        // Clean up
        await exec(`git checkout ${context.ref}`)
      }
    }
  }

  return Promise.all(tasks)
})().catch(e => {
  core.setFailed(e)
})
