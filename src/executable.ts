import path from 'path'
import { Octokit } from '@octokit/rest'
import commander from 'commander'

import ReportGenerator, { ReportGeneratorConfig } from './ReportGenerator'

const packageJson = require('../package.json')
const program = new commander.Command()

program
  .name('github-security-report')
  .version(packageJson.version)

program
  .requiredOption('-t, --token <token>', 'github access token')
  .requiredOption('-r, --repository <repository>', 'github repository, owner/repo_name format')
  .option('-s, --sarif-directory <sarifReportDirectory>', 'the SARIF report directory to load reports from', '../results')
  .option('-o, --output-directory <outputDirectory>', 'output directory for summary report', '.')
  .option('-f, --output-filename <outputFilename>', 'output filename for summary report', 'summary.pdf')
  .option('-m, --template-model-report <templateModelReport>', 'template for summary report (summary, executive_summary, vulnerability)', 'summary')
  .option('--github-api-url <url>', 'GitHub API URL', 'https://api.github.com')

program.parse(process.argv)
const opts = program.opts()

const reportGenerateConfig: ReportGeneratorConfig = {
  repository: opts.repository,
  octokit: new Octokit({auth: opts.token, baseUrl: opts.url}),
  sarifReportDirectory: getPath(opts.sarifDirectory),
  outputDirectory: getPath(opts.outputDirectory),
  outputFile: opts.outputFilename,
  templating: {
    name: opts.templateModelReport
  }
}

async function execute(reportGenerateConfig: ReportGeneratorConfig) {
  console.log(`Using Node Version: ${process.version}`)

  try {
    const generator = new ReportGenerator(reportGenerateConfig)
    console.log(`Generating Security report for ${reportGenerateConfig.repository}...`)
    const file = await generator.run()
    console.log(`Summary Report generated: ${file}`)

  } catch (err: any) {
    console.log(err.stack)
    console.error(err.message)
    console.error()
    program.help({error: true})
  }
}

execute(reportGenerateConfig)

function getPath(value: string) {
  if (path.isAbsolute(value)) {
    return value
  } else {
    return path.normalize(path.join(process.cwd(), value))
  }
}