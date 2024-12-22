// main.js

// Tooltip global
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

let allData = [];

// Cambiar de pestaña
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab).classList.add('active');

    // Al cambiar a la pestaña "bar", redibujar con el valor actual (o 10 por defecto)
    if (tab === "bar") {
      const inputField = d3.select("#num-songs");
      if (!validateChartInput(inputField)) {
        // Si era inválido, la función ya puso 10, así que ya está dibujado
      } else {
        const numSongs = +inputField.property("value");
        createBarChart(allData, numSongs);
      }
    }
  });
});

// Cargar CSV
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    // Reemplaza vacíos con "N/A"
    for (let key in d) {
      if (!d[key] || d[key].trim() === "" || d[key] === "null" || d[key] === "undefined") {
        d[key] = "N/A";
      }
    }
    // Parsear Streams
    if (d['Spotify Streams'] !== "N/A") {
      const numericStr = d['Spotify Streams'].replace(/[^\d]/g, '');
      const num = +numericStr;
      d['Spotify Streams'] = isNaN(num) ? 0 : num;
    }
    // Parsear Track Score
    if (d['Track Score'] !== "N/A") {
      const parsedScore = parseFloat(d['Track Score']);
      d['Track Score'] = isNaN(parsedScore) ? 0 : parsedScore;
    } else {
      d['Track Score'] = 0;
    }
  });

  // Guardar data limpia en allData
  allData = data;

  // Log de depuración: canciones con mayor Streams (top 5)
  const debugTopStreams = [...allData]
    .sort((a, b) => b['Spotify Streams'] - a['Spotify Streams'])
    .slice(0, 5);
  console.log("Top 5 Streams (in allData) ->", debugTopStreams);

  // Filtro inicial para la tabla: sort by Streams desc, top 25
  markActiveSort("#sort-by-streams-desc");
  const sorted = [...allData].sort((a, b) => b['Spotify Streams'] - a['Spotify Streams']);
  console.log("Tabla inicial top 5 ->", sorted.slice(0, 5));  // Depuración
  populateTable(sorted.slice(0, 25));

  // Scatter con data completa
  createScatterPlot(allData);

  // Listeners
  d3.select("#num-songs").on("input", function() {
    if (validateChartInput(d3.select(this))) {
      const numSongs = +d3.select(this).property("value");
      createBarChart(allData, numSongs);
    }
  });

  d3.select("#num-rows").on("input", function() {
    if (validateTableInput(d3.select(this))) {
      const numRows = +d3.select(this).property("value");
      const activeBtn = document.querySelector(".sort-button.active-sort");
      if (activeBtn) {
        applySort(activeBtn.id, numRows);
      } else {
        populateTable(allData.slice(0, numRows));
      }
    }
  });

  // Botones de orden (tabla)
  d3.select("#sort-by-streams-desc").on("click", () => {
    markActiveSort("#sort-by-streams-desc");
    const numRows = +d3.select("#num-rows").property("value");
    applySort("sort-by-streams-desc", numRows);
  });

  d3.select("#sort-by-streams-asc").on("click", () => {
    markActiveSort("#sort-by-streams-asc");
    const numRows = +d3.select("#num-rows").property("value");
    applySort("sort-by-streams-asc", numRows);
  });

  d3.select("#sort-by-track-asc").on("click", () => {
    markActiveSort("#sort-by-track-asc");
    const numRows = +d3.select("#num-rows").property("value");
    applySort("sort-by-track-asc", numRows);
  });

  d3.select("#sort-by-track-desc").on("click", () => {
    markActiveSort("#sort-by-track-desc");
    const numRows = +d3.select("#num-rows").property("value");
    applySort("sort-by-track-desc", numRows);
  });
});

// Marca el botón de sort activo
function markActiveSort(buttonId) {
  d3.selectAll(".sort-button").classed("active-sort", false);
  d3.select(buttonId).classed("active-sort", true);
}

// Aplica el orden y dibuja la tabla
function applySort(buttonId, numRows) {
  let sortedData = [];
  if (buttonId === "sort-by-streams-desc") {
    sortedData = [...allData].sort((a, b) => b['Spotify Streams'] - a['Spotify Streams']);
  } else if (buttonId === "sort-by-streams-asc") {
    sortedData = [...allData].sort((a, b) => a['Spotify Streams'] - b['Spotify Streams']);
  } else if (buttonId === "sort-by-track-asc") {
    sortedData = [...allData].sort((a, b) => d3.ascending(a.Track, b.Track));
  } else if (buttonId === "sort-by-track-desc") {
    sortedData = [...allData].sort((a, b) => d3.descending(a.Track, b.Track));
  }
  console.log(`Orden aplicado: ${buttonId}. Top 5 ->`, sortedData.slice(0, 5)); // Depuración
  populateTable(sortedData.slice(0, numRows));
}

// Validación Bar Chart: 1..50
function validateChartInput(input) {
  let value = +input.property("value");
  if (value < 1 || value > 50 || isNaN(value)) {
    input.style("border", "2px solid red");
    Swal.fire({
      icon: 'error',
      title: 'Invalid Input',
      text: 'Debe ser un número entre 1 y 50. Se revertirá a 10.',
      timer: 2000,
      showConfirmButton: false
    });
    input.property("value", 10);
    createBarChart(allData, 10);
    return false;
  }
  input.style("border", "1px solid #ccc");
  return true;
}

