// Final Project Choropleths
// Quyen Ha and Marty Dang

//////////////////////////////////////////////////////////////////////
// Namespace
//   namespace variables to put on top, useful for updating

var NS = {

    // original namespace variables
    width: 980,
    height: 600,
    fruitsTable: d3.map(),
    fruitsExpenditure: d3.map(),
    active: d3.select(null),

    // variables for the legend
    svgLegendHeight: 160,
    svgLegendWidth: 140,
    boxMargin: 4,
    lineHeight: 14,
    keyHeight: 10,
    keyWidth: 40,
    boxWidth: 130

};

//////////////////////////////////////////////////////////////////////
// functions start here

// this is the main engine of the program
function main () {

    // create the map's title
    makeTitle ();

    // create the svg context for the map
    makeSVG ();

    // create the quantileScale
    makeQuantileScale ();

    // create the projection and path to draw the choropleth
    makeProjectionPath ();

    // queue the us.json data and load in us.json
    queueData ();

    // create the dropdown menu
    makeMenu ();

    // rearrange the buttons and slider for aesthetic purpose
    aesthetics ();

} // end main

// put a title at the bottom. this is a distinct SVG element
function makeTitle () {

    // title is a separate SVG element
    NS.headingsvg = d3.select("body")
        .append("svg")
	.attr("id", "svgTitle")
        .attr("width", NS.width)
        // height for the heading is 30 pixels
        .attr("height", 30);

    // add text title to the svg element
    NS.headingsvg.append("g")
	.append("text")
	.attr("class", "heading")
	.attr("text-anchor", "middle")
	.attr("font-family", "sans-serif")
	.attr("x", NS.width/2 - 20)
	.attr("y", 20)
	.attr("font-size", "18px")
	.attr("font-weight", "bold")
	.text("United States Map of Counties' Average Fruit Prices and Consumption");

} // end makeTitle

// create the svg context for the map
function makeSVG () {

    var svg = d3.select("body")
	    .append("svg")
	    .attr("id", "svgMap")
	    .attr("width", NS.width)
	    .attr("height", NS.height);

    // store the svg in the namespace
    NS.svg = svg;

} // end makeSVG

// create the projection and path to draw the choropleth
function makeProjectionPath () {

    // set up the projection
    NS.projection = d3.geoAlbers()
	    .scale(1280)
	    .translate([NS.width/2, NS.height/2]);

    // set up the path
    NS.path = d3.geoPath()
	.projection(NS.projection);

} // end makeProjectionPath

// make the quantileScale
function makeQuantileScale () {

    // make the quantileScale that corresponds values with 9 shades of blue
    NS.quantileScale = d3.scaleQuantile()
	.range(["#f7fcfd", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6",
		"#4292c6", "#2171b5", "#08519c", "#08306b"]);

    /*// make the quantileScale that corresponds values with 9 shades of purple
    NS.quantileScale = d3.scaleQuantile()
	.range(["#f7fcfd", "#e0ecf4", "#bfd3e6", "#9ebcda", "#8c96c6",
		"#8c6bb1", "#88419d", "#810f7c", "#4d004b"]);*/

    /*// make the quantileScale that corresponds values with 9 shades of red
    NS.quantileScale = d3.scaleQuantile()
	.range(["#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014",
		"#cc4c02", "#993404", "#662506"]);*/

    /*// make the quantileScale that corresponds values with 9 shades of red
    NS.quantileScale = d3.scaleQuantile()
	.range(["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4",
		"#1d91c0", "#225ea8", "#253494", "#081d58"]);*/

} // end makeQuantileScale

// function to draw states, states' lines, and counties of choropleth
function makeMap () {

    // create invisible rectangle over the svg to catch the reset event
    NS.svg.append("rect")
	.attr("class", "background")
	.attr("width", NS.width)
	.attr("height", NS.height)
        // when the rectangle is clicked, return to original map
	.on("click", reset);

    // create group g that will hold both states and counties elements
    NS.g = NS.svg.append("g")
	.style("stroke-width", "0.25px")
	.attr("transform", "translate(" + 0 + "," + 0 + "),  scale(" + 1 + "," + 1 + ")");

    // draw the counties in group g, with id counties
    NS.g.append("g")
	.attr("id", "counties")
	.selectAll("path")
	.data(NS.countiesData)
	.enter()
	.append("path")
	.attr("d", NS.path)
	.attr("class", "county")
	.on("click", clicked);

    // draw the states border
    NS.g.append("path")
	.datum(NS.statesLines)
	.attr("id", "state-borders")
	.attr("d", NS.path);

    // when the home button is clicked, also reset to original map
    d3.select("#zoomOut")
	.on("click", reset);

    d3.select(self.frameElement).style("height", NS.height + "px");

} // end makeMap

