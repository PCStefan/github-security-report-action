import * as path from 'path'

export function getTestDirectoryFilePath(...filePath: any[]): string {
  const args = [__dirname, '..', '_tmp', ...filePath]
  return path.join(...args)
}

export function getSampleDataDirectory(...dir: any[]): string {
  const args = [__dirname, '..', 'samples', ...dir]
  return path.join(...args)
}

export function getSampleSarifDirectory(...dir: any[]): string {
  const args = [__dirname, '..', 'samples', 'sarif', ...dir]
  return path.join(...args)
}

export function getSampleReportJsonDirectory(...dir: any[]): string {
  const args = [__dirname, '..', 'samples', 'reportJson', ...dir]
  return path.join(...args)
}

export function getGitHubToken(): string {
  const token = process.env['GITHUB_TOKEN']

  if (!token) {
    throw new Error('GitHub Token was not set for environment variable "GITHUB_TOKEN"')
  }
  return token
}