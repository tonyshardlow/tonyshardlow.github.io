
(function () {

  var Network, Rad
  
  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  //########################################

  // Help with the placement of nodes
  RadialPlacement = function () {
    var center, current, increment, place, placement, radialLocation, radius, setKeys, start, values;
    // stores the key -> location values
    values = d3.map();
    // how much to separate each location by
    increment = 20;
    // how large to make the layout
    radius = 200;
    // where the center of the layout should be
    center = {
      "x": 0,
      "y": 0
    };
    // what angle to start at
    start = -120;
    current = start;
    //##############################################
    // radialLocation

    // Given an center point, angle, and radius length,
    // return a radial position for that angle
    radialLocation = function (center, angle, radius) {
      var x, y;
      x = center.x + radius * Math.cos(angle * Math.PI / 180);
      y = center.y + radius * Math.sin(angle * Math.PI / 180);
      return {
        "x": x,
        "y": y
      };
    };
    //#####################################
    // Main entry point for RadialPlacement
    // Returns location for a particular key,
    // creating a new location if necessary.
    placement = function (key) {
      var value;
      value = values.get(key);
      if (!values.has(key)) {
        value = place(key);
      }
      return value;
    };
    //######################################

    // Gets a new location for input key
    place = function (key) {
      var value;
      value = radialLocation(center, current, radius);
      values.set(key, value);
      current += increment;
      return value;
    };
    //############################################
    // Given a set of keys, perform some 
    // magic to create a two ringed radial layout.
    // Expects radius, increment, and center to be set.
    // If there are a small number of keys, just make
    // one circle.
    setKeys = function (keys) {
      var firstCircleCount, firstCircleKeys, secondCircleKeys;
      // start with an empty values
      values = d3.map();
      // number of keys to go in first circle
      firstCircleCount = 360 / increment;
      // if we don't have enough keys, modify increment
      // so that they all fit in one circle
      if (keys.length < firstCircleCount) {
        increment = 360 / keys.length;
      }
      // set locations for inner circle
      firstCircleKeys = keys.slice(0, firstCircleCount);
      firstCircleKeys.forEach(function (k) {
        return place(k);
      });
      // set locations for outer circle
      secondCircleKeys = keys.slice(firstCircleCount);
      // setup outer circle
      radius = radius + radius / 1.8;
      increment = 360 / secondCircleKeys.length;
      return secondCircleKeys.forEach(function (k) {
        return place(k);
      });
    };
    //###############################

    placement.keys = function (_) {
      if (!arguments.length) {
        return d3.keys(values);
      }
      setKeys(_);
      return placement;
    };
    //###############################

    placement.center = function (_) {
      if (!arguments.length) {
        return center;
      }
      center = _;
      return placement;
    };
    //###################################

    placement.radius = function (_) {
      if (!arguments.length) {
        return radius;
      }
      radius = _;
      return placement;
    };
    //#######################################

    placement.start = function (_) {
      if (!arguments.length) {
        return start;
      }
      start = _;
      current = start;
      return placement;
    };
    //####################################

    placement.increment = function (_) {
      if (!arguments.length) {
        return increment;
      }
      increment = _;
      return placement;
    };
    return placement;
  };

  //# end of RadialPlacement()
  //#############################
  //#############################################
  // Main network constructor function
  Network = function () {
    var RemoveHelper, allData, charge, colourScheme, coreStrokeColor, curLinksData, curNodesData, filterLinks, filterNodes, filterTargets, foci, force, forceTick, getColor, getRadius, groupCenters, height, hideDetails, include_cats, killSubNodes, layout, link, linkedByIndex, linksG, mapNodes, moveToRadialLayout, myfunction, neighboring, network, node, nodeColors, nodeCounts, nodeSlots, nodecwcolours, nodesG, nodet, radialTick, resetKillSubNodes, setFilter, setFixed, setFree, setLayout, setSort, setupData, showDetails, sort, sortedSemesters, strokeFor, strokecolor, strokecolor2, tooltip, update, updateCenters, updateLinks, updateNodes, updateTexts, width;
    //
    // // SVG injection:
    // var svg = d3.select("#hook").append("svg").attr("id", "d3svg").attr("width", 120).attr("height", 120);
  

    // variables we want to access
    // include CATS sizes on popups
    include_cats = false;
    // in multiple places of Network
    width = 1200;
    height = 650;
    // allData will store the unfiltered data
    allData = [];
    curLinksData = [];
    curNodesData = [];
    linkedByIndex = {};
    // these will hold the svg groups for
    // accessing the nodes and links display
    nodesG = null;
    linksG = null;
    // these will point to the circles and lines
    // of the nodes and links
    node = null;
    link = null;
    nodet = null; // future (for text)
    // variables to refect the current settings
    // of the visualization
    layout = "force";
    colourScheme = "Semester";
    sort = "semester";
    // groupCenters will store our radial layout for
    // the group by semester layout.
    groupCenters = null;
    // our force directed layout ()
    // force = d3.forceSimulation() # v3
    force = d3.forceSimulation().force('center', d3.forceCenter(width / 2, height / 2));
    // color function used to color nodes
    //  nodeColors = d3.scale.category10()
    coreStrokeColor = "#000000"; //black
    strokecolor = "#000000";
    strokecolor2 = "#500000";
    nodeColors = d3.scaleOrdinal().domain(["C2.S1", "L2.S1", "C2.S2", "L2.S2", "L3.S1", "C3.S1", "L3.S2", "C3.S2", "L4.S1", "L4.S2","L3.AY","C4.AY","L34.S1","L34.S2"]).range(["#1f77b4", "#1f77b4", "#9edae5", "#9edae5", "#d62728", "#d62728", "#ffc7d1", "#ffc7d1", "#2ca02c", "#bcbd22","#ff47e0","#2cbd9a",'url(#mainGradient)','url(#mainGradient1)']);
    nodeSlots = d3.scaleOrdinal().domain(["1", "2", "3", "4", "5", "6", "7", "8", "9"]).range(["#357EC7", "#FFCBA4", "#979735", "#FF6600", "#983265", "#FFFF00", "#FFA62F", "#BCDD11", "#EE88CD"]);
    nodecwcolours = d3.scaleOrdinal().domain(["-", "100% coursework", "75%", "50% coursework", "25% coursework", "40% coursework"]).range(["#FCD271", "#dd1e2f", "#ebb035", "#06a2cb", "#218559", "#357EC7"]);

    // tooltip used to display details
    tooltip = Tooltip("vis-tooltip", 130);
    //#############################################
    // charge used in semester layout
    charge = function (node) {
      return -0.5 * Math.pow(node.radius, 2.0) / 2;
    };
    //#######################################
    // network
    // Starting point for network visualization
    // Initializes visualization and starts force  layout
    network = function (selection, data) {
      var vis;
      // format our data
      allData = setupData(data);
      // create our svg and groups
      vis = d3.select(selection).append("svg").attr("width", width).attr("height", height);
  
      // Create the svg:defs element and the main gradient definition.
      var svgDefs = vis.append('defs');

      var mainGradient = svgDefs.append('linearGradient')
            .attr('id', 'mainGradient').attr('gradientTransform','rotate(90)');

      var mainGradient1 = svgDefs.append('linearGradient')
            .attr('id', 'mainGradient1').attr('gradientTransform','rotate(90)');
      // Create the stops of the main gradient. Each stop will be assigned
      // a class to style the stop using CSS.
      mainGradient.append('stop')
            .attr('class', 'stop-left')
            .attr('offset', '0');

      mainGradient.append('stop')
            .attr('class', 'stop-right')
        .attr('offset', '1');
      
     
       
        
      mainGradient1.append('stop')
            .attr('class', 'stop-left1')
            .attr('offset', '0');

      mainGradient1.append('stop')
            .attr('class', 'stop-right1')
            .attr('offset', '1');
      
      linksG = vis.append("g").attr("id", "links");
      nodesG = vis.append("g").attr("id", "nodes");
      // setup the size of the force environment
      return setLayout(layout);
    };
    //#################################################  #########
    // update()
    // Performs the bulk of the
    // work to setup our visualization based on the
    // current layout/sort/filter.

    // update() is called everytime a parameter changes
    // and the network needs to be reset.

    update = function () {
      var semesters;
      // filter data to show based on current filter   settings.
      curNodesData = filterNodes(allData.nodes);
      resetKillSubNodes(curNodesData, allData.links);
      killSubNodes(curNodesData, allData.links);
      killSubNodes(curNodesData, allData.links);
      killSubNodes(curNodesData, allData.links);
      curNodesData = filterNodes(curNodesData);
      curLinksData = filterLinks(allData.links, curNodesData);
      // radial layout
      if (layout === "radial") {
        setFree(curNodesData);
        semesters = sortedSemesters(curNodesData, curLinksData);
        updateCenters(semesters);
      }
      // enter / exit for nodes
      updateNodes();
      updateTexts();
      // reset nodes in force layout
      force.nodes(curNodesData);
      // always show links in force layout
      if (layout === "force") {
        return updateLinks();
      } else {
        // reset links so they do not interfere with
        // other layouts. updateLinks() will be called   when force is done animating.
        // force.links([])
        // if present, remove them from svg 
        if (link) {
          link.data([]).exit().remove();
          return link = null;
        }
      }
    };
    //#################################################  ########
    // Public function to switch between layouts
    network.toggleLayout = function (newLayout) {
      force.stop();
      // if present, remove them from svg 
      if (node) {
        node.data([]).exit().remove();
        node = null;
      }
      if (nodet) {
        nodet.data([]).exit().remove();
        node = null;
      }

      return setLayout(newLayout);
    };
    //#################################################  ########
    // Public function to switch between layouts
    network.toggleColour = function (newColour) {
      colourScheme = newColour;
      return network.toggleRun("tick");
    };

    //###########################
    // Public function to switch between layouts
    network.toggleRun = function (newRun) {
      if (newRun=== "stop"){
        force.alpha(0.0);
        return force.stop();
      }
      if (newRun === "start") {
        force.alpha(1.0);
        update();
        return force.restart();
      }
      if (newRun === "tick" && (force.alpha()<=force.alphaMin())) {
        force.restart();
        update();
        return force.stop();
      }
    };

    //#################################################

    network.updateData = function (newData) {
      allData = setupData(newData);
      setLayout(layout);
      network.toggleRun("start");
    };
    //################################################ called once to clean up raw data and 
    // switch links to
    // point to node instances
    // Returns modified data
    setupData = function (data) {
      var nodesMap;
      data.nodes.forEach(function (n) {
        var randomnumber;
        // set initial (x,y) 
        n.x = randomnumber = Math.floor(Math.random() * width * 0.02 + width * 0.5);
        n.y = randomnumber = Math.floor(Math.random() * height * 0.02 + height * 0.5);
        // set node radius 
        if (n.ects!=null){
          include_cats=true;
        }
        return n.radius = 20;
      });
      nodesMap = mapNodes(data.nodes);
      // set links
      data.links.forEach(function (l) {
        l.source = nodesMap.get(l.source);
        l.target = nodesMap.get(l.target);
        // linkedByIndex is used for link sorting
        return linkedByIndex[`${l.source.id},${l.target.id}  `] = 1;
      });
      return data;
    };
    //##############################################
    // mapNodes

    // Helper function to map node id's
    // to node  objects.
    // Returns d3.map of ids -> nodes
    mapNodes = function (nodes) {
      var nodesMap;
      nodesMap = d3.map();
      nodes.forEach(function (n) {
        return nodesMap.set(n.id, n);
      });
      return nodesMap;
    };
    //#############################################
    // nodeCounts

    // Helper function that returns an associative   array
    // with counts of unique attr in nodes
    // attr is value stored in node, like 'semester'
    nodeCounts = function (nodes, attr) {
      var counts;
      counts = {};
      nodes.forEach(function (d) {
        var name;
        if (counts[name = d[attr]] == null) {
          counts[name] = 0;
        }
        return counts[d[attr]] += 1;
      });
      return counts;
    };
    //#################################################
    // neighbouring
    // Given two nodes a and b, returns true if
    // there is a link between them.
    // Uses linkedByIndex initialized in setupData
    neighboring = function (a, b) {
      return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id];
    };

    //##########################################
    // filterNodes
    // Removes nodes from input array

    // Returns array of nodes
    filterNodes = function (allNodes) {
      var filteredNodes;
      filteredNodes = allNodes;
      filteredNodes = filteredNodes.filter(function (n) {
        return n.tinclude !== "0";
      });
      return filteredNodes;
    };
    //#################################################  #
    // sortedSemesters
    // Returns array of semesters sorted based on
    // current sorting method.
    sortedSemesters = function (nodes, links) {
      var counts, semesters;
      semesters = [];
      if (sort === "links") {
        counts = {};
        links.forEach(function (l) {
          var name, name1;
          if (counts[name = l.source.semester] == null) {
            counts[name] = 0;
          }
          counts[l.source.semester] += 1;
          if (counts[name1 = l.target.semester] == null) {
            counts[name1] = 0;
          }
          return counts[l.target.semester] += 1;
        });
        // add any missing semesters that dont have  any links
        nodes.forEach(function (n) {
          var name;
          return counts[name = n.semester] != null ? counts[name] : counts[name] = 0;
        });
        // sort based on counts
        semesters = d3.entries(counts).sort(function (a, b) {
          return b.value - a.value;
        });
        // get just names
        semesters = semesters.map(function (v) {
          return v.key;
        });
      } else {
        // sort semesters by song count
        counts = nodeCounts(nodes, "semester");
        semesters = d3.entries(counts).sort(function (a, b) {
          return b.value - a.value;
        });
        semesters = semesters.map(function (v) {
          return v.key;
        });
      }
      return semesters;
    };
    //#################################################  #####
    // killSubNodes
    // Returns array of semesters sorted based on
    // current sorting method.
    // tinclude=1 if node off; include=1 if node silver
    killSubNodes = function (nodes, links) {
      return links.forEach(function (l) {
        if (l.source.include === "0" || l.source.tinclude === "0") {
          return l.target.tinclude = "0"; //node off
        }
      });
    };
    //#################################################  #####
    // resetKillSubNodes
    // Returns array of semesters sorted based on
    // current sorting method.
    // tinclude=1 if node off; include=1 if node silver
    resetKillSubNodes = function (nodes, links) {
      return links.forEach(function (l) {
        return l.target.tinclude = "1"; //node is on   
      });
    };
    //################################################
    // setFree
    // Returns array of semesters sorted based on
    // current sorting method.
    setFree = function (nodes) {
      return nodes.forEach(function (n) {
        return n.fixed = 0;
      });
    };
    //###################################
    // setFree
    // Returns array of semesters sorted based on
    // current sorting method.
    setFixed = function (nodes) {
      return nodes.forEach(function (n) {
        if (n.fix === "fix") {
          n.fixed = 1;
          n.x = width * n.xpos;
          n.y = height * n.ypos;
          n.px = width * n.xpos;
          n.py = height * n.ypos;
        }
        if (n.ects != null) {
          return include_cats = true;
        }
      });
    };
    //###############################################
    // updateCenters()

    updateCenters = function (semesters) {
      if (layout === "radial") {
        return groupCenters = RadialPlacement().center({
          "x": width / 2,
          "y": height / 2
        }).radius(300).increment(18).keys(semesters);
      }
    };
    //##########################################
    // filterLinks

    // Removes links from allLinks whose
    // source or target is not present in curNodes
    // Returns array of links
    filterLinks = function (allLinks, curNodes) {
      curNodes = mapNodes(curNodes);
      return allLinks.filter(function (l) {
        return curNodes.get(l.source.id) && curNodes.get(l.target.id);
      });
    };
    //#################################################
    // filterTargets
    // Removes node from  whose
    // source  is not present in curNodes
    filterTargets = function (allLinks, curNodes) {
      curNodes = mapNodes(curNodes);
      return curNodes.filter(function (l) {
        return curNodes.get(l.source.id) && curNodes.get(l.target.id);
      });
    };
    //#################################

    getColor = function (d) {
    
      if (d.include !== "0") {
        if (colourScheme === "Timeslot") {
          return nodeSlots(d.timeslot);
        } else if (colourScheme === "Coursework") {
          return nodecwcolours(d.cw);
        } else {
           return nodeColors(d.semester);
        }
      } else {
        return "#c0c0c0";
      }
    };
    getRadius = function (d) {
      if (d.ects != null) {
        if (d.ects === 20) {
          return 30;
        }        else if (d.ects === 10) {
          return 22; // exists
        } else if (d.ects === 5) {
          return 16;
        } else if (d.ects === 1) {
          return 20;
        }
      } else {
        return 20; // not exists    
      }
    };
    //###################################
    // updateNodes
    // enter/exit display for nodes
    updateNodes = function () {
      node = nodesG.selectAll("circle").data(curNodesData, function (d) {
        return d.id;
      });
      node.enter().append("circle").attr("cx", function (d) {
        return d.x;
      }).merge(node).attr("cy", function (d) {
        return d.y;
      }).attr("r", function (d) {
        return getRadius(d);
      }).style("fill", function (d) {
          return getColor(d);
          })
        .style("stroke", function (d) {
        return strokeFor(d);
      }).style("stroke-width", "4px");
      node.on("mouseover", showDetails).on("mouseout", hideDetails).on("click", myfunction);
      return node.exit().remove();
    };
    //#################################################
    // updateTexts

    updateTexts = function () {
      nodet = nodesG.selectAll("text.labels").data(curNodesData, function (d) {
        return d.id;
      });
      nodet.enter().append("text").attr("class", "labels").merge(nodet).attr("dx", function (d) {
        return d.x - 2 - 2 * d.sname.length;
      }).attr("style", 'font-size:9px; font-family:  "Monospace"; font-weight: bold;  letter-spacing: 0px;').attr("dy", function (d) {
        return d.y + 4;
      }).text(function (d) {
        return d.sname; //d.id
      });
      nodet.on("mouseover", showDetails).on("mouseout", hideDetails).on("click", myfunction);
      return nodet.exit().remove();
    };
    //###################################
    // updateLinks
    // enter/exit display for links
    updateLinks = function () {
      link = linksG.selectAll("line.link").data(curLinksData, function (d) {
        return `${d.source.id}_${d.target.id}`;
      });
      link.enter().append("line").attr("class", "link").merge(link).attr("stroke", strokecolor).attr("stroke-opacity", 0.3).attr("stroke-width", "2px").attr("x1", function (d) {
        return d.source.x;
      }).attr("y1", function (d) {
        return d.source.y;
      }).attr("x2", function (d) {
        return d.target.x;
      }).attr("y2", function (d) {
        return d.target.y;
      });
      return link.exit().remove();
    };
    //############################################
    // setLayout
    // choose force or radial layout
    // and set appropriate forces
    setLayout = function (newLayout) {
      var cutoff;
      layout = newLayout;
      force.stop();
      update();
      cutoff = 80;
      if (layout === "force") {
        // repulsive charge
        // constrain all
        // damping
        // links
        force.on("tick", forceTick).force("charge", d3.forceManyBody().strength(-150).distanceMax(cutoff)).force("gravity", d3.forceManyBody().strength(4).distanceMin(1 * cutoff)).velocityDecay(0.20).force('link', d3.forceLink(curLinksData).distance(80).strength(0.9)); // negative is repulsive
        force.alpha(1.0);
        force.alphaMin(5e-1);
        force.alphaDecay(1e-3);
      } else if (layout === "radial") {
        force.on("tick", radialTick).force('charge', d3.forceManyBody().strength(-300).distanceMax(40)).velocityDecay(0.08);
        force.alpha(1.0);
        force.alphaMin(5e-1);
        force.alphaDecay(2e-3);
      }
      update();
      return force.restart();
    };
    //############################################
    // RemoveHelper

    RemoveHelper = function () {
      // if present, remove them from svg 
      if (node) {
        node.data([]).exit().remove();
        return node = null;
      }
    };
    //#################################################  #
    // setFilter()
    // switches filter option to new filter
    setFilter = function (newFilter) {
      var filter;
      return filter = newFilter;
    };
    //#################################################  #
    // setSort()
    // switches sort option to new sort
    setSort = function (newSort) {
      return sort = newSort;
    };
    //################################################
    // foci

    foci = function (n) {
      switch (n.semester) {
        case "L4.S2":
          return height * 0.95;
        case "L4.S1":
          return height * 0.8;
        case "L34.S2":
            return height * 0.9;
        case "L34.S1":
            return height * 0.75;
        case "L3.S2":
          return height * 0.55;
        case "L3.S1":
          return height * 0.4;
        case "C3.S2":
          return height * 0.6;
        case "C3.S1":
          return height * 0.4;
        case "C2.S2":
          return height * 0.2;
        case "C2.S1":
          return height * 0.02;
        case "L2.S2":
          return height * 0.05;
        case "L2.S1":
          return height * 0.02;
        case "L3.AY":
          return height * 0.4;
        case "C4.AY":
            return height * 0.4;
        default:
          return height * 0.05;
      }
    };
    //################################################
    // forceTick
    // tick function for force directed layout
    forceTick = function () {
      var k;
      k = 0.2 * force.alpha();
      node.each(function (o, i) {
        o.y += (foci(o) - o.y) * k*2;
        if (o.fix === "fix") {
          o.x += (width * o.xpos - o.x) * k * 2;
          return o.y += (width * o.ypos - o.y) * k * 2;
        }
      });
      nodet.attr("dx", function (d) {
        return d.x - 2 - 2 * d.sname.length;
      }).attr("dy", function (d) {
        return d.y + 4;
      });
      node.attr("cx", function (d) {
        return d.x;
      }).attr("cy", function (d) {
        return d.y;
      });
      return update();
    };
    //########################################
    // radialTick
    // tick function for radial layout
    radialTick = function () {
      node.each(moveToRadialLayout());
      // error here
      node.attr("cx", function (d) {
        return d.x;
      }).attr("cy", function (d) {
        return d.y;
      });
      nodet.attr("dx", function (d) {
        return d.x - 2 - 2 * d.sname.length;
      }).attr("dy", function (d) {
        return d.y + 4;
      });
      return update();
    };
    //##############################################
    // Push geometrically towards appropriate location.
    // Uses alpha to dampen effect over time.
    moveToRadialLayout = function () {
      var k;
      k = 0.5 * Math.sqrt(force.alpha());
      return function (d) {
        var centerNode, tlength;
        centerNode = groupCenters(d.semester);
        tlength = Math.sqrt(Math.pow(centerNode.x - d.x, 2) + Math.pow(centerNode.y - d.y, 2));
        if (tlength > 1) {
          d.x += (centerNode.x - d.x) * k;
          return d.y += (centerNode.y - d.y) * k;
        }
      };
    };

    //################################################
    // Helper function that returns stroke color for
    // particular node.
    strokeFor = function (d) {
      if (d.semester[0] === "C") {
        return d3.rgb(coreStrokeColor).toString();
      } else if (d.semester[3] === ".") {
       // return d3.rgb(getColor(d)).toString();
      }  else {
         return d3.rgb(getColor(d)).darker().toString();
       }
    };
    //###############################################
    // click function (balls on/off)
    myfunction = function (d, i) {
      if (d.semester[0] !== "C") {
        if (d.include !== "0") {
          d.include = "0"; // turn node off
          d.tinclude = "1"; // but keep it silver
          force.alpha(1.0);
        } else {
          d.include = "1"; // turn node on
          d.tinclude = "1";
        }
        // higlight connected links
        node.style("fill", function (n) {
          return getColor(n);
        });
        return update(1);
      }
    };
    //###############################################
    // Mouseover tooltip function

    showDetails = function (d, i) {
      var content;
      content = '<p class="title">' + d.lid + ": " + d.name + '</p><p class="main">';
      if (d.cw) {
        content += d.cw + "  ";
      } else {
        content += "100% exam  ";
      }
      content += '</p><p class="main">Timeslot ' + d.timeslot + '</p><p class="main"> ';
      if (d.semester === "C2.S1") {
        content += 'Level 2 Semester 1 Core';
      }
      if (d.semester === "C2.S2") {
        content += 'Level 2 Semester 2 Core';
      }
      if (d.semester === "L2.S1") {
        content += 'Level 2 Semester 1';
      }
      if (d.semester === "L2.S2") {
        content += 'Level 2 Semester 2';
      }
      if (d.semester === "L3.S1") {
        content += 'Level 3 Semester 1';
      }
      if (d.semester === "L3.S2") {
        content += 'Level 3 Semester 2';
      }
      if (d.semester === "L34.S1") {
        content += 'Level 3 or 4, Semester 1';
      }
      if (d.semester === "L34.S2") {
        content += 'Level 3 or 4, Semester 2';
      }
      if (d.semester === "C3.S1") {
        content += 'Level 3 Semester 1 Core';
      }
      if (d.semester === "C3.S2") {
        content += 'Level 3 Semester 2 Core';
      }
      if (d.semester === "L3.AY") {
        content += 'Level 3 Year-long';
      }
      if (d.semester === "C4.AY") {
        content += 'Level 4 Year-long';
      }
      if (d.semester === "L4.S1") {
        content += 'Level 4 Semester 1';
      }
      if (d.semester === "L4.S2") {
        content += 'Level 4 Semester 2';
      }
      if (include_cats === true) {
        content += '</p><p class="main">';
        if (d.ects != null) {
          if (d.ects === 10) {
            content += ' 10-credits';
          }
          if (d.ects === 5) {
            content += ' 5-credits';
          }
          if (d.ects === 1) {
            content += ' 5/10-credits';
          }
          if (d.ects === 15) {
            content += ' 15-credits';
          }
        } else {
          content += ' ';
        }
      }
      content += '</p>';
      tooltip.showTooltip(content, d3.event);
      // higlight connected links
      
      force.stop();
      if (link) {
        return link.attr("stroke", function (l) {
          if (l.source === d || l.target === d) {
            return strokecolor;
          } else {
            return strokecolor2;
          }
        }).attr("stroke-opacity", function (l) {
          if (l.source === d || l.target === d) {
            return 1;
          } else {
            return 0.2;
          }
        }).attr("stroke-width", function (l) {
          if (l.source === d || l.target === d) {
            return "5px";
          } else {
            return "2px";
          }
        });
      }
      update();
    };

    //################################################
    // Mouse-out function

    hideDetails = function (d, i) {
      tooltip.hideTooltip();
      if (link) {
        link.attr("stroke", strokecolor).attr("stroke-opacity", 0.4).attr("stroke-width", "2px");
      }
      return force.restart();
    };
    // Final act of Network() function is to return  the inner 'network()' function.
    return network;
  };

  //###########################################
  // Activate selector button

  activate = function (group, link) {
    d3.selectAll(`#${group} a`).classed("active", false);
    return d3.select(`#${group} #${link}`).classed("active", true);
  };

  //########################################
  // main routine

  $(function () {
    var myNetwork;
    myNetwork = Network();
    //# events
    d3.selectAll("#layouts a").on("click", function (d) {
      var newLayout, newRun;
      newLayout = d3.select(this).attr("id");
      activate("layouts", newLayout);
      newRun = "start";
      activate("run", newRun);
      myNetwork.toggleLayout(newLayout);
      return myNetwork.toggleRun(newRun);
    });
    d3.selectAll("#colours a").on("click", function (d) {
      var newColour;
      newColour = d3.select(this).attr("id");
      activate("colours", newColour);
      return myNetwork.toggleColour(newColour);
    });
    d3.selectAll("#run a").on("click", function (d) {
      var newRun;
      newRun = d3.select(this).attr("id");
      activate("run", newRun);
      return myNetwork.toggleRun(newRun);
    });
    // "change of degree"-event
    $("#song_select").on("change", function (e) {
      var songFile;
      songFile = $(this).val();
      d3.json(`${songFile}`).then(function (json) {
        return myNetwork.updateData(json);
      });
      return myNetwork.toggleRun("start");
    });
    // default behaviour   
    return d3.json("M.json").then(function (json) {
      return myNetwork("#vis", json);
    });
  });

}).call(this);