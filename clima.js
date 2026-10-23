
const formulario = document.querySelector("#formulario-clima");
const campoCiudad = document.querySelector("#ciudad");
const botonBuscar = document.querySelector("#boton-buscar");
const selectorUnidad = document.querySelector("#unidad");
const estado = document.querySelector("#estado");

const ubicacion = document.querySelector("#ubicacion");
const descripcionActual = document.querySelector("#descripcion-actual");
const temperatura = document.querySelector("#temperatura");
const sensacion = document.querySelector("#sensacion");
const humedad = document.querySelector("#humedad");
const viento = document.querySelector("#viento");

const porHora = document.querySelector("#por-hora");
const porSemana = document.querySelector("#por-semana");

let ultimoPronostico = null;
let graficoTemperatura = null;
let numeroConsulta = 0;

// Convierte Celsius a la unidad seleccionada.
function convertirTemperatura(valor) {
    if (selectorUnidad.value === "fahrenheit") {
        return (valor * 9 / 5) + 32;
    }

    return valor;
}

function simboloTemperatura() {
    return selectorUnidad.value === "fahrenheit" ? "°F" : "°C";
}

function formatoTemperatura(valor) {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) {
        return "--";
    }

    return `${convertirTemperatura(valor).toFixed(1)} ${simboloTemperatura()}`;
}

// Traduce los códigos meteorológicos de Open-Meteo.
function describirClima(codigo) {
    if (codigo === 0) return { texto: "Despejado", icono: "☀️" };
    if (codigo === 1) return { texto: "Mayormente despejado", icono: "🌤️" };
    if (codigo === 2) return { texto: "Parcialmente nublado", icono: "⛅" };
    if (codigo === 3) return { texto: "Nublado", icono: "☁️" };
    if ([45, 48].includes(codigo)) return { texto: "Niebla", icono: "🌫️" };

    if ([51, 53, 55, 56, 57].includes(codigo)) {
        return { texto: "Llovizna", icono: "🌦️" };
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) {
        return { texto: "Lluvia", icono: "🌧️" };
    }

    if ([71, 73, 75, 77, 85, 86].includes(codigo)) {
        return { texto: "Nieve", icono: "❄️" };
    }

    if ([95, 96, 99].includes(codigo)) {
        return { texto: "Tormenta", icono: "⛈️" };
    }

    return { texto: "Condición variable", icono: "🌡️" };
}

function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);

    if (clase) {
        elemento.className = clase;
    }

    elemento.textContent = texto;
    return elemento;
}

function crearTarjetaHora(datos, indice) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-pronostico";

    const hora = datos.hourly.time[indice].slice(11, 16);
    const clima = describirClima(datos.hourly.weather_code[indice]);
    const temp = datos.hourly.temperature_2m[indice];
    const lluvia = datos.hourly.precipitation_probability[indice];

    tarjeta.append(
        crearElemento("p", "hora", hora),
        crearElemento("p", "icono-clima", clima.icono),
        crearElemento("p", "", clima.texto),
        crearElemento("p", "temp", formatoTemperatura(temp)),
        crearElemento(
            "p",
            "detalle-menor",
            `Prob. lluvia: ${lluvia ?? 0}%`
        )
    );

    return tarjeta;
}

function crearTarjetaDia(datos, indice) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-pronostico";

    // Mediodía local evita cambios de día por la zona horaria.
    const fecha = new Date(`${datos.daily.time[indice]}T12:00:00`);

    let nombreDia = fecha.toLocaleDateString("es-MX", {
        weekday: "long",
        timeZone: "UTC"
    });

    nombreDia = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);

    const clima = describirClima(datos.daily.weather_code[indice]);
    const max = datos.daily.temperature_2m_max[indice];
    const min = datos.daily.temperature_2m_min[indice];
    const lluvia = datos.daily.precipitation_probability_max[indice];

    tarjeta.append(
        crearElemento("p", "hora", nombreDia),
        crearElemento("p", "icono-clima", clima.icono),
        crearElemento("p", "", clima.texto),
        crearElemento("p", "temp", formatoTemperatura(max)),
        crearElemento(
            "p",
            "detalle-menor",
            `Mínima: ${formatoTemperatura(min)}`
        ),
        crearElemento(
            "p",
            "detalle-menor",
            `Prob. lluvia: ${lluvia ?? 0}%`
        )
    );

    return tarjeta;
}

function mostrarClimaActual(datos) {
    const actual = datos.current;

    ubicacion.textContent = datos.nombreCompleto;

    const clima = describirClima(actual.weather_code);

    descripcionActual.textContent = `${clima.icono} ${clima.texto}`;

    temperatura.textContent = formatoTemperatura(actual.temperature_2m);
    sensacion.textContent = formatoTemperatura(actual.apparent_temperature);

    humedad.textContent = `${actual.relative_humidity_2m}%`;
    viento.textContent = `${actual.wind_speed_10m} km/h`;
}

