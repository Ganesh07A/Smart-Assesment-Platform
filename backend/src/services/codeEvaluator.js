// const fs = require("fs");
// const path = require("path");
// const { exec } = require("child_process");
// const { v4: uuidv4 } = require("uuid");

// const TEMP_DIR = path.join(__dirname, "../../temp");

// // Ensure temp directory exists
// if (!fs.existsSync(TEMP_DIR)) {
//   fs.mkdirSync(TEMP_DIR);
// }

// /**
//  * Normalize output for comparison
//  */
// const normalize = (output) =>
//   output.toString().trim().replace(/\r\n/g, "\n");

// /**
//  * Run python code against test cases
//  */
// exports.evaluatePythonCode = async (code, testCases) => {
//   const fileId = uuidv4();
//   const filePath = path.join(TEMP_DIR, `${fileId}.py`);

//   fs.writeFileSync(filePath, code);

//   let totalMarks = 0;
//   let earnedMarks = 0;
//   const results = [];

//   for (const testCase of testCases) {
//     const { input, expectedOutput, marks } = testCase;

//     try {
//       const output = await runPython(filePath, input);

//       const passed =
//         normalize(output) === normalize(expectedOutput);

//       if (passed) earnedMarks += marks;

//       totalMarks += marks;

//       results.push({
//         input,
//         expectedOutput,
//         output,
//         passed,
//         marksAwarded: passed ? marks : 0,
//       });
//     } catch (err) {
//       totalMarks += marks;

//       results.push({
//         input,
//         expectedOutput,
//         output: err.message,
//         passed: false,
//         marksAwarded: 0,
//         error: "Runtime Error / Timeout",
//       });
//     }
//   }

//   fs.unlinkSync(filePath);

//   return {
//     totalMarks,
//     earnedMarks,
//     results,
//   };
// };

// /**
//  * Execute Python file safely
//  */
// const runPython = (filePath, input) => {
//   return new Promise((resolve, reject) => {
//     const process = exec(
//       `python "${filePath}"`,
//       { timeout: 2000 }, // 2 sec timeout
//       (error, stdout, stderr) => {
//         if (error) {
//           reject(new Error("Execution failed"));
//         } else if (stderr) {
//           reject(new Error(stderr));
//         } else {
//           resolve(stdout);
//         }
//       }
//     );

//     process.stdin.write(input);
//     process.stdin.end();
//   });
// };

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

let Docker;
try {
  Docker = require('dockerode');
} catch {
  Docker = null;
}

const TIMEOUT = parseInt(process.env.CODE_EXECUTION_TIMEOUT) || 10000;

/**
 * Execute Python code against test cases.
 * Tries Docker first, falls back to child_process.
 */
async function executeCode(code, testCases) {
  const results = [];

  for (const tc of testCases) {
    try {
      const result = await runPython(code, tc.input || '');
      const passed = normalizeOutput(result.stdout) === normalizeOutput(tc.expectedOutput);
      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: result.stdout,
        passed,
        error: result.stderr || null,
      });
    } catch (err) {
      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: '',
        passed: false,
        error: err.message,
      });
    }
  }

  return results;
}

/**
 * Try Docker first, fallback to local child_process.
 */
async function runPython(code, stdin) {
  if (Docker) {
    try {
      // console.log('Attempting Docker execution...');
      return await runPythonDocker(code, stdin);
    } catch (err) {
      console.warn('Docker execution failed, falling back to local:', err.message);
    }
  }
  // console.log('Running locally...');
  return runPythonLocal(code, stdin);
}

/**
 * Run Python code in a Docker container (sandboxed).
 */
async function runPythonDocker(code, stdin) {
  const docker = new Docker();

  // Write code to a temp file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-'));
  const codePath = path.join(tmpDir, 'solution.py');
  fs.writeFileSync(codePath, code);

  // Normalize path for Windows Docker (if using WSL2 or Docker Desktop)
  // dockerode usually handles absolute paths well, but we should be careful.
  const hostPath = path.resolve(tmpDir);

  try {
    const container = await docker.createContainer({
      Image: 'assessment-python',
      Cmd: ['python', '/sandbox/solution.py'],
      WorkingDir: '/sandbox',
      Tty: false,
      HostConfig: {
        Binds: [`${hostPath}:/sandbox:ro`],
        Memory: (parseInt(process.env.MAX_MEMORY_MB) || 256) * 1024 * 1024,
        NanoCpus: (parseFloat(process.env.MAX_CPUS) || 0.5) * 1e9, // 0.5 CPU limit
        NetworkMode: 'none',
        AutoRemove: true,
      },
      OpenStdin: true,
      StdinOnce: true,
    });

    await container.start();

    if (stdin) {
      const stream = await container.attach({ stream: true, stdin: true, hijack: true });
      stream.write(stdin);
      stream.end();
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(async () => {
        try {
          const info = await container.inspect();
          if (info.State.Running) {
            await container.kill();
          }
        } catch { }
        reject(new Error('Time Limit Exceeded'));
      }, TIMEOUT)
    );

    const waitPromise = container.wait();
    await Promise.race([waitPromise, timeoutPromise]);

    const logs = await container.logs({ stdout: true, stderr: true });

    // dockerode logs format with Tty: false is [stream_id, 0, 0, 0, size1, size2, size3, size4, content...]
    // We can simplify by just using a TTY if we don't need to separate stdout/stderr,
    // OR we can use the simple slice if we only care about the content.
    // However, for alpine python, the simple toString often includes these bytes at the start.

    let output = '';
    let offset = 0;
    while (offset < logs.length) {
      // 8 bytes header
      const size = logs.readUInt32BE(offset + 4);
      output += logs.slice(offset + 8, offset + 8 + size).toString('utf8');
      offset += 8 + size;
    }

    return { stdout: output.trim(), stderr: '' };
  } finally {
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}

/**
 * Run Python code via local child_process (development fallback).
 */
function runPythonLocal(code, stdin) {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-'));
    const codePath = path.join(tmpDir, 'solution.py');
    fs.writeFileSync(codePath, code);

    const proc = spawn('python', [codePath], {
      timeout: TIMEOUT,
      cwd: tmpDir,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    if (stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }

    proc.on('close', (exitCode) => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (exitCode !== 0 && !stderr) {
        stderr = `Process exited with code ${exitCode}`;
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });

    proc.on('error', (err) => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      reject(err);
    });
  });
}

function normalizeOutput(str) {
  if (!str) return '';
  return str.toString().trim().replace(/\r\n/g, '\n').replace(/\s+$/gm, '');
}

module.exports = { executeCode };

