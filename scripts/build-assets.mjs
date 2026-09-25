import { copyFile, cp, mkdir, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

const projectRoot = resolve(process.cwd())
const outputDir = resolve(projectRoot, 'dist')

// Guard the generated folder before clearing it. Source files are never targets.
if (dirname(outputDir) !== projectRoot || basename(outputDir) !== 'dist') {
  throw new Error('Refusing to clear an unexpected asset output directory.')
}

// OneDrive and a just-stopped local Worker can briefly hold a generated file
// on Windows. Node retries only this verified dist/ deletion; source files are
// never touched.
await rm(outputDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 })
await mkdir(join(outputDir, 'css'), { recursive: true })
await mkdir(join(outputDir, 'js'), { recursive: true })

await Promise.all([
  copyFile(join(projectRoot, 'index.html'), join(outputDir, 'index.html')),
  copyFile(join(projectRoot, 'admin.html'), join(outputDir, 'admin.html')),
  copyFile(join(projectRoot, '_headers'), join(outputDir, '_headers')),
  copyFile(join(projectRoot, 'css', 'style.css'), join(outputDir, 'css', 'style.css')),
  copyFile(join(projectRoot, 'css', 'admin.css'), join(outputDir, 'css', 'admin.css')),
  copyFile(join(projectRoot, 'css', 'tailwind.css'), join(outputDir, 'css', 'tailwind.css')),
  copyFile(join(projectRoot, 'js', 'app.js'), join(outputDir, 'js', 'app.js')),
  copyFile(join(projectRoot, 'js', 'admin.js'), join(outputDir, 'js', 'admin.js')),
  cp(join(projectRoot, 'assets', 'audio'), join(outputDir, 'assets', 'audio'), { recursive: true }),
  cp(join(projectRoot, 'assets', 'brand'), join(outputDir, 'assets', 'brand'), { recursive: true }),
  cp(join(projectRoot, 'assets', 'cases'), join(outputDir, 'assets', 'cases'), { recursive: true }),
  cp(join(projectRoot, 'assets', 'cosmetics'), join(outputDir, 'assets', 'cosmetics'), { recursive: true }),
  cp(join(projectRoot, 'assets', 'events'), join(outputDir, 'assets', 'events'), { recursive: true }),
  cp(join(projectRoot, 'assets', 'partners'), join(outputDir, 'assets', 'partners'), { recursive: true }),
])

console.log('Built public assets in dist/.')
