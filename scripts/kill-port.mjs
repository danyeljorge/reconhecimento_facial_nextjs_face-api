import { execSync } from "child_process";

for (const port of [3000, 3001]) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const lines = output.trim().split("\n");
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(Number(pid)) && Number(pid) > 4) {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      console.log(`Killing PID ${pid} on port ${port}`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
      } catch {}
    }
  } catch {
    console.log(`No process on port ${port}`);
  }
}
