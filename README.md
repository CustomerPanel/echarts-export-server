# Apache ECharts HTTP Export Server

This is a Node.js-based service, and uses [node canvas](https://github.com/Automattic/node-canvas) to render [Apache ECharts](https://echarts.apache.org/) charts to images (PNG, JPG, SVG , PDF and Base64) to be sent back to the user.

## What

The export server is a Node.js-based service, which is easy to install and integrate on any system. It accepts either JSON-formatted chart options or SVGs, together with additional resources, and uses [node canvas](https://github.com/Automattic/node-canvas) to render [Apache ECharts](https://echarts.apache.org/) charts to images (PNG, JPG, SVG , PDF and Base64) to be sent back to the user.

The application can be used either as a CLI (Command Line Interface), as an HTTP server, or as a node.js module.

## Install

First, make sure you have node.js installed. Go to [nodejs.org](https://nodejs.org/en/download/) and download/install node for your platform.

The minimum version of Node.js required is **12.0.0**.

After node.js is installed, install the export server by opening a terminal and typing:

```shell
git clone https://github.com/xiaomaigou/echarts-export-server
cd echarts-export-server
npm install

# OR
# 项目依赖canvas，由于canvas 二进制文件默认通过github下载，可能下载较慢，通过npm参数指定该模块的二进制文件下载镜像地址
npm install --unsafe-perm --canvas_binary_host_mirror=https://registry.npmmirror.com/-/binary/canvas/

# Installation: Fedora and other RPM based distributions
# yum install gcc-c++ cairo-devel libjpeg-turbo-devel pango-devel giflib-devel
```

If you have any installation issues like node-gyp while canvas installation pelase check: https://github.com/Automattic/node-canvas/wiki

## Running

```shell
# Running as a daemon
npm start
npm stop
npm restart

# status
npm run status
npm run logs

# Running in the foreground, prints its logs to the standard output (stdout), and can be stopped by pressing Ctrl-C.
npm run foreground
# dev
npm run dev
```

## Command Line Arguments

**General options**

**Server related options**

- `--host`: The hostname to run the server on.
- `--port`: The port to listen for incoming requests on. Defaults to `3000`.

_`-` and `--` can be used interchangeably when using the CLI._

## HTTP Server

The server accepts the following arguments:

- `type`: The format: `png`, `jpeg`, `pdf`, `svg`. Mimetypes can also be used.Defaults to `png`.
- `width`: The chart width. Defaults to `600`.
- `height`: The chart height. Defaults to `400`.
- `base64`: Bool, set to true to get base64 back instead of binary.Defaults to `false`.
- `download`: Bool, set to true to send attachment headers on the response.Defaults to `false`.
- `option`: A JSON object with options to be passed to `ECharts.setOption(..)`.

It responds to `application/json`, `Mimetypes`, and URL encoded requests.

CORS is enabled for the server.

It's to run the server using [pm2](https://www.npmjs.com/package/pm2). Please refer to the pm2 documentation for details on how to set this up.

### System Requirements

The system requirements largely depend on your use case.

It's largely CPU and memory bound, so when using in heavy-traffic situations,
it needs a fairly beefy server. It's recommended that the server has at least 1GB
of memory regardless of traffic, and more than one core.

### Installing Fonts

Does your Linux server not have Arial or Calibri? ECharts uses the system installed fonts to render pages. Therefore the ECharts Export Server requires fonts to be properly installed on the system in order to use them to render charts.

Fonts are installed differently depending on your system. Please follow the below guides for font installation on most common systems.

#### OS X

Install your desired fonts with the Font Book app, or place it in /Library/Fonts/ (system) or ~/Library/Fonts/ (user)

#### Linux

Copy or move the TTF file to the `/usr/share/fonts/truetype` (may require sudo privileges):

```
mkdir -p /usr/share/fonts/truetype
cp yourFont.ttf /usr/share/fonts/truetype/
fc-cache -fv
```

#### Windows

Copy or move the TTF file to `C:\Windows\Fonts\`:

```
copy yourFont.ttf C:\Windows\Fonts\yourFont.ttf
```

### Google fonts

If you need Google Fonts in your custom installation, they can be had here:
https://github.com/google/fonts

Download them, and follow the above instructions for your OS.

### 中文乱码

直接将 Windows 的 C:\Windows\Fonts\msyh.ttc 文件(微软雅黑)拷贝到以下目录，重启生效。

```shell
mkdir -p /usr/share/fonts/truetype
cp msyh.ttf /usr/share/fonts/truetype/
```

## Server Example

### Request Parameter Format

```json
{
  "type": "png",
  "width": 600,
  "height": 400,
  "base64": false,
  "download": false,
  "option": {
    "backgroundColor": "#fff",
    "animation": false,
    "xAxis": {
      "type": "category",
      "data": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    },
    "yAxis": {
      "type": "value"
    },
    "series": [
      {
        "data": [820, 932, 901, 934, 1290, 1330, 1720],
        "type": "line",
        "label": {
          "show": true
        }
      }
    ]
  }
}
```

### GET Request

```html
http://localhost:3000/?config=%7B%22width%22%3A800%2C%22height%22%3A500%2C%22option%22%3A%7B%22backgroundColor%22%3A%22%23fff%22%2C%22xAxis%22%3A%7B%22type%22%3A%22category%22%2C%22data%22%3A%5B%22Mon%22%2C%22Tue%22%2C%22Wed%22%2C%22Thu%22%2C%22Fri%22%2C%22Sat%22%2C%22Sun%22%5D%7D%2C%22yAxis%22%3A%7B%22type%22%3A%22value%22%7D%2C%22series%22%3A%5B%7B%22data%22%3A%5B820%2C932%2C901%2C934%2C1290%2C1330%2C1320%5D%2C%22type%22%3A%22line%22%7D%5D%7D%7D
```

### POST Request

```sh
# Generate a chart and save it to chart.png
curl -H "Content-Type: application/json" \
-X POST localhost:3000 \
-o chart.png \
-d '{
  "type": "png",
  "width": 600,
  "height": 400,
  "base64": false,
  "download": false,
  "option": {
    "backgroundColor": "#fff",
    "animation": false,
    "xAxis": {
      "type": "category",
      "data": [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun"
      ]
    },
    "yAxis": {
      "type": "value"
    },
    "series": [
      {
        "data": [
          820,
          932,
          901,
          934,
          1290,
          1330,
          1720
        ],
        "type": "line",
        "label": {
          "show": true
        }
      }
    ]
  }
}'
```

### ECharts Java Client

It's recommended to create an `Option` object and its Json representation in chainable Java codes using [ECharts Java](https://github.com/ECharts-Java/ECharts-Java) . Please refer to the ECharts Java documentation for details on how to set this up.

```java
public static void main(String[] args) {
    // All methods in ECharts Java supports method chaining
    Bar bar = new Bar()
        .setLegend()
        .setTooltip("item")
        .addXAxis(new String[] { "Matcha Latte", "Milk Tea", "Cheese Cocoa", "Walnut Brownie" })
        .addYAxis()
        .addSeries("2015", new Number[] { 43.3, 83.1, 86.4, 72.4 })
        .addSeries("2016", new Number[] { 85.8, 73.4, 65.2, 53.9 })
        .addSeries("2017", new Number[] { 93.7, 55.1, 82.5, 39.1 });
    Engine engine = new Engine();
	// The renderJsonOption method will return a string, which represents an Option object in JSON format.
	String optionJsonString = engine.renderJsonOption(line);
    System.out.println(optionJsonString);
}
```

### Base64 Response Format

```json
{
  "code": 200,
  "msg": "success",
  "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA..."
}
```

## Reference

[Apache ECharts Server Side Rendering](https://echarts.apache.org/handbook/en/how-to/cross-platform/server/)

[Node canvas](https://github.com/Automattic/node-canvas)

[Highcharts Node.js Export Server](https://github.com/highcharts/node-export-server)

[PM2](https://www.npmjs.com/package/pm2)

[ECharts Java](https://github.com/ECharts-Java/ECharts-Java)

## License

[Apache License 2.0](LICENSE).