// Validación Tabla: >=1
function validateTableInput(input) {
  const value = +input.property("value");
  if (value < 1 || isNaN(value)) {
    input.style("border", "2px solid red");
    Swal.fire({
      icon: 'error',
      title: 'Invalid Input',
      text: 'Debe ser un número positivo (>=1).',
      timer: 2000,
      showConfirmButton: false
    });
    return false;
  }
  input.style("border", "1px solid #ccc");
  return true;
}

// Scatter Plot
function createScatterPlot(data) {
  const svg = d3.select("#scatter svg");
  svg.selectAll("*").remove();

  const width = +svg.attr("width") - 50;
  const height = +svg.attr("height") - 50;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  const xMax = d3.max(data, d => (d['Spotify Streams'] === "N/A" ? 0 : d['Spotify Streams']));
  const xScale = d3.scaleLinear()
    .domain([0, xMax])
    .range([margin.left, width - margin.right]);

  const yMax = d3.max(data, d => d['Track Score'] || 0);
  const yScale = d3.scaleLinear()
    .domain([0, yMax])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format(".2s")));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale));

  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d['Spotify Streams'] === "N/A" ? 0 : d['Spotify Streams']))
    .attr("cy", d => yScale(d['Track Score'] || 0))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(
          "Track: " + d.Track + "<br>" +
          "Artist: " + d.Artist + "<br>" +
          "Streams: " + (
            d['Spotify Streams'] === 0 || d['Spotify Streams'] === "N/A"
              ? "N/A"
              : d['Spotify Streams'].toLocaleString()
          ) + "<br>" +
          "Track Score: " + (d['Track Score'] || 0)
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
      d3.select(event.target).attr("fill", "orange");
    })
    .on("mouseout", event => {
      tooltip.style("display", "none");
      d3.select(event.target).attr("fill", "steelblue");
    });
}

// Bar Chart
function createBarChart(data, numSongs) {
  const svg = d3.select("#bar svg");
  svg.selectAll("*").remove();

  let width = svg.node().getBoundingClientRect().width - 50;
  if (!width || width <= 0) {
    width = 800;
  }
  const height = +svg.attr("height") - 50;
  const margin = { top: 20, right: 20, bottom: 40, left: 150 };

  // Ordenar desc
  const sortedData = [...data].sort((a, b) => b['Spotify Streams'] - a['Spotify Streams']);
  console.log("BarChart: top 5 sorted ->", sortedData.slice(0, 5));  // Depuración

  const topData = sortedData.slice(0, numSongs);
  console.log(`BarChart: top ${numSongs}`, topData);

  const xMax = d3.max(topData, d => (d['Spotify Streams'] === "N/A" ? 0 : d['Spotify Streams']));
  const xScale = d3.scaleLinear()
    .domain([0, xMax])
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleBand()
    .domain(topData.map(d => d.Track))
    .range([margin.top, height - margin.bottom])
    .padding(0.1);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format(".2s")));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale));

  svg.selectAll("rect")
    .data(topData)
    .enter()
    .append("rect")
    .attr("x", margin.left)
    .attr("y", d => yScale(d.Track))
    .attr("width", 0)
    .attr("height", yScale.bandwidth())
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(
          "Track: " + d.Track + "<br>" +
          "Artist: " + d.Artist + "<br>" +
          "Streams: " + (
            d['Spotify Streams'] === 0 || d['Spotify Streams'] === "N/A"
              ? "N/A"
              : d['Spotify Streams'].toLocaleString()
          )
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
      d3.select(event.target).attr("fill", "orange");
    })
    .on("mouseout", event => {
      tooltip.style("display", "none");
      d3.select(event.target).attr("fill", "steelblue");
    })
    .transition()
    .duration(800)
    .attr("width", d => xScale(
      d['Spotify Streams'] === "N/A" ? 0 : d['Spotify Streams']
    ) - margin.left);
}

// Tabla
function populateTable(data) {
  const tbody = d3.select("#data-table tbody");
  tbody.selectAll("tr").remove();

  data.forEach((d, i) => {
    let trackVal = d.Track;
    if (!trackVal || trackVal.trim() === "" || trackVal === "N/A") {
      trackVal = "N/A";
    }

    let albumVal = d['Album Name'];
    if (!albumVal || albumVal.trim() === "" || albumVal === "N/A") {
      albumVal = "N/A";
    }

    let artistVal = d.Artist;
    if (!artistVal || artistVal.trim() === "" || artistVal === "N/A") {
      artistVal = "N/A";
    }

    let streamsVal = d['Spotify Streams'];
    if (streamsVal === undefined || streamsVal === null || isNaN(streamsVal)) {
      streamsVal = "N/A";
    } else {
      streamsVal = streamsVal === 0 ? "N/A" : streamsVal.toLocaleString();
    }

    let releaseVal = d['Release Date'];
    if (!releaseVal || releaseVal.trim() === "" || releaseVal === "N/A") {
      releaseVal = "N/A";
    }

    let popVal = d['Spotify Popularity'];
    if (!popVal || popVal.trim() === "" || popVal === "N/A") {
      popVal = "N/A";
    }

    const row = tbody.append("tr");
    row.append("td").text(i + 1);
    row.append("td").text(trackVal);
    row.append("td").text(albumVal);
    row.append("td").text(artistVal);
    row.append("td").text(streamsVal);
    row.append("td").text(releaseVal);
    row.append("td").text(popVal);
  });
}
