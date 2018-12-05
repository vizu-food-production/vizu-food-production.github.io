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
      map.display_data(data, region, region_type, climate_scenario)
    });
}

class Map {
  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    console.log('width: ' + this.width)
    console.log('heigh: ' + this.height)
    this.projection = d3.geoEqualEarth()
      .translate([4 * this.width / 9, this.height / 2])
      .scale((this.width) / 5);
    this.path = d3.geoPath()
      .projection(this.projection);
    this.svg = d3.select('#map').append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
    this.land = this.svg.append('g');
    this.circles = this.svg.append('g');
    this.boundaries = this.svg.append('g');
    this.transform = d3.zoomIdentity
    this.climate_scenario = 'SSP1'
    this.region = 'World'
    this.region_type = 'Global'

    this.predefined_zoom_levels = {
      'World':         {'x': 0,                      'y': 0,                       'k': 1},
      'Europe':        {'x': -1.611 * this.width,    'y': -0.373921 * this.height, 'k': 4.5},
      'Africa':        {'x': -0.527344 * this.width, 'y': -0.503356 * this.height, 'k': 2},
      'Asia':          {'x': -0.805664 * this.width, 'y': -0.131352 * this.height, 'k': 1.8},
      'North America': {'x': 0.13916 * this.width,   'y': -0.153404 * this.height, 'k': 2.2},
      'South America': {'x': 0.007324 * this.width,  'y': -0.824545 * this.height, 'k': 2},
      'Oceania':       {'x': -2.40967 * this.width,  'y': -1.62991 * this.height,  'k': 3.15}
    }
  }

  draw_legend(color_scale) {
    let xpos = window.innerWidth / 5;
    let ypos = window.innerHeight * 0.85;
    let svg = d3.select("svg");
    svg.append("g")
      .attr("class", "legendLinear")
      .attr("transform", "translate(" + xpos + "," + ypos + ")");

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
    this.region = region
    this.region_type = region_type
    this.climate_scenario = climate_scenario
    const context = this;

    const colorScale = d3.scaleLinear()
      .domain([-100, 100])
      .range(['red', 'green'])
    colorScale.clamp(true)

    this.draw_legend(colorScale)

    let dataPoints = this.circles.selectAll('polygon').data(data, d => d.min_lon.toString() + "," + d.min_lat.toString());

    if (region_type == 'Continent' || region_type == 'Global') {
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

  clear_data() {
    this.region_type = 'None'
    this.region = 'None'

    this.circles.selectAll('polygon')
      .transition()
      .duration(1000)
      .attr('opacity', 0)
      .remove();
  }

  zoom_on_continent(x, y, k) {
    this.transform.x = x
    this.transform.y = y
    this.transform.k = k
  }
}

function draw_charts(ssp_type) {
  draw_barchart_by_continent(ssp_type, 'Percentageoftotalcal2050', "#chart1", "Share of calorie production (%)")
  draw_barchart_by_continent(ssp_type, 'diffCalories', "#chart2", "Variation in calorie production (%)")
  draw_barchart_by_continent(ssp_type, 'Sufficiency2050', "#chart3", "Sufficiency (%)")
}

function draw_barchart_by_continent(ssp_type, yvalues, chartdiv, ylabel) {
  let chart = dc.barChart(chartdiv);
  d3.csv("data/graph/graph_continent_data_ssp" + ssp_type + ".csv").then(function(continents) {
    continents.forEach(function(x) {
      x[yvalues] = +x[yvalues];
    });

    let ndx = crossfilter(continents),
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

function load_country_polygons(countries, countries_to_continent) {
  filenames = ['AFG.geo.json', 'AGO.geo.json', 'ALB.geo.json', 'ARE.geo.json', 'ARG.geo.json', 'ARM.geo.json', 'ATA.geo.json', 'ATF.geo.json', 'AUS.geo.json', 'AUT.geo.json', 'AZE.geo.json', 'BDI.geo.json', 'BEL.geo.json', 'BEN.geo.json', 'BFA.geo.json', 'BGD.geo.json', 'BGR.geo.json', 'BHS.geo.json', 'BIH.geo.json', 'BLR.geo.json', 'BLZ.geo.json', 'BMU.geo.json', 'BOL.geo.json', 'BRA.geo.json', 'BRN.geo.json', 'BTN.geo.json', 'BWA.geo.json', 'CAF.geo.json', 'CAN.geo.json', 'CHE.geo.json', 'CHL.geo.json', 'CHN.geo.json', 'CIV.geo.json', 'CMR.geo.json', 'COD.geo.json', 'COG.geo.json', 'COL.geo.json', 'CRI.geo.json', 'CS-KM.geo.json', 'CUB.geo.json', 'CYP.geo.json', 'CZE.geo.json', 'DEU.geo.json', 'DJI.geo.json', 'DNK.geo.json', 'DOM.geo.json', 'DZA.geo.json', 'ECU.geo.json', 'EGY.geo.json', 'ERI.geo.json', 'ESH.geo.json', 'ESP.geo.json', 'EST.geo.json', 'ETH.geo.json', 'FIN.geo.json', 'FJI.geo.json', 'FLK.geo.json', 'FRA.geo.json', 'GAB.geo.json', 'GBR.geo.json', 'GEO.geo.json', 'GHA.geo.json', 'GIN.geo.json', 'GMB.geo.json', 'GNB.geo.json', 'GNQ.geo.json', 'GRC.geo.json', 'GRL.geo.json', 'GTM.geo.json', 'GUF.geo.json', 'GUY.geo.json', 'HND.geo.json', 'HRV.geo.json', 'HTI.geo.json', 'HUN.geo.json', 'IDN.geo.json', 'IND.geo.json', 'IRL.geo.json', 'IRN.geo.json', 'IRQ.geo.json', 'ISL.geo.json', 'ISR.geo.json', 'ITA.geo.json', 'JAM.geo.json', 'JOR.geo.json', 'JPN.geo.json', 'KAZ.geo.json', 'KEN.geo.json', 'KGZ.geo.json', 'KHM.geo.json', 'KOR.geo.json', 'KWT.geo.json', 'LAO.geo.json', 'LBN.geo.json', 'LBR.geo.json', 'LBY.geo.json', 'LKA.geo.json', 'LSO.geo.json', 'LTU.geo.json', 'LUX.geo.json', 'LVA.geo.json', 'MAR.geo.json', 'MDA.geo.json', 'MDG.geo.json', 'MEX.geo.json', 'MKD.geo.json', 'MLI.geo.json', 'MLT.geo.json', 'MMR.geo.json', 'MNE.geo.json', 'MNG.geo.json', 'MOZ.geo.json', 'MRT.geo.json', 'MWI.geo.json', 'MYS.geo.json', 'NAM.geo.json', 'NCL.geo.json', 'NER.geo.json', 'NGA.geo.json', 'NIC.geo.json', 'NLD.geo.json', 'NOR.geo.json', 'NPL.geo.json', 'NZL.geo.json', 'OMN.geo.json', 'PAK.geo.json', 'PAN.geo.json', 'PER.geo.json', 'PHL.geo.json', 'PNG.geo.json', 'POL.geo.json', 'PRI.geo.json', 'PRK.geo.json', 'PRT.geo.json', 'PRY.geo.json', 'PSE.geo.json', 'QAT.geo.json', 'ROU.geo.json', 'RUS.geo.json', 'RWA.geo.json', 'SAU.geo.json', 'SDN.geo.json', 'SEN.geo.json', 'SLB.geo.json', 'SLE.geo.json', 'SLV.geo.json', 'SOM.geo.json', 'SRB.geo.json', 'SSD.geo.json', 'SUR.geo.json', 'SVK.geo.json', 'SVN.geo.json', 'SWE.geo.json', 'SWZ.geo.json', 'SYR.geo.json', 'TCD.geo.json', 'TGO.geo.json', 'THA.geo.json', 'TJK.geo.json', 'TKM.geo.json', 'TLS.geo.json', 'TTO.geo.json', 'TUN.geo.json', 'TUR.geo.json', 'TWN.geo.json', 'TZA.geo.json', 'UGA.geo.json', 'UKR.geo.json', 'URY.geo.json', 'USA.geo.json', 'UZB.geo.json', 'VEN.geo.json', 'VNM.geo.json', 'VUT.geo.json', 'YEM.geo.json', 'ZAF.geo.json', 'ZMB.geo.json', 'ZWE.geo.json']

  for (let i = 0; i < filenames.length; i++) {
    d3.json('countries/' + filenames[i])
      .then(data => {
        countries[data['features'][0]['properties']['name']] = data['features'][0]['geometry']['coordinates']
        countries_to_continent[data['features'][0]['properties']['name']] = data['features'][0]['properties']['continent']
      })
  }
}

function inside(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    let x = point[0], y = point[1];

    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];

        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
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

  const reset = d3.select('#reset_button');
  
  const ssp1 = d3.select('#ssp1');
  const ssp2 = d3.select('#ssp2');
  const ssp3 = d3.select('#ssp3');
  const ssp4 = d3.select('#ssp4');
  const ssp5 = d3.select('#ssp5');

  const eu = d3.select('#europe');
  const af = d3.select('#africa');
  const as = d3.select('#asia');
  const na = d3.select('#north_america');
  const sa = d3.select('#south_america');
  const oc = d3.select('#oceania');

  let mark_active = function(button) {
    ssp1.style('background-color', 'white')
    ssp2.style('background-color', 'white')
    ssp3.style('background-color', 'white')
    ssp4.style('background-color', 'white')
    ssp5.style('background-color', 'white')
    button.style('background-color', 'rgb(150, 150, 200)')
  }

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

      map.display_data(data, 'World', 'Global', 'SSP1')
      mark_active(ssp1)

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
      .selectAll('polygon') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);

    map.transform = d3.event.transform
  }

  const zoom = d3.zoom()
    .scaleExtent([1, 50])
    .on('zoom', zoomed);

  map.svg.call(zoom);

  reset.on("click", function(d, i) {
    updateData(map, "data/2050/SSP1/SSP1__World.csv", 'World', 'Global', 'SSP1')
    mark_active(ssp1)
  });

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
          // TODO remove when testing done
          console.log('Point in country: ' + key)
          region_found = true
          if (key != map.region) {
            remove_region = false
          }

          if (region_found && !remove_region) {
            // We show the continent either if we currently have a global view or a view on another continent
            if (map.region_type == 'None' || map.region_type == 'Global' ||
               (map.region_type == 'Continent' && countries_to_continent[key] != map.region) ||
               (map.region_type == 'Country' && countries_to_continent[key] != countries_to_continent[map.region]))
            {
              updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__" + countries_to_continent[key] + ".csv", countries_to_continent[key], 'Continent', map.climate_scenario)
            }
            else {
              updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__" + key + ".csv", key, 'Country', map.climate_scenario)
            }
          }
          break
        }
      }
    }

    if (!region_found) {
      if (map.region_type == 'Country') {
        updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__"+countries_to_continent[map.region] + ".csv", countries_to_continent[map.region], 'Continent', map.climate_scenario)
      } else if (map.region_type == 'Continent' || map.region_type == 'None') {
        updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__World.csv", 'World', 'Global', map.climate_scenario)
      }
    }
    else if (remove_region) {
      map.clear_data()
    }
  })

  let enable_scenario_event = function(map, button, ssp_nb) {
    button.on('click', function(d, i) {
      draw_charts(ssp_nb)
      updateData(map, 'data/2050/SSP' + ssp_nb + '/SSP' + ssp_nb + '__' + map.region + '.csv', map.region, map.region_type, 'SSP' + ssp_nb)
      mark_active(button)
    })
  }

  enable_scenario_event(map, ssp1, '1')
  enable_scenario_event(map, ssp2, '2')
  enable_scenario_event(map, ssp3, '3')
  enable_scenario_event(map, ssp4, '4')
  enable_scenario_event(map, ssp5, '5')

  let enable_continent_event = function(map, button, continent) {
    button.on('click', function(d, i) {
      updateData(map, 'data/2050/' + map.climate_scenario + '/' + map.climate_scenario + '__' + continent + '.csv', continent, 'Continent', map.climate_scenario)
    })
  }

  enable_continent_event(map, eu, 'Europe')
  enable_continent_event(map, af, 'Africa')
  enable_continent_event(map, as, 'Asia')
  enable_continent_event(map, na, 'North America')
  enable_continent_event(map, sa, 'South America')
  enable_continent_event(map, oc, 'Oceania')

  $("#right_panel").click(function(){
    let id = $(this).attr("href").substring(1);
    $("html, body").animate({ scrollTop: $("#"+id).offset().top }, 1000, function(){
      $("#right_panel").slideReveal("hide");
    });
  });

  let slider = $("#right_panel").slideReveal({
          // width: 100,
          push: false,
          position: "right",
          // speed: 600,
          trigger: $(".handle"),
          // autoEscape: false,
          shown: function(obj){
            obj.find(".handle").html('<span class="glyphicon glyphicon-chevron-right"></span>');
          },
          hidden: function(obj){
            obj.find(".handle").html('<span class="glyphicon glyphicon-chevron-left"></span>');
          }
        });

});
