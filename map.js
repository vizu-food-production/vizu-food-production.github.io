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

var controller = new ScrollMagic.Controller({
  globalSceneOptions: {
    triggerHook: 'onLeave'
  }
});








function add_strories(map) {
  // get all slides
  var slides = document.querySelectorAll("section.panel");

  var story = document.getElementById("story1");
  console.log(story)
  new ScrollMagic.Scene({
      triggerElement: story
    })
    .setPin(story)
    .addIndicators() // add indicators (requires plugin)
    .addTo(controller)
    .on("enter leave", function(e) {
      let image_size = document.getElementById("image").style.height;
      console.log(image_size);
      let map_div = document.getElementById("map");
      if (e.type == "enter") {
        console.log('now');
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
    .setPin(story)
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
      .setPin(story)
      .addIndicators() // add indicators (requires plugin)
      .addTo(controller)
      .on("enter leave", function(e) {
        if (e.type == "enter") {
          updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + "Nigeria" + ".csv", "Nigeria", "Country", map.climate_scenario)

        } else {
          updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + continent +".csv", continent, 'Continent', map.climate_scenario)
        }
      });

    var slides = document.querySelectorAll("section.panel");
    // create scene for every slide
    for (var i = 0; i < slides.length; i++) {
      new ScrollMagic.Scene({
          triggerElement: slides[i]
        })
        .setPin(slides[i])
        .addIndicators() // add indicators (requires plugin)
        .addTo(controller);
    }
}


function updateData(map, path_to_data, region, region_type, climate_scenario) {
  let data = []
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
      map.display_data(data, region, region_type, climate_scenario)
    });
}

