# 
root = exports ? this
#########################################
# 
# Help with the placement of nodes
RadialPlacement = () ->
  # stores the key -> location values
  values = d3.map()
  # how much to separate each location by
  increment = 20
  # how large to make the layout
  radius = 200
  # where the center of the layout should be
  center = {"x":0, "y":0}
  # what angle to start at
  start = -120
  current = start
  ###############################################
  # radialLocation
  # 
  # Given an center point, angle, and radius length,
  # return a radial position for that angle
  radialLocation = (center, angle, radius) ->
    x = (center.x + radius * Math.cos(angle * Math.PI / 180))
    y = (center.y + radius * Math.sin(angle * Math.PI / 180))
    {"x":x,"y":y}
  ######################################
  # Main entry point for RadialPlacement
  # Returns location for a particular key,
  # creating a new location if necessary.
  placement = (key) ->
    value = values.get(key)
    if !values.has(key)
      value = place(key)
    value
  #######################################
  #
  # Gets a new location for input key
  place = (key) ->
    value = radialLocation(center, current, radius)
    values.set(key,value)
    current += increment
    value
  #############################################
  # Given a set of keys, perform some 
  # magic to create a two ringed radial layout.
  # Expects radius, increment, and center to be set.
  # If there are a small number of keys, just make
  # one circle.
  setKeys = (keys) ->
    # start with an empty values
    values = d3.map()
    # number of keys to go in first circle
    firstCircleCount = 360 / increment
    # if we don't have enough keys, modify increment
    # so that they all fit in one circle
    if keys.length < firstCircleCount
      increment = 360 / keys.length
    # set locations for inner circle
    firstCircleKeys = keys.slice(0,firstCircleCount)
    firstCircleKeys.forEach (k) -> place(k)
    # set locations for outer circle
    secondCircleKeys = keys.slice(firstCircleCount)
    # setup outer circle
    radius = radius + radius / 1.8
    increment = 360 / secondCircleKeys.length
    secondCircleKeys.forEach (k) -> place(k)

  ################################
  # 
  placement.keys = (_) ->
    if !arguments.length
      return d3.keys(values)
    setKeys(_)
    placement
  ################################
  # 
  placement.center = (_) ->
    if !arguments.length
      return center
    center = _
    placement
  ####################################
  # 
  placement.radius = (_) ->
    if !arguments.length
      return radius
    radius = _
    placement
  ########################################
  # 
  placement.start = (_) ->
    if !arguments.length
      return start
    start = _
    current = start
    placement
  #####################################
  # 
  placement.increment = (_) ->
    if !arguments.length
      return increment
    increment = _
    placement
  return placement