// add fruits types into the dropdown menu
function makeMenu () {

    // run update function when dropdown selection changes
    d3.select("#fruit").on("change", function () {

	// find which type of fruits was selected from the menu
	NS.selectedFruit = d3.select(this)
		.property("value");

	// pair price with expenditure
	pairPriceExp ();

	// initialize the month to January (1)
	NS.initialFruits = NS.fruitsByMonth.filter(
	    function(d) {
		return d.key == 1;
	    });

	// parse the data and create a Fruits dictionary with
	// with fips as keys and price as value
	NS.initialFruits.forEach(function(d) {
	    d.values.forEach(function(c) {
		c.price = c[NS.selectedFruit];
		NS.fruitsTable.set(c.fips, +c.price);
	    });
	});

	// parse the data and create an Expenditure dictionary with
	// with fips as keys and expenditure as value
	NS.initialFruits.forEach(function(d) {
	    d.values.forEach(function(c) {
		c.expenditure = c[NS.selectedExpenditure];
		NS.fruitsExpenditure.set(c.fips, +c.expenditure);
	    });
	});

	// remove the old slider label
	d3.select(".slider-label").remove();

	// remove the old slider
	d3.select("input").remove();

	// remove the old legend
 	d3.select("#svgLegend").remove();

	// remove the old bubbles
	d3.selectAll("circle").remove();

	// update the map with appropriate colors and add tooltip to counties
	updateMap ();

	// make the legends
	makeLegends ();

	// add the slider that allows the user to choose month
	makeSlider ();

	// create the bubbles that represent a county's expenditure on the chosen fruit
	makeBubbles ();

    });

    // load in the data depends on which year is selected
    d3.select("#year").on("change", function () {

	// remove the old map
	d3.select("#svgMap").remove();

	// remove the old legend
	d3.select("#svgLegend").remove();

	// remove the old label
	d3.select("#svgTitle").remove();

	// remove the old slider
	d3.select("input").remove();

	// remove the old slider label
	d3.select(".slider-label").remove();

	// remove the old bubbles
	d3.selectAll("circle").remove();

	// set the year value from the dropdown menu and load in that year's data
	var year = this.value;
	chooseYear (year);

    });

} // end makeMenu

// function to create the legends
function makeLegends () {

    // create a separate svg to hold the legend
    var svgLegend = d3.select("body")
	    .append("svg")
	    .attr("id", "svgLegend")
	    .attr("width", NS.svgLegendWidth)
	    .attr("height", NS.svgLegendHeight)
	    .attr("transform", "translate(" + 25 + "," + (-NS.height/2 + 240) + ")");

    // store the svg in the namespace
    NS.svgLegend = svgLegend;

    // create the xScale
    NS.xScale = d3.scaleLinear()
	.domain(NS.fruitsTable.values());

    // create the legends holder
    NS.legend = NS.svgLegend.append("g")
	.attr("class", "legend");

    // create the legends title
    NS.title = ["Fruits price ($/ounce)"];
    NS.titleHeight = NS.title.length * NS.lineHeight + NS.boxMargin;
    NS.legend.selectAll("text")
	.data(NS.title)
	.enter()
	.append("text")
	.attr("class", "legend-title")
	.attr("y", function(d, i) { return (i+1) * NS.lineHeight-2; })
	.text(function(d) { return d; });

    // create the legend box
    NS.legendBox = NS.legend.append("rect")
	.attr("transform", "translate (0," + NS.titleHeight + ")")
	.attr("class", "legend-box")
	.attr("width", NS.boxWidth)
	.attr("height", NS.quantileScale.range().length *
	      NS.lineHeight + 2 * NS.boxMargin +
	      NS.lineHeight - NS.keyHeight);

    // create the holder for the rectangles
    NS.legendItems = NS.legend.append("g")
	.attr("transform", "translate (8," + (NS.titleHeight + NS.boxMargin) + ")")
	.attr("class", "legend-items");

    // add the rectangles to the legend
    NS.legendItems.selectAll("rect")
	.data(NS.quantileScale.range().map(function(d) {
	    d = NS.quantileScale.invertExtent(d);
	    if (d[0] == null) d[0] = NS.xScale.domain()[0];
	    if (d[1] == null) d[1] = NS.xScale.domain()[1];
	    return d;
	}))
	.enter()
	.append("rect")
	.attr("y", function(d, i) { return i * NS.lineHeight + NS.lineHeight - NS.keyHeight; })
	.attr("width", NS.keyWidth)
	.attr("height", NS.keyHeight)
	.style("fill", function(d) { return NS.quantileScale(d[0]); });

    // add the text next to the rectangles
    NS.legendItems.selectAll("text")
	.data(NS.quantileScale.range().map(function(d) {
	    d = NS.quantileScale.invertExtent(d);
	    if (d[0] == null) d[0] = NS.xScale.domain()[0];
	    if (d[1] == null) d[1] = NS.xScale.domain()[1];
	    return d;
	}))
	.enter()
	.append("text")
	.attr("x", 48)
	.attr("y", function(d, i) { return (i+1) * NS.lineHeight - 2; })
	.text(function(d) { return d[0].toFixed(3) + "-" + d[1].toFixed(3); });

} // end makeLegends

