let chartLibPromise
let chartLib

function loadChartLib() {
  if (!chartLibPromise) {
    chartLibPromise = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]).then(([core, charts, components, renderers]) => {
      core.use([
        charts.BarChart,
        components.GridComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
      ])

      chartLib = {
        init: core.init,
        LinearGradient: core.graphic.LinearGradient,
      }

      return chartLib
    })
  }

  return chartLibPromise
}

export async function createChart(element) {
  const lib = await loadChartLib()
  return lib.init(element)
}

export function createGradient(stops) {
  if (!chartLib) {
    throw new Error('Chart library has not been loaded yet.')
  }

  return new chartLib.LinearGradient(0, 0, 0, 1, stops)
}
