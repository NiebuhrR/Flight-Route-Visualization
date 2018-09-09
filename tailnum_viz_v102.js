// JS FILE v1.02
// By Quyen Ha
// Date: 9/6/2018

//////////////////////////////////////////////////////////////////////
// VARIABLES FOR UPDATING

// namespace variables, useful for updating
var NS = {

    // original namespace variables
    width: 1380,
    height: 800,
    radius: {min:6, max:12},

    // variable for slider position
    sliderTop: 30,
    sliderLeft: 1380 - 500,

    // variable for title's size and position
    titleWidth: 1380,
    titleHeight: 30,
    titleX: 1380/2 + 190,
    titleY: 20,
    titleTop: 600

};

//////////////////////////////////////////////////////////////////////
// SET UP SVG, POSITION ELEMENTS, MAIN HUB OF PROGRAM

// this is the main engine of the program
function main () {


    // create the map's title
    makeTitle ()

    // create the svg context
    makeSVG ();

    // load US geographical data us.json
    queueData ();

    // add tailnum to the dropdown menu
    makeMenu ();

    // rearrange the buttons and slider for aesthetic purpose
    aesthetics ();

} // end main

// create the svg context
function makeSVG () {

    var svg = d3.select("body")
                .append("svg")
                .attr("id", "svgMap")
                .attr("width", NS.width)
                .attr("height", NS.height);

    // store the svg in the namespace
    NS.svg = svg;

} // end makeSVG

// put a title at the bottom. this is a distinct SVG element
function makeTitle () {

    // title is a separate SVG element
    NS.headingsvg = d3.select("body")
                      .append("svg")
	                  .attr("id", "svgTitle")
                      .attr("width", NS.titleWidth)
                      // height for the heading is 30 pixels
                      .attr("height", NS.titleHeight);

    // add text title to the svg element
    NS.headingsvg.append("g")
	             .append("text")
	             .attr("class", "heading")
	             .attr("text-anchor", "middle")
	             .attr("font-family", "Times New Roman")
	             .attr("x", NS.titleX)
	             .attr("y", NS.titleY)
	             .attr("font-size", "18px")
	             .attr("font-weight", "bold")
	             .text("Visualization of United Monthly Domestic Flights by Tail Number in 2008");

} // end makeTitle

// rearrange the buttons and slider for aesthetic purpose
function aesthetics () {

    var slider = document.getElementById("sliderContainer");
    slider.style.position = "absolute";
    slider.style.top = NS.sliderTop + "px";
    slider.style.left = NS.sliderLeft + "px";

    var title = document.getElementById("svgTitle");
    title.style.position = "absolute";
    title.style.top = NS.titleTop + "px";

} // end aesthetics

//////////////////////////////////////////////////////////////////////
// DRAWING THE BASE MAP

// load in us.json
function queueData () {

    d3.queue ()
    .defer (d3.json, "geodata/us.json")
    .await(ready);

} // end queueData

// main function ready
function ready (error, us) {

    // if there is an error in loading the data, throw error
    if (error) throw error;

    // boolean function to filter out Alaska (stateid !== 2)
    NS.notAlaska = function(d) {
        var id = +d.id;
        return id !== 2;
    };

    // filter Alaska out of the basemap
    var old = us.objects.states.geometries.length;
    us.objects.states.geometries = us.objects.states.geometries.filter(NS.notAlaska);
    console.log("Filtered out " + (old - us.objects.states.geometries.length) +
                " states from base map.");

    // size projection to fit the US map excluding Alaska
    NS.states = topojson.feature(us, us.objects.states);

    NS.projection = d3.geoAlbers().fitSize([NS.width, NS.height/1.45], NS.states);

    // set the geopath
    NS.geoPath = d3.geoPath(NS.projection);

    // store the interior states' border and the exterior country's border in NS
    NS.interiorBorder = topojson.mesh(us, us.objects.states,
                                          function (a, b) { return a !== b; });
    NS.exteriorBorder = topojson.mesh(us, us.objects.states,
                                          function (a, b) { return a === b; });

    // draw states and states' line of the map
    drawMap ();

} // end ready