// function to fill the counties with appropriate colors and add title to counties
function updateMap () {

    // update the quantileScale with new Fruits values
    NS.quantileScale.domain(NS.fruitsTable.values());

    // fill the counties with appropriate colors using the new quantileScale
    NS.g.selectAll("path.county")
	.style("fill", function(d) {
	    // get the price from the fruitsTable
	    d.price = NS.fruitsTable.get(d.id);
	    return NS.quantileScale(d.price);
	});

    // create the tooltip using d3-tip.js
    NS.toolTip = d3.tip()
	.attr("class", "d3-tip")
	.offset([-10, 0])
	.html(function(d) {

	    // convert the numerical FIPS to string
	    var statesFIP = d.id.toString();

	    // if the FIPS is only 4-digit long, then only takes the first digit
	    // else takes the first two digits
	    if (statesFIP.length == 4){
		statesFIP = statesFIP.slice(0, 1);
	    } else {
		statesFIP = statesFIP.slice(0, 2);
	    }

	    // if the price is undefined then display n/a on the tooltip
	    if (d.price == undefined) {
		return NS.countyNames[d.id] + ", " + NS.stateNames[statesFIP] +
		    "<br/>Fruit's price: " + "n/a";
	    } else {
		// display the county name, the state name, and the fruit's price in tooltip
		return NS.countyNames[d.id] + ", " + NS.stateNames[statesFIP] +
		    "<br/>Fruit's price: " + "$" + (d.price).toFixed(3);
		}
	    });

    // call the tooltip
    NS.svg.call(NS.toolTip);

    // add tooltip to county
    NS.g.selectAll("path.county")
        // display the tooltip when hovering over county
	.on("mouseover", NS.toolTip.show)
	.on("mouseout", NS.toolTip.hide);

} // end updateMap

// make the time slider that allows user to choose month
function makeSlider () {

    // create the slider, with min value as 1 and max value as 12
    NS.slider = d3.select("#sliderContainer")
	.append("g")
	.append("input")
	.attr("type", "range")
	.attr("min", 1)
	.attr("max", 12)
	.attr("value", 1)
	.attr("class", "slider")
	.on("input", function() {
	    var month = this.value;
	    updateLabel (month);
	    updateByMonth (month);
	});

    // create the slider scale
    NS.sliderScale = d3.scaleLinear()
	.domain([1, 12])
	.range([0, 400]);

    // create the tick marks for the slider
    NS.slider.call(d3.axisBottom(NS.sliderScale)
		   .tickSize(10)
		   .ticks(12));

    // initialize the label to January
    // add label to the slider
    d3.select("#sliderContainer")
	.append("text")
	.attr("class", "slider-label")
	.text("January");


} // end makeSlider

