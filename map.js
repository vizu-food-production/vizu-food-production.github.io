


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
	// `DOMContentLoaded` already fired
	action();
	}
}

function updateData(map, path_to_data) {
	let data = [];
	d3.csv(path_to_data, function(csv) {
		data.push({"min_lon": (+csv.min_lon), "max_lon": (+csv.max_lon), "min_lat": -(+csv.min_lat), "max_lat": -(+csv.max_lat),
							 "Change_in_Yield": parseInt(csv.Change_in_Yield), "lon": (+csv.lon), "lat": -(+csv.lat)});
	})
	.then(() => {
		map.display_data(data)
	});
}

class Map {
	constructor() {
		this.width = window.innerWidth * (2/3);
		this.height = window.innerHeight * 0.95;
		this.projection = d3.geoMercator()
			.translate([this.width / 2, 5*this.height / 8])
			.scale((this.width) /2 / Math.PI);
		this.path = d3.geoPath()
			.projection(this.projection);
		this.svg = d3.select('#map').append('svg')
			.attr('width', this.width)
			.attr('height', this.height);
		this.land = this.svg.append('g');
		this.circles = this.svg.append('g');
		this.boundaries = this.svg.append('g');
	}


	display_data(data) {
		const context = this;

		const colorScale = d3.scaleLinear()
												 .domain([d3.min(data, d => d.Change_in_Yield), d3.max(data, d => d.Change_in_Yield)])
												 .range(['red', 'green'])

    let dataPoints = this.circles.selectAll('rect').data(data, d => d.lon.toString() + "," + d.lat.toString());

		dataPoints
			.enter().append('rect')
			.attr('x', d => context.projection([d.min_lon, d.min_lat])[0])
			.attr('y', d => context.projection([d.min_lon, d.min_lat])[1])
			.attr('width', d => context.projection([d.max_lon, d.max_lat])[0] - context.projection([d.min_lon, d.min_lat])[0])
			.attr('height', d => context.projection([d.max_lon, d.max_lat])[1] - context.projection([d.min_lon, d.min_lat])[1])
			.style('fill', d => colorScale(d.Change_in_Yield));

		dataPoints
			.attr('x', d => context.projection([d.min_lon, d.min_lat])[0])
			.attr('y', d => context.projection([d.min_lon, d.min_lat])[1])
			.attr('width', d => context.projection([d.max_lon, d.max_lat])[0] - context.projection([d.min_lon, d.min_lat])[0])
			.attr('height', d => context.projection([d.max_lon, d.max_lat])[1] - context.projection([d.min_lon, d.min_lat])[1])
			.style('fill', d => colorScale(d.Change_in_Yield));

		dataPoints
			.exit()
			.remove();
	}

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
	d3.csv("../data/2050/SSP1_cc_agg.csv", function(csv) {
		data.push({"min_lon": (+csv.min_lon), "max_lon": (+csv.max_lon), "min_lat": -(+csv.min_lat), "max_lat": -(+csv.max_lat),
		           "Change_in_Yield": parseInt(csv.Change_in_Yield), "lon": (+csv.lon), "lat": -(+csv.lat)});
	})
	.then(() => {
  	background.then(world => {
			map.land.append('path')
	  		.datum({ type: 'Sphere' })
	  		.attr('class', 'sphere')
	  		.attr('d', map.path);

			map.land.append('path')
				.datum(topojson.merge(world, world.objects.countries.geometries))
				.attr('class', 'land')
				.attr('d', map.path);

  		map.boundaries.append('path')
	  		.datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
	  		.attr('class', 'boundary')
	  		.attr('d', map.path);
  	});

  	map.display_data(data)

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
		updateData(map, "../data/2050/SSP1_cc_agg.csv");
	})

	ssp2.on("click", function(d, i) {
		updateData(map, "../data/2050/SSP2_cc_agg.csv");
	})

	ssp3.on("click", function(d, i) {
		updateData(map, "../data/2050/SSP3_cc_agg.csv");
	})

	ssp4.on("click", function(d, i) {
		updateData(map, "../data/2050/SSP4_cc_agg.csv");
	})

	ssp5.on("click", function(d, i) {
		updateData(map, "../data/2050/SSP5_cc_agg.csv");
	})

	});
