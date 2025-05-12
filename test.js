d3.csv("Eco_clean.csv").then(data => {
  const svg = d3.select("svg");
  const width = +svg.node().clientWidth;
  const height = +svg.attr("height");
  const zoomG = svg.append("g");

  svg.call(d3.zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (event) => zoomG.attr("transform", event.transform))
  );

  // Step 1: Extract nodes (including collabs)
  const orgMap = new Map(); // store category per org

  data.forEach(row => {
    const org = row["Organization.Name"]?.trim();
    if (org) {
      orgMap.set(org, row["Category"]?.trim() || "Unknown");
    }
    if (row["Collaborations"]) {
      row["Collaborations"]
        .split(/;\s*/)
        .map(name => name.trim())
        .forEach(collab => {
          if (collab && !orgMap.has(collab)) {
            orgMap.set(collab, "Unknown");
          }
        });
    }
  });

  const nodes = Array.from(orgMap.entries()).map(([name, category]) => ({
    id: name,
    category: category
  }));

  // Step 2: Create edges
  const edges = [];

  data.forEach(row => {
    const source = row["Organization.Name"]?.trim();
    if (source && row["Collaborations"]) {
      const collaborators = row["Collaborations"]
        .split(/;\s*/)
        .map(name => name.trim())
        .filter(name => name && name !== source);

      collaborators.forEach(target => {
        edges.push({ source, target });
      });
    }
  });

// Step 3: Color scale by category
const colorScale = d3.scaleOrdinal()
  .domain([
    "Health and Education",
    "NGO",
    "Alternative Education",
    "External Contractor",
    "Yukon Government",
    "Post-Secondary Institution",
    "Yukon FN Entities",
    "Yukon Government - FNSB",
    "Yukon Government - Education",
    "Unknown"
  ])
  .range([
    "#1f77b4", // Health and Education - blue
    "#ff7f0e", // NGO - orange
    "#2ca02c", // Alternative Education - green
    "#d62728", // External Contractor - red
    "#9467bd", // Yukon Government - purple
    "#8c564b", // Post-Secondary Institution - brown
    "#e377c2", // Yukon FN Entities - pink
    "#17becf", // Yukon Government - FNSB - gray
    "#bcbd22", // Yukon Government - Education - yellow-green
    "#7f7f7f"  // Unknown - cyan
  ]);

  // Step 4: Simulation
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.id).distance(200))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(200))
    .on("tick", ticked);

  // Draw links
  const link = zoomG.append("g")
    .attr("stroke", "#aaa")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(edges)
    .enter().append("line")
    .attr("stroke-width", 1.5);

  // Draw nodes
  const circle = zoomG.selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 95)
    .attr("fill", d => colorScale(d.category))
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended)
    );

  // Add labels
  const label = zoomG.selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text(d => d.id)
    .attr("text-anchor", "middle")
    .attr("dy", 4)
    .attr("fill", "#fff")
    .attr("pointer-events", "none");

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    circle
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
});