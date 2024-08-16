import * as path from 'path'
import { mkdirP } from '@actions/io'
import { Octokit } from '@octokit/rest'

import DataCollector from './DataCollector'
import Template from './templating/Template'
import { createPDF } from './pdf/pdfWriter'

export type ReportGeneratorConfig = {
  repository: string
  octokit: Octokit

  sarifReportDirectory: string
  outputDirectory: string
  outputFile: string

  templating: {
    directory?: string
    name: string
  }
}

export default class ReportGenerator {
  private readonly config: ReportGeneratorConfig

  constructor(config: ReportGeneratorConfig) {
    this.config = config
  }

  async run(): Promise<string> {
    const config = this.config
    const collector = new DataCollector(config.octokit, config.repository)

    const reportData = await collector.getPayload(config.sarifReportDirectory)
    const reportTemplate = new Template(config.templating.directory)
    const html = reportTemplate.render(reportData.getJSONPayload(), config.templating.name)

    await mkdirP(config.outputDirectory)

    console.log('')
    return await createPDF(html, path.join(config.outputDirectory, config.outputFile))
  }
}