// function to create the text label above the slider
function updateLabel (month) {

    // convert number to month
    var monthLabel;
    if (month == 1) monthLabel = "January";
    if (month == 2) monthLabel = "February";
    if (month == 3) monthLabel = "March";
    if (month == 4) monthLabel = "April";
    if (month == 5) monthLabel = "May";
    if (month == 6) monthLabel = "June";
    if (month == 7) monthLabel = "July";
    if (month == 8) monthLabel = "August";
    if (month == 9) monthLabel = "September";
    if (month == 10) monthLabel = "October";
    if (month == 11) monthLabel = "November";
    if (month == 12) monthLabel = "December";

    // remove the old text slider value changes
    d3.select("#sliderContainer")
	.selectAll("text")
	.remove();

    // add label to the slider
    d3.select("#sliderContainer")
	.append("text")
	.attr("class", "slider-label")
	.text(monthLabel);

} // end updateLabel

// update the choropleth using the month chosen from the slider
function updateByMonth (month) {

    // filter the fruits with the new chosen month
    NS.filteredFruits = NS.fruitsByMonth.filter(
	function(d) {
	    return d.key == month;
	});

    // create a new fruit dictionary with the new month
    NS.filteredFruits.forEach(function(d) {
	d.values.forEach(function(c) {
	    c.price = c[NS.selectedFruit];
	    NS.fruitsTable.set(c.fips, +c.price);
	});
    });

    // parse the data and create an Expenditure dictionary with
    // with fips as keys and expenditure as value
    NS.filteredFruits.forEach(function(d) {
	d.values.forEach(function(c) {
	    c.expenditure = c[NS.selectedExpenditure];
	    NS.fruitsExpenditure.set(c.fips, +c.expenditure);
	});
    });

    // remove the old bubbles
    d3.selectAll("circle").remove();

    // remove the old legend
    d3.select("#svgLegend").remove();

    // create a new legend
    makeLegends ();

    // make new bubbles
    makeBubbles ();

    // update the map using the data of the filtered month
    updateMap ();

} // end updateByMonth

// function to zoom in when a state is clicked
function clicked(d) {

    var x, y, k;

    // when zoomed it, recalculating x and y position using centroid and county's position
    if (d && NS.centered !== d) {
	var centroid = NS.path.centroid(d);
	x = centroid[0];
	y = centroid[1];
	k = 3;
	NS.centered = d;
    }
    // else when zoomed out, recalculating x and y position using the SVG
    else {
	x = NS.width / 2;
	y = NS.height / 2;
	k = 1;
	NS.centered = null;
    }

    // remove the bubbles when zoomed in
    NS.g.selectAll(".bubbles")
	.remove();

    // change the center of the county path
    NS.g.selectAll("path")
	.classed("active", NS.centered && function(d) { return d === NS.centered; });

    // transform the svg using the new center
    NS.g.transition()
	.duration(750)
	.attr("transform", "translate(" + NS.width / 2 + "," + NS.height / 2 +
	      ")scale(" + k + ")translate(" + -x + "," + -y + ")")
	.style("stroke-width", 1.5 / k + "px");

} // end clicked

// reset to original map
function reset () {

    if (NS.active.node() === this) return reset();

    NS.active.classed("active", false);
    NS.active = d3.select(null);

    // transition back to view full svg
    NS.g.transition()
	.duration(750)
	.style("stroke-width", "1.5px")
	.attr("transform", "translate(" + 0 + "," + 0 + "),  scale(" + 1 + "," + 1 + ")");

    // remake the bubble when zoom out
    makeBubbles ();

} // end reset

// queue the data and load in us.json
function queueData () {

    d3.queue()
	.defer(d3.json, "geodata/us.json")
	.await(ready);

} // end queueData

// main function ready
function ready (error, us) {

    // if there is an error in loading the data, throw error
    if (error) throw error;

    // store the counties and states data into the namespace
    NS.countiesData = topojson.feature(us, us.objects.counties).features;
    NS.statesData = topojson.feature(us, us.objects.states).features;
    NS.statesLines = topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; });

    // because us.json does not contain counties' name, load in counties name file
    // to map counties' FIPS (id) to counties' names
    d3.tsv("geodata/us-county-names.tsv", function(tsv){
	// extract just the names and Ids
	NS.countyNames = {};
	tsv.forEach(function(d,i){
	    NS.countyNames[d.id] = d.name;
	});
    });

    // because us.json does not contain states' name, load in counties name file
    // to map states' FIPS (id) to states' names
    d3.tsv("geodata/us-state-names.tsv", function(tsv){
	// extract just the names and Ids
	NS.stateNames = {};
	tsv.forEach(function(d,i){
	    NS.stateNames[d.id] = d.name;
	});
    });

    // draw states, states' line, and counties of choropleth
    makeMap ();

} // end ready

