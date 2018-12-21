
function whenDocumentLoaded(action) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", action);
  } else {
    action();
  }
}

var controller = new ScrollMagic.Controller({
  globalSceneOptions: {
    triggerHook: 'onLeave'
  }
});






function add_strories(map) {

  var story = document.getElementById("story1");
  new ScrollMagic.Scene({
      triggerElement: story
    })
    .addIndicators() // add indicators (requires plugin)
    .addTo(controller)
    .on("enter leave", function(e) {
      let map_div = document.getElementById("map");
      if (e.type == "enter") {
        map_div.style.top = "0px";
        map_div.style.position = "fixed";

      } else {
        map_div.style.position = "relative";
      }
    });

  story = document.getElementById("story2");
  new ScrollMagic.Scene({
      triggerElement: story
    })
    .addIndicators() // add indicators (requires plugin)
    .addTo(controller)
    .on("enter leave", function(e) {
      if (e.type == "enter") {
        continent = "Africa"
        updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + continent +".csv", continent, 'Continent', map.climate_scenario)
      } else {
        updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + "World" + ".csv", "World", "World", map.climate_scenario)
      }
    });

    story = document.getElementById("story3");
    new ScrollMagic.Scene({
        triggerElement: story
      })
      .addIndicators() // add indicators (requires plugin)
      .addTo(controller)
      .on("enter leave", function(e) {
        if (e.type == "enter") {
          updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + "Nigeria" + ".csv", "Nigeria", "Country", map.climate_scenario)

        } else {
          updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + continent +".csv", continent, 'Continent', map.climate_scenario)
        }
      });

    var slides = document.querySelectorAll(".spacer");
    // create scene for every slide
    for (var i = 0; i < slides.length; i++) {
      new ScrollMagic.Scene({
          triggerElement: slides[i]
        })
        .addIndicators() // add indicators (requires plugin)
        .addTo(controller);
    }
}

