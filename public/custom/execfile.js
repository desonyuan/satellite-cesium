const { execFile } = require("child_process");
const { existsSync } = require("fs");
const { join } = require("path");
const arg = ["Walker", "7000.0", "0.001", "53", "0", "0", "0", "3", "4", "1"];
console.log(join(process.cwd(), 'public'), '当前执行路径');

const res = execFile(join(process.cwd(), 'public/custom/hpop_executable.exe'), arg, (error, stdout, stderr) => {
  if (error) {
    console.error("执行出错:", error);
    return;
  }
  console.log("标准输出:", stdout);
  console.error("标准错误:", stderr);
});
