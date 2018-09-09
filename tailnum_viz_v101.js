// JS FILE v1.01
// By Quyen Ha
// Date: 9/3/2018

//////////////////////////////////////////////////////////////////////
// GLOBAL
//   global variables to put on top, useful for updating
//   what an awful coding practice... i'm really sorry
var filepaths = {
  airport: "geodata/airports.csv",
  flight: "flightdata/N942UA.csv",
  usa: "geodata/us.json"
};

// grab the svg context, its width and height
var svg = d3.select("svg");
var width = +svg.attr("width");
var height = +svg.attr("height");

// create variable plot for drawing
var plot = svg.append("g")
              .attr("id", "plot");

// set the radius for bubbles
var radius = {min:6, max: 12};

// create the placeholder for the states' data
var states = null;

// create the projection for us map
var projection = d3.geoAlbers();

//////////////////////////////////////////////////////////////////////

// trigger map drawing
d3.json (filepaths.usa, drawMap);

// draw the continental US
function drawMap (error, map) {

  // determine which ids belong to the continental US
  var isContinental = function(d) {
    var id = +d.id;
    return id < 60 && id !== 2 && id !== 15;
  };

  // determine which ids belong to the continental US
  var isContinental = function(d) {
    var id = +d.id;
    return id < 60 && id !== 2 && id !== 15;
  };

  // filter out non-continental united states
  var old = map.objects.states.geometries.length;
  map.objects.states.geometries = map.objects.states.geometries.filter(isContinental);
  console.log("Filtered out " + (old - map.objects.states.geometries.length) + " states from base map.");

  // size projection to fit continental US
  states = topojson.feature(map, map.objects.states);
  projection.fitSize([width, height], states);

  // draw base map with states' borders
  var base = plot.append("g")
                 .attr("id", "basemap");

  // set the geopath
  var geoPath = d3.geoPath(projection);

  // append the geopath to the base map
  base.append("path")
      .datum(states)
      .attr("class", "land")
      .attr("d", geoPath);

  // boolean flags to check if border is interior or exterior
  var isInterior = function(a, b) { return a !== b; };
  var isExterior = function(a, b) { return a === b; };

  // draw the interior border
  base.append("path")
      .datum(topojson.mesh(map, map.objects.states, isInterior))
      .attr("class", "border interior")
      .attr("d", geoPath);

  // draw the exterior border
  base.append("path")
      .datum(topojson.mesh(map, map.objects.states, isExterior))
      .attr("class", "border exterior")
      .attr("d", geoPath);

  // trigger data warning
  d3.queue()
    .defer(d3.csv, filepaths.airport, typeAirport)
    .defer(d3.csv, filepaths.flight, typeFlight)
    .await(filterData);

} // end drawMap

// convert gps coordinates to number and init degree
function typeAirport (d) {
  d.longitude = +d.longitude;
  d.latitude = +d.latitude;
  d.degree = 0;
  return d;
} // end typeAirport

// convert route_frequency to number and init segments
function typeFlight (d) {
  d.count = +d.route_frequency;
  return d;
}

// filter data for edge bundling
function filterData (error, airports, flights) {

  if (error) throw error;

  // get map of airport objects by IATA value
  var byiata = d3.map(airports, function(d) { return d.iata; });
  console.log("Loaded " + byiata.size() + " airports.");

  // convert links into better format and track node degree
  flights.forEach(function(d) {
    d.source = byiata.get(d.origin);
    d.target = byiata.get(d.dest);

    d.source.degree = d.source.degree + 1;
    d.target.degree = d.target.degree + 1;
  })

  // filter out airports outside of projection or those without a valid state
  var old = airports.length;
  airports = airports.filter(function(d) {
    return d3.geoContains(states, [d.longitude, d.latitude]) && d.state != "NA";
  });
  console.log("Filtered " + (old - airports.length) + " out of bounds airports.");

  // function to sort airports by degree
  var bydegree = function(a, b) {
    return d3.descending (a.degree, b.degree);
  };

  // sort filtered airports by bydegree
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
  flights = flights.filter (function(d) {
    return byiata.has(d.source.iata) && byiata.has(d.target.iata);
  });

  console.log("Removed " + (old - flights.length) + " flights.");
  console.log("Currently " + airports.length + " airports remaining.");
  console.log("Currently " + flights.length + " flights remaining.");

  // trigger drawing flight routes
  drawData(byiata.values(), flights);

} // end filterData

// function to draw airports and flight route
function drawData(airports, flights) {

  // setup and start edge bundling
  var bundle = generateSegments(airports, flights);

  // set up variable to hold the lines
  var line = d3.line()
               .curve(d3.curveBundle)
               .x(function(d) { return d.x; })
               .y(function(d) { return d.y; });

  // set up variable to hold the links
  var links = plot.append("g")
                  .attr("id", "flights")
                  .selectAll("path.flight")
                  .data(bundle.paths)
                  .enter()
                  .append("path")
                  .attr("d", line)
                  .style("fill", "none")
                  .style("stroke", "#252525")
                  .style("stroke-width", 0.5)
                  .style("stroke-opacity", 0.3);

  // set up the layout
  var layout = d3.forceSimulation()
                  // settle at a layout faster
                  .alphaDecay(0.1)
                  // nearby nodes attract each other
                  .force("charge", d3.forceManyBody()
                                     .strength(8)
                                     .distanceMax(radius.max * 2))
                  .force('collision', d3.forceCollide()
                                        .radius(3))
                   // edges want to be as short as possible
                   // prevents too much stretching
                   .force("link", d3.forceLink()
                                    .strength(0.5)
                                    .distance(0))
                   .on("tick", function(d) { links.attr("d", line); })
                   .on("end", function(d) { console.log("Layout complete!"); });

  layout.nodes(bundle.nodes).force("link").links(bundle.links);

  // set the scale to draw airports
  var scale = d3.scaleSqrt()
                .domain(d3.extent(airports, function(d) { return d.degree; }))
                .range([radius.min, radius.max]);

  // draw the airports as bubbles
  plot.append("g")
      .attr("id", "airports")
      .selectAll("circle.airport")
      .data(airports)
      .enter()
      .append("circle")
      .attr("r", function(d) { return scale(d.degree); })
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .style("fill", "white")
      .style("opacity", 0.5)
      .style("stroke", "#252525");

} // end drawData

// generate segments for edge bundling
function generateSegments(nodes, links) {

  // calculate distance between two nodes
  var distance = function(source, target) {

    var dx2 = Math.pow(target.x - source.x, 2);
    var dy2 = Math.pow(target.y - source.y, 2);

    return Math.sqrt(dx2 + dy2);

  };

  // max distance any two nodes is the hypotenuse
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
