# GitHub - Security Report Generator

A GitHub Action for generating PDF reports for GitHub Advanced Security Code Scan Results and Dependency Vulnerabilities.

The action comes with some predefined HTML templates using [Nunjucks](https://mozilla.github.io/nunjucks/templating.html),
along with the ability to in the future provide your own templates to the renderer.

Due to the nature of CodeQL Analysis this action ideally should be executed after the `github/codeql-action/analyze`
action step, as this will generate the SARIF files on the runner which can be used to identify ALL the rules that were
applied during the analysis. The results stored on your repository will only contain the results that generated an alert.

## Processing

The action will use the provided token to load all the dependencies, dependency vulnerabilities and the Code Scanning
results for the specified repository. It will then look in the directory specified for any SARIF reports.

With this data it will construct a JSON payload that it then passes into the template system (using Nunjucks a Jinja
like templating system for JavaScript) and will generate a Summary Report (with more of these to come in the future)
providing a roll up summary security report in HTML.

Using this HTML, it then passes it over to Puppeteer to render this in a headless Chromium before generating a PDF and
saving it in the specified directory.


## Parameters

* `token`: A GitHub Personal Access Token with access to `repo` scope or you can use `${{ secrets.GITHUB_TOKEN }}` instead of PAT)
* `sarifReportDir`: The directory to look for SARIF reports (from the CodeQL analyze action this defaults to `../results`)
* `outputDir`: The output directory for the PDF reports, defaults to `github.workspace`
* `outputFilename`: The name of the output file for the generated report(s), github-action defaults to `summary.pdf`
* `templateModelReport`: The name of the template used to generate report(s)., defaults to `summary.html`
* `repository`: The repository in `<owner>/<repo_name>` form, defaults to `github.repository`


## Templates

Currently the templates are hard coded into the action. There are extension points built into the action that will allow
a future release to provide customization of these templates, via an ability to specify your own.


## Examples

Please refer to: [test-report-generation.yml > "Generate a report" step](https://github.com/PCStefan/github-security-report-action/blob/main/.github/workflows/test-report-generation.yml#L27) to see how to add this to your github repo workflow.

```
  - name: "Install browser via puppeteer"
    run: npx puppeteer browsers install chrome

  - name: "Generate Security Report"
    uses: PCStefan/github-security-report-action@v3
    with:
      ...
```

Output:
Example summary report output: [Example summary report](./samples/summary.pdf)

---


## Standalone execution

For this version, an executable is possible only if you are going to be able to build `node` locally:
- Get `Node 18+` (tested with node 18.20.4 and node20.15.1)
- Get `NASM` installed (nasm-2.16.03-installer-x64.exe -- https://www.nasm.us/pub/nasm/releasebuilds/?C=M;O=D)
- Get `Python v3.11` (any version after 3.12 does not work as it does not contain a library to build node)
- Get `Visual Studio 2019 or later` (tested with VS2022, v17.11) (there is a known issue with VS2022-v17.10, so update your VS to avoid any issues)

### Build executable
- Open `Developer Command Prompt for Visual Studio 2022" (not powershell)
- Navigate to where you cloned this
- Run `pnpm run build-exe`

### Running
Just call the platform executable and pass in the arguments as required. The arguments are the same as that of the GitHub Action, and you can get the full details from invoking the `--help` option on the executable as it will output detailed help

Options:
- Please see: [Options with executable](https://github.com/PCStefan/github-security-report-action/blob/main/src/executable.ts#L14-L21)

An example of running the executable on Windows.
```
$ ./github-security-report.exe <options>[]
```


---

## Notes

```
Forked with history reset from: https://github.com/peter-murray/github-security-report-action

Changes
- Updated packages to be compatible with node18+.
- Fixed infinite loop of fetching paginated results.
- Added 2 optional configuration variables: [ "outputFilename", "templateModelReport"]
```
