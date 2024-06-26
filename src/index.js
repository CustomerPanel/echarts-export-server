var http = require('http')
var url = require('url')
var fs = require('fs')
var ejs = require('ejs')
var echarts = require('echarts')
const { createCanvas } = require('canvas')
const nodeHtmlToImage = require('node-html-to-image')
const args = process.argv
const styles = fs.readFileSync('src/chartTemplateStyles.css', 'utf-8')

const mime = {
	'image/png': 'png',
	'image/jpeg': 'jpeg',
	'image/gif': 'gif',
	'application/pdf': 'pdf',
	'image/svg+xml': 'svg',
}

const mimeReverse = {
	png: 'image/png',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	pdf: 'application/pdf',
	svg: 'image/svg+xml',
}

let chartData = {}

const port = args.port || 3001

echarts.setPlatformAPI({
	// Same with the old setCanvasCreator
	createCanvas() {
		return createCanvas()
	},
})

function processConfig(request, response, callback) {
	if (typeof callback !== 'function') {
		return null
	}
	if (request.method === 'GET') {
		// Parse url parameters
		let params = url.parse(request.url, true).query
		if (!params.config) {
			response.end(
				JSON.stringify({
					code: 400,
					msg: 'request parameter "config" invalid!',
					data: null,
				})
			)
			return
		}
		request.config = params.config
		callback()
	} else {
		// Parse the body parameter
		let body = ''
		request.on('data', function (chunk) {
			body += chunk
			if (body.length > 1e6) {
				response.end(
					JSON.stringify({
						code: 400,
						msg: 'request body too large!',
						data: null,
					})
				)
			}
		})
		request.on('end', function () {
			request.config = body
			callback()
		})
	}
}

function setChartOptions(props) {
	chartData.xAxis = props.xAxis.data
	chartData.legendData =
		props.legend && props.legend.data ? props.legend.data : null
	const newSeries = props.series.filter((serie) => serie.selected == true)

	return {
		backgroundColor: '#fff',
		animation: false,
		legend: chartData.legendData
			? {
					bottom: '0',
					type: 'scroll',
					textStyle: {
						fontSize: 10,
					},
					show: true,
					data: chartData.legendData,
					selectedMode: false,
			  }
			: null,
		xAxis: {
			type: 'category',
			data: chartData.xAxis,
		},
		yAxis: {
			type: 'value',
		},
		series: newSeries,
	}
}

function renderChart(config) {
	let result
	const canvas = createCanvas(
		config.width ? config.width : 600,
		config.height ? config.height : 400
	)
	const chart = echarts.init(canvas)

	const optionsReceived = config.option ? config.option : config

	const chartOptions = setChartOptions(optionsReceived)

	// chart.setOption(config.option);
	chart.setOption(chartOptions)

	if (config.base64 ? config.base64 : false) {
		const base64 = canvas.toDataURL(
			config.formatType ? config.formatType : 'png'
		)
		//  const base64=chart.getDataURL();
		result = JSON.stringify({
			code: 200,
			msg: 'success',
			data: base64,
		})
	} else {
		result = canvas.toBuffer(config.formatType ? config.formatType : 'png')
	}
	chart.dispose()

	return result
}

//////////////////

const chartTemplate = fs.readFileSync('src/chartTemplate.ejs', 'utf-8')

http
	.createServer(function (req, res) {
		res.setHeader('Access-Control-Allow-Origin', '*')
		res.setHeader('Content-Type', 'application/json;charset=UTF-8')

		const parsedUrl = url.parse(req.url, true)
		const path = parsedUrl.pathname

		if (path === '/getChartImage') {
			processConfig(req, res, function () {
				let config
				try {
					config = JSON.parse(req.config)
				} catch (e) {
					res.end(
						JSON.stringify({
							code: 400,
							msg: 'request parameter "config" format invalid, is not JSON!',
							data: null,
						})
					)
					return
				}

				// width: The chart width
				config.width = config.width || 600
				// height: The chart height
				config.height = config.height || 400
				// type: The format: png, jpeg, pdf, svg.
				config.type = config.type || 'png'
				config.formatType = 'image/png'
				config.contentType = 'image/png'
				// base64: Bool, set to true to get base64 back instead of binary.
				config.base64 = config.base64 === true
				// download: Bool, set to true to send attachment headers on the response.
				config.download = config.download === true
				switch (config.type) {
					case 'png':
						config.formatType = 'image/png'
						config.contentType = 'image/png'
						break
					case 'jpeg':
						config.formatType = 'image/jpeg'
						config.contentType = 'image/jpeg'
						break
					case 'svg':
					case 'pdf':
					default:
						config.formatType = 'image/png'
						config.contentType = 'image/png'
						config.type = 'png'
				}

				if (config.base64) {
					config.contentType = 'application/json;charset=UTF-8'
				}
				// "Content-Type": "image/png"
				// "Content-Type": "image/jpeg"
				// "Content-Type": "application/json;charset=UTF-8"
				res.setHeader('Content-Type', config.contentType)
				if (config.download ? config.download : false) {
					res.setHeader(
						'Content-Disposition',
						'attachment; filename="chart.' + config.type + '"'
					)
				}

				let result
				try {
					result = renderChart(config)
				} catch (e) {
					console.error('Error: Canvas rendering failed!' + e.message)
					res.setHeader('Content-Type', 'application/json;charset=UTF-8')
					result = JSON.stringify({
						code: 500,
						msg: 'Error: Canvas rendering failed! The content of the request parameter "option" may be invalid!',
						data: config.option,
					})
				}
				res.write(result)
				res.end()
			})
		} else if (path === '/getDashboardImage') {
			processConfig(req, res, function () {
				const dashboardData = JSON.parse(req.config)
				const series = dashboardData.series
				const renderedHtml = ejs.render(chartTemplate, {
					styles,
					series,
				})

				try {
					nodeHtmlToImage({
						output: './image.png',
						html: '<html><body>' + renderedHtml + '</body></html>',
						puppeteerArgs: {args: ['--no-sandbox']}
					}).then(() => {
						// Read the image file
						fs.readFile('./image.png', function (err, data) {
							if (err) {
								console.error('Error reading file: ' + err.message)
								res.status(500).end()
							} else {
								// Send the image content in the response
								res.writeHead(200, { 'Content-Type': 'image/png' })
								res.end(data)
								console.log('The image was created and sent successfully!')
							}
						})
					})
				} catch (e) {
					console.error('Error: ' + e.message)
					res.status(500).end()
				}
			})
		}
	})
	.listen(port, function () {
		console.log('Server is started at port ' + port + ' ...')
	})