function updateBothData(map, path_to_data, path_to_compare_data, region, compare_region, region_type, climate_scenario) {
  let data = []
  let compare_data = []
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
      if (compare_region != 'None') {
        d3.csv(path_to_compare_data, function(csv) {
            let change_in_prod = parseFloat(csv.percent_change_in_production)
            if (isNaN(change_in_prod)) {
              change_in_prod = Number.MAX_VALUE
            }
            compare_data.push({
              "min_lon": (+csv.min_lon),
              "max_lon": (+csv.max_lon),
              "min_lat": -(+csv.min_lat),
              "max_lat": -(+csv.max_lat),
              "ΔCalories": (+csv.ΔCalories),
              "percent_change_in_production": change_in_prod
            });
          })
          .then(() => {
            map.display_both_regions(data, compare_data, region, compare_region, region_type, climate_scenario)
          });
      } else {
        map.display_both_regions(data, [], region, compare_region, region_type, climate_scenario)
      }
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

    this.compare_mode = false
    this.compare_region = 'None'

    this.main_data = []
    this.compare_data = []

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

  draw_legend(color_scale) {
    let xpos = window.innerWidth / 5;
    let ypos = window.innerHeight * 0.85;
    let svg = d3.select("svg");

    svg.selectAll(".legendLinear").remove()

    svg.append("g")
      .attr("class", "legendLinear")
      .attr("transform", "translate(" + xpos + "," + ypos + ")")

    let legendLinear = d3.legendColor()
      .shapeWidth(window.innerWidth / 37)
      .shapeHeight(window.innerWidth / 50)
      .title("Predicted percent change in calory production between 2000 and 2050 (%)")
      .orient('horizontal')
      .cells([-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100])
      .scale(color_scale);

    svg.select(".legendLinear")
      .call(legendLinear);
  }

  display_data(data, region, region_type, climate_scenario) {
    if (this.compare_mode) {
      this.compare_data = data
    } else {
      this.main_data = data
    }

    const context = this;

    const colorScale = d3.scaleLinear()
      .domain([-100, 0, 100])
      .range(['red', 'yellow', 'green'])
    colorScale.clamp(true)

    this.draw_legend(colorScale)

    if (this.compare_mode && this.region != 'None') {
      if (region != this.region) {
        this.compare_region = region
        draw_compare_charts(climate_scenario, this.region, this.compare_region, region_type)

        let mainDataPoints = this.circles.selectAll('polygon').data(this.main_data, d => d.min_lon.toString() + "," + d.min_lat.toString());
        let compareDataPoints = this.circles.selectAll('polygon').data(data, d => d.min_lon.toString() + "," + d.min_lat.toString());

        mainDataPoints
          .exit()
          .transition()
          .duration(1000)
          .attr('opacity', 0)
          .remove();

        compareDataPoints
          .enter().append('polygon')
          .attr('points', d => context.projection([d.min_lon, d.min_lat])[0] + ',' + context.projection([d.min_lon, d.min_lat])[1] + ' ' +
            context.projection([d.min_lon, d.max_lat])[0] + ',' + context.projection([d.min_lon, d.max_lat])[1] + ' ' +
            context.projection([d.max_lon, d.max_lat])[0] + ',' + context.projection([d.max_lon, d.max_lat])[1] + ' ' +
            context.projection([d.max_lon, d.min_lat])[0] + ',' + context.projection([d.max_lon, d.min_lat])[1])
          .style('fill', d => colorScale(d.percent_change_in_production))
          .attr('transform', context.transform)
          .attr('opacity', 0)
          .transition()
          .duration(1000)
          .attr('opacity', 1);
      }
    } else {
      draw_charts(climate_scenario, region, region_type)
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
        .style('fill', d => colorScale(d.percent_change_in_production))
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
        .style('fill', d => colorScale(d.percent_change_in_production));

      dataPoints
        .exit()
        .transition()
        .duration(1000)
        .attr('opacity', 0)
        .remove();
    }
  }

  display_both_regions(data, compare_data, region, compare_region, region_type, climate_scenario) {
    if (this.compare_mode) {
      this.main_data = data
      this.compare_data = compare_data
      this.region = region
      this.compare_region = compare_region
      this.region_type = region_type
      this.climate_scenario = climate_scenario

      const context = this;

      const colorScale = d3.scaleLinear()
        .domain([-100, 0, 100])
        .range(['red', 'yellow', 'green'])
      colorScale.clamp(true)

      this.draw_legend(colorScale)

      draw_compare_charts(climate_scenario, this.region, this.compare_region, region_type)

      let dataPoints = this.circles.selectAll('polygon').data(data.concat(compare_data), d => d.min_lon.toString() + "," + d.min_lat.toString());

      dataPoints
        .enter().append('polygon')
        .attr('points', d => context.projection([d.min_lon, d.min_lat])[0] + ',' + context.projection([d.min_lon, d.min_lat])[1] + ' ' +
          context.projection([d.min_lon, d.max_lat])[0] + ',' + context.projection([d.min_lon, d.max_lat])[1] + ' ' +
          context.projection([d.max_lon, d.max_lat])[0] + ',' + context.projection([d.max_lon, d.max_lat])[1] + ' ' +
          context.projection([d.max_lon, d.min_lat])[0] + ',' + context.projection([d.max_lon, d.min_lat])[1])
        .style('fill', d => colorScale(d.percent_change_in_production))
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
        .style('fill', d => colorScale(d.percent_change_in_production));

      dataPoints
        .exit()
        .transition()
        .duration(1000)
        .attr('opacity', 0)
        .remove();
    }
  }

  switch_data() {
    if (this.compare_mode) {
      let new_compare_data = this.main_data.slice(0)
      this.main_data = this.compare_data
      this.compare_data = new_compare_data

      let new_compare_region = this.region
      this.region = this.compare_region
      this.compare_region = new_compare_region

      draw_compare_charts(this.climate_scenario, this.region, this.compare_region, this.region_type)
    }
  }

  clear_data() {
    if (this.compare_mode) {
      let mainDataPoints = this.circles.selectAll('polygon').data(this.main_data, d => d.min_lon.toString() + "," + d.min_lat.toString());

      mainDataPoints
        .exit()
        .transition()
        .duration(1000)
        .attr('opacity', 0)
        .remove();

      this.compare_region = 'None'
      this.compare_data = []
      draw_compare_charts(this.climate_scenario, this.region, 'None', this.region_type)
    } else {
      this.region_type = 'None'
      this.region = 'None'
      this.main_data = []
      this.compare_data = []

      this.circles.selectAll('polygon')
        .transition()
        .duration(1000)
        .attr('opacity', 0)
        .remove();

      remove_charts()
    }
  }

  zoom_on_continent(x, y, k) {
    this.transform.x = x
    this.transform.y = y
    this.transform.k = k
  }
}

