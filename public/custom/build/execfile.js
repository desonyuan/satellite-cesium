const { execFile } = require("child_process")
const { join } = require("path")
const arg = [
  "BEIDOU"
  // "orbit_cal",
  // "Walker",
  // "7000.0",
  // "0.001",
  // "53",
  // "0",
  // "0",
  // "0",
  // "3",
  // "4",
  // "1"
]
const res = execFile(join(__dirname, 'hpop_executable.exe'), arg, (error, stdout, stderr) => {
  if (error) {
    console.error('执行出错:', error);
    return;
  }
  console.log('标准输出:', stdout);
  console.error('标准错误:', stderr);
})