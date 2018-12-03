/*
	Run the action when we are sure the DOM has been loaded
	https://developer.mozilla.org/en-US/docs/Web/Events/DOMContentLoaded
	Example:
	whenDocumentLoaded(() => {
		console.log('loaded!');
		document.getElementById('some-element');
	});
	*/
function whenDocumentLoaded(action) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", action);
  } else {
    action();
  }
}

function updateData(map, path_to_data) {
  let data = [];
  d3.csv(path_to_data, function(csv) {
      let change_in_prod = parseFloat(csv.percent_change_in_production)
      if (isNaN(change_in_prod)) {
        change_in_prod = Number.MAX_VALUE
      }
      data.push({
        "min_lon": (+csv.min_lon),
        "max_lon": (+csv.max_lon),
        "min_lat": -(+csv.min_lat),
        "max_lat": -(+csv.max_lat),
        "ΔCalories": (+csv.ΔCalories),
        "percent_change_in_production": change_in_prod
      });
    })
    .then(() => {
      map.display_data(data)
    });
}

class Map {
  constructor() {
    this.width = window.innerWidth * (2 / 3);
    this.height = window.innerHeight * 0.95;
    this.projection = d3.geoMercator()
      .translate([this.width / 2, 5 * this.height / 8])
      .scale((this.width) / 2 / Math.PI);
    this.path = d3.geoPath()
      .projection(this.projection);
    this.svg = d3.select('#map').append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
    this.land = this.svg.append('g');
    this.circles = this.svg.append('g');
    this.boundaries = this.svg.append('g');
  }

  draw_legend(color_scale) {
    var xpos = window.innerWidth / 5;
    var ypos = window.innerHeight * 0.85;
    var svg = d3.select("svg");
    svg.append("g")
      .attr("class", "legendLinear")
      .attr("transform", "translate(" + xpos + "," + ypos + ")");

    var legendLinear = d3.legendColor()
      .shapeWidth(window.innerWidth / 37)
      .shapeHeight(window.innerWidth / 50)
      .title("Predicted percent change in calory production between 2000 and 2050 (%)")
      .orient('horizontal')
      .cells([-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100])
      .scale(color_scale);

    svg.select(".legendLinear")
      .call(legendLinear);
  }

  display_data(data) {
    const context = this;

    const colorScale = d3.scaleLinear()
      .domain([-100, 100])
      .range(['red', 'green'])
    colorScale.clamp(true)

    this.draw_legend(colorScale)


    let dataPoints = this.circles.selectAll('rect').data(data, d => d.min_lon.toString() + "," + d.min_lat.toString());

    dataPoints
      .enter().append('rect')
      .attr('x', d => context.projection([d.min_lon, d.min_lat])[0])
      .attr('y', d => context.projection([d.min_lon, d.min_lat])[1])
      .attr('width', d => context.projection([d.max_lon, d.max_lat])[0] - context.projection([d.min_lon, d.min_lat])[0])
      .attr('height', d => context.projection([d.max_lon, d.max_lat])[1] - context.projection([d.min_lon, d.min_lat])[1])
      .style('fill', d => colorScale(d.percent_change_in_production))
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    dataPoints
      .attr('x', d => context.projection([d.min_lon, d.min_lat])[0])
      .attr('y', d => context.projection([d.min_lon, d.min_lat])[1])
      .attr('width', d => context.projection([d.max_lon, d.max_lat])[0] - context.projection([d.min_lon, d.min_lat])[0])
      .attr('height', d => context.projection([d.max_lon, d.max_lat])[1] - context.projection([d.min_lon, d.min_lat])[1])
      .style('fill', d => colorScale(d.percent_change_in_production));

    dataPoints
      .exit()
      .transition()
      .duration(1000)
      .attr('opacity', 0)
      .remove();
  }

}

