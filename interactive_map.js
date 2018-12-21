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

function updateData(map, path_to_data, region, region_type, climate_scenario) {
  draw_charts(climate_scenario, region, region_type)

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
    this.width = window.innerWidth * 0.67;
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
        .title("Predicted sustainability in 2050 (%)")
        .orient('horizontal')
        .cells([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        .scale(color_scale);

      return legendLinear;
    }
  }

  draw_legend(metric, color_scale) {
    let xpos = window.innerWidth / 5;
    let ypos = window.innerHeight * 0.85;
    let svg = this.svg;

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
    console.log('region', region, 'region_type', region_type)
    if (region in this.predefined_zoom_levels) {
      console.log('ZOOOm')
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
      .style('fill', d => {
        if (this.metric == 'Variation') {
          return colorScale(d.percent_change_in_production)
        } else {
          return colorScale(d.sufficiency)
        }
      })
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
      .style('fill', d => {
        if (this.metric == 'Variation') {
          return colorScale(d.percent_change_in_production)
        } else {
          return colorScale(d.sufficiency)
        }
      });

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
        .range(['#C11432', '#FDD10A', '#66A64F'])
      colorScale.clamp(true)

      return colorScale;
    } else {
      const colorScale = d3.scaleLinear()
        .domain([0, 50, 100])
        .range(['#F7D708', '#9CCF31', '#004E64'])
      colorScale.clamp(true)

      return colorScale;
    }
  }

  change_displayed_metric(metric) {
    console.log(metric, this.metric)
    if (metric != this.metric) {
      this.metric = metric

      const colorScale = this.get_color_scale(metric)

      this.draw_legend(metric, colorScale)

      let dataPoints = this.circles.selectAll('polygon').data(this.main_data, d => d.min_lon.toString() + "," + d.min_lat.toString());

      dataPoints
        .transition()
        .duration(1000)
        .style('fill', d => {
          if (metric == 'Variation') {
            return colorScale(d.percent_change_in_production)
          } else {
            return colorScale(d.sufficiency)
          }
        });
    }
  }

  zoom_on_continent(x, y, k) {
    this.transform.x = x
    this.transform.y = y
    this.transform.k = k
  }

  clear_data() {
    this.main_data = []
    this.circles.selectAll('polygon')
      .transition()
      .duration(1000)
      .attr('opacity', 0)
      .remove();
    this.region = 'None'
    this.region_type = 'None'
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
    draw_barchart_by_continent(ssp_type, 'Percentageoftotalcal2050', "#chart1", "Production (%)", 1, true)
    draw_barchart_by_continent(ssp_type, 'diffCalories', "#chart2", "Variation (%)", 1, true)
    document.getElementById("analytics_title").innerHTML = 'World View';
    document.getElementById("country").style.display = 'none';
    document.getElementById("continent").style.display = 'none';
    document.getElementById("world").style.display = 'block';
  } else if (region_type == 'Continent') {
    get_continent_facts(region, ssp_type);
    document.getElementById("analytics_title").innerHTML = 'Continent: ' + region;
    document.getElementById("world").style.display = 'none';
    document.getElementById("country").style.display = 'none';
    document.getElementById("continent").style.display = 'block';
  } else {
    document.getElementById("analytics_title").innerHTML = 'Country: ' + region;
    get_country_facts(region, ssp_type);
    document.getElementById("world").style.display = 'none';
    document.getElementById("continent").style.display = 'none';
    document.getElementById("country").style.display = 'block';
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
          return split[0].substring(0,1) + '. ' + split[1];
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
        .range(["#66A64F", "#C11432"]))
      .colorAccessor(function(d) {
        if (d.value > 0) {
          return "positive";
        }
        return "negative";
      })
      .brushOn(false)
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
        }
        else {
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
  const background = d3.json('https://unpkg.com/world-atlas@1.1.4/world/110m.json');

  let dropdown_scenario = document.getElementById("select_rcp");
  dropdown_scenario.onchange = function() {
    let ssp_nb = this.value;
    let ssp_type = 'SSP' + ssp_nb;
    updateData(map, 'data/2050/SSP' + ssp_nb + '/SSP' + ssp_nb + '_' + map.region + '.csv', map.region, map.region_type, ssp_type)
  }

  let dropdown_metric = document.getElementById("select_metric");
  dropdown_metric.onchange = function() {
    let metric = this.value;
    map.change_displayed_metric(metric)
  }

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
      console.log(data)
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
                  // We show the continent either if we currently have a global view or a view on another continent
                  if (map.region_type == 'None' || map.region_type == 'Global' ||
                    (map.region_type == 'Continent' && countries_to_continent[key] != map.region) ||
                    (map.region_type == 'Country' && countries_to_continent[key] != countries_to_continent[map.region])) {
                    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + countries_to_continent[key] + ".csv", countries_to_continent[key], 'Continent', map.climate_scenario)
                  } else {
                    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + key + ".csv", key, 'Country', map.climate_scenario)
                  }
              }
              break
            }
          }
        }

        if (!region_found) {
          if (map.region_type == 'Country') {
            updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_" + countries_to_continent[map.region] + ".csv", countries_to_continent[map.region], 'Continent', map.climate_scenario)
          } else if (map.region_type == 'Continent' || map.region_type == 'None') {
            updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "_World.csv", 'World', 'Global', map.climate_scenario)
          }
        } else if (remove_region) {
          map.clear_data()
        }
      })

      map.svg.on("mousemove", function(d, i) {
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
              }
              else if (map.region_type == 'Continent' || map.region_type == 'Country') {
                box
                  .style('opacity', 1)
                  .text(key)
              }
              else {
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
          .style('top', (d3.max([d3.mouse(this)[1] - 40, 5])) + 'px')
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

  map.svg.call(zoom);

});
