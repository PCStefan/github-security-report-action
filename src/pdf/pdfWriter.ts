import puppeteer from 'puppeteer-core'
import { executablePath } from 'puppeteer'

export async function createPDF(html: string, file: string): Promise<string> {
  console.log(`Generating pdf`)

  const browser = await puppeteer.launch({
    headless: true,
    acceptInsecureCerts: true,
    executablePath: executablePath(),
    defaultViewport: {
      width: 1920,
      height: 1280,
      deviceScaleFactor: 1,
    },
    args: [
      '--no-sandbox',             // Crucial for bypassing the sandbox error
      '--disable-setuid-sandbox',  // Also helpful for Linux environments
      '--disable-gpu',
      '--disable-dev-shm-usage' // Important for limited /dev/shm in some environments
    ],
  })

  const page = await browser.newPage()
  await page.setContent(html)
  await page.pdf({path: file, format: 'A4'})

  await browser.close()

  console.log(`Generated pdf: ${file}`)

  return file
}
