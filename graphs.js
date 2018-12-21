const countries = ['Republic of the Congo','Germany','Armenia','Guinea Bissau','Nicaragua','Africa','Ireland','Asia','Hungary','Oman','Saudi Arabia','Bosnia and Herzegovina',
'Jordan','Venezuela','Czech Republic','South Sudan','Liberia','United Republic of Tanzania','Morocco','South Africa','Senegal','Niger','Falkland Islands','Libya','Panama',
'Lithuania','Kazakhstan','Ecuador','Argentina','Jamaica','Russia','Papua New Guinea','Zambia','Slovakia','Ethiopia','Sierra Leone','Western Sahara','Uganda','Guinea','Taiwan',
'South America','Burundi','Kenya','Algeria','Turkmenistan','Honduras','Switzerland','Tunisia','Haiti','Portugal','Togo','Japan','Iceland','Mozambique','Democratic Republic of the Congo',
'Oceania','Luxembourg','West Bank','Benin','Europe','Romania','Kuwait','Madagascar','United Arab Emirates','Australia','Gabon','Malawi','North Korea','Cambodia','Belarus',
'Finland','Malaysia','Kosovo','France','Mongolia','Netherlands','Vanuatu','Egypt','Cuba','Laos','Cameroon','Angola','North America','Spain','The Bahamas','Gambia','Kyrgyzstan',
'Swaziland','Bulgaria','Botswana','Latvia','Moldova','Mali','Denmark','Iraq','Azerbaijan','New Caledonia','Philippines','New Zealand','Norway','Poland','Macedonia',
'United States of America','Mauritania','French Guiana','Greenland','Slovenia','Peru','Paraguay','World','Nigeria','Pakistan','China','South Korea','Chad','Costa Rica',
'Sweden','Somalia','Chile','Bangladesh','Djibouti','Thailand','Uruguay','Sri Lanka','Namibia','Canada','East Timor','Tajikistan','Central African Republic','Vietnam','India',
'United Kingdom','Eritrea','Bolivia','Qatar','Afghanistan','Belgium','Ivory Coast','Brazil','Belize','Rwanda','Cyprus','Austria','Puerto Rico','Indonesia','Mexico',
'El Salvador','Turkey','Burkina Faso','Republic of Serbia','Brunei','Trinidad and Tobago','Guatemala','Georgia','Nepal','Croatia','Ukraine','Bhutan','Uzbekistan','Greece',
'Colombia','Guyana','Dominican Republic','Montenegro','Italy','Lesotho','Solomon Islands','Syria','Fiji','Zimbabwe','Yemen','Ghana','Israel','Equatorial Guinea','Sudan',
'Iran','Albania','Estonia','Myanmar','Lebanon','Suriname'];


function whenDocumentLoaded(action) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", action);
  } else {
    action();
  }
}


function autocomplete(inp, arr) {
	let currentFocus;
	inp.addEventListener("input", function(e) {
		let a, b, i, val = this.value;
		closeAllLists();
		if (!val) { return false;}
		currentFocus = -1;
		a = document.createElement("DIV");
		a.setAttribute("id", this.id + "autocomplete-list");
		a.setAttribute("class", "autocomplete-items");
		this.parentNode.appendChild(a);
		for (i = 0; i < arr.length; i++) {
			if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
				b = document.createElement("DIV");
				b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
				b.innerHTML += arr[i].substr(val.length);
				b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
				b.addEventListener("click", function(e) {
					inp.value = this.getElementsByTagName("input")[0].value;
					closeAllLists();
				});
				a.appendChild(b);
			}
		}
	});
	inp.addEventListener("keydown", function(e) {
		let x = document.getElementById(this.id + "autocomplete-list");
		if (x) x = x.getElementsByTagName("div");
		if (e.keyCode == 40) {
			currentFocus++;
			addActive(x);
		} else if (e.keyCode == 38) { 
			currentFocus--;
			addActive(x);
		} else if (e.keyCode == 13) {
			e.preventDefault();
			if (currentFocus > -1) {
				if (x) x[currentFocus].click();
			}
		}
	});
	function addActive(x) {
		if (!x) return false;
		removeActive(x);
		if (currentFocus >= x.length) currentFocus = 0;
		if (currentFocus < 0) currentFocus = (x.length - 1);
		x[currentFocus].classList.add("autocomplete-active");
	}
	function removeActive(x) {
		for (let i = 0; i < x.length; i++) {
			x[i].classList.remove("autocomplete-active");
		}
	}
	function closeAllLists(elmnt) {
		let x = document.getElementsByClassName("autocomplete-items");
		for (let i = 0; i < x.length; i++) {
			if (elmnt != x[i] && elmnt != inp) {
				x[i].parentNode.removeChild(x[i]);
			}
		}
	}

	document.addEventListener("click", function (e) {
		closeAllLists(e.target);
	});
}


whenDocumentLoaded(() => {
  

  let country_selection = document.getElementById("select_country");
  dropdown_scenario.onchange = function() {
    let ssp_nb = this.value;
    let ssp_type = 'SSP' + ssp_nb;
    if (!map.compare_mode) {
      updateData(map, 'data/2050/SSP' + ssp_nb + '/SSP' + ssp_nb + '_' + map.region + '.csv', map.region, map.region_type, ssp_type)
    }
    update_story(ssp_type)
  }


  let data26 = [];
  let data45 = [];
  let data60 = [];
  let data85 = [];

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
      
    });



});




autocomplete(document.getElementById("select_country"), countries);