function get_country_facts(country, ssp_type) {
  d3.csv("../data/graph/graph_country_data_" + ssp_type.toLowerCase() + ".csv").then(function(countries) {
    countries.forEach(function(x) {
      if (x.country == country) {
        document.getElementById('facts').style.display = 'block';
        document.getElementById("facts").innerHTML = '<li>Population in year 2000: ' + Math.round(x.Population_2000 / 1000000) + ' million</li><li>Predicted population in 2050: ' + Math.round(x.Population_2050 / 1000000) + ' million</li><li>Variation in calories production between 2000 and 2050: ' + Math.round(x['ΔCalories']) + '%</li><li>Food sufficiency in 2050: ' + Math.round(x.Sufficiency_2050) + '%</li>';
      }
    });
  });
}

function get_world_facts(ssp_type) {
  d3.csv("../data/graph/graph_continent_data_" + ssp_type.toLowerCase() + ".csv").then(function(continents) {
    Population2000 = 0;
    Population2050 = 0;
    continents.forEach(function(x) {
      Population2000 += +x.Population2000;
      Population2050 += +x.Population2050;
    });
    document.getElementById('facts').style.display = 'block';
    document.getElementById("facts").innerHTML = '<li>World population in year 2000: ' + Math.round(Population2000 / 1000000) + ' million</li><li>Predicted world population in 2050: ' + Math.round(Population2050 / 1000000) + ' million</li>';
  });
}

function get_continent_facts(continent, ssp_type) {
  d3.csv("../data/graph/graph_continent_data_" + ssp_type.toLowerCase() + ".csv").then(function(countries) {
    countries.forEach(function(x) {
      if (x.continent == continent) {
        document.getElementById('facts').style.display = 'block';
        document.getElementById("facts").innerHTML = '<li>Population in year 2000: ' + Math.round(x.Population2000 / 1000000) + ' million</li><li>Predicted population in 2050: ' + Math.round(x.Population2050 / 1000000) + ' million</li><li>Variation in calories production between 2000 and 2050: ' + Math.round(x['diffCalories']) + '%</li><li>Food sufficiency in 2050: ' + Math.round(x.Sufficiency2050) + '%</li>';
      }
    });
  });
}

function draw_charts(ssp_type, region, region_type) {
  if (region_type == 'None' || region_type == 'Global') {
    get_world_facts(ssp_type);
    draw_piechart_by_continent(ssp_type, 'Percentageoftotalcal2050', "#chart1", "Production (%)")
    draw_barchart_by_continent(ssp_type, 'Percentageoftotalcal2050', "#chart12", "Production (%)", 0.55, true)
    draw_barchart_by_continent(ssp_type, 'diffCalories', "#chart2", "Variation (%)", 1, false)
    draw_barchart_by_continent(ssp_type, 'Sufficiency2050', "#chart3", "Sufficiency (%)", 1, false)
    document.getElementById("analytics_title").innerHTML = 'World View';
    document.getElementById("country").style.display = 'none';
    document.getElementById("continent").style.display = 'none';
    document.getElementById("world").style.display = 'block';
    document.getElementById("comparison").style.display = 'none';
  } else if (region_type == 'Continent') {
    get_continent_facts(region, ssp_type);
    document.getElementById("analytics_title").innerHTML = 'Continent: ' + region;
    document.getElementById("world").style.display = 'none';
    document.getElementById("country").style.display = 'none';
    document.getElementById("continent").style.display = 'block';
    document.getElementById("comparison").style.display = 'none';
  } else {
    document.getElementById("analytics_title").innerHTML = 'Country: ' + region;
    get_country_facts(region, ssp_type);
    document.getElementById("world").style.display = 'none';
    document.getElementById("continent").style.display = 'none';
    document.getElementById("country").style.display = 'block';
    document.getElementById("comparison").style.display = 'none';
  }
}

function draw_compare_charts(climate_scenario, first_region, second_region, region_type) {
  if (second_region == 'None') {
    if (region_type == 'Continent') {
      document.getElementById("analytics_title").innerHTML = first_region + ' - Select another continent';
    } else {
      document.getElementById("analytics_title").innerHTML = first_region + ' - Select another country';
    }
  } else {
    document.getElementById("analytics_title").innerHTML = first_region + ' - ' + second_region;
  }
  document.getElementById("comparison").style.display = 'block';
  document.getElementById("country").style.display = 'none';
  document.getElementById("continent").style.display = 'none';
  document.getElementById("world").style.display = 'none';
  document.getElementById('facts').style.display = 'none';
}