function mostrarPronosticoPorHora(datos) {
    porHora.replaceChildren();

    const horas = datos.hourly.time;
    const horaActual = datos.current.time;

    // Selecciona la hora local actual o la siguiente disponible.
    let inicio = horas.findIndex(hora => hora >= horaActual);

    if (inicio === -1) inicio = 0;

    const fin = Math.min(inicio + 24, horas.length);
    const fragmento = document.createDocumentFragment();

    for (let i = inicio; i < fin; i++) {
        fragmento.append(crearTarjetaHora(datos, i));
    }

    porHora.append(fragmento);
}

function mostrarPronosticoSemanal(datos) {
    porSemana.replaceChildren();

    const fragmento = document.createDocumentFragment();

    for (let i = 0; i < datos.daily.time.length; i++) {
        fragmento.append(crearTarjetaDia(datos, i));
    }

    porSemana.append(fragmento);
}

function mostrarGrafico(datos) {
    const horas = datos.hourly.time;
    const horaActual = datos.current.time;

    let inicio = horas.findIndex(hora => hora >= horaActual);

    if (inicio === -1) inicio = 0;

    const fin = Math.min(inicio + 24, horas.length);

    const etiquetas = horas
        .slice(inicio, fin)
        .map(hora => hora.slice(11, 16));

    const valores = datos.hourly.temperature_2m
        .slice(inicio, fin)
        .map(convertirTemperatura);

    const simbolo = simboloTemperatura();

    const contexto = document
        .querySelector("#grafico-temperatura")
        .getContext("2d");

    if (graficoTemperatura) {
        graficoTemperatura.destroy();
    }

    graficoTemperatura = new Chart(contexto, {
        type: "line",

        data: {
            labels: etiquetas,
            datasets: [{
                label: `Temperatura (${simbolo})`,
                data: valores,
                borderColor: "#1769aa",
                backgroundColor: "rgba(70, 160, 220, 0.15)",
                borderWidth: 3,
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.35
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: true,
                    position: "bottom"
                }
            },

            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 6,
                        maxRotation: 0
                    },
                    grid: {
                        display: false
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: `Temperatura (${simbolo})`
                    }
                }
            }
        }
    });
}

function mostrarTodo(datos) {
    mostrarClimaActual(datos);
    mostrarPronosticoPorHora(datos);
    mostrarPronosticoSemanal(datos);
    mostrarGrafico(datos);
}

async function consultarClima(ciudad) {
    const idConsulta = ++numeroConsulta;

    estado.textContent = "Buscando ciudad...";
    botonBuscar.disabled = true;

    try {
        // Paso 1: obtener las coordenadas de la ciudad.
        const parametrosBusqueda = new URLSearchParams({
            name: ciudad,
            count: "1",
            language: "es",
            format: "json"
        });

        const respuestaCiudad = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?${parametrosBusqueda}`
        );

        if (!respuestaCiudad.ok) {
            throw new Error("No se pudo buscar la ciudad.");
        }

        const resultadoCiudad = await respuestaCiudad.json();

        if (idConsulta !== numeroConsulta) return;

        const lugar = resultadoCiudad.results?.[0];

        if (!lugar) {
            throw new Error("No encontramos esa ciudad. Intenta con otro nombre.");
        }

        estado.textContent = "Obteniendo el pronóstico...";

        // Paso 2: solicitar los datos actuales, horarios y diarios.
        const parametrosClima = new URLSearchParams({
            latitude: lugar.latitude,
            longitude: lugar.longitude,

            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "weather_code",
                "wind_speed_10m"
            ].join(","),

            hourly: [
                "temperature_2m",
                "precipitation_probability",
                "weather_code"
            ].join(","),

            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max"
            ].join(","),

            forecast_days: "7",
            timezone: "auto",
            temperature_unit: "celsius",
            wind_speed_unit: "kmh"
        });

        const respuesta = await fetch(
            `https://api.open-meteo.com/v1/forecast?${parametrosClima}`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener el pronóstico meteorológico.");
        }

        const datos = await respuesta.json();

        if (idConsulta !== numeroConsulta) return;

        if (!datos.current || !datos.hourly || !datos.daily) {
            throw new Error("La API no devolvió todos los datos esperados.");
        }

        datos.nombreCompleto = `${lugar.name}, ${lugar.country}`;

        ultimoPronostico = datos;

        mostrarTodo(datos);

        estado.textContent =
            `Pronóstico actualizado para ${lugar.name}.`;

    } catch (error) {
        if (idConsulta !== numeroConsulta) return;

        estado.textContent =
            error instanceof TypeError
                ? "No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo."
                : error.message;

    } finally {
        if (idConsulta === numeroConsulta) {
            botonBuscar.disabled = false;
        }
    }
}

// Buscar ciudad al enviar el formulario.
formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    const ciudad = campoCiudad.value.trim();

    if (ciudad) {
        consultarClima(ciudad);
    }
});

// Cambiar unidades sin volver a consultar la API.
selectorUnidad.addEventListener("change", () => {
    if (ultimoPronostico) {
        mostrarTodo(ultimoPronostico);
    }
});

// Carga inicial.
consultarClima(campoCiudad.value);
