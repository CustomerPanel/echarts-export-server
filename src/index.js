require('../instrument')

var http = require('http')
var url = require('url')
var fs = require('fs')
var ejs = require('ejs')
var echarts = require('echarts')
const { createCanvas } = require('canvas')
const nodeHtmlToImage = require('node-html-to-image')
const args = process.argv
const styles = fs.readFileSync('src/chartTemplateStyles.css', 'utf-8')
const { format, parseISO } = require('date-fns')

let chartData = {}

const port = args.port || 3001

echarts.setPlatformAPI({
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
	const groupByDate = props.groupByDate || null
	chartData.xAxis = formatXAxisData(props.xAxis.data, groupByDate)
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
			axisLabel: {
				formatter: function (value) {
					return numbersFormatterForChart(value, props.series[0].format)
				},
			},
		},
		series: newSeries,
	}
}
function formatNumber(num, divisor, suffix) {
	const divided = num / divisor
	let decimalPlaces = 0

	if (divided % 1 !== 0) {
		decimalPlaces = (divided * 10) % 1 === 0 ? 1 : 2
	}

	return divided.toFixed(decimalPlaces) + suffix
}

function numbersFormatterForChart(value, format) {
	if (!format) {
		return `${value}`
	}

	const num = Number(value)

	let formattedValue
	if (Math.abs(num) >= 1_000_000_000) {
		formattedValue = formatNumber(num, 1_000_000_000, 'B')
	} else if (Math.abs(num) >= 1_000_000) {
		formattedValue = formatNumber(num, 1_000_000, 'M')
	} else if (Math.abs(num) >= 1_000) {
		formattedValue = formatNumber(num, 1_000, 'k')
	} else {
		formattedValue =
			num % 1 === 0 ? num.toString() : num.toFixed(format.precision)
	}

	const parts = formattedValue.split('.')
	const integerPart = parts[0]
	const decimalPart = parts[1]

	const integerWithSeparator = integerPart.replace(
		/\B(?=(\d{3})+(?!\d))/g,
		format.separator
	)

	if (decimalPart) {
		return `${format.prefix}${integerWithSeparator}${format.decimal}${decimalPart}${format.suffix}`
	} else {
		return `${format.prefix}${integerWithSeparator}${format.suffix}`
	}
}

function numbersFormatter(value, format) {
	if (!format) {
		return `${value}`
	}
	const num = Number(value)
	const formattedValue = num.toFixed(format.precision).toString()
	const parts = formattedValue.split('.')
	const integerPart = parts[0]
	const decimalPart = parts[1]

	const integerWithSeparator = integerPart.replace(
		/\B(?=(\d{3})+(?!\d))/g,
		format.separator
	)
	if (decimalPart) {
		return `${format.prefix}${integerWithSeparator}${format.decimal}${decimalPart}${format.suffix}`
	} else {
		return `${format.prefix}${integerWithSeparator}`
	}
}