## end of RadialPlacement()
##############################
##############################################
# Main network constructor function
Network = () ->
  # variables we want to access
  # include CATS sizes on popups
  include_cats=false
  # in multiple places of Network
  width = 1200
  height = 650
  # allData will store the unfiltered data
  allData = []
  curLinksData = []
  curNodesData = []
  linkedByIndex = {}
  # these will hold the svg groups for
  # accessing the nodes and links display
  nodesG = null
  linksG = null
  # these will point to the circles and lines
  # of the nodes and links
  node = null
  link = null
  nodet = null # future (for text)
  # variables to refect the current settings
  # of the visualization
  layout = "force"
  colourScheme = "Semester"
  sort = "semester"
  # groupCenters will store our radial layout for
  # the group by semester layout.
  groupCenters = null
  # our force directed layout ()
  # force = d3.forceSimulation() # v3
  force = d3.forceSimulation().force('center', d3.forceCenter(width / 2, height / 2))
  # color function used to color nodes
  #  nodeColors = d3.scale.category10()
  coreStrokeColor="#000000"#black
  strokecolor="#000000"
  strokecolor2="#500000"
  nodeColors = d3.scaleOrdinal()
    .domain(["C2.S1","L2.S1","C2.S2","L2.S2","L3.S1","C3.S1","L3.S2","C3.S2","L4.S1","L4.S2"])
    .range(["#1f77b4","#1f77b4","#9edae5","#9edae5","#d62728","#d62728","#d6616b","#d6616b","#2ca02c","#bcbd22"])
  nodeSlots = d3.scaleOrdinal()
    .domain(["1","2","3","4","5","6","7","8","9"])
    .range(["#357EC7","#FFCBA4","#979735",
      "#FF6600",  "#983265","#FFFF00",
      "#FFA62F","#BCDD11","#EE88CD"])
  nodecwcolours = d3.scaleOrdinal()
    .domain(["-","100% coursework","75%",
        "50%","25% coursework","40% coursework"])
    .range(["#FCD271","#dd1e2f","#ebb035",
      "#06a2cb","#218559","#357EC7"])
      
   # tooltip used to display details
  tooltip = Tooltip("vis-tooltip", 130)
  ##############################################
  # charge used in semester layout
  charge = (node) -> 
    -0.5*Math.pow(node.radius,2.0)/2
  ########################################
  # network
  # Starting point for network visualization
  # Initializes visualization and starts force  layout
  network = (selection, data) ->
    # format our data
    allData = setupData(data)
    # create our svg and groups
    vis = d3.select(selection)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
    #
    linksG = vis.append("g").attr("id", "links")
    nodesG = vis.append("g"). attr("id", "nodes")
    # setup the size of the force environment
    setLayout(layout)
  ##################################################  #########
  # update()
  # Performs the bulk of the
  # work to setup our visualization based on the
  # current layout/sort/filter.
  #
  # update() is called everytime a parameter changes
  # and the network needs to be reset.
  #
  update = () ->
  # filter data to show based on current filter   settings.
    curNodesData = filterNodes(allData.nodes)
    resetKillSubNodes(curNodesData,allData.links)
    killSubNodes(curNodesData,allData.links)
    killSubNodes(curNodesData,allData.links)
    killSubNodes(curNodesData,allData.links)
    curNodesData = filterNodes(curNodesData)
    curLinksData = filterLinks(allData.links, curNodesData)
    # radial layout
    if layout == "radial"
      setFree(curNodesData)
      semesters = sortedSemesters(curNodesData, curLinksData)
      updateCenters(semesters)
    # enter / exit for nodes
    updateNodes()
    updateTexts()
    # reset nodes in force layout
    force.nodes(curNodesData)
    # always show links in force layout
    if layout == "force"
      updateLinks()
    else
      # reset links so they do not interfere with
      # other layouts. updateLinks() will be called   when force is done animating.
      # force.links([])
      # if present, remove them from svg 
      if link
        link.data([]).exit().remove()
        link = null
  ##################################################  ########
  # Public function to switch between layouts
  network.toggleLayout = (newLayout) ->
    force.stop()
    # if present, remove them from svg 
    if node
      node.data([]).exit().remove()
      node = null
    if nodet
      nodet.data([]).exit().remove()
      node = null
    #
    setLayout(newLayout)
  ##################################################  ########
  # Public function to switch between layouts
  network.toggleColour = (newColour) ->
    colourScheme=newColour
    
  ############################
  # Public function to switch between layouts
  network.toggleRun = (newRun) ->
    force.stop()
    if (newRun=="start")
      force.alpha(1.0)
      update()
      force.restart() 
  #############################################
  #  load new data (programme) set
  network.updateData = (newData) ->
    allData = setupData(newData)
    setLayout(layout)
    toggleRun("start")
  ################################################# called once to clean up raw data and 
  # switch links to
  # point to node instances
  # Returns modified data
  setupData = (data) ->
    data.nodes.forEach (n) ->
      # set initial (x,y) 
      n.x = randomnumber=Math.floor(Math.random()   *width*0.02+width*0.5)
      n.y = randomnumber=Math.floor(Math.random()   *height*0.02+height*0.5)
      # set node radius 
      n.radius = 20
    nodesMap  = mapNodes(data.nodes)
    # set links
    data.links.forEach (l) ->
      l.source = nodesMap.get(l.source)
      l.target = nodesMap.get(l.target)
      # linkedByIndex is used for link sorting
      linkedByIndex["#{l.source.id},#{l.target.id}  "] = 1
    data
  ###############################################
  # mapNodes
  # 
  # Helper function to map node id's
  # to node  objects.
  # Returns d3.map of ids -> nodes
  mapNodes = (nodes) ->
    nodesMap = d3.map()
    nodes.forEach (n) ->
      nodesMap.set(n.id, n)
    nodesMap
  ##############################################
  # nodeCounts
  # 
  # Helper function that returns an associative   array
  # with counts of unique attr in nodes
  # attr is value stored in node, like 'semester'
  nodeCounts = (nodes, attr) ->
    counts = {}
    nodes.forEach (d) ->
      counts[d[attr]] ?= 0
      counts[d[attr]] += 1
    counts
  ##################################################
  # neighbouring
  # Given two nodes a and b, returns true if
  # there is a link between them.
  # Uses linkedByIndex initialized in setupData
  neighboring = (a, b) ->
    linkedByIndex[a.id + "," + b.id] or
    linkedByIndex[b.id + "," + a.id]    
  ###########################################
  # filterNodes
  # Removes nodes from input array
  # 
  # Returns array of nodes
  filterNodes = (allNodes) ->
    filteredNodes = allNodes

    filteredNodes = filteredNodes.filter (n) ->
                          n.tinclude != "0"   
    filteredNodes
  ##################################################  #
  # sortedSemesters
  # Returns array of semesters sorted based on
  # current sorting method.
  sortedSemesters = (nodes,links) ->
    semesters = []
    if sort == "links"
      counts = {}
      links.forEach (l) ->
        counts[l.source.semester] ?= 0
        counts[l.source.semester] += 1
        counts[l.target.semester] ?= 0
        counts[l.target.semester] += 1
        # add any missing semesters that dont have  any links
      nodes.forEach (n) ->
        counts[n.semester] ?= 0
        # sort based on counts
      semesters = d3.entries(counts).sort (a,b) ->
          b.value - a.value
        # get just names
      semesters = semesters.map (v) -> v.key
    else
      # sort semesters by song count
      counts = nodeCounts(nodes, "semester")
      semesters = d3.entries(counts).sort (a,b) ->
          b.value - a.value
      semesters = semesters.map (v) -> v.key
    semesters
  ##################################################  #####
  # killSubNodes
  # Returns array of semesters sorted based on
  # current sorting method.
  # tinclude=1 if node off; include=1 if node silver
  killSubNodes = (nodes,links) ->
    links.forEach (l) ->
      if l.source.include=="0" or l.source. tinclude=="0"
        l.target.tinclude="0"#node off
  ##################################################  #####
  # resetKillSubNodes
  # Returns array of semesters sorted based on
  # current sorting method.
  # tinclude=1 if node off; include=1 if node silver
  resetKillSubNodes = (nodes,links) ->
    links.forEach (l) ->
      l.target.tinclude="1"#node is on   
  #################################################
  # setFree
  # Returns array of semesters sorted based on
  # current sorting method.
  setFree = (nodes) ->
    nodes.forEach (n) ->
      n.fixed=0
  ####################################
  # setFree
  # Returns array of semesters sorted based on
  # current sorting method.
  setFixed = (nodes) ->
    nodes.forEach (n)->
      if n.fix=="fix"
        n.fixed=1
        n.x=width*n.xpos
        n.y=height*n.ypos
        n.px=width*n.xpos
        n.py=height*n.ypos
      if n.cats?
        include_cats=trus

  ################################################
  # updateCenters()
  # 
  updateCenters = (semesters) ->
    if layout == "radial"
      groupCenters = RadialPlacement()
        .center({"x":width/2, "y":height/2 })
        .radius(300)
        .increment(18)
        .keys(semesters)
  ###########################################
  # filterLinks
  # 
  # Removes links from allLinks whose
  # source or target is not present in curNodes
  # Returns array of links
  filterLinks = (allLinks, curNodes) ->
    curNodes = mapNodes(curNodes)
    allLinks.filter (l) ->
      curNodes.get(l.source.id) and curNodes.get(l. target.id)
  ##################################################
  # filterTargets
  # Removes node from  whose
  # source  is not present in curNodes
  filterTargets = (allLinks, curNodes) ->
    curNodes = mapNodes(curNodes)
    curNodes.filter (l) ->
      curNodes.get(l.source.id) and curNodes.get(l. target.id)
  ##################################
  # 
  #
  getColor = (d) ->
    if d.include!="0"
      if colourScheme=="Timeslot"
        nodeSlots(d.timeslot)
      else if colourScheme=="Coursework"
        nodecwcolours(d.cw)
      else
        nodeColors(d.semester)
    else
      "#c0c0c0"   
  getRadius = (d) ->
          if d.cats?
            if d.cats==20
              28 # exists
            else if d.cats==10  
              14
            else if d.cats==15
              20
          else 
            20 # not exists    
  ####################################
  # updateNodes
  # enter/exit display for nodes
  updateNodes = () ->
    node = nodesG.selectAll("circle").data(curNodesData, (d) -> d.id)
    node.enter().append("circle")
      .attr("cx", (d) -> d.x)
      .merge(node)
      .attr("cy", (d) -> d.y)
      .attr("r", (d) -> getRadius(d))
      .style("fill", (d)-> getColor(d))
      .style("stroke", (d) -> strokeFor(d))
      .style("stroke-width", "4px")  

    node.on("mouseover", showDetails)
      .on("mouseout", hideDetails)
      .on("click", click_function)
    node.exit().remove()
  ##################################################
  # updateTexts
  # 
  updateTexts = () ->
    nodet = nodesG.selectAll("text.labels").data(curNodesData, (d) -> d.id)

    nodet.enter().append("text")
      .attr("class", "labels")
      .merge(nodet)
      .attr("dx", (d) -> d.x-2-2*d.sname.length)
      .attr("style",'font-size:9px; font-family:  "Monospace"; font-weight: bold;  letter-spacing: 0px;')
      .attr("dy", (d) -> d.y+4)
      .text((d)->d.sname)#d.id

    nodet.on("mouseover", showDetails)
       .on("mouseout", hideDetails)
       .on("click", click_function)
    nodet.exit().remove()
  ####################################
  # updateLinks
  # enter/exit display for links
  updateLinks = () ->
    link = linksG.selectAll("line.link").data(curLinksData, (d)-> "#{d.source.id}_#{d.target.id}")
    link.enter().append("line")
      .attr("class", "link")
      .merge(link)
      .attr("stroke", strokecolor)
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", "2px")
      .attr("x1", (d) -> d.source.x)
      .attr("y1", (d) -> d.source.y)
      .attr("x2", (d) -> d.target.x)
      .attr("y2", (d) -> d.target.y)
      
    link.exit().remove()
  #############################################
  # setLayout
  # choose force or radial layout
  # and set appropriate forces
  setLayout = (newLayout) ->
    layout = newLayout
    force.stop()
    update()
    cutoff=80
    if layout == "force"
      force.on("tick", forceTick)
        # repulsive charge
        .force("charge", 
        d3.forceManyBody().strength(-100).distanceMax(cutoff))# negative is repulsive
        # constrain all
        .force("gravity",d3.forceManyBody().strength(5).distanceMin(2*cutoff))
        # damping
        .velocityDecay(0.6)
        # links
        .force('link',
           d3.forceLink(curLinksData).distance(80).strength(0.3) ) 
      force.alpha(1.0)
      force.alphaMin(1e-4)
      force.alphaDecay(1e-6)             
    else if layout == "radial"
      force.on("tick", radialTick)
        .force('charge',
          d3.forceManyBody().strength(-50).distanceMax(100))
          .velocityDecay(0.15)
      force.alpha(1.0)
      force.alphaMin(1e-4)
      force.alphaDecay(1e-6) 
   
    force.restart()
  #############################################
  # RemoveHelper
  #
  # 
  RemoveHelper=()->
    # if present, remove them from svg 
    if node
      node.data([]).exit().remove()
      node = null
  ##################################################  #
  # setFilter()
  # switches filter option to new filter
  setFilter = (newFilter) ->
    filter = newFilter
  ##################################################  #
  # setSort()
  # switches sort option to new sort
  setSort = (newSort) ->
    sort = newSort
  #################################################
  # foci
  #  
  foci = (n)->
    switch n.semester
      when "L4.S2"
        height*0.8
      when "L4.S1"
        height*0.65
      when "L3.S2"
        height*0.5
      when "L3.S1"
        height*0.35
      when "C3.S2"
        height*0.5
      when "C3.S1"
        height*0.35
      when "C2.S2"
        height*0.2
      when "C2.S1"
        height*0.05
      when "L2.S2"
        height*0.2
      when "L2.S1"
        height*0.05
      else
        height*0.05
  #################################################
  # forceTick
  # tick function for force directed layout
  forceTick = () ->
    k = 0.2* force.alpha()
    node.each (o,i)->
      o.y += (foci(o)-o.y)*k
      if o.fix=="fix"
        o.x += (width*o.xpos-o.x)*k*2
    nodet.attr("dx", (d) -> d.x-2-2*d.sname.length)
      .attr("dy", (d) -> d.y+4)
    node.attr("cx", (d) -> d.x)
      .attr("cy", (d) -> d.y)  
    update()
  #########################################
  # radialTick
  # tick function for radial layout
  radialTick = () ->
    node.each(moveToRadialLayout())
    # error here
    node.attr("cx", (d) -> d.x)
        .attr("cy", (d) -> d.y)
    nodet.attr("dx", (d) ->  d.x-2-2*d.sname.length)
         .attr("dy", (d) -> d.y+4)
    update()
  #############################################
  # Push geometrically towards 
  # appropriate location.
  # Uses alpha to dampen effect over time.
  moveToRadialLayout = () ->
    k =0.5 * Math.sqrt(force.alpha())
    (d) -> 
      centerNode = groupCenters(d.semester)
      tlength=Math.sqrt(Math.pow(centerNode.x-d.x,2)+Math.pow(centerNode.y-d.y,2))
      if (tlength>1)
        d.x += (centerNode.x - d.x) * k
        d.y += (centerNode.y - d.y) * k    
  ############################################### Helper function that
  # returns stroke color 
  # for particular node.
  strokeFor = (d) ->
    if d.semester[0]=="C"
      d3.rgb(coreStrokeColor).toString()
    else
      d3.rgb(getColor(d)).darker().toString()
  ############################################### click function (balls on/off)
  click_function =(d,i)->
    if d.semester[0]!="C"
      if d.include!="0"
        d.include="0" # turn node off
        d.tinclude="1" # but keep it silver
      else
        d.include="1" # turn node on
        d.tinclude="1"
      # higlight connected links
      node.style("fill", (n)->getColor(n))
      update(1)
  ##########################################
  # Mouseover tooltip function
  # 
  showDetails = (d,i) ->
    force.stop()
    content = '<p class="title">' + d.lid+": "+d.name + '</p><p class="main">'
    if (d.cw)
      content +=d.cw+"  "
    else
      content +="100% exam  "
    content+='</p><p class="main">Timeslot '+d.timeslot+'</p><p class="main"> '
    if (d.semester=="C2.S1")
      content+=  'Level 2 Semester 1 Core'
    if (d.semester=="C2.S2")
      content+=  'Level 2 Semester 2 Core'
    if (d.semester=="L2.S1")
      content+=  'Level 2 Semester 1'
    if (d.semester=="L2.S2")
      content+=  'Level 2 Semester 2'
    if (d.semester=="L3.S1")
      content+=  'Level 3 Semester 1'
    if (d.semester=="L3.S2")
      content+=  'Level 3 Semester 2'
    if (d.semester=="C3.S1")
      content+=  'Level 3 Semester 1 Core'
    if (d.semester=="C3.S2")
      content+=  'Level 3 Semester 2 Core'
    if (d.semester=="L4.S1")
      content+=  'Level 4 Semester 1'
    if (d.semester=="L4.S2")
      content+=  'Level 4 Semester 2'
    if include_cats==true 
      content+='</p><p class="main">'
      if d.cats?
        if (d.cats==20)
          content+= ' 20-CATS'
        if (d.cats==10)
          content+= ' 10-CATS'
        if (d.cats==15)
          content+= ' 15-CATS'
      else
        content+=  ' 15-CATS'
  
    content+=  '</p>' 
    tooltip.showTooltip(content,d3.event)

    # higlight connected links
    if link
      link
      .attr("stroke", (l) -> if l.source == d or l.target == d then strokecolor else strokecolor2)
          .attr("stroke-opacity", (l) -> if l.source == d or l.target == d then 1  else 0.2)
          .attr("stroke-width", (l) -> if l.source == d or l.target == d then  "5px" else "2px")       

  #################################################
  # Mouse-out function
  # 
  hideDetails = (d,i) ->
    tooltip.hideTooltip()
    if link
      link.attr("stroke", strokecolor)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", "2px")
    force.restart()
  # Final act of Network() function is to return  the inner 'network()' function.
  return network
############################################
# Activate selector button
# 
activate = (group, link) ->
  d3.selectAll("##{group} a").classed("active", false)
  d3.select("##{group} ##{link}").classed("active", true)
#########################################
# main routine
# 
$ ->
  myNetwork = Network()
  ## events
  d3.selectAll("#layouts a").on "click", (d) ->
    newLayout = d3.select(this).attr("id")
    activate("layouts", newLayout)
    newRun="start"
    activate("run", newRun)
    myNetwork.toggleLayout(newLayout)
    myNetwork.toggleRun(newRun)
  d3.selectAll("#colours a").on "click", (d) ->
    newColour = d3.select(this).attr("id")
    activate("colours", newColour)
    myNetwork.toggleColour(newColour)
  d3.selectAll("#run a").on "click", (d) ->
    newRun = d3.select(this).attr("id")
    activate("run", newRun)
    myNetwork.toggleRun(newRun)

  # "change of degree"-event
  $("#song_select").on "change", (e) ->
    songFile = $(this).val()
    d3.json "#{songFile}", (json) ->
      myNetwork.updateData(json)

  # default behaviour   
  d3.json "M.json", (json) ->
    myNetwork("#vis", json)
 