// draw states and states' line for the US map (exclude Alaska)
function drawMap () {

    // create plot to hold all the drawings
    NS.plot = NS.svg.append("g")
                    .attr("id", "plot");

    // create the base to hold US map
    NS.base = NS.plot.append("g")
                     .attr("id", "basemap");

    // append the geoPath to the base map
    NS.base.append("path")
           .datum(NS.states)
           .attr("class", "land")
           .attr("d", NS.geoPath);

    // draw the interior states' border
    NS.base.append("path")
           .datum(NS.interiorBorder)
           .attr("class", "border interior")
           .attr("d", NS.geoPath);

    // draw the exterior countries' border
    NS.base.append("path")
           .datum(NS.exteriorBorder)
           .attr("class", "border exterior")
           .attr("d", NS.geoPath);

} // end drawMap

//////////////////////////////////////////////////////////////////////
// PROCESSING DATA FOR THE DROPDOWN MENU

// create the drop down menu and trigger drawing flights & airports
function makeMenu () {

    // grab the dropdown menu from html
    var tailnumMenu = d3.select("#tailnumDropDown");

    // add tail number onto the dropdown menu
    for (i=0; i<NS.flightsbyTail.length;i++) {
        tailnumMenu.append("option")
                   .attr("value", NS.flightsbyTail[i].key)
                   .text(NS.flightsbyTail[i].key);
    }

    // run update function when dropdown selection changes
    d3.select("#tailnum")
      .on("change", function () {

        // clear existing arrays
        NS.initTail = [];
        NS.filteredFlights = [];
        NS.filteredAirports = [];

        // remove old flights and airports
        d3.select("#flights").remove();
        d3.select("#airports").remove();

        // remove the old slider
        d3.select("input").remove();
        d3.select(".slider-label").remove();

        // find which tailnum was selected from the menu
        NS.selectedTailnum = d3.select(this)
        .property("value");

        // intialize the month to January (1)
        NS.initTail = NS.flightsbyMonth.filter( function(d) { return d.key == 1; });

        // only keep flights and airports correponding to the selected tailnum
        filteredData ();

        // draw flight routes as bundling edges
        drawRoutes ();

        // draw airports as bubbles
        drawAirports ();

        // add the slider that allows users to choose month
        makeSlider ();

    });
} // end makeMenu

// filter airports and flights based on the selected tailnum
function filteredData () {

    // get map of airport objects by IATA values
    NS.byiata = d3.map(NS.airportsData, function(d) { return d.iata; });
    console.log("Loaded " + NS.byiata.size() + " airports.");

    // parse the data and create a flights dictionary with
    // tailnum as keys and dest/origin as values
    NS.initTail.forEach(function(d) {
        d.values.forEach(function(c) {
            if (c.tailnum == NS.selectedTailnum) { NS.filteredFlights.push(c); }
        });
    });

    // convert origin and dest to source and target; track node degree
    NS.filteredFlights.forEach(function(d) {
        d.source = NS.byiata.get(d.origin);
        d.target = NS.byiata.get(d.dest);

        d.source.degree = d.source.degree + 1;
        d.target.degree = d.target.degree + 1;
    });

    // only keep airports that the selected tailnum passes through
    for (var i=0; i<NS.airportsData.length; i++) {
        for (var j=0; j<NS.filteredFlights.length; j++) {
            if (NS.airportsData[i].iata == NS.filteredFlights[j].origin ||
                NS.airportsData[i].iata == NS.filteredFlights[j].dest){
                NS.filteredAirports.push(NS.airportsData[i]);
            }
        }
    }

    console.log("Filtered " + (NS.airportsData.length - NS.filteredAirports.length)
                            + " airports. ");

    // calculate projected x, y pixel locations
    NS.filteredAirports.forEach(function(d) {
        var coords = NS.projection([d.longitude, d.latitude]);
        d.x = coords[0];
        d.y = coords[1];
    });

    console.log("Currently " + NS.filteredAirports.length + " airports remaining.");
    console.log("Currently " + NS.filteredFlights.length + " flights remaining.");

} // end filteredData