//
function chooseYear (year) {

    if (year == "2011") {
        d3.csv("fruitsdata/ChoroplethCE2011.csv", function (error, data) {
	    // if error log to console
	    if (error) {
		console.log(error);
	    } else {
		console.log("2011 dataset loaded");
		// assign the dataset into the namespace
		NS.fruitsData = data;
		// format the data
		NS.fruitsData.forEach(function(d) {
		    d.month = parseInt(d.month);
		    d.fips = parseInt(d.fips);
		});
		// nesting the data by month
		NS.fruitsByMonth = d3.nest()
		    .key(function(d) { return d.month; })
		    .entries(NS.fruitsData);
		// call the main function
		main ();
	    }
	});
    }
    if (year == "2012") {
        d3.csv("fruitsdata/ChoroplethCE2012.csv", function (error, data) {
	    // if error log to console
	    if (error) {
		console.log(error);
	    } else {
		console.log("2012 dataset loaded");
		// assign the dataset into the namespace
		NS.fruitsData = data;
		// format the data
		NS.fruitsData.forEach(function(d) {
		    d.month = parseInt(d.month);
		    d.fips = parseInt(d.fips);
		});
		// nesting the data by month
		NS.fruitsByMonth = d3.nest()
		    .key(function(d) { return d.month; })
		    .entries(NS.fruitsData);
		// call the main function
		main ();
	    }
	});
    }
    if (year == "2013") {
        d3.csv("fruitsdata/ChoroplethCE2013.csv", function (error, data) {
	    // if error log to console
	    if (error) {
		console.log(error);
	    } else {
		console.log("2013 dataset loaded");
		// assign the dataset into the namespace
		NS.fruitsData = data;
		// format the data
		NS.fruitsData.forEach(function(d) {
		    d.month = parseInt(d.month);
		    d.fips = parseInt(d.fips);
		});
		// nesting the data by month
		NS.fruitsByMonth = d3.nest()
		    .key(function(d) { return d.month; })
		    .entries(NS.fruitsData);
		// call the main function
		main ();
	    }
	});
    }
} // end chooseYear

// function to pair price with expenditure
function pairPriceExp () {

	// pair consumption with expenditure
	if (NS.selectedFruit == "oapplep")  { NS.selectedExpenditure = "oapplee";  }
	if (NS.selectedFruit == "oblackbp") { NS.selectedExpenditure = "oblackbe"; }
	if (NS.selectedFruit == "obluebp")  { NS.selectedExpenditure = "obluebe";  }
	if (NS.selectedFruit == "ograpep")  { NS.selectedExpenditure = "ograpee";  }
 	if (NS.selectedFruit == "ograpefp") { NS.selectedExpenditure = "ograpefe"; }
 	if (NS.selectedFruit == "olemonp")  { NS.selectedExpenditure = "olemone";  }
	if (NS.selectedFruit == "oorangep") { NS.selectedExpenditure = "oorangee"; }
	if (NS.selectedFruit == "oraspbp")  { NS.selectedExpenditure = "oraspbe";  }
	if (NS.selectedFruit == "ostrawp")  { NS.selectedExpenditure = "ostrawe";  }
	if (NS.selectedFruit == "oothp")    { NS.selectedExpenditure = "oothe";    }
	if (NS.selectedFruit == "capplep")  { NS.selectedExpenditure = "capplee";  }
	if (NS.selectedFruit == "cblackbp") { NS.selectedExpenditure = "cblackbe"; }
	if (NS.selectedFruit == "cbluebp")  { NS.selectedExpenditure = "cbluebe";  }
	if (NS.selectedFruit == "cgrapep")  { NS.selectedExpenditure = "cgrapee";  }
	if (NS.selectedFruit == "cgrapefp") { NS.selectedExpenditure = "cgrapefe"; }
	if (NS.selectedFruit == "clemonp")  { NS.selectedExpenditure = "clemone";  }
	if (NS.selectedFruit == "corangep") { NS.selectedExpenditure = "corangee"; }
	if (NS.selectedFruit == "craspbp")  { NS.selectedExpenditure = "craspbe";  }
	if (NS.selectedFruit == "cstrawp")  { NS.selectedExpenditure = "cstrawe";  }
	if (NS.selectedFruit == "cothp")    { NS.selectedExpenditure = "cothe";    }

} // end pairPriceExp