function draw_barchart_by_continent(ssp_type, yvalues, chartdiv, ylabel, size, short_labels) {
  let chart = dc.barChart(chartdiv);
  d3.csv("../data/graph/graph_continent_data_" + ssp_type.toLowerCase() + ".csv").then(function(continents) {
    continents.forEach(function(x) {
      x[yvalues] = +x[yvalues];
    });

    let ndx = crossfilter(continents),
      xaxis = ndx.dimension(function(d) {
        var split = d.continent.split(' ');
        if (split.length > 1 && short_labels) {
          return split[0].substring(0,1) + '. ' +split[1].substring(0,1) + '. ';
        }
        return d.continent;
      }),
      yaxis = xaxis
      .group().reduceSum(function(d) {
        return d[yvalues];
      });
    chart
      .width(window.innerWidth / 3.5 * size)
      .height(window.innerHeight / 5)
      .x(d3.scaleBand())
      .xUnits(dc.units.ordinal)
      .colors(d3.scaleOrdinal().domain(["positive", "negative"])
        .range(["green", "red"]))
      .colorAccessor(function(d) {
        if (d.value > 0) {
          return "positive";
        }
        return "negative";
      })
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

function updateData(map, path_to_data, region, region_type, climate_scenario) {
  draw_barchart_by_continent(climate_scenario, 'diffCalories', "#chart2", "Variation (%)", 1, false)
  let data = []
  d3.csv(path_to_data, function(csv) {

      let population = csv['Population 2050']
      let requirement = population * 365 * 2355000
      let calories = csv['Calories 2050']
      let sufficiency = 100
      if (requirement > 0) {
        sufficiency = 100 * calories / requirement
      }

      let change_in_prod = parseFloat(csv.percent_change_in_production)
      if (isNaN(change_in_prod)) {
        change_in_prod = Number.MAX_VALUE
      }
      data.push({
        "min_lon": (+csv.min_lon),
        "max_lon": (+csv.max_lon),
        "min_lat": -(+csv.min_lat),
        "max_lat": -(+csv.max_lat),
        "sufficiency": sufficiency,
        "percent_change_in_production": change_in_prod
      });
    })
    .then(() => {
      map.display_data(data, region, region_type, climate_scenario)
    });
}

class Map {
  constructor() {
    this.width = window.innerWidth * 0.66;
    this.height = window.innerHeight;
    this.projection = d3.geoWinkel3()
      .translate([4 * this.width / 9, this.height / 1.8])
      .scale((this.width) / 5);
    this.path = d3.geoPath()
      .projection(this.projection);
    this.svg = d3.select('#map').select('svg')
      .attr('width', this.width)
      .attr('height', this.height);
    this.land = this.svg.select('#container').append('g');
    this.circles = this.svg.select('#container').append('g');
    this.boundaries = this.svg.select('#container').append('g');
    this.transform = d3.zoomIdentity
    this.climate_scenario = 'SSP1'
    this.region = 'World'
    this.region_type = 'Global'
    this.metric = 'Variation'

    this.main_data = []

    this.predefined_zoom_levels = {
      'World': {
        'x': 0,
        'y': 0,
        'k': 1
      },
      'Europe': {
        'x': -4.009 * this.projection([15.36, 49.194])[0] + this.width / 2,
        'y': -4.009 * this.projection([15.36, 49.194])[1] + this.height / 2,
        'k': 4.009
      },
      'Africa': {
        'x': -1.496 * this.projection([19.25, 0.442])[0] + this.width / 2,
        'y': -1.496 * this.projection([19.25, 0.442])[1] + this.height / 2,
        'k': 1.496
      },
      'Asia': {
        'x': -1.604 * this.projection([78.76, 25.003])[0] + this.width / 2,
        'y': -1.604 * this.projection([78.76, 25.003])[1] + this.height / 2,
        'k': 1.604
      },
      'North America': {
        'x': -2.076 * this.projection([-78.23, 32.262])[0] + this.width / 2,
        'y': -2.076 * this.projection([-78.23, 32.262])[1] + this.height / 2,
        'k': 2.076
      },
      'South America': {
        'x': -1.782 * this.projection([-62.76, -20.891])[0] + this.width / 2,
        'y': -1.782 * this.projection([-62.76, -20.891])[1] + this.height / 2,
        'k': 1.782
      },
      'Oceania': {
        'x': -2.649 * this.projection([147.18, -25.378])[0] + this.width / 2,
        'y': -2.649 * this.projection([147.18, -25.378])[1] + this.height / 2,
        'k': 2.649
      }
    }
  }

  get_legend(metric, color_scale) {
    if (metric == 'Variation') {
      let legendLinear = d3.legendColor()
        .shapeWidth(window.innerWidth / 37)
        .shapeHeight(window.innerWidth / 50)
        .title("Predicted percent change in calory production between 2000 and 2050 (%)")
        .orient('horizontal')
        .cells([-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100])
        .scale(color_scale);

      return legendLinear;
    } else {
      let legendLinear = d3.legendColor()
        .shapeWidth(window.innerWidth / 37)
        .shapeHeight(window.innerWidth / 50)
        .title("Predicted percent change in calory production between 2000 and 2050 (%)")
        .orient('horizontal')
        .cells([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        .scale(color_scale);

      return legendLinear;
    }
  }

  draw_legend(metric, color_scale) {
    let xpos = window.innerWidth / 5;
    let ypos = window.innerHeight * 0.85;
    let svg = d3.select("svg");

    svg.selectAll(".legendLinear").remove()

    svg.append("g")
      .attr("class", "legendLinear")
      .attr("transform", "translate(" + xpos + "," + ypos + ")")


    let legendLinear = this.get_legend(metric, color_scale)

    svg.select(".legendLinear")
      .call(legendLinear);
  }

  display_data(data, region, region_type, climate_scenario) {
    this.main_data = data

    const context = this;

    const colorScale = this.get_color_scale(this.metric)

    this.draw_legend(this.metric, colorScale)

    let dataPoints = this.circles.selectAll('polygon').data(data, d => d.min_lon.toString() + "," + d.min_lat.toString());

    if ((region_type == 'Continent' || region_type == 'Global') && (region_type != this.region_type || region != this.region)) {
      let zoom_level = this.predefined_zoom_levels[region]
      this.zoom_on_continent(zoom_level['x'], zoom_level['y'], zoom_level['k'])

      this.land
        .selectAll('path') // To prevent stroke width from scaling
        .transition()
        .duration(1000)
        .attr('transform', this.transform);

      this.boundaries
        .selectAll('path') // To prevent stroke width from scaling
        .transition()
        .duration(1000)
        .attr('transform', this.transform);
    }

    this.region = region
    this.region_type = region_type
    this.climate_scenario = climate_scenario

    dataPoints
      .enter().append('polygon')
      .attr('points', d => context.projection([d.min_lon, d.min_lat])[0] + ',' + context.projection([d.min_lon, d.min_lat])[1] + ' ' +
        context.projection([d.min_lon, d.max_lat])[0] + ',' + context.projection([d.min_lon, d.max_lat])[1] + ' ' +
        context.projection([d.max_lon, d.max_lat])[0] + ',' + context.projection([d.max_lon, d.max_lat])[1] + ' ' +
        context.projection([d.max_lon, d.min_lat])[0] + ',' + context.projection([d.max_lon, d.min_lat])[1])
      .style('fill', d => { if (this.metric == 'Variation') { return colorScale(d.percent_change_in_production) } else { return colorScale(d.sufficiency) } })
      .attr('transform', context.transform)
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    dataPoints
      .transition()
      .duration(1000)
      .attr('points', d => context.projection([d.min_lon, d.min_lat])[0] + ',' + context.projection([d.min_lon, d.min_lat])[1] + ' ' +
        context.projection([d.min_lon, d.max_lat])[0] + ',' + context.projection([d.min_lon, d.max_lat])[1] + ' ' +
        context.projection([d.max_lon, d.max_lat])[0] + ',' + context.projection([d.max_lon, d.max_lat])[1] + ' ' +
        context.projection([d.max_lon, d.min_lat])[0] + ',' + context.projection([d.max_lon, d.min_lat])[1])
      .attr('transform', context.transform)
      .style('fill', d => { if (this.metric == 'Variation') { return colorScale(d.percent_change_in_production) } else { return colorScale(d.sufficiency) } });

    dataPoints
      .exit()
      .transition()
      .duration(1000)
      .attr('opacity', 0)
      .remove();
  }

  get_color_scale(metric) {
    if (metric == 'Variation') {
      const colorScale = d3.scaleLinear()
        .domain([-100, 0, 100])
        .range(['red', 'yellow', 'green'])
      colorScale.clamp(true)

      return colorScale;
    }
    else {
      const colorScale = d3.scaleLinear()
        .domain([0, 50, 100])
        .range(['#F7D708', '#9CCF31', '#009ECE'])
      colorScale.clamp(true)

      return colorScale;
    }
  }

  change_displayed_metric(metric) {
    if (metric != this.metric) {
      this.metric = metric

      const colorScale = this.get_color_scale(metric)

      let dataPoints = this.circles.selectAll('polygon').data(this.main_data, d => d.min_lon.toString() + "," + d.min_lat.toString());

      dataPoints
        .transition()
        .duration(1000)
        .style('fill', d => { if (metric == 'Variation') { return colorScale(d.percent_change_in_production) } else { return colorScale(d.sufficiency) } });
    }
  }

  zoom_on_continent(x, y, k) {
    this.transform.x = x
    this.transform.y = y
    this.transform.k = k
  }
}

whenDocumentLoaded(() => {
  const map = new Map();

  add_strories(map);
  const background = d3.json('https://unpkg.com/world-atlas@1.1.4/world/110m.json');

  let data = [];

  d3.csv("data/2050/SSP1/SSP1_World.csv", function(csv) {

      let population = csv['Population 2050']
      let requirement = population * 365 * 2355000
      let calories = csv['Calories 2050']
      let sufficiency = 100
      if (requirement > 0) {
        sufficiency = 100 * calories / requirement
      }

      let change_in_prod = parseFloat(csv.percent_change_in_production)
      if (isNaN(change_in_prod)) {
        change_in_prod = Number.MAX_VALUE
      }

      data.push({
        "min_lon": (+csv.min_lon),
        "max_lon": (+csv.max_lon),
        "min_lat": -(+csv.min_lat),
        "max_lat": -(+csv.max_lat),
        "sufficiency": sufficiency,
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

      map.display_data(data, 'World', 'Global', 'SSP1')
    });

});
