document.getElementById("defaultOpen").click();


function plot_data(evt, to_show) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(to_show).style.display = "block";
    evt.currentTarget.className += " active";


    if (to_show == "sufficiency") {
        let map_list;
        map_list = document.getElementsByClassName("map_six");
        while (map_list.length > 0) {
            let to_remove = map_list[map_list.length-1];
            to_remove.parentNode.removeChild(to_remove);
            console.log("Removed map");
        }
        map_list = document.getElementsByClassName("map_two");
        while (map_list.length < 2) {
            let maps = document.getElementById("maps");
            let new_map = document.createElement("div");
            new_map.setAttribute('id', "map" + map_list.length.toString());
            new_map.setAttribute('class', "map_two");
            maps.appendChild(new_map);

            console.log("Added map");
            map_list = document.getElementsByClassName("map_two");
        }

        plot_choropleth();
    }

    else {
        let map_list;
        map_list = document.getElementsByClassName("map_two");
        while (map_list.length > 0) {
            let to_remove = map_list[map_list.length-1];
            to_remove.parentNode.removeChild(to_remove);
            console.log("Removed map");
        }
        map_list = document.getElementsByClassName("map_six");
        while (map_list.length < 6) {
            let maps = document.getElementById("maps");
            let new_map = document.createElement("div");
            new_map.setAttribute('id', "map" + map_list.length.toString());
            new_map.setAttribute('class', "map_six");
            maps.appendChild(new_map);
            console.log("Added map");
            map_list = document.getElementsByClassName("map_six");
        }

        show_maps();

    }
};


function show_maps() {
    let maps = [];
    for (i = 0; i < 6; i++) {
        let map = new L.map('map' + i.toString()).setView([20, -0], 1);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 10
        }).addTo(map);

        let title = L.control({position: 'bottomright'});
        title.onAdd = function (map) { // create a div with a class "info legend"
            let div = L.DomUtil.create('div', 'title_six');

            if (i==0) div.innerHTML = '<p class="title_six" >2000</p>';
            else div.innerHTML = '<p class="title_six" >SSP' + i.toString() + '</p>';
            return div;
        };

        title.addTo(map);

        maps.push(map);
    }


    for (i = 0; i < 6; i++) {
        for (j = i+1; j < 6; j++) {
            maps[i].sync(maps[j]);
            maps[j].sync(maps[i]);
        }
    }

    let topoLayer = new L.GeoJSON();
};



function plot_choropleth() {

   // Define Map area/position and any background tiles
   let map0 = new L.map('map0').setView([20, -0], 1);
   L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 10
    }).addTo(map0);

   
   let topoLayer = new L.GeoJSON();

   d3.csv("data/choropleth/agg_countries_2000.csv", function(data) {
    const legend0 = 0, legend1 = 50, legend2 = 90, legend3 = 100, legend4 = 110, legend5 = 400;
    const fmtn = d3.format(".0f");
    const color_map = ["#cb181d","#fb6a4a","#fcbba1","#c7e9c0","#74c476","#238b45"];
        // Loop through imported data and populate lookup table with the values to be displayed
        let mapLookup = d3.map();
        let borders = 'data/world-110m.geojson';

        data.forEach( function(d) { mapLookup.set(d.country, +d["Sufficiency 2000"]); });

        // Colours used (uses parameters defined at start)
        function getColor(d) {
            return d >= legend5 ? color_map[5] :
            d >= legend4 ? color_map[4] :
            d >= legend3 ? color_map[3] :
            d >= legend2 ? color_map[2] :
            d >= legend1 ? color_map[1] :
            d >= legend0 ? color_map[0] :
            'grey';
        }

        // Imports boundary data and passes to the addTopoData function
        $.getJSON(borders).done(addTopoData);


        // Draws the boundary data on the map
        function addTopoData(topoData) {
            topoLayer.addData(topoData);
            topoLayer.addTo(map0)
            topoLayer.eachLayer(handleLayer);
        }

        // Set the style of the boundary data layer (fill color based on data values)
        function handleLayer(layer) {
            layer.setStyle({ fillColor : getColor(mapLookup.get(layer.feature.properties.name)),
                fillOpacity: 0.8,
                color: 'black',
                weight:0.5,
                opacity: 1 });

            layer.on({ mouseover : enterLayer,
                mouseout: leaveLayer  });

        } 

        let info = L.control();

        info.onAdd = function(map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };


        // Behaviour when mouseover an area
        function enterLayer(){
           this.setStyle({ weight: 2, opacity: 1 });

           let country = this.feature.properties.name;
               // method that we will use to update the tooltip feature
               info.update = function () {
                this._div.innerHTML = country + ' <br/> ' + "2000 Sufficiency" + ': ' + fmtn(mapLookup.get(country)) + "%";
            };
            info.addTo(map0);
        }
          // Behaviour when mouseout an area
          function leaveLayer(){
           this.setStyle({ weight: 0.5 });
               // method that we will use to reset the tooltip feature
               info.update = function () {
                this._div.innerHTML = 'Hover over a country for more information';
            };
            info.addTo(map0);
        }

        // Add legend (6 ranges)
        let legend = L.control({position: 'bottomleft'});

        legend.onAdd = function (map) { // create a div with a class "info legend"
        let div = L.DomUtil.create('div', 'info legend'),
        grades = [legend0, legend1, legend2, legend3, legend4, legend5],
        labels = [];

            // loop through our density intervals and generate a label with a colored square for each interval
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +='<i style="background:' + getColor(grades[i] + 0.001) + '"></i> '  +
                fmtn(grades[i]) + (grades[i + 1] + 0.001 ? ' to ' + fmtn(grades[i + 1]) + "%" + '<br>' : '+' + "%" );
            }

            return div;
        };

        legend.addTo(map0);

        let title = L.control({position: 'bottomright'});
        title.onAdd = function (map) { // create a div with a class "info legend"
        let div = L.DomUtil.create('div', 'title_two');
            div.innerHTML = '<p class="title" >2000</p>';
            return div;
        };

        title.addTo(map0);

    });

   let map1 = new L.map('map1').setView([20, -0], 1);
   L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 10
    }).addTo(map1);

   let title = L.control({position: 'bottomright'});
    title.onAdd = function (map) { 
    let div = L.DomUtil.create('div', 'title_two');
        div.innerHTML = '<p class="title_two" >2050</p>';
        return div;
    };

    title.addTo(map1);


   map0.sync(map1);
   map1.sync(map0);
};