// function to make bubbles for expenditure when button bubblesOn is clicked
function makeBubbles () {

    NS.bubbles = NS.g.selectAll(".bubbles")
	.data(NS.countiesData)
	.enter()
	.append("circle")
	.attr("class", "bubbles")
	.attr("r", function(d) {
	    // get the expenditure from fruitsExpenditure dictionary
	    d.expenditure = NS.fruitsExpenditure.get(d.id);
	    // if the expenditure is undefined, set it to 0
	    if (d.expenditure == undefined) { d.expenditure = 0; }
	    // set the initial radius to 0
	    return 1.5*d.expenditure;
	})
        // move the circle to the appropriate county's location
	.attr("transform", function(d) {
	    return "translate(" + NS.path.centroid(d) + ")";
	})
        // add title to the circle
	.append("title")
	.text(function(d) {

	    // convert the numerical FIPS to string
	    var statesFIP = d.id.toString();

	    // if the FIPS is only 4-digit long, then only takes the first digit
	    // else takes the first two digits
	    if (statesFIP.length == 4){
		statesFIP = statesFIP.slice(0, 1);
	    } else {
		statesFIP = statesFIP.slice(0, 2);
	    }

	    return NS.countyNames[d.id] + ", " + NS.stateNames[statesFIP] +
		"\nAverage expenditure: " + "$" + (d.expenditure).toFixed(2);
	});

    d3.select("#bubblesButton")
	.selectAll("button")
	.on("click",
	    function () {
		// get the id of the button
		var buttonID = this.id;
		// increase circles' radii to actual values when bubblesOn is clicked
		d3.selectAll(".bubbles")
		    .transition()
		    .duration(700)
		    .attr("r", function(d) {
			if (buttonID == "bubblesOn") {
			    // set the radius as 10*expenditure
			    return 1.5*d.expenditure;
			} else if (buttonID == "bubblesOff") {
			    return 0;
			}
		    });
	});

} // end makeBubbles

// rearrange the buttons and slider for aesthetic purpose
function aesthetics () {

    var timeSlider = document.getElementById("sliderContainer");
    timeSlider.style.position = "absolute";
    timeSlider.style.top = 70 + "px";
    timeSlider.style.left = 10 + "px";

    var zoomOut = document.getElementById("zoomOut");
    zoomOut.style.position = "absolute";
    zoomOut.style.top = 110 + "px";

    var controls = document.getElementById("controls");
    controls.style.position = "absolute";
    controls.style.top = 90 + "px";
    controls.style.left = (NS.width+30) + "px";

    var bubbles = document.getElementById("bubblesButton");
    bubbles.style.position = "aboslute";
    bubbles.style.left = NS.width + "px";

    var title = document.getElementById("svgTitle");
    title.style.position = "absolute";
    title.style.top = (NS.height+85) + "px";

} // end aesthetics


//////////////////////////////////////////////////////////////////////
// read in the data file and set up the visualization
d3.csv("fruitsdata/ChoroplethCE2011.csv", function (error, data) {
    // if error log to console
    if (error) {
	console.log(error);
    } else {
	console.log("default dataset loaded");
	// assign the dataset into the namespace
	NS.fruitsData = data;
	// format the data
	NS.fruitsData.forEach(function(d) {
	    d.month = parseInt(d.month);
	    d.fips = parseInt(d.fips);
	});
	// nesting the data by month
	NS.fruitsByMonth = d3.nest()
	    .key(function(d) { return d.month; })
	    .entries(NS.fruitsData);
	// call the main function
	main ();
    }
});

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// adjust links to original data sources
var urls = {
  air: "https://gist.githubusercontent.com/mbostock/7608400/raw/airports.csv",
  fly: "https://gist.githubusercontent.com/mbostock/7608400/raw/flights.csv",
  usa: "https://gist.githubusercontent.com/mbostock/4090846/raw/us.json"
};

var svg = d3.select("svg");
var plot = svg.append("g").attr("id", "plot");

var width  = +svg.attr("width");
var height = +svg.attr("height");

var radius = {min: 6, max: 12};

// placeholder for state data once loaded
var states = null;

// only focus on the continental united states
// https://github.com/d3/d3-geo#geoAlbers
var projection = d3.geoAlbers();