// draw flight routes as bundling edges
function drawRoutes () {

    // bundle is an object of three values
    // nodes: all nodes including control nodes
    // links: all individual segments (source to target)
    // paths: all segments combined into single path for drawing
    var bundle = generateSegments (NS.filteredAirports, NS.filteredFlights);

    // set up var line to hold the actual routes
    var line = d3.line()
                 .curve(d3.curveBundle)
                 .x(function(d) { return d.x; })
                 .y(function(d) { return d.y; });

    // draw the actual linear routes
    var links = NS.plot.append("g")
                       .attr("id", "flights")
                       .selectAll("path.flight")
                       .data(bundle.paths)
                       .enter()
                       .append("path")
                       .attr("d", line)
                       .style("fill", "none")
                       .style("stroke", "#252525")
                       .style("stroke-width", 0.5)
                       .style("stroke-opacity", 0.5);

    // set up the layout
    var layout = d3.forceSimulation()
                   // settle at a layout faster
                   .alphaDecay(0.1)
                   // nearby nodes attract each other
                   .force("charge", d3.forceManyBody()
                   .strength(8)
                   .distanceMax(NS.radius.max * 2))
                   .force('collision', d3.forceCollide()
                   .radius(5))
                   // edges want to be as short as possible
                   // prevents too much stretching
                   .force("link", d3.forceLink()
                   .strength(0.5)
                   .distance(0))
                   .on("tick", function(d) { links.attr("d", line); })
                   .on("end", function(d) { console.log("Layout complete!"); });

    // apply the layout
    layout.nodes(bundle.nodes).force("link").links(bundle.links);

} // end drawRoutes

// generate segments for edge bundling
function generateSegments(nodes, links) {

    // calculate distance between two nodes
    var distance = function(source, target) {

        var dx2 = Math.pow(target.x - source.x, 2);
        var dy2 = Math.pow(target.y - source.y, 2);

        return Math.sqrt(dx2 + dy2);

    };

    // max distance any two nodes is the hypotenuse
    var hypotenuse = Math.sqrt(NS.width * NS.width + NS.height * NS.height);

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
                       .domain([0, total + 1])
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

} // end geenerateSegments

// function to draw airports as bubbles
function drawAirports () {

    // draw the airport bubbles
    NS.plot.append("g")
           .attr("id", "airports")
           .selectAll(".bubbles")
           .data(NS.filteredAirports)
           .enter()
           .append("circle")
           .attr("class", "bubbles")
           .attr("r", function(d) { return 7; })
           .attr("cx", function(d) { return d.x; })
           .attr("cy", function(d) { return d.y; });

    // create the tooltip using d3-tip.js
    NS.toolTip = d3.tip()
                   .attr("class", "d3-tip")
                   .offset([-10, 0])
                   .html(function(d) {
                       return d.city + ", " + d.state +
                       "</br>" + d.name + " (" + d.iata + ")";
                   });

    // call the tooltip
    NS.svg.call(NS.toolTip);

    // add tooltip to airport bubbles
    NS.plot.selectAll("circle")
           .on("mouseover", NS.toolTip.show)
           .on("mouseout", NS.toolTip.hide);

} // drawAirports

//////////////////////////////////////////////////////////////////////
// CREATE THE SLIDER THAT ALLOWS USER TO CHOOSE MONTH

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

// update the map using the month chosen from slider
function updateByMonth (month) {

    // clear existing arrays
    NS.initTail = [];
    NS.filteredFlights = [];
    NS.filteredAirports = [];

    // remove old flights and airports
    d3.select("#flights").remove();
    d3.select("#airports").remove();

    // filter the flights with the new chosen month
    NS.initTail = NS.flightsbyMonth.filter( function (d) { return d.key == month; });

    // only keep flights and airports correponding to the selected tailnum
    filteredData ();

    // draw flight routes as bundling edges
    drawRoutes ();

    // draw airports as bubbles
    drawAirports ();

} // end updateByMonth

//////////////////////////////////////////////////////////////////////
// read in the data file and set up the visualization
d3.csv("geodata/airports.csv", function(error, data) {
    // if error log to console
    if (error) {
        console.log(error);
    } else {
        console.log("Airports data loaded.");
        NS.airportsData = data;
        // format the data
        NS.airportsData.forEach(function(d) {
            d.longitude = parseFloat(d.longitude);
            d.latitude = parseFloat(d.latitude);
            d.degree = 0;
        });
    }
});

d3.csv("flightdata/UA_2008.csv", function (error, data) {
    // if error log to console
    if (error) {
        console.log(error);
    } else {
        console.log("Flights data loaded.");
        // assign the flightroute data to namespace
        NS.flightsData = data;
        // format the data
        NS.flightsData.forEach(function(d) {
            d.month = parseInt(d.month);
            d.route_frequency = parseFloat(d.route_frequency);
        });
        // nesting data by tailnum
        NS.flightsbyTail = d3.nest()
        .key(function(d) {return d.tailnum; })
        .entries(NS.flightsData);

        // nesting the data by month
        NS.flightsbyMonth = d3.nest()
        .key(function(d) {return d.month; })
        .entries(NS.flightsData);
        // call the main function
        main ();
    }
});
