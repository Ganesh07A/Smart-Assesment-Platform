const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const TEMP_DIR = path.join(__dirname, "../../temp");

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

/**
 * Normalize output for comparison
 */
const normalize = (output) =>
  output.toString().trim().replace(/\r\n/g, "\n");

/**
 * Run python code against test cases
 */
exports.evaluatePythonCode = async (code, testCases) => {
  const fileId = uuidv4();
  const filePath = path.join(TEMP_DIR, `${fileId}.py`);

  fs.writeFileSync(filePath, code);

  let totalMarks = 0;
  let earnedMarks = 0;
  const results = [];

  for (const testCase of testCases) {
    const { input, expectedOutput, marks } = testCase;

    try {
      const output = await runPython(filePath, input);

      const passed =
        normalize(output) === normalize(expectedOutput);

      if (passed) earnedMarks += marks;

      totalMarks += marks;

      results.push({
        input,
        expectedOutput,
        output,
        passed,
        marksAwarded: passed ? marks : 0,
      });
    } catch (err) {
      totalMarks += marks;

      results.push({
        input,
        expectedOutput,
        output: err.message,
        passed: false,
        marksAwarded: 0,
        error: "Runtime Error / Timeout",
      });
    }
  }

  fs.unlinkSync(filePath);

  return {
    totalMarks,
    earnedMarks,
    results,
  };
};

/**
 * Execute Python file safely
 */
const runPython = (filePath, input) => {
  return new Promise((resolve, reject) => {
    const process = exec(
      `python "${filePath}"`,
      { timeout: 2000 }, // 2 sec timeout
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error("Execution failed"));
        } else if (stderr) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }
      }
    );

    process.stdin.write(input);
    process.stdin.end();
  });
};
