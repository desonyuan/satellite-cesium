import numpy as np
import matplotlib.pyplot as plt

# 读取文件并处理数据
def read_and_process(file_path1, file_path2):
    position_errors = []
    velocity_errors = []

    with open(file_path1, 'r') as file1, open(file_path2, 'r') as file2:
        lines1 = file1.readlines()
        lines2 = file2.readlines()

        min_length = min(len(lines1), len(lines2))

        for i in range(min_length):
            line1 = lines1[i].strip().split()
            line2 = lines2[i].strip().split()

            data1 = np.array([float(part) for part in line1[1:]])
            data2 = np.array([float(part)*1000 for part in line2[4:]])

            r1 = data1[:3]
            v1 = data1[3:]
            r2 = data2[:3]
            v2 = data2[3:]

            dr = r1 - r2
            dv = v1 - v2

            error_r = np.linalg.norm(dr)
            error_v = np.linalg.norm(dv)

            position_errors.append(error_r)
            velocity_errors.append(error_v)

    return position_errors, velocity_errors

# 绘图函数
def plot_errors(position_errors, velocity_errors, time_interval):
    time_points = np.arange(0, len(position_errors) * time_interval, time_interval)

    plt.figure(figsize=(12, 6))

    plt.subplot(1, 2, 1)
    plt.plot(time_points, position_errors, label='Position Error (r)')
    plt.xlabel('Time Step (min)')
    plt.ylabel('3D Error (m)')
    plt.title('Position Error over Time')
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(time_points, velocity_errors, label='Velocity Error (v)')
    plt.xlabel('Time Step (min)')
    plt.ylabel('3D Error (m/s)')
    plt.title('Velocity Error over Time')
    plt.legend()

    plt.tight_layout()
    plt.savefig('error_show.png')
    plt.show()

# 主程序
if __name__ == "__main__":
    file_path1 = 'SatelliteStates_J2000.txt'
    file_path2 = 'J2000_7day_gt.txt'
    # file_path1 = "D:\\HPOP_code\\HPOP_RK4\\beidou_output\\Satellite_1_fixed.txt"
    # file_path2 = "C:\\Users\\Thinkpad\\Desktop\\Satellite1_fixed_rv_9.txt"
    time_interval = 0.5

    position_errors, velocity_errors = read_and_process(file_path1, file_path2)
    plot_errors(position_errors, velocity_errors, time_interval)