// trigger map drawing
d3.json(urls.usa, drawMap);

/*
 * draw the continental united states
 */
function drawMap(error, map) {
  // determines which ids belong to the continental united states
  // https://gist.github.com/mbostock/4090846#file-us-state-names-tsv
  var isContinental = function(d) {
    var id = +d.id;
    return id < 60 && id !== 2 && id !== 15;
  };

  // filter out non-continental united states
  var old = map.objects.states.geometries.length;
  map.objects.states.geometries = map.objects.states.geometries.filter(isContinental);
  console.log("Filtered out " + (old - map.objects.states.geometries.length) + " states from base map.");

  // size projection to fit continental united states
  // https://github.com/topojson/topojson-client/blob/master/README.md#feature
  states = topojson.feature(map, map.objects.states);
  projection.fitSize([width, height], states);

  // draw base map with state borders
  var base = plot.append("g").attr("id", "basemap");
  var path = d3.geoPath(projection);

  base.append("path")
      .datum(states)
      .attr("class", "land")
      .attr("d", path);

  // draw interior and exterior borders differently
  // https://github.com/topojson/topojson-client/blob/master/README.md#mesh

  // used to filter only interior borders
  var isInterior = function(a, b) { return a !== b; };

  // used to filter only exterior borders
  var isExterior = function(a, b) { return a === b; };

  base.append("path")
      .datum(topojson.mesh(map, map.objects.states, isInterior))
      .attr("class", "border interior")
      .attr("d", path);

  base.append("path")
      .datum(topojson.mesh(map, map.objects.states, isExterior))
      .attr("class", "border exterior")
      .attr("d", path);

  // trigger data drawing
  d3.queue()
    .defer(d3.csv, urls.air, typeAirport)
    .defer(d3.csv, urls.fly, typeFlight)
    .await(filterData);
}

/*
 * see airports.csv
 * convert gps coordinates to number and init degree
 */
function typeAirport(d) {
  d.longitude = +d.longitude;
  d.latitude = +d.latitude;
  d.degree = 0;
  return d;
}

/*
 * see flights.csv
 * convert count to number and init segments
 */
function typeFlight(d) {
  d.count = +d.count;
  return d;
}

/*
 * we need a much smaller subgraph for edge bundling
 */
function filterData(error, airports, flights) {
  if(error) throw error;

  // get map of airport objects by iata value
  // international air transport association (iata)
  var byiata = d3.map(airports, function(d) { return d.iata; });
  console.log("Loaded " + byiata.size() + " airports.");

  // convert links into better format and track node degree
  flights.forEach(function(d) {
    d.source = byiata.get(d.origin);
    d.target = byiata.get(d.destination);

    d.source.degree = d.source.degree + 1;
    d.target.degree = d.target.degree + 1;
  });

  // filter out airports outside of projection
  // or those without a valid state (i.e. d.state === "NA")
  // https://github.com/d3/d3-geo#geoContains
  var old = airports.length;
  airports = airports.filter(function(d) {
    return d3.geoContains(states, [d.longitude, d.latitude]) && d.state !== "NA";
  });
  console.log("Filtered " + (old - airports.length) + " out of bounds airports.");

  // function to sort airports by degree
  var bydegree = function(a, b) {
    return d3.descending(a.degree, b.degree);
  };

  // uncomment nest to show airport with highest degree per state
  // uncomment slice to show top 50 airports by degree
  // uncomment both to see everything break because there are too many airports

  // nest airports by state and reduce to maximum degree airport per state
  // https://github.com/d3/d3-collection#nests
  // airports = d3.nest()
  //   .key(function(d) { return d.state; })
  //   .rollup(function(leaves) {
  //     leaves.sort(bydegree);
  //     return leaves[0];
  //   })
  //   .map(airports)
  //   .values();

  // sort remaining airports by degree
  airports.sort(bydegree);

  airports = airports.slice(0, 50);

  // calculate projected x, y pixel locations
  airports.forEach(function(d) {
    var coords = projection([d.longitude, d.latitude]);
    d.x = coords[0];
    d.y = coords[1];
  });

  // reset map to only contain airports post filter
  byiata = d3.map(airports, function(d) { return d.iata; });

  // filter out flights that do not go between remaining airports
  old = flights.length;
  flights = flights.filter(function(d) {
    return byiata.has(d.source.iata) && byiata.has(d.target.iata);
  });

  console.log("Removed " + (old - flights.length) + " flights.");

  console.log("Currently " + airports.length + " airports remaining.");
  console.log("Currently " + flights.length + " flights remaining.");

  // start drawing everything
  drawData(byiata.values(), flights);
}

