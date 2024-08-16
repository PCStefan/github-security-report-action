import { Octokit } from '@octokit/rest'
import { RequestHeaders, RequestParameters } from '@octokit/types'

import {
  QUERY_SECURITY_VULNERABILITIES,
  QUERY_DEPENDENCY_GRAPH,
  VulnerabilityAlert,
  DependencySetData, RepositoryVulnerabilityAlerts, DependencyGraphResult
} from './DependencyTypes'

import Vulnerability from './Vulnerability'
import DependencySet from './DependencySet'

type Repo = {
  owner: string,
  repo: string,
}


export default class GitHubDependencies {

  private readonly octokit: Octokit

  constructor(octokit) {
    this.octokit = octokit
  }

  async getAllVulnerabilities(repo: Repo): Promise<Vulnerability[]> {
    console.log(`(#3) Github Vulnerabilities Fetcher, processing upstream:`, repo)

    function extractVulnerabilityAlerts(data: RepositoryVulnerabilityAlerts): VulnerabilityAlert[] {
      return data.repository.vulnerabilityAlerts.nodes
    }

    const data: VulnerabilityAlert[] = await this.getPaginatedQuery<RepositoryVulnerabilityAlerts, VulnerabilityAlert>(
      QUERY_SECURITY_VULNERABILITIES,
      {organizationName: repo.owner, repositoryName: repo.repo},
      'repository.vulnerabilityAlerts.pageInfo',
      extractVulnerabilityAlerts
    ).then((result => {
      console.log(`(#3f) Fetched all vulnerabilities`)
      return result
    }))

    return data.map(val => {
      // console.debug(`  (#3) Found vulnerability`, val)
      return new Vulnerability(val)
    })
  }

  async getAllDependencies(repo: Repo): Promise<DependencySet[]> {
    console.log(`(#2) Github Project Dependencies Fetcher, processing upstream:`, repo)

    function extractDependencySetData(data: DependencyGraphResult): DependencySetData[] {
      return data.repository.dependencyGraphManifests.edges
    }

    const data = await this.getPaginatedQuery(
      QUERY_DEPENDENCY_GRAPH,
      {organizationName: repo.owner, repositoryName: repo.repo},
      'repository.dependencyGraphManifests.pageInfo',
      extractDependencySetData,
      {accept: 'application/vnd.github.hawkgirl-preview+json'}
    ).then((result) => {
      console.log(`(#2f) Fetched all dependencies`)
      return result
    })

    return data.map(node => {
      //console.debug('  (#2) Found project dependencies', node)
      return new DependencySet(node)
    })
  }

  async getPaginatedQuery<T, Y>(query: string,
                                parameters: {organizationName: string, repositoryName: string},
                                pageInfoPath: string,
                                extractResultsFn: (val: T) => Y[],
                                headers?: RequestHeaders): Promise<Y[]> {
    const octokit = this.octokit
    const results: Y[] = []
    const queryParameters = Object.assign({cursor: null}, parameters)

    let hasNextPage = false
    do {
      const graphqlParameters = buildGraphQLParameters(query, queryParameters, headers)
      const queryResult = await octokit.graphql<T>(graphqlParameters)

      const extracted = extractResultsFn(queryResult)
      results.push(...extracted)

      const pageInfo = getObject(queryResult, ...pageInfoPath.split('.'))

      hasNextPage = pageInfo ? pageInfo.hasNextPage : false

      if (hasNextPage) {
        queryParameters.cursor = pageInfo.endCursor
      }
    } while (hasNextPage)

    return results
  }
}

function buildGraphQLParameters(query: string, parameters?: Object, headers?: RequestHeaders): RequestParameters {
  const result: RequestParameters = {
    ...(parameters || {}),
    query: query,
  }

  if (headers) {
    result.headers = headers
  }

  return result
}

function getObject(target, ...path) {
  if (target !== null && target !== undefined) {
    const value = target[path[0]]

    if (path.length > 1) {
      return getObject(value, ...path.slice(1))
    } else {
      return value
    }
  }
  return null
}