function remove_charts() {
  document.getElementById("analytics_title").innerHTML = 'Select a region to view analytics';
  document.getElementById("comparison").style.display = 'none';
  document.getElementById("country").style.display = 'none';
  document.getElementById("continent").style.display = 'none';
  document.getElementById("world").style.display = 'none';
  document.getElementById('facts').style.display = 'none';
}

function draw_piechart_by_continent(ssp_type, yvalues, chartdiv, ylabel) {
  let chart = dc.pieChart(chartdiv);
  d3.csv("../data/graph/graph_continent_data_" + ssp_type.toLowerCase() + ".csv").then(function(continents) {
    continents.forEach(function(x) {
      x[yvalues] = +x[yvalues];
    });

    let ndx = crossfilter(continents),
      xaxis = ndx.dimension(function(d) {
        var split = d.continent.split(' ');
        if (split.length > 1) {
          return split[0].substring(0, 1) + split[1].substring(0, 1)
        }
        return d.continent.substring(0, 3).toUpperCase();
      }),
      yaxis = xaxis
      .group().reduceSum(function(d) {
        return d[yvalues];
      });
    chart
      .width(window.innerWidth / 6)
      .height(window.innerHeight / 6)
      .dimension(xaxis)
      .group(yaxis)
      .on('renderlet', function(chart) {
        chart.selectAll('rect').on("click", function(d) {
          console.log("click!", d);
        });
      });
    chart.render();
  });
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
          return split[0].substring(0, 1) + '. ' + split[1].substring(0, 1) + '. ';
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

function load_country_polygons(countries, countries_to_continent) {
  filenames = ['AFG.geo.json', 'AGO.geo.json', 'ALB.geo.json', 'ARE.geo.json', 'ARG.geo.json', 'ARM.geo.json', 'ATF.geo.json', 'AUS.geo.json', 'AUT.geo.json', 'AZE.geo.json', 'BDI.geo.json', 'BEL.geo.json', 'BEN.geo.json', 'BFA.geo.json', 'BGD.geo.json', 'BGR.geo.json', 'BHS.geo.json', 'BIH.geo.json', 'BLR.geo.json', 'BLZ.geo.json', 'BMU.geo.json', 'BOL.geo.json', 'BRA.geo.json', 'BRN.geo.json', 'BTN.geo.json', 'BWA.geo.json', 'CAF.geo.json', 'CAN.geo.json', 'CHE.geo.json', 'CHL.geo.json', 'CHN.geo.json', 'CIV.geo.json', 'CMR.geo.json', 'COD.geo.json', 'COG.geo.json', 'COL.geo.json', 'CRI.geo.json', 'CS-KM.geo.json', 'CUB.geo.json', 'CYP.geo.json', 'CZE.geo.json', 'DEU.geo.json', 'DJI.geo.json', 'DNK.geo.json', 'DOM.geo.json', 'DZA.geo.json', 'ECU.geo.json', 'EGY.geo.json', 'ERI.geo.json', 'ESH.geo.json', 'ESP.geo.json', 'EST.geo.json', 'ETH.geo.json', 'FIN.geo.json', 'FJI.geo.json', 'FLK.geo.json', 'FRA.geo.json', 'GAB.geo.json', 'GBR.geo.json', 'GEO.geo.json', 'GHA.geo.json', 'GIN.geo.json', 'GMB.geo.json', 'GNB.geo.json', 'GNQ.geo.json', 'GRC.geo.json', 'GRL.geo.json', 'GTM.geo.json', 'GUF.geo.json', 'GUY.geo.json', 'HND.geo.json', 'HRV.geo.json', 'HTI.geo.json', 'HUN.geo.json', 'IDN.geo.json', 'IND.geo.json', 'IRL.geo.json', 'IRN.geo.json', 'IRQ.geo.json', 'ISL.geo.json', 'ISR.geo.json', 'ITA.geo.json', 'JAM.geo.json', 'JOR.geo.json', 'JPN.geo.json', 'KAZ.geo.json', 'KEN.geo.json', 'KGZ.geo.json', 'KHM.geo.json', 'KOR.geo.json', 'KWT.geo.json', 'LAO.geo.json', 'LBN.geo.json', 'LBR.geo.json', 'LBY.geo.json', 'LKA.geo.json', 'LSO.geo.json', 'LTU.geo.json', 'LUX.geo.json', 'LVA.geo.json', 'MAR.geo.json', 'MDA.geo.json', 'MDG.geo.json', 'MEX.geo.json', 'MKD.geo.json', 'MLI.geo.json', 'MLT.geo.json', 'MMR.geo.json', 'MNE.geo.json', 'MNG.geo.json', 'MOZ.geo.json', 'MRT.geo.json', 'MWI.geo.json', 'MYS.geo.json', 'NAM.geo.json', 'NCL.geo.json', 'NER.geo.json', 'NGA.geo.json', 'NIC.geo.json', 'NLD.geo.json', 'NOR.geo.json', 'NPL.geo.json', 'NZL.geo.json', 'OMN.geo.json', 'PAK.geo.json', 'PAN.geo.json', 'PER.geo.json', 'PHL.geo.json', 'PNG.geo.json', 'POL.geo.json', 'PRI.geo.json', 'PRK.geo.json', 'PRT.geo.json', 'PRY.geo.json', 'PSE.geo.json', 'QAT.geo.json', 'ROU.geo.json', 'RUS.geo.json', 'RWA.geo.json', 'SAU.geo.json', 'SDN.geo.json', 'SEN.geo.json', 'SLB.geo.json', 'SLE.geo.json', 'SLV.geo.json', 'SOM.geo.json', 'SRB.geo.json', 'SSD.geo.json', 'SUR.geo.json', 'SVK.geo.json', 'SVN.geo.json', 'SWE.geo.json', 'SWZ.geo.json', 'SYR.geo.json', 'TCD.geo.json', 'TGO.geo.json', 'THA.geo.json', 'TJK.geo.json', 'TKM.geo.json', 'TLS.geo.json', 'TTO.geo.json', 'TUN.geo.json', 'TUR.geo.json', 'TWN.geo.json', 'TZA.geo.json', 'UGA.geo.json', 'UKR.geo.json', 'URY.geo.json', 'USA.geo.json', 'UZB.geo.json', 'VEN.geo.json', 'VNM.geo.json', 'VUT.geo.json', 'YEM.geo.json', 'ZAF.geo.json', 'ZMB.geo.json', 'ZWE.geo.json']

  for (let i = 0; i < filenames.length; i++) {
    d3.json('countries/' + filenames[i])
      .then(data => {
        let country = data['features'][0]['properties']['name']
        if (country == 'South Africa') {
          countries[country] = [data['features'][0]['geometry']['coordinates'][0]]
        } else {
          countries[country] = data['features'][0]['geometry']['coordinates']
        }
        countries_to_continent[country] = data['features'][0]['properties']['continent']
      })
  }
}

function inside(point, vs) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

  let x = point[0],
    y = point[1];

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0],
      yi = vs[i][1];
    let xj = vs[j][0],
      yj = vs[j][1];

    let intersect = ((yi > y) != (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};

whenDocumentLoaded(() => {
  let countries = {}
  let countries_to_continent = {}
  load_country_polygons(countries, countries_to_continent)

  const map = new Map();

  add_strories(map);
  const background = d3.json('https://unpkg.com/world-atlas@1.1.4/world/110m.json');

  let ssp_slider = document.getElementById("ssp_range");
  ssp_slider.oninput = function() {
    let ssp_nb = this.value;
    let ssp_type = 'SSP' + ssp_nb;
    if (!map.compare_mode) {
      updateData(map, 'data/2050/SSP' + ssp_nb + '/SSP' + ssp_nb + '_' + map.region + '.csv', map.region, map.region_type, ssp_type)
    } else {
      updateBothData(map, 'data/2050/SSP' + ssp_nb + '/SSP' + ssp_nb + '_' + map.region + '.csv',
        'data/2050/SSP' + ssp_nb + '/SSP' + ssp_nb + '_' + map.compare_region + '.csv',
        map.region, map.compare_region, map.region_type, ssp_type)
    }
  }

  let data = [];

  d3.csv("data/2050/SSP1/SSP1_World.csv", function(csv) {
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

      map.display_data(data, 'World', 'Global', 'SSP1')

      draw_charts(map.climate_scenario, map.region, map.region_type)

      map.svg.on("click", function(d, i) {
        let targetId = d3.event.target.id
        if (targetId != 'zoom_rect' && targetId != 'unzoom_rect' &&
          targetId != 'zoom_text' && targetId != 'unzoom_text') {

          let remove_region = true
          let region_found = false

          coord = d3.mouse(this)
          coord[0] = (coord[0] - map.transform.x) / map.transform.k
          coord[1] = (coord[1] - map.transform.y) / map.transform.k
          coord = map.projection.invert(coord)

          let keys = Object.keys(countries)

          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]

            let country_polygons = countries[key]
            for (let j = 0; j < country_polygons.length; j++) {
              let polygon = []
              if (country_polygons.length > 1) {
                polygon = country_polygons[j][0]
              } else {
                polygon = country_polygons[j]
              }
              if (inside(coord, polygon)) {
                region_found = true
                if (key != map.region) {
                  remove_region = false
                }

                if (region_found && !remove_region) {
                  if (map.compare_mode) {
                    if (map.region_type == 'Continent') {
                      if (countries_to_continent[key] != map.compare_region) {
                        updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + countries_to_continent[key] + ".csv", countries_to_continent[key], 'Continent', map.climate_scenario)
                      } else {
                        map.clear_data()
                      }
                    } else {
                      if (key != map.compare_region) {
                        updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + key + ".csv", key, 'Country', map.climate_scenario)
                      } else {
                        map.clear_data()
                      }
                    }
                  } else {
                    // We show the continent either if we currently have a global view or a view on another continent
                    if (map.region_type == 'None' || map.region_type == 'Global' ||
                      (map.region_type == 'Continent' && countries_to_continent[key] != map.region) ||
                      (map.region_type == 'Country' && countries_to_continent[key] != countries_to_continent[map.region])) {
                      updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + countries_to_continent[key] + ".csv", countries_to_continent[key], 'Continent', map.climate_scenario)
                    } else {
                      updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + key + ".csv", key, 'Country', map.climate_scenario)
                    }
                  }
                }
                break
              }
            }
          }

          if (!region_found && !map.compare_mode) {
            if (map.region_type == 'Country') {
              updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + countries_to_continent[map.region] + ".csv", countries_to_continent[map.region], 'Continent', map.climate_scenario)
            } else if (map.region_type == 'Continent' || map.region_type == 'None') {
              updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_World.csv", 'World', 'Global', map.climate_scenario)
            }
          } else if (remove_region) {
            map.clear_data()
          }
        }
      })

      d3.select('body').on('mouseover', function(d, i) {
        d3.select('#mouse_region').style('opacity', 0)
      })

      map.svg.on("mousemove", function(d, i) {
        let targetId = d3.event.target.id
        if (targetId != 'zoom_rect' && targetId != 'unzoom_rect' &&
          targetId != 'zoom_text' && targetId != 'unzoom_text') {

          coord = d3.mouse(this)
          coord[0] = (coord[0] - map.transform.x) / map.transform.k
          coord[1] = (coord[1] - map.transform.y) / map.transform.k
          coord = map.projection.invert(coord)

          let keys = Object.keys(countries)

          let box = d3.select('#mouse_region')
          let on_valid_region = false

          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]

            let country_polygons = countries[key]
            for (let j = 0; j < country_polygons.length; j++) {
              let polygon = []
              if (country_polygons.length > 1) {
                polygon = country_polygons[j][0]
              } else {
                polygon = country_polygons[j]
              }
              if (inside(coord, polygon)) {
                on_valid_region = true
                if (map.region_type == 'Global' || map.region_type == 'None' ||
                  (map.region_type == 'Continent' && (map.region != countries_to_continent[key] || map.compare_mode)) ||
                  (map.region_type == 'Country' && !map.compare_mode && countries_to_continent[map.region] != countries_to_continent[key])) {
                  box
                    .style('opacity', 1)
                    .text(countries_to_continent[key])
                } else if (map.region_type == 'Continent' || map.region_type == 'Country') {
                  box
                    .style('opacity', 1)
                    .text(key)
                } else {
                  box
                    .style('opacity', 0)
                }
                break
              }
            }
          }

          if (!on_valid_region) {
            if (map.region_type == 'Country' && !map.compare_mode) {
              box
                .style('opacity', 1)
                .text(countries_to_continent[map.region])
            } else if (map.region_type == 'Continent' && !map.compare_mode) {
              box
                .style('opacity', 1)
                .text('World view')
            } else {
              box
                .style('opacity', 0)
            }
          }

          let dims = box.node().getBoundingClientRect()

          box
            .style('left', (d3.min([d3.mouse(this)[0] + 20, window.innerWidth - dims.width - 5])) + 'px')
            .style('top', (d3.max([d3.event.pageY - 40, 5 + d3.event.pageY])) + 'px')
        } else {
          d3.select('#mouse_region').style('opacity', 0)
        }
      })

      const analytics_button = d3.select('#analytics_mode')
      const compare_button = d3.select('#compare_mode')
      compare_button.style('color', 'white')

      analytics_button.on('click', function(d, i) {
        if (map.compare_mode) {
          map.clear_data()
          map.compare_mode = false
          compare_button.style('background-color', '#2E2E2E')
          compare_button.style('color', 'white')
          analytics_button.style('background-color', 'white')
          analytics_button.style('color', '#2E2E2E')
          draw_charts(map.climate_scenario, map.region, map.region_type)
        }
      })

      compare_button.on('click', function(d, i) {
        if (!map.compare_mode && map.region_type != 'Global' && map.region_type != 'None') {
          map.compare_mode = true
          compare_button.style('background-color', 'white')
          compare_button.style('color', '#2E2E2E')
          analytics_button.style('background-color', '#2E2E2E')
          analytics_button.style('color', 'white')
          draw_compare_charts(map.climate_scenario, map.region, map.compare_region, map.region_type)
        }
      })

      const swap_regions_button = d3.select('#swap_regions')
      swap_regions_button.style('color', 'white')

      swap_regions_button.on('click', function(d, i) {
        if (map.compare_mode && map.compare_region != 'None') {
          map.switch_data()
        }
      })
    });

  function zoomed() {
    map.land
      .selectAll('path') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);

    map.boundaries
      .selectAll('path') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);

    map.circles
      .selectAll('polygon') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);

    map.transform = d3.event.transform
  }

  const zoom = d3.zoom()
    .scaleExtent([1, 50])
    .on('zoom', zoomed);

  map.svg.call(zoom)
    .on('wheel.zoom', null)
    .on('dbclick', null)

  map.svg.select('#zoom_buttons').on('zoom', null)

  function zoomClick(is_zoom) {
    let current_transform = map.transform
    if ((current_transform.k >= 1 && !is_zoom) || (current_transform.k <= 50 && is_zoom)) {
      let zoom_factor = 2
      if (!is_zoom) {
        zoom_factor = 1 / zoom_factor
      }

      let current_scale = current_transform.k
      let current_x = current_transform.x
      let current_y = current_transform.y

      let coord = []
      coord[0] = (map.width / 2 - map.transform.x) / map.transform.k
      coord[1] = (map.height / 2 - map.transform.y) / map.transform.k
      coord = map.projection.invert(coord)

      current_transform.k = current_scale * zoom_factor
      current_transform.x = -current_transform.k * map.projection([coord[0], coord[1]])[0] + map.width / 2
      current_transform.y = -current_transform.k * map.projection([coord[0], coord[1]])[1] + map.height / 2

      console.log(current_transform)

      map.land
        .selectAll('path') // To prevent stroke width from scaling
        .transition()
        .duration(1000)
        .attr('transform', current_transform);

      map.boundaries
        .selectAll('path') // To prevent stroke width from scaling
        .transition()
        .duration(1000)
        .attr('transform', current_transform);

      map.circles
        .selectAll('polygon') // To prevent stroke width from scaling
        .transition()
        .duration(1000)
        .attr('transform', current_transform);

      map.transform = current_transform
    }
  }

  d3.select('#zoom_rect').on('click', function(d, i) {
    zoomClick(true)
  });
  d3.select('#unzoom_rect').on('click', function(d, i) {
    zoomClick(false)
  });
  d3.select('#zoom_text').on('click', function(d, i) {
    zoomClick(true)
  });
  d3.select('#unzoom_text').on('click', function(d, i) {
    zoomClick(false)
  });

});