function renderChart(config) {
	const canvas = createCanvas(
		config.width ? config.width : 600,
		config.height ? config.height : 400
	)
	const chart = echarts.init(canvas)

	const optionsReceived = config.option ? config.option : config
	const chartOptions = setChartOptions(optionsReceived)
	chart.setOption(chartOptions)

	let result
	if (config.base64 ? config.base64 : false) {
		const base64 = canvas.toDataURL(
			config.formatType ? config.formatType : 'png'
		)
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

function formatXAxisData(datesString, groupByDate) {
	let newXAxisData = []
	if (datesString.length > 0) {
		if (groupByDate === 'monthly') {
			newXAxisData = datesString.map((dateString) => {
				const date = parseISO(dateString)
				const formattedDate = format(date, 'MMM yyyy')
				return formattedDate
			})
		} else if (groupByDate === 'yearly') {
			newXAxisData = datesString.map((dateString) => {
				const date = parseISO(dateString)
				const formattedDate = format(date, 'yyyy')
				return formattedDate
			})
		} else {
			newXAxisData = datesString.map((dateString) => {
				const date = parseISO(dateString)
				const formattedDate = format(date, 'MM-dd-yyyy')
				return formattedDate
			})
		}
	}

	return newXAxisData
}

function formatSeries(series) {
	const newSeries = series.map((serie, index) => {
		const newSerie = {
			...serie,
			lineStyle: {
				width: 2,
			},
			label: {
				position: serie?.label.position,
				show: true,
				color: serie?.trends[index] > 0 ? 'green' : 'red',
				align: 'center',

				formatter: function (params) {
					const dataIndex = params.dataIndex
					const trendValue = parseFloat(serie?.trends[dataIndex].toFixed(2))
					return trendValue > 0
						? `{a|+${trendValue}%}`
						: trendValue < 0
						? `{b|${trendValue}%}`
						: `{c|${trendValue}%}`
				},
				rich: {
					a: {
						color: serie.invertGrowthColors ? 'red' : 'green',
					},
					b: {
						color: serie.invertGrowthColors ? 'green' : 'red',
					},
					c: { color: 'black' },
				},
			},
		}
		return newSerie
	})
	return newSeries
}
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
					if (config.growthRate) {
						const newSeries = formatSeries(config.series)
						config.series = newSeries
					}
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

				const formattedSeries = []
				config.series.forEach((serie) => {
					if (!config.showOnlyCompletedPeriods) {
						const solidData = Array.isArray(serie?.data) ? [...serie.data] : []
						const dashedData = new Array(solidData.length).fill(null)

						if (serie.type === 'line') {
							dashedData[dashedData.length - 2] =
								solidData[dashedData.length - 2]
							dashedData[dashedData.length - 1] =
								solidData[dashedData.length - 1]
							solidData[solidData.length - 1] = NaN
							formattedSeries.push({
								...serie,

								data: solidData,
								lineStyle: { ...serie.lineStyle, type: 'solid' },
							})
							formattedSeries.push({
								...serie,

								data: dashedData,
								lineStyle: { ...serie.lineStyle, type: 'dashed' },
								itemStyle: { ...serie.itemStyle, opacity: 0.5 },
							})
						} else {
							dashedData[dashedData.length - 1] =
								solidData[dashedData.length - 1]
							solidData[solidData.length - 1] = NaN

							formattedSeries.push({
								...serie,
								data: solidData,
								lineStyle: { ...serie.lineStyle, type: 'solid' },
								stack: serie.name,
							})

							formattedSeries.push({
								...serie,
								data: dashedData,
								stack: serie.name,
								lineStyle: { ...serie.lineStyle, type: 'solid' },
								itemStyle: { ...serie.itemStyle, opacity: 0.5 },
							})
						}
					} else {
						formattedSeries.push(serie)
					}
				})

				config.series = formattedSeries
				config.width = config.width || 600
				config.height = config.height || 400
				config.type = config.type || 'png'
				config.formatType = 'image/png'
				config.contentType = 'image/png'
				config.base64 = config.base64 === true
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
				res.setHeader('Content-Type', config.contentType)
				if (config.download ? config.download : false) {
					res.setHeader(
						'Content-Disposition',
						'attachment; filename="chart.' + config.type + '"'
					)
				}
				let result
				try {
					config.xAxis[0] = {
						...config.xAxis[0],
						axisLabel: {
							formatter: function (value) {
								return formatXAxisData(value, config.groupByDate)
							},
						},
					}
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
				let series = dashboardData.series

				series.forEach((serie, index) => {
					serie.metricOrEvents.forEach((metric, indexMetric) => {
						if (metric.format.suffix === '%') {
							metric.last_value = metric.last_value / 100
						}
						let newLastValue = numbersFormatter(
							metric.last_value,
							metric.format
						)
						series[index].metricOrEvents[indexMetric].last_value = newLastValue
					})
				})

				const renderedHtml = ejs.render(chartTemplate, {
					styles,
					series,
				})
				try {
					nodeHtmlToImage({
						output: './image.png',
						html: '<html><body>' + renderedHtml + '</body></html>',
						puppeteerArgs: { args: ['--no-sandbox'] },
					}).then(() => {
						fs.readFile('./image.png', function (err, data) {
							if (err) {
								console.error('Error reading file: ' + err.message)
								res.status(500).end()
							} else {
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