function draw_charts(ssp_type) {
  draw_barchart_by_continent(ssp_type, 'Percentageoftotalcal2050', "#chart1", "Share of calorie production (%)")
  draw_barchart_by_continent(ssp_type, 'diffCalories', "#chart2", "Variation in calorie production (%)")
  draw_barchart_by_continent(ssp_type, 'Sufficiency2050', "#chart3", "Sufficiency (%)")
}

function draw_barchart_by_continent(ssp_type, yvalues, chartdiv, ylabel) {
  var chart = dc.barChart(chartdiv);
  d3.csv("data/graph/graph_continent_data_ssp" + ssp_type + ".csv").then(function(continents) {
    continents.forEach(function(x) {
      x[yvalues] = +x[yvalues];
    });

    var ndx = crossfilter(continents),
      xaxis = ndx.dimension(function(d) {
        return d.continent;
      }),
      yaxis = xaxis
      .group().reduceSum(function(d) {
        return d[yvalues];
      });
    chart
      .width(window.innerWidth / 3.5)
      .height(window.innerHeight / 4.5)
      .x(d3.scaleBand())
      .xUnits(dc.units.ordinal)
      .brushOn(false)
      .xAxisLabel("Continent")
      .yAxisLabel(ylabel)
      .dimension(xaxis)
      .group(yaxis)
      .on('renderlet', function(chart) {
        chart.selectAll('rect').on("click", function(d) {
          console.log("click!", d);
        });
      });
    chart.yAxis().tickFormat(d3.format('.2s'));
    chart.margins().left = 50;
    chart.render();
  });
}




whenDocumentLoaded(() => {

  const map = new Map();
  const background = d3.json('https://unpkg.com/world-atlas@1.1.4/world/110m.json');
  const reset = d3.select('#reset_button');
  const ssp1 = d3.select('#ssp1');
  const ssp2 = d3.select('#ssp2');
  const ssp3 = d3.select('#ssp3');
  const ssp4 = d3.select('#ssp4');
  const ssp5 = d3.select('#ssp5');

  let data = [];

  d3.csv("data/2050/SSP1/SSP1__World.csv", function(csv) {
      let change_in_prod = parseFloat(csv.percent_change_in_production)
      if (isNaN(change_in_prod)) {
        change_in_prod = Number.MAX_VALUE
      }

      data.push({
        "min_lon": (+csv.min_lon),
        "max_lon": (+csv.max_lon),
        "min_lat": -(+csv.min_lat),
        "max_lat": -(+csv.max_lat),
        "ΔCalories": (+csv.ΔCalories),
        "percent_change_in_production": change_in_prod
      });
    })
    .then(() => {
      background.then(world => {
        map.land.append('path')
          .datum(topojson.merge(world, world.objects.countries.geometries))
          .attr('class', 'land')
          .attr('d', map.path);

        map.boundaries.append('path')
          .datum(topojson.mesh(world, world.objects.countries))
          .attr('class', 'boundary')
          .attr('d', map.path);
      });

      map.display_data(data)

      draw_charts('1')


    });

  function zoomed() {
    map.land
      .selectAll('path') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);

    map.boundaries
      .selectAll('path') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);

    map.circles
      .selectAll('rect') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);
  }

  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .on('zoom', zoomed);

  map.svg.call(zoom);

  reset.on("click", function(d, i) {
    //map.display(data, initialBounds)
    map.svg.transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity);
  });

  ssp1.on("click", function(d, i) {
    draw_charts('1')
    updateData(map, "data/2050/SSP1/SSP1__World.csv");
  })

  ssp2.on("click", function(d, i) {
    draw_charts('2')
    updateData(map, "data/2050/SSP2/SSP2__World.csv");
  })

  ssp3.on("click", function(d, i) {
    draw_charts('3')
    updateData(map, "data/2050/SSP3/SSP3__World.csv");
  })

  ssp4.on("click", function(d, i) {
    draw_charts('4')
    updateData(map, "data/2050/SSP4/SSP4__World.csv");
  })

  ssp5.on("click", function(d, i) {
    draw_charts('5')
    updateData(map, "data/2050/SSP5/SSP5__World.csv");
  })

});
