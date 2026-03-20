import { spawn } from "node:child_process"
import path from "node:path"

const args = process.argv.slice(2)
const isMacBuild = process.platform === "darwin" && args[0] === "build"
const maxAttempts = isMacBuild ? 2 : 1
const cargoTargetDir = process.env.CARGO_TARGET_DIR ?? path.resolve(process.cwd(), "target-player")

function runTauri(attempt) {
  return new Promise((resolve) => {
    const child = spawn("pnpm", ["exec", "tauri", ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CARGO_TARGET_DIR: cargoTargetDir,
      },
      shell: process.platform === "win32",
      stdio: isMacBuild ? ["inherit", "pipe", "pipe"] : "inherit",
    })

    let output = ""

    if (isMacBuild) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString()
        output += text
        process.stdout.write(text)
      })

      child.stderr.on("data", (chunk) => {
        const text = chunk.toString()
        output += text
        process.stderr.write(text)
      })
    }

    child.on("error", (error) => {
      resolve({ code: 1, output: `${output}\n${error.message}` })
    })

    child.on("exit", (code) => {
      resolve({ code: code ?? 1, output })
    })
  })
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = await runTauri(attempt)

  if (result.code === 0) {
    process.exit(0)
  }

  const shouldRetry =
    attempt < maxAttempts
    && result.output.includes("bundle_dmg.sh")

  if (!shouldRetry) {
    process.exit(result.code)
  }

  process.stderr.write("\nRetrying macOS DMG bundling after bundle_dmg.sh failure...\n")
}
