import { Octokit } from '@octokit/rest'
import { Endpoints } from '@octokit/types'
import { PaginatingEndpoints } from '@octokit/plugin-paginate-rest'
const fs = require('node:fs')

import CodeScanningAlert, { CodeScanningData } from './CodeScanningAlert'
import CodeScanningResults from './CodeScanningResults'

type DataType<T> = "data" extends keyof T ? T["data"] : unknown

type listCodeScanningAlertsParameters = Endpoints['GET /repos/{owner}/{repo}/code-scanning/alerts']['parameters']

type Repo = {
  owner: string,
  repo: string
}

export default class GitHubCodeScanning {

  private readonly octokit: Octokit

  constructor(octokit) {
    this.octokit = octokit
  }

  getOpenCodeScanningAlerts(repo: Repo): Promise<CodeScanningResults> {
    console.log(`(#4) Open Code Scanning Alerts Fetcher, processing upstream:`, repo)

    return getCodeScanning(this.octokit, repo, 'open')
      .then((result) => {
        console.log(`(#4f) Fetched open code scanning alerts`)
        return result
      })
  }

  getClosedCodeScanningAlerts(repo: Repo): Promise<CodeScanningResults> {
    console.log(`(#5) Closed Code Scanning Alerts Fetcher, processing upstream:`, repo)

    return getCodeScanning(this.octokit, repo, 'dismissed')
      .then((result) => {
        console.log(`(#5f) Fetched closed code scanning alerts`)
        return result
      })
  }
}

function getCodeScanning(octokit: Octokit,
                         repo: Repo,
                         state: 'open' | 'fixed' | 'dismissed'): Promise<CodeScanningResults> {

  const params: listCodeScanningAlertsParameters = {
    owner: repo.owner,
    repo: repo.repo,
    state: state
  }

  return octokit.paginate('GET /repos/{owner}/{repo}/code-scanning/alerts', params)
    .then((alerts: DataType<PaginatingEndpoints["GET /repos/{owner}/{repo}/code-scanning/alerts"]["response"]>) => {

      const results: CodeScanningResults = new CodeScanningResults()
      alerts.forEach((alert) => {
        results.addCodeScanningAlert(new CodeScanningAlert(alert))
      })

      return results
    })
}