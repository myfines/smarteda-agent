# PT100 V5：保护电路与真实 AVR 固件的分阶段验证

本例把 SmartEDA 原生模拟前端与开源数字验证连接起来。**未验证 SmartEDA 内的 MCU 固件执行，未宣称实时模拟/数字联合求解。** 平台中的稳定工程是带输入保护的模拟前端；数字系统在 AVR8js 中执行真实 AVR 机器指令。

## 已实现

- V4 的有限电源 Howland 激励、三线补偿、增益/偏置、RC 滤波和迟滞故障标志。
- 10kΩ ADC 串联限流、上下钳位、100nF 储能电容和 3.3V/1kΩ 预负载。
- ATmega328P 8MHz 固件：10 位 ADC、16 次均值、PT100 二次方程反算、故障优先、1602 LCD、9600 波特串口、心跳。
- ngspice 直流保护验证数据传入 AVR8js ADC 外设；测试按工况注入故障 GPIO。显示内容从固件 GPIO 总线解码，未用温度公式冒充 LCD 输出。
- 六项真实指令测试：100℃、180℃、短路、高阻、矛盾标志、恢复。

## 复现

仓库根目录先运行 `npm ci --ignore-scripts`，需要 Node.js 20.19 或更新版本。

```sh
node examples/pt100-v5/verify-avr.mjs
node examples/pt100-v5/serve.mjs
```

打开终端输出的本机网址。切换工况即可观察固件实际驱动的 LCD、ADC 和串口输出。服务只监听 127.0.0.1，只读取白名单文件。

重新编译需要开源 AVR GCC 工具链：

```sh
python examples/pt100-v5/compile.py --bin /path/to/avr/bin
python examples/pt100-v5/protection.py --exe /path/to/ngspice --output protection-results
```

Windows `--bin` 例：`C:\tools\avr\bin`。预编译 HEX 已包含，不必为了运行演示重新安装编译器。原构建使用 avr-gcc 7.3.0，程序 text=3358、data=148、bss=0 字节；CI 也会从 C 源码重新编译并运行。

## 接线

| 引脚            | 功能                             |
| --------------- | -------------------------------- |
| PC0 / ADC0      | 保护后的温度电压，AVCC/AREF=3.3V |
| PC1 / PC2 / PC3 | 低异常 / 高异常 / 超温输入       |
| PD2 / PD3       | LCD RS / E                       |
| PD4..PD7        | LCD D4..D7，RW 接地              |
| PD1             | UART TX，9600 8N1                |
| PB5             | 心跳，未接加热执行器             |

SmartEDA 原生端点使用 `PORTC0`、`PORTD2` 等完整名称，详见 skill 的 MCU 参考。原生模型内部标识与封装印字可能不同。

## 证据范围与工程边界

`pt100-v5-analog.circuit` 是可读原生模型；公开原生验收索引与私有交付截图分别记录平台运行。`protection.py` 用通用 Shockley 二极管模型复核保护；`avr-results.json` 是 AVR8js 的真实运行结果。外部保护模型不是具体料号或 ESD/浪涌认证。3.3V 必须已上电，未验证掉电反灌与实际 ADC 内部保护二极管。

10 位 ADC 量化使 100℃显示约99.90℃、180℃约179.97℃；小数位用于呈现数值，并不意味着0.01℃硬件精度。原 V4 的12位假设量化误差不能当作本 AVR 的误差。PT100、引线不匹配、电阻容差、运放失调和自热仍需纳入实物标定。

当前不提供 native MCU 成功加载或保存后自动恢复的保证。Program 字段可保存字符串、引脚数量匹配、仿真时钟前进，都不能单独证明固件执行；实验性 MCU 工程未作为正式平台成品交付。

开源依赖：[AVR8js](https://github.com/wokwi/avr8js)（MIT）、[ngspice](https://ngspice.sourceforge.io/)、AVR GCC / avr-libc。依赖保留各自许可证。本仓库原创适配代码使用 MIT。
