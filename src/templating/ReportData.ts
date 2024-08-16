import Vulnerability from '../dependencies/Vulnerability'
import DependencySet from '../dependencies/DependencySet'
import { SarifFile } from '../sarif/SarifReportFinder'
import CodeScanningResults from '../codeScanning/CodeScanningResults'
import CodeScanningRule from '../sarif/CodeScanningRule'
import {
  AlertSummary,
  CodeScanningRules, CodeScanResults, CodeScanSummary,
  CollectedData,
  CWECoverage, Dependencies,
  DependencySummary,
  JsonPayload, Manifest,
  Repo,
  RuleData, SeverityToVulnerabilities, SeverityToAlertSummary
} from './ReportTypes'

export default class ReportData {

  private readonly data: CollectedData

  constructor(data: CollectedData) {
    this.data = data || {}
  }

  get githubRepo(): Repo {
    return this.data.github || {}
  }

  get vulnerabilities(): Vulnerability[] {
    return this.data.vulnerabilities || []
  }

  get dependencies(): DependencySet[] {
    return this.data.dependencies || []
  }

  get openDependencyVulnerabilities(): Vulnerability[] {
    return this.vulnerabilities.filter(vulnerability => {
      return !vulnerability.isDismissed
    })
  }

  get closedDependencyVulnerabilities(): Vulnerability[] {
    return this.vulnerabilities.filter(vulnerability => {
      return vulnerability.isDismissed
    })
  }

  get openCodeScanResults(): CodeScanningResults {
    return this.data.codeScanningOpen || {}
  }

  get closedCodeScanResults(): CodeScanningResults {
    return this.data.codeScanningClosed || {}
  }

  get sarifReports(): SarifFile[] {
    return this.data.sarifReports || []
  }

  get codeScanningRules(): CodeScanningRules {
    const result = {}

    this.sarifReports.forEach(report => {
      // Each report is an object of {file, payload} keys
      const rules = report.payload.rules

      if (rules) {
        rules.forEach(rule => {
          result[rule.id] = rule
        })
      }
    })

    return result
  }

  getJSONPayload(): JsonPayload {
    const data =  {
      github: this.githubRepo,
      metadata: {
        created: new Date().toISOString(),
      },
      sca: {
        dependencies: this.getDependencySummary(),
        vulnerabilities: {
          total: this.openDependencyVulnerabilities.length,
          bySeverity: this.getVulnerabilitiesBySeverity()
        },
      },
      scanning: {
        rules: this.getAppliedCodeScanningRules(),
        cwe: this.getCWECoverage() || {},
        results: this.getCodeScanSummary(),
      }
    }
    return data
  }

  getCWECoverage(): CWECoverage | null {
    const rules = this.getAppliedCodeScanningRules()

    if (rules) {
      const result: {[key: string]: RuleData[]} = {}

      rules.forEach(rule => {
        const cwes = rule.cwe

        if (cwes) {
          cwes.forEach(cwe => {
            if (!result[cwe]) {
              result[cwe] = []
            }

            result[cwe].push(rule)
          })
        }
      })

      return {
        cweToRules: result,
        cwes: Object.keys(result)
      }
    }

    return null
  }


  getDependencySummary(): DependencySummary {
    const unprocessed: Manifest[] = []
      , processed: Manifest[] = []
      , dependencies: Dependencies = {}


    let totalDeps = 0

    this.dependencies.forEach(depSet => {
      totalDeps += depSet.count

      const manifest = {
        filename: depSet.filename,
        path: depSet.path
      }

      if (depSet.isValid) {
        processed.push(manifest)
      } else {
        unprocessed.push(manifest)
      }

      const identifiedDeps = depSet.dependencies
      if (identifiedDeps) {
        identifiedDeps.forEach(dep => {
          const type = dep.packageType.toLowerCase()

          if (!dependencies[type]) {
            dependencies[type] = []
          }

          dependencies[type].push({
            name: dep.name,
            type: dep.packageType,
            version: dep.version,
          })
        })
      }
    })

    return {
      manifests: {
        processed: processed,
        unprocessed: unprocessed,
      },
      totalDependencies: totalDeps,
      dependencies: dependencies
    }
  }

  getVulnerabilitiesBySeverity(): SeverityToVulnerabilities {
    const result = {}

    // Obtain third party artifacts ranked by severity
    const vulnerabilities = this.openDependencyVulnerabilities
    vulnerabilities.forEach(vulnerability => {
      const severity = vulnerability.severity.toLowerCase()

      if (!result[severity]) {
        result[severity] = []
      }
      result[severity].push(vulnerability)
    })

    return result
  }

  getAppliedCodeScanningRules(): RuleData[] {
    const rules = this.codeScanningRules

    if (rules) {
      return Object.values(rules).map(rule => {
        return getRuleData(rule)
      })
    }

    return []
  }

  getCodeScanSummary(): CodeScanSummary {
    const open = this.openCodeScanResults
      , closed = this.closedCodeScanResults
      , rules = this.codeScanningRules


    const data = {
      open: generateAlertSummary(open, rules),
      closed: generateAlertSummary(closed, rules),
    }

    return data
  }
}

function generateAlertSummary(open: CodeScanningResults, rules: CodeScanningRules): CodeScanResults {
  const result: SeverityToAlertSummary = {}
  let total = 0

  open.getCodeQLScanningAlerts().forEach(codeScanAlert => {
    const ruleId = codeScanAlert.ruleId

    if(ruleId == null) {
      console.warn('generateAlertSummary::getCodeQLScanningAlerts::rule::codeScanAlert::ruleId is null')
      return;
    }

    const matchedRule = rules ? rules[ruleId] : null
    const severity = codeScanAlert.severity ?? '(no severity)' as string

    const summary: AlertSummary = {
      tool: codeScanAlert.toolName,
      name: codeScanAlert.ruleDescription ?? '(no description)',
      state: codeScanAlert.state,
      created: codeScanAlert.created,
      url: codeScanAlert.url,
      rule: {
        id: codeScanAlert.ruleId ?? '-1',
      }
    }

    if (matchedRule) {
      summary.rule.details = matchedRule
    }

    if (!result[severity]) {
      result[severity] = []
    }
    result[severity].push(summary)
    total++
  })

  return {
    total: total,
    scans: result
  }
}

function getRuleData(rule: CodeScanningRule): RuleData {
  return {
    name: rule.name,
    id: rule.id, //TODO maybe id?
    severity: rule.severity,
    precision: rule.precision,
    kind: rule.kind,
    shortDescription: rule.shortDescription,
    description: rule.description,
    tags: rule.tags,
    cwe: rule.cwes,
  }
}