/*
 * draw airports and flights using edge bundling
 */
function drawData(airports, flights) {
  // setup and start edge bundling
  var bundle = generateSegments(airports, flights);

  // https://github.com/d3/d3-shape#curveBundle
  var line = d3.line()
    .curve(d3.curveBundle)
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; });

  var links = plot.append("g").attr("id", "flights")
    .selectAll("path.flight")
    .data(bundle.paths)
    .enter()
    .append("path")
    .attr("d", line)
    .style("fill", "none")
    .style("stroke", "#252525")
    .style("stroke-width", 0.5)
    .style("stroke-opacity", 0.2);

  // https://github.com/d3/d3-force
  var layout = d3.forceSimulation()
    // settle at a layout faster
    .alphaDecay(0.1)
    // nearby nodes attract each other
    .force("charge", d3.forceManyBody()
      .strength(10)
      .distanceMax(radius.max * 2)
    )
    // edges want to be as short as possible
    // prevents too much stretching
    .force("link", d3.forceLink()
      .strength(0.8)
      .distance(0)
    )
    .on("tick", function(d) {
      links.attr("d", line);
    })
    .on("end", function(d) {
      console.log("Layout complete!");
    });

  layout.nodes(bundle.nodes).force("link").links(bundle.links);

  // draw airports
  var scale = d3.scaleSqrt()
    .domain(d3.extent(airports, function(d) { return d.degree; }))
    .range([radius.min, radius.max]);

  plot.append("g").attr("id", "airports")
    .selectAll("circle.airport")
    .data(airports)
    .enter()
    .append("circle")
    .attr("r", function(d) { return scale(d.degree); })
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .style("fill", "white")
    .style("opacity", 0.6)
    .style("stroke", "#252525")
    .on("mouseover", onMouseOver)
    .on("mousemove", onMouseMove)
    .on("mouseout", onMouseOut);
}

/*
 * Turns a single edge into several segments that can
 * be used for simple edge bundling.
 */
function generateSegments(nodes, links) {
  // calculate distance between two nodes
  var distance = function(source, target) {
    // sqrt( (x2 - x1)^2 + (y2 - y1)^2 )
    var dx2 = Math.pow(target.x - source.x, 2);
    var dy2 = Math.pow(target.y - source.y, 2);

    return Math.sqrt(dx2 + dy2);
  };

  // max distance any two nodes can be apart is the hypotenuse!
  var hypotenuse = Math.sqrt(width * width + height * height);

  // number of inner nodes depends on how far nodes are apart
  var inner = d3.scaleLinear()
    .domain([0, hypotenuse])
    .range([1, 15]);

  // generate separate graph for edge bundling
  // nodes: all nodes including control nodes
  // links: all individual segments (source to target)
  // paths: all segments combined into single path for drawing
  var bundle = {nodes: [], links: [], paths: []};

  // make existing nodes fixed
  bundle.nodes = nodes.map(function(d, i) {
    d.fx = d.x;
    d.fy = d.y;
    return d;
  });

  links.forEach(function(d, i) {
    // calculate the distance between the source and target
    var length = distance(d.source, d.target);

    // calculate total number of inner nodes for this link
    var total = Math.round(inner(length));

    // create scales from source to target
    var xscale = d3.scaleLinear()
      .domain([0, total + 1]) // source, inner nodes, target
      .range([d.source.x, d.target.x]);

    var yscale = d3.scaleLinear()
      .domain([0, total + 1])
      .range([d.source.y, d.target.y]);

    // initialize source node
    var source = d.source;
    var target = null;

    // add all points to local path
    var local = [source];

    for (var j = 1; j <= total; j++) {
      // calculate target node
      target = {
        x: xscale(j),
        y: yscale(j)
      };

      local.push(target);
      bundle.nodes.push(target);

      bundle.links.push({
        source: source,
        target: target
      });

      source = target;
    }

    local.push(d.target);

    // add last link to target node
    bundle.links.push({
      source: target,
      target: d.target
    });

    bundle.paths.push(local);
  });

  return bundle;
}


</script>
