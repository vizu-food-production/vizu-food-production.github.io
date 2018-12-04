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
    this.transform = {'x': 0, 'y': 0, 'k': 1}
    this.climate_scenario = 'SSP1'
    this.region = 'World'
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
      .attr('transform', context.transform)
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

function load_country_polygons(countries) {
  filenames = ['AFG.geo.json', 'AGO.geo.json', 'ALB.geo.json', 'ARE.geo.json', 'ARG.geo.json', 'ARM.geo.json', 'ATA.geo.json', 'ATF.geo.json', 'AUS.geo.json', 'AUT.geo.json', 'AZE.geo.json', 'BDI.geo.json', 'BEL.geo.json', 'BEN.geo.json', 'BFA.geo.json', 'BGD.geo.json', 'BGR.geo.json', 'BHS.geo.json', 'BIH.geo.json', 'BLR.geo.json', 'BLZ.geo.json', 'BMU.geo.json', 'BOL.geo.json', 'BRA.geo.json', 'BRN.geo.json', 'BTN.geo.json', 'BWA.geo.json', 'CAF.geo.json', 'CAN.geo.json', 'CHE.geo.json', 'CHL.geo.json', 'CHN.geo.json', 'CIV.geo.json', 'CMR.geo.json', 'COD.geo.json', 'COG.geo.json', 'COL.geo.json', 'CRI.geo.json', 'CS-KM.geo.json', 'CUB.geo.json', 'CYP.geo.json', 'CZE.geo.json', 'DEU.geo.json', 'DJI.geo.json', 'DNK.geo.json', 'DOM.geo.json', 'DZA.geo.json', 'ECU.geo.json', 'EGY.geo.json', 'ERI.geo.json', 'ESH.geo.json', 'ESP.geo.json', 'EST.geo.json', 'ETH.geo.json', 'FIN.geo.json', 'FJI.geo.json', 'FLK.geo.json', 'FRA.geo.json', 'GAB.geo.json', 'GBR.geo.json', 'GEO.geo.json', 'GHA.geo.json', 'GIN.geo.json', 'GMB.geo.json', 'GNB.geo.json', 'GNQ.geo.json', 'GRC.geo.json', 'GRL.geo.json', 'GTM.geo.json', 'GUF.geo.json', 'GUY.geo.json', 'HND.geo.json', 'HRV.geo.json', 'HTI.geo.json', 'HUN.geo.json', 'IDN.geo.json', 'IND.geo.json', 'IRL.geo.json', 'IRN.geo.json', 'IRQ.geo.json', 'ISL.geo.json', 'ISR.geo.json', 'ITA.geo.json', 'JAM.geo.json', 'JOR.geo.json', 'JPN.geo.json', 'KAZ.geo.json', 'KEN.geo.json', 'KGZ.geo.json', 'KHM.geo.json', 'KOR.geo.json', 'KWT.geo.json', 'LAO.geo.json', 'LBN.geo.json', 'LBR.geo.json', 'LBY.geo.json', 'LKA.geo.json', 'LSO.geo.json', 'LTU.geo.json', 'LUX.geo.json', 'LVA.geo.json', 'MAR.geo.json', 'MDA.geo.json', 'MDG.geo.json', 'MEX.geo.json', 'MKD.geo.json', 'MLI.geo.json', 'MLT.geo.json', 'MMR.geo.json', 'MNE.geo.json', 'MNG.geo.json', 'MOZ.geo.json', 'MRT.geo.json', 'MWI.geo.json', 'MYS.geo.json', 'NAM.geo.json', 'NCL.geo.json', 'NER.geo.json', 'NGA.geo.json', 'NIC.geo.json', 'NLD.geo.json', 'NOR.geo.json', 'NPL.geo.json', 'NZL.geo.json', 'OMN.geo.json', 'PAK.geo.json', 'PAN.geo.json', 'PER.geo.json', 'PHL.geo.json', 'PNG.geo.json', 'POL.geo.json', 'PRI.geo.json', 'PRK.geo.json', 'PRT.geo.json', 'PRY.geo.json', 'PSE.geo.json', 'QAT.geo.json', 'ROU.geo.json', 'RUS.geo.json', 'RWA.geo.json', 'SAU.geo.json', 'SDN.geo.json', 'SEN.geo.json', 'SLB.geo.json', 'SLE.geo.json', 'SLV.geo.json', 'SOM.geo.json', 'SRB.geo.json', 'SSD.geo.json', 'SUR.geo.json', 'SVK.geo.json', 'SVN.geo.json', 'SWE.geo.json', 'SWZ.geo.json', 'SYR.geo.json', 'TCD.geo.json', 'TGO.geo.json', 'THA.geo.json', 'TJK.geo.json', 'TKM.geo.json', 'TLS.geo.json', 'TTO.geo.json', 'TUN.geo.json', 'TUR.geo.json', 'TWN.geo.json', 'TZA.geo.json', 'UGA.geo.json', 'UKR.geo.json', 'URY.geo.json', 'USA.geo.json', 'UZB.geo.json', 'VEN.geo.json', 'VNM.geo.json', 'VUT.geo.json', 'YEM.geo.json', 'ZAF.geo.json', 'ZMB.geo.json', 'ZWE.geo.json']

  for (let i = 0; i < filenames.length; i++) {
    d3.json('../countries/' + filenames[i])
      .then(data => {
        countries[data['features'][0]['properties']['name']] = data['features'][0]['geometry']['coordinates']
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
  countries = {}
  load_country_polygons(countries)

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

      map.display_data(data)
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
      .selectAll('rect') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);

    map.transform = d3.event.transform
  }

  const zoom = d3.zoom()
    .scaleExtent([1, 50])
    .on('zoom', zoomed);

  map.svg.call(zoom);

  reset.on("click", function(d, i) {
    map.svg.transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity);

    updateData(map, "data/2050/SSP1/SSP1__World.csv")
    map.region = 'World'
    map.climate_scenario = 'SSP1'
    mark_active(ssp1)
  });

  map.svg.on("click", function(d, i) {
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
          updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__" + key + ".csv")
          map.region = key
          break
        }
      }
    }
  })

  ssp1.on("click", function(d, i) {
    draw_charts('1')
    updateData(map, "data/2050/SSP1/SSP1__" + map.region + ".csv");
    map.climate_scenario = 'SSP1'
    mark_active(ssp1)
  })

  ssp2.on("click", function(d, i) {
    draw_charts('2')
    updateData(map, "data/2050/SSP2/SSP2__" + map.region + ".csv");
    map.climate_scenario = 'SSP2'
    mark_active(ssp2)
  })

  ssp3.on("click", function(d, i) {
    draw_charts('3')
    updateData(map, "data/2050/SSP3/SSP3__" + map.region + ".csv");
    map.climate_scenario = 'SSP3'
    mark_active(ssp3)
  })

  ssp4.on("click", function(d, i) {
    draw_charts('4')
    updateData(map, "data/2050/SSP4/SSP4__" + map.region + ".csv");
    map.climate_scenario = 'SSP4'
    mark_active(ssp4)
  })

  ssp5.on("click", function(d, i) {
    draw_charts('5')
    updateData(map, "data/2050/SSP5/SSP5__" + map.region + ".csv");
    map.climate_scenario = 'SSP5'
    mark_active(ssp5)
  })

  eu.on("click", function(d, i) {
    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__Europe.csv")
    map.region = 'Europe'
  })

  af.on("click", function(d, i) {
    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__Africa.csv")
    map.region = 'Africa'
  })

  as.on("click", function(d, i) {
    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__Asia.csv")
    map.region = 'Asia'
  })

  na.on("click", function(d, i) {
    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__North America.csv")
    map.region = 'North America'
  })

  // TODO Costa Rica is in north america, not in south america. Correct data
  sa.on("click", function(d, i) {
    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__South America.csv")
    map.region = 'South America'
  })

  oc.on("click", function(d, i) {
    updateData(map, "data/2050/" + map.climate_scenario + "/" + map.climate_scenario + "__Oceania.csv")
    map.region = 'Oceania'
  })

});
