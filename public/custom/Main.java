import java.io.BufferedReader;
import java.io.InputStreamReader;

public class Main {
    public static void main(String[] args) {
        try {
            // 可执行文件路径
            String executablePath = "D:\\HPOP_code\\HPOP_RK4\\build\\hpop_executable.exe";

            // 要传递的参数
            String[] cmdArgs = {
                    executablePath, // 可执行文件路径（必须放在第一个）
                    // "BEIDOU",
                    // "orbit_cal", // 参数1
                    "scene_edit",
                    "Walker", // 参数2
                    "7000.0", // 参数3
                    "0.001", // 参数4
                    "53", // 参数5
                    "0", // 参数6
                    "0", // 参数7
                    "0", // 参数8
                    "3", // 参数9
                    "4", // 参数10
                    "1" // 参数11
            };

            // 调用外部程序并传递参数
            Process process = Runtime.getRuntime().exec(cmdArgs);

            // 读取外部程序的输出
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }

            // 等待外部程序执行完成
            int exitCode = process.waitFor();
            System.out.println("程序执行结束，退出码: " + exitCode);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}