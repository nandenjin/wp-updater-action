import { promises as fs } from 'fs'
import * as core from '@actions/core'
import { compareVersions, isRepoClean } from './lib'
import axios from 'axios'
import { WPReleaseAPIResponse } from './types'
;(async () => {
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

      core.info((await isRepoClean()) ? 'Repo is clean' : 'Repo is dirty')
    }
  }

  await Promise.all(tasks)
})().catch(e => {
  core.setFailed(e)
})
