import { FESTIVAL_FERIA_NAME } from "./utils.js";

export const PRONAFECYT_BY_NIVEL = {
    "Primaria (I y II Ciclos)": [
        "F11B - Quehacer Científico y Tecnológico"
    ],
    "Secundaria - III Ciclo": [
        "F8B - Demostraciones Científicas y Tecnológicas",
        "F9B - Investigación Científica",
        "F10B - Investigación y Desarrollo Tecnológico"
    ],
    "Secundaria - Ed. Diversificada": [
        "F9B - Investigación Científica",
        "F10B - Investigación y Desarrollo Tecnológico"
    ],
    "Educación Especial": [
        "F12B - Sumando Experiencias Científicas",
        "F13B - Mi Experiencia Científica"
    ]
};

export function getNivelFromPronatecyt(categoria) {
    if (!categoria) return null;
    const code = String(categoria).split(" ")[0];
    if (["F11B", "F11C"].includes(code)) return "Primaria (I y II Ciclos)";
    if (["F8B", "F8C"].includes(code)) return "Secundaria - III Ciclo";
    if (["F9B", "F9C", "F10B", "F10C"].includes(code)) return "Secundaria - Ed. Diversificada";
    if (["F12B", "F12C", "F13B"].includes(code)) return "Educación Especial";
    return null;
}

export const PRONAFECYT_CATEGORIES = [
    "F8B - Demostraciones Científicas y Tecnológicas",
    "F9B - Investigación Científica",
    "F10B - Investigación y Desarrollo Tecnológico",
    "F11B - Quehacer Científico y Tecnológico",
    "F12B - Sumando Experiencias Científicas",
    "F13B - Mi Experiencia Científica"
];

// ponytail: max code = indicadores × 3, normalizado a 40/50 del PDF
export const PRONAFECYT_CODE_MAX = {
    F8B: 66, F8C: 72,
    F9B: 72, F9C: 81,
    F10B: 72, F10C: 81,
    F11B: 51, F11C: 69,
    F12B: 54, F12C: 69,
    F13B: 54
};

export function getRubricIndicatorsByFeria(feriaType) {
    if (feriaType === "Feria Expotecnica") {
        return [
            "Planteamiento y justificacion del proyecto",
            "Metodologia aplicada",
            "Calidad tecnica y funcionalidad",
            "Presentacion y comunicacion",
            "Viabilidad e impacto"
        ];
    }

    if (feriaType === "Festival Estudiantil de las Artes") {
        return [
            "Creatividad e originalidad",
            "Calidad artistica y tecnica",
            "Expresion y comunicacion",
            "Puesta en escena y presentacion"
        ];
    }

    return [
        "Dominio del tema cientifico",
        "Metodologia e investigacion",
        "Innovacion del proyecto",
        "Presentacion y comunicacion"
    ];
}

export function getExpotecnicaRubricByCategory(category, tipo) {
    const EXPO_RUBRICS = {
        "DESAFIO STEAM": {
            title: "ExpoTEC-7 - Exposicion del proyecto Desafio STEAM",
            sections: [{
                    title: "A. Identificacion y formulacion del problema",
                    indicators: [
                        "Define el problema de forma precisa.",
                        "Plantea alternativas de solucion con conceptos teorico-practicos atinentes.",
                        "Propone objetivos vinculados a la busqueda de soluciones.",
                        "Evidencia el impacto social, cientifico o tecnologico a corto y largo plazo.",
                        "Demuestra capacidad para expresar ideas con seguridad y defender el proyecto."
                    ]
                },
                {
                    title: "B. Elaboracion del proyecto y metodologia",
                    indicators: [
                        "Demuestra una linea de investigacion y desarrollo coherente y clara.",
                        "Argumenta el analisis e interpretacion de datos recopilados.",
                        "Evidencia gestion de recursos y busqueda de apoyo.",
                        "Demuestra originalidad y autoria propia.",
                        "Aplica la normativa vigente.",
                        "Se evidencia la factibilidad e implementacion comercial o industrial a futuro."
                    ]
                },
                {
                    title: "C. Prototipo y resultados",
                    indicators: [
                        "Presenta una linea de trabajo coherente y clara.",
                        "Da respuesta a la necesidad u objetivos planteados.",
                        "Evidencia uso optimo de los recursos disponibles.",
                        "Demuestra precision tecnica en elaboracion y funcionamiento.",
                        "Respeta las normativas de seguridad vigentes.",
                        "Muestra actualidad tecnologica en el campo de trabajo.",
                        "Evidencia el funcionamiento correcto segun la solucion planteada.",
                        "Demuestra creatividad e innovacion en ideas nuevas o mejoradas."
                    ]
                },
                {
                    title: "D. Presentacion y comunicacion",
                    indicators: [
                        "Evidencia apropiacion y dominio del tema.",
                        "Demuestra claridad y coherencia en la exposicion ante el panel de jueces.",
                        "Utiliza lenguaje tecnico acorde con el nivel academico y el campo.",
                        "Argumenta de forma solida y fundamentada la propuesta.",
                        "Emplea recursos afines (disenos, diagramas, graficos, esquemas, modelos, programas, equipos).",
                        "Describe la metodologia para implementacion, evaluacion y perfeccionamiento de la solucion.",
                        "Presenta resultados consistentes con los objetivos y la solucion al problema.",
                        "Brinda conclusiones precisas y objetivas basadas en los resultados.",
                        "Denota colaboracion y comunicacion efectiva del equipo.",
                        "Demuestra capacidad de recibir, analizar y aplicar sugerencias de mejora."
                    ]
                },
                {
                    title: "E. Documentacion del proyecto",
                    indicators: [
                        "Se evidencia congruencia entre lo expuesto por el estudiante o equipo y el informe escrito.",
                        "Evidencia el uso de lenguaje tecnico afin al tema del proyecto.",
                        "Estipula los procedimientos tecnicos utilizados.",
                        "La bitacora detalla en forma cronologica los procesos de investigacion, implementacion y experimentacion.",
                        "El cartel contiene informacion relevante para la exposicion del proyecto.",
                        "Utiliza el cartel como recurso y apoyo para el desarrollo de la exposicion."
                    ]
                }
            ]
        },
        "EMPRENDIMIENTO E INNOVACION": {
            title: "ExpoTEC-8 - Evaluacion de la exposicion del modelo de negocios",
            sections: [{
                    title: "A. Propuesta de valor y ventaja competitiva",
                    indicators: [
                        "Define de forma precisa la operacion basica de la potencial empresa.",
                        "Plantea las alternativas de solucion que la empresa brindara al problema o necesidad detectada.",
                        "Describe los productos o servicios ofrecidos que brindan valor a los clientes.",
                        "Evidencia el impacto de la potencial empresa desde diversos ambitos, tanto a corto como a largo plazo.",
                        "Argumenta las diferencias que ofrece la potencial empresa con la competencia."
                    ]
                },
                {
                    title: "B. Conocimiento del mercado y modelo de negocio",
                    indicators: [
                        "Demuestra un buen entendimiento del mercado, la competencia y aspectos financieros.",
                        "Argumenta con solidez que hace unico al negocio y por que constituye una buena oportunidad.",
                        "Demuestra gestion de los recursos de forma sostenible y responsable.",
                        "Expone una propuesta innovadora y creativa con respecto al mercado.",
                        "Define los canales mediante los cuales hara llegar a los clientes la propuesta de valor.",
                        "Caracteriza el segmento de clientes (necesidades, comportamientos, atributos)."
                    ]
                },
                {
                    title: "C. Comunicacion y presentacion oral",
                    indicators: [
                        "Demuestra claridad y coherencia en la exposicion del modelo de negocios ante el panel de jueces.",
                        "Utiliza lenguaje tecnico acorde con el nivel academico y el campo del negocio.",
                        "Evidencia capacidad de comunicacion oral y dominio de la propuesta de valor."
                    ]
                },
                {
                    title: "D. Operaciones y sostenibilidad del negocio",
                    indicators: [
                        "Expone las fuentes de ingresos y estructura de costos.",
                        "Describe las demandas del segmento de clientes y el seguimiento para asegurar la calidad de los bienes o servicios ofrecidos.",
                        "Describe las alianzas estrategicas de su propuesta de valor."
                    ]
                }
            ]
        }
    };

    const ESCRITO_RUBRICS = {
        "DESAFIO STEAM": {
            title: "ExpoTEC-10 - Evaluacion del informe escrito y bitacora (Desafio STEAM)",
            sections: [{
                    title: "I. Introduccion",
                    indicators: [
                        "Delimita los antecedentes del problema o necesidad por solventar.",
                        "Evidencia claridad en la definicion del problema.",
                        "Fundamenta la relevancia o utilidad potencial del proyecto.",
                        "Define los criterios tecnicos utilizados para la solucion del problema.",
                        "Evidencia la viabilidad del proyecto."
                    ]
                },
                {
                    title: "II. Marco teorico",
                    indicators: [
                        "Emplea variedad de fuentes de informacion confiables para sustentar el proyecto (tesis, libros, articulos, entrevistas, repositorios, paginas web).",
                        "Incluye citas bibliograficas relevantes, de forma critica dentro del texto, que documentan la investigacion y desarrollo del proyecto.",
                        "Emplea fuentes bibliograficas actualizadas, segun el tema abordado en el proyecto.",
                        "Define terminos o conceptos relevantes para la investigacion y desarrollo del proyecto.",
                        "Sintetiza la informacion existente del tema en estudio.",
                        "Evidencia la organizacion logica de la informacion recopilada."
                    ]
                },
                {
                    title: "III. Objetivos",
                    indicators: [
                        "Presenta el objetivo general y al menos dos objetivos especificos.",
                        "Se plantean de forma clara, precisa y segun estructura requerida: verbo en infinitivo, contenido y condicion tecnica.",
                        "Evidencia relacion con la propuesta de solucion planteada."
                    ]
                },
                {
                    title: "IV. Metodologia",
                    indicators: [
                        "Presenta las etapas del proyecto en el cronograma.",
                        "Cumple con las etapas establecidas en el cronograma.",
                        "Describe paso a paso los procedimientos y tecnicas utilizadas para la investigacion y desarrollo.",
                        "Describe los recursos utilizados para la implementacion del proyecto.",
                        "Evidencia procesos de mejora continua durante la investigacion y desarrollo del proyecto.",
                        "Evidencia el desarrollo de ideas novedosas o la aplicacion creativa de conocimientos.",
                        "Fundamenta los calculos requeridos para las demostraciones.",
                        "Incluye disenos y esquemas claros en relacion con el desarrollo del prototipo."
                    ]
                },
                {
                    title: "V. Discusion de resultados y conclusiones",
                    indicators: [
                        "Muestra concordancia entre los resultados obtenidos y los objetivos planteados.",
                        "Presenta los datos mediante tablas, diagramas, figuras, graficos, entre otros, que sustenten los resultados obtenidos.",
                        "Evidencia la interpretacion de los resultados desde una vision analitica y reflexiva, sin delimitarse a describirlos.",
                        "Demuestra resultados (producto) aplicables y utiles en la vida real.",
                        "Presenta coherencia entre los disenos y esquemas con respecto al prototipo desarrollado.",
                        "Plantea conclusiones relevantes en relacion con los objetivos trazados, analisis de datos y prototipado.",
                        "Concluye sobre el impacto ambiental, social o economico de la implementacion del proyecto."
                    ]
                },
                {
                    title: "VI. Estructura y formato del proyecto",
                    indicators: [
                        "Presenta una organizacion clara y logica, en congruencia con la estructura dada en los lineamientos.",
                        "Presenta el documento en formato de doble columna (IEEE, articulo de revista).",
                        "Presenta el listado de referencias citadas en el documento, segun formato APA vigente."
                    ]
                },
                {
                    title: "VII. Bitacora",
                    indicators: [
                        "Evidencia el proceso de investigacion y desarrollo realizado.",
                        "Cumple con el formato solicitado, segun los lineamientos de la ExpoTECNICA.",
                        "Presenta relacion con el informe escrito."
                    ]
                }
            ]
        },
        "EMPRENDIMIENTO E INNOVACION": {
            title: "ExpoTEC-11 - Evaluacion del documento escrito del modelo de negocios",
            sections: [{
                    title: "A. Propuesta de valor y diferenciacion",
                    indicators: [
                        "Describe de forma clara y precisa los antecedentes que fundamentan la propuesta de valor.",
                        "Explica con solidez que hace unico al negocio y por que es atractivo.",
                        "Describe las actividades clave que la empresa implementa para ofrecer una propuesta de valor.",
                        "Describe de forma detallada el producto o servicio propuesto que brinda valor a los clientes.",
                        "Detalla como los productos o servicios ofrecidos se diferencian de la competencia."
                    ]
                },
                {
                    title: "B. Segmento de clientes y canales",
                    indicators: [
                        "Emplea lenguaje tecnico acorde con el nivel academico y el campo del negocio.",
                        "Define los canales mediante los cuales hara llegar a los clientes la propuesta de valor.",
                        "Caracteriza ampliamente el segmento de clientes (necesidades, comportamientos, atributos).",
                        "Presenta los elementos diferenciadores que facilitan la decision de compra del cliente.",
                        "Describe las demandas del segmento de clientes y el seguimiento para asegurar la calidad de los bienes o servicios ofrecidos.",
                        "Presenta las estrategias para el acercamiento al cliente, ya sea durante el proceso de atencion o de servicio."
                    ]
                },
                {
                    title: "C. Estructura financiera y alianzas",
                    indicators: [
                        "Presenta datos sobre clientes, tendencias y oportunidades.",
                        "Incluye estrategias de promocion, precios, distribucion y posicionamiento.",
                        "Presenta la estructura de costos, gastos e ingresos.",
                        "Incluye los canales para la distribucion del producto hasta el cliente y su promocion, incorporando el uso de nuevas tecnologias.",
                        "Detalla las alianzas estrategicas y aportes a su propuesta de valor."
                    ]
                },
                {
                    title: "D. Viabilidad y pertinencia del negocio",
                    indicators: [
                        "Justifica de forma solida la viabilidad y pertinencia del negocio.",
                        "Identifica la situacion de mercado, sociedad o industria que se aborda en la propuesta de negocio.",
                        "Argumenta la necesidad o problema que resuelve la propuesta de negocio.",
                        "Determina aspectos sociales, economicos, tecnologicos o ambientales que resuelve la propuesta de negocio."
                    ]
                },
                {
                    title: "E. Estructura y formato del documento",
                    indicators: [
                        "Plantea los objetivos del negocio enfatizando en su viabilidad, escalabilidad y sostenibilidad.",
                        "Presenta una organizacion clara y logica del documento, en congruencia con la estructura dada en los lineamientos.",
                        "Presenta el listado de referencias citadas en el documento, segun formato APA vigente.",
                        "Cumple con el formato establecido."
                    ]
                }
            ]
        }
    };

    if (tipo === "Escrito" && ESCRITO_RUBRICS[category]) {
        return {
            title: ESCRITO_RUBRICS[category].title,
            sections: ESCRITO_RUBRICS[category].sections
        };
    }

    if (EXPO_RUBRICS[category]) {
        return {
            title: EXPO_RUBRICS[category].title,
            sections: EXPO_RUBRICS[category].sections
        };
    }

    return {
        title: "Evaluacion general - ExpoTECNICA",
        sections: [{ title: "Criterios generales", indicators: getRubricIndicatorsByFeria("Feria Expotecnica") }]
    };
}

export function getPronatecytRubricByCategory(category) {
    const F8B = {
        title: "PRONAFECYT F8B - Demostraciones Científicas y Tecnológicas (40 pts)",
        sections: [{
                title: "A. Propósito principal de la demostración e importancia del tema",
                indicators: [
                    "El propósito es explicado con claridad y coherencia, así como la importancia de la investigación y sus posibles consecuencias.",
                    "Las preguntas generales están relacionadas con la demostración.",
                    "La demostración corresponde a un proceso o principio científico o tecnológico."
                ]
            },
            {
                title: "B. Marco teórico y metodología",
                indicators: [
                    "Existe familiaridad y manejo de los contenidos de las fuentes consultadas.",
                    "Existe claridad en los conceptos utilizados.",
                    "La organización de la investigación demuestra una metodología de trabajo.",
                    "Selecciona los instrumentos adecuados para su demostración (maquetas, modelos, equipo de laboratorio, etc.).",
                    "Utiliza recursos materiales en forma ingeniosa y creativa.",
                    "Los recursos y desechos generados son utilizados considerando la sostenibilidad ambiental."
                ]
            },
            {
                title: "C. Análisis y conclusiones (Logros obtenidos)",
                indicators: [
                    "Realiza la interpretación de los resultados obtenidos en la demostración.",
                    "Explica cómo la demostración ilustra el concepto o principio científico, tecnológico o social seleccionado.",
                    "Contrasta o compara los resultados obtenidos en la demostración, con la información consultada.",
                    "Complementa la comparación con reflexiones personales."
                ]
            },
            {
                title: "D. Dominio del principio o proceso científico o tecnológico",
                indicators: [
                    "Explica el principio, proceso científico o tecnológico.",
                    "Evidencia comprensión de los conceptos que fundamentan la demostración.",
                    "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
                ]
            },
            {
                title: "E. Presentación y comunicación científica o tecnológica",
                indicators: [
                    "El cartel presentado apoya la comunicación en forma fluida.",
                    "El material expuesto tiene relación con el trabajo de investigación.",
                    "Existe claridad en la comunicación y se utiliza lenguaje científico acorde al tema.",
                    "Existe capacidad de síntesis para realizar la comunicación."
                ]
            },
            {
                title: "F. Autenticidad del trabajo realizado",
                indicators: [
                    "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
                    "Existe originalidad en la elaboración del material."
                ]
            }
        ]
    };

    const F9B = {
        title: "PRONAFECYT F9B - Investigación Científica (40 pts)",
        sections: [{
                title: "A. Planteamiento de los objetivos y justificación del problema",
                indicators: [
                    "La escogencia del problema demuestra creatividad y originalidad.",
                    "Los objetivos tienen relación con el problema de investigación.",
                    "Los objetivos son explicados con claridad y coherencia, así como la importancia de la investigación.",
                    "La definición de la pregunta incluye las variables.",
                    "Las personas estudiantes identifican las variables en la hipótesis."
                ]
            },
            {
                title: "B. Marco teórico",
                indicators: [
                    "Existe familiaridad y manejo de los contenidos de las fuentes.",
                    "Es comprensible el manejo de los conceptos, variables o términos técnicos utilizados."
                ]
            },
            {
                title: "C. Metodología aplicada",
                indicators: [
                    "Planificación y cumplimiento por etapas de la investigación.",
                    "Selecciona recursos e instrumentos adecuados para utilizarlos.",
                    "Describe los recursos tecnológicos (digitales o analógicos) y/o material concreto, preferiblemente reutilizable, requeridos en el desarrollo de la investigación.",
                    "Describe de manera adecuada las metodologías utilizadas.",
                    "Los recursos y desechos generados son utilizados considerando la sostenibilidad ambiental."
                ]
            },
            {
                title: "D. Discusión, interpretación y aplicación de los resultados",
                indicators: [
                    "Existe coherencia entre los objetivos y las conclusiones.",
                    "Análisis, discusión y correlación de variables es adecuado.",
                    "Logra la comprobación o negación de las hipótesis según las variables.",
                    "Congruencia de datos, tablas y gráficos presentados con el tema escogido.",
                    "Sugiere posibles aplicaciones de los resultados obtenidos o mejoras a las actividades efectuadas."
                ]
            },
            {
                title: "E. Presentación y comunicación científica",
                indicators: [
                    "El cartel presentado apoya la comunicación en forma fluida.",
                    "El material expuesto tiene relación con el trabajo de investigación.",
                    "Capacidad de síntesis para llevar a cabo la comunicación.",
                    "Claridad y coherencia al explicar el propósito, el proceso de investigación y sus conclusiones.",
                    "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
                ]
            },
            {
                title: "F. Autenticidad del trabajo realizado",
                indicators: [
                    "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
                    "Existe originalidad en la elaboración del material."
                ]
            }
        ]
    };

    const F10B = {
        title: "PRONAFECYT F10B - Investigación y Desarrollo Tecnológico (40 pts)",
        sections: [{
                title: "A. Planteamiento de los objetivos y justificación del problema",
                indicators: [
                    "La escogencia del problema/pregunta responde a una necesidad concreta.",
                    "Justifica, de forma cualitativa o cuantitativa, la relevancia del problema y la necesidad a abordar con la investigación.",
                    "Los objetivos tienen relación con el problema de investigación.",
                    "Los objetivos son explicados con claridad y coherencia, así como la importancia de la investigación y sus posibles consecuencias."
                ]
            },
            {
                title: "B. Marco teórico",
                indicators: [
                    "Existe familiaridad y manejo de los contenidos de las fuentes.",
                    "Existe claridad y precisión en los conceptos utilizados.",
                    "Utiliza correctamente el lenguaje científico y tecnológico acorde a la investigación."
                ]
            },
            {
                title: "C. Metodología aplicada",
                indicators: [
                    "Selección de instrumentos y métodos adecuados.",
                    "Describe las metodologías utilizadas para la obtención de soluciones tecnológicas.",
                    "Cumplimiento de las etapas planificadas en el diseño del desarrollo tecnológico.",
                    "Utiliza recursos materiales de bajo costo.",
                    "Los recursos están orientados hacia la sostenibilidad ambiental.",
                    "Describe las metodologías de evaluación y perfeccionamiento."
                ]
            },
            {
                title: "D. Discusión, interpretación y aplicación de los resultados",
                indicators: [
                    "Coherencia de los objetivos con los resultados obtenidos.",
                    "Explica cómo los resultados de la investigación tienen un impacto positivo sobre el problema a resolver.",
                    "Presentación y congruencia de datos, tablas y gráficos con el tema investigado.",
                    "Analiza posibles aplicaciones del desarrollo tecnológico obtenido en la sociedad."
                ]
            },
            {
                title: "E. Presentación y comunicación científica",
                indicators: [
                    "El cartel presentado apoya la comunicación en forma fluida.",
                    "El material expuesto tiene relación con el trabajo de investigación.",
                    "Existe capacidad de síntesis para llevar a cabo la comunicación.",
                    "Claridad al explicar el propósito, el proceso de investigación y la relevancia del trabajo a través de sus conclusiones.",
                    "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
                ]
            },
            {
                title: "F. Autenticidad del trabajo realizado",
                indicators: [
                    "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
                    "Existe originalidad en la elaboración del material."
                ]
            }
        ]
    };

    const F11B = {
        title: "PRONAFECYT F11B - Quehacer Científico y Tecnológico I y II Ciclos (40 pts)",
        sections: [{
                title: "A. Aspectos iniciales",
                indicators: [
                    "Las ideas previas que motivan la investigación evidencian una toma de decisiones por parte de las personas estudiantes.",
                    "Expresa sus ideas al presentar la(s) pregunta(s) que orienta su investigación y las suposiciones o predicciones."
                ]
            },
            {
                title: "B. Pasos por seguir",
                indicators: [
                    "Las acciones o pasos realizados en la investigación son comunicados con frases sencillas y coherentes.",
                    "Evidencia familiaridad y comprensión de los pasos y acciones realizadas durante la investigación."
                ]
            },
            {
                title: "C. Logros obtenidos",
                indicators: [
                    "Comunica los logros de la investigación.",
                    "Comunica las fuentes de información consultadas.",
                    "Expresa ideas propias relacionadas con la temática investigada.",
                    "Evidencia el disfrute y apropiación de la investigación realizada."
                ]
            },
            {
                title: "D. Dominio de la temática",
                indicators: [
                    "Comunica el proceso de la investigación realizada de forma lógica y secuencial.",
                    "Demuestra dominio al comunicar los logros obtenidos.",
                    "Todas las personas estudiantes integrantes del proyecto participan en la comunicación de la información."
                ]
            },
            {
                title: "E. Presentación y comunicación de la información",
                indicators: [
                    "El cartel presentado apoya la comunicación en forma fluida.",
                    "El material expuesto tiene relación con el trabajo de investigación.",
                    "Menciona todos los elementos que apoyan el trabajo de investigación.",
                    "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
                ]
            },
            {
                title: "F. Autenticidad del trabajo realizado",
                indicators: [
                    "El cartel y material expuesto/elaborado da muestras de que las personas estudiantes realizaron el trabajo.",
                    "Existe originalidad en la elaboración del material."
                ]
            }
        ]
    };

    const F12B = {
        title: "PRONAFECYT F12B - Sumando Experiencias Científicas (40 pts)",
        sections: [{
                title: "A. Aspectos iniciales",
                indicators: [
                    "Las ideas previas que motivan la investigación evidencian una toma de decisiones por parte de las personas estudiantes.",
                    "Expresa sus ideas al presentar la(s) pregunta(s) que orienta su investigación y las suposiciones o predicciones."
                ]
            },
            {
                title: "B. Pasos por seguir",
                indicators: [
                    "Las acciones o pasos realizados en la investigación son comunicados con frases sencillas y coherentes.",
                    "Evidencia familiaridad y comprensión de los pasos y acciones realizadas durante la investigación."
                ]
            },
            {
                title: "C. Logros obtenidos",
                indicators: [
                    "Comunica los hallazgos con la información consultada.",
                    "Comunica los logros de la investigación.",
                    "Comunica las fuentes de información consultadas.",
                    "Expresa ideas propias relacionadas con la temática investigada.",
                    "Evidencia el disfrute y apropiación de la investigación realizada."
                ]
            },
            {
                title: "D. Dominio de la temática",
                indicators: [
                    "Comunica el proceso de la investigación realizada de forma lógica y secuencial.",
                    "Demuestra dominio al comunicar los logros obtenidos.",
                    "Todas las personas estudiantes integrantes del proyecto participan en la comunicación de la información."
                ]
            },
            {
                title: "E. Presentación y comunicación de la información",
                indicators: [
                    "El cartel presentado apoya la comunicación en forma fluida.",
                    "El material expuesto tiene relación con el trabajo de investigación.",
                    "Señala o menciona todos los elementos que apoyan el trabajo de investigación.",
                    "Todas las personas estudiantes miembros del proyecto participan en la exposición y dominan el tema."
                ]
            },
            {
                title: "F. Autenticidad del trabajo realizado",
                indicators: [
                    "El cartel y otros recursos visuales corresponden al desarrollo cognitivo de las personas estudiantes.",
                    "Existe originalidad en la elaboración del material."
                ]
            }
        ]
    };

    const F13B = {
        title: "PRONAFECYT F13B - Mi Experiencia Científica (100 pts)",
        sections: [{
                title: "A. Aspectos iniciales",
                indicators: [
                    "Se evidencia el planteamiento de la hipótesis o problema.",
                    "Se demuestra que fue un tema desarrollado en el aula.",
                    "Es un tema que corresponde al currículo establecido al nivel de los estudiantes."
                ]
            },
            {
                title: "B. Pasos por seguir",
                indicators: [
                    "Expresa de acuerdo a sus habilidades comunicativas las acciones o pasos realizados en la investigación (material concreto, fotos, pictograma, señas, oral).",
                    "Evidencia familiaridad y comprensión de los pasos y acciones realizadas durante la investigación."
                ]
            },
            {
                title: "C. Logros obtenidos",
                indicators: [
                    "Expresa de acuerdo a sus habilidades comunicativas los hallazgos con la información consultada (material concreto, fotos, pictograma, señas, oral).",
                    "Expresa de acuerdo a sus habilidades comunicativas los logros de la investigación (material concreto, fotos, pictograma, señas, oral).",
                    "Expresa de acuerdo a sus habilidades comunicativas las fuentes de información consultada (material concreto, fotos, pictograma, señas, oral).",
                    "Evidencia el disfrute y la apropiación de la investigación realizada."
                ]
            },
            {
                title: "D. Dominio de la temática",
                indicators: [
                    "Expresa de acuerdo a sus habilidades comunicativas el proceso de la investigación realizada de forma lógica y secuencial (material concreto, fotos, pictograma, señas, oral).",
                    "Demuestra dominio al comunicar los logros obtenidos.",
                    "Todas las personas integrantes del proyecto participan en la comunicación del proyecto."
                ]
            },
            {
                title: "E. Comunicación de la información",
                indicators: [
                    "El cartel presentado apoya la comunicación en forma fluida.",
                    "El material expuesto tiene relación con el trabajo de investigación.",
                    "Señala o menciona todos los elementos que apoyan el trabajo de investigación.",
                    "Manifiesta normas de cortesía al comunicar lo investigado."
                ]
            },
            {
                title: "F. Autenticidad del trabajo realizado",
                indicators: [
                    "El cartel y otros recursos (objetos concretos, imágenes, material audiovisual, recursos tecnológicos y otros) corresponden al desarrollo cognitivo de los estudiantes.",
                    "Evidencia originalidad en la elaboración de material."
                ]
            }
        ]
    };

    const F8C = {
        title: "PRONAFECYT F8C - Demostraciones Científicas y Tecnológicas (Diario de Experiencias)",
        sections: [{
                title: "Portada e Índice",
                indicators: [
                    "Contiene los elementos oficiales de la portada (Dirección Regional de Educación, Circuito Educativo, nombre del centro educativo, título del proyecto, categoría de participación y área temática del proyecto, nombre de las personas estudiantes, nivel/sección, nombre de la persona docente o tutora, año).",
                    "El título del proyecto establece una idea general del trabajo realizado.",
                    "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
                ]
            },
            {
                title: "Aspectos iniciales de la demostración (Introducción)",
                indicators: [
                    "Anota las ideas previas que motivan la realización del proyecto.",
                    "Señala la importancia del tema relacionado con la demostración.",
                    "Indica la(s) pregunta(s) general(es) relacionadas con la demostración.",
                    "Explica el propósito principal de la demostración del campo científico, tecnológico o social seleccionado."
                ]
            },
            {
                title: "Explorando fuentes de información (Marco teórico)",
                indicators: [
                    "Describe las palabras claves, los conceptos o términos técnicos relevantes que se ponen en práctica en la demostración, indicando las fuentes de información consultadas.",
                    "Registra información adicional de diferentes fuentes de carácter científico, empírico o cotidiano, que complementan las ideas previas planteadas.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
                ]
            },
            {
                title: "Pasos por seguir (Metodología)",
                indicators: [
                    "Explica los pasos, procedimientos, métodos o técnicas utilizados en la demostración.",
                    "Narra los aportes propios que enriquecen la demostración realizada.",
                    "Indica si la demostración presenta algún cambio a partir de la fuente original de donde fue tomada.",
                    "Anota la lista de recursos tecnológicos (digitales o analógicos) y/o el material concreto preferiblemente reutilizable, requeridos en el desarrollo de la demostración.",
                    "Describe los recursos utilizados y el manejo de los residuos que pueden generarse considerando la sostenibilidad ambiental."
                ]
            },
            {
                title: "Logros obtenidos (Interpretación de los resultados)",
                indicators: [
                    "Analiza o interpreta los resultados obtenidos en la demostración.",
                    "Contrasta los resultados obtenidos con la información consultada, anotando reflexiones personales, acordes a su edad.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro).",
                    "Establece las conclusiones obtenidas a partir de la demostración realizada.",
                    "Aporta evidencias (fotografías, listas de asistencia, afiches, entre otras) acerca de la comunicación de la información obtenida en la demostración a los miembros de la comunidad educativa."
                ]
            },
            {
                title: "Referencias consultadas y Resumen",
                indicators: [
                    "Utiliza mínimo cuatro fuentes de información para realizar el proyecto.",
                    "Aporta referencias de no más de 10 años y de fuentes confiables, tomando en cuenta la abundancia de información sobre el tema desarrollado.",
                    "Utiliza un formato de referencia bibliográfica consistente sea APA u otro. Cita todas las fuentes que fueron mencionadas como referencias en el trabajo y viceversa.",
                    "Presenta una síntesis de los aspectos más relevantes de la demostración, describiendo en qué consiste, los resultados obtenidos, las conclusiones o las recomendaciones derivadas del trabajo realizado (máximo 250 palabras)."
                ]
            }
        ]
    };

    const F9C = {
        title: "PRONAFECYT F9C - Investigación Científica (Diario de Experiencias)",
        sections: [{
                title: "Portada e Índice",
                indicators: [
                    "Contiene los elementos oficiales de la portada (Dirección Regional de Educación, Circuito Educativo, nombre del centro educativo, título del proyecto, categoría de participación y área temática del proyecto, nombre de las personas estudiantes, nivel/sección, nombre de la persona docente o tutora, año).",
                    "El título del proyecto establece una idea general del trabajo realizado.",
                    "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
                ]
            },
            {
                title: "Aspectos iniciales de la investigación (Introducción)",
                indicators: [
                    "Anota las ideas previas que motivan la realización del proyecto.",
                    "Indica la importancia del tema investigado.",
                    "Presenta la(s) pregunta(s) que orientan la investigación.",
                    "Redacta la(s) hipótesis que se desea comprobar, tomando en cuenta las variables, independiente y dependiente.",
                    "Presenta el objetivo general y de uno a tres objetivos específicos de la investigación."
                ]
            },
            {
                title: "Explorando fuentes de información (Marco teórico)",
                indicators: [
                    "Describe los conceptos, las variables o términos técnicos relevantes que se aplican en la investigación, indicando las fuentes de información consultadas.",
                    "Registra información adicional de diferentes fuentes de carácter científico, empírico o cotidiano, que complementan las ideas previas planteadas.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
                ]
            },
            {
                title: "Pasos por seguir (Metodología)",
                indicators: [
                    "Explica los pasos, procedimientos, métodos o técnicas utilizados en la investigación.",
                    "Presenta la lista de recursos tecnológicos (digitales o analógicos) y/o el material concreto preferiblemente reutilizable, requeridos en el desarrollo de la investigación.",
                    "Selecciona y describe los instrumentos adecuados de investigación (encuestas, entrevistas, hojas de observación, experimentos, grupo control, entre otros).",
                    "Explica las variables independiente y dependiente, que forman parte de la hipótesis que se desea comprobar.",
                    "Describe los recursos utilizados y el manejo de los residuos que pueden generarse, considerando la sostenibilidad ambiental."
                ]
            },
            {
                title: "Logros obtenidos (Interpretación de los resultados)",
                indicators: [
                    "Analiza de forma estadística los datos obtenidos acerca de las variables establecidas en la hipótesis, por medio de tablas, gráficos, promedios, entre otros.",
                    "Indica si se cumple o no la hipótesis planteada.",
                    "Contrasta o compara los resultados obtenidos con la información consultada, complementándola con reflexiones personales.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro).",
                    "Establece al menos una conclusión por cada objetivo específico planteado.",
                    "Brinda sugerencias para mejorar las actividades efectuadas, tomando en cuenta la(s) pregunta(s) de la investigación.",
                    "Aporta evidencias (fotografías, listas de asistencia, afiches, entre otras) acerca de la comunicación de los logros obtenidos en la investigación."
                ]
            },
            {
                title: "Referencias consultadas, Resumen y Bitácora",
                indicators: [
                    "Presenta suficientes referencias que sustentan el trabajo (mínimo siete fuentes para III Ciclo y Educación Diversificada).",
                    "Aporta referencias de no más de 10 años y de fuentes confiables.",
                    "Utiliza un formato de referencia bibliográfica consistente sea APA u otro.",
                    "Contiene una síntesis de los aspectos más relevantes de la investigación (metodología, resultados, conclusiones, máximo 250 palabras).",
                    "Se presenta completa la bitácora, dando cuenta de las diferentes actividades de investigación realizadas (fecha, hora, actividad, resumen, temas discutidos)."
                ]
            }
        ]
    };

    const F10C = {
        title: "PRONAFECYT F10C - Investigación y Desarrollo Tecnológico (Diario de Experiencias)",
        sections: [{
                title: "Portada y Título",
                indicators: [
                    "Contiene los elementos oficiales de la portada (Dirección Regional de Educación, Circuito Educativo, nombre del centro educativo, título del proyecto, categoría de participación y área temática del proyecto, nombre de las personas estudiantes, nivel/sección, nombre de la persona docente o tutora, año).",
                    "El título informa el contenido de la investigación; es breve, conciso y específico."
                ]
            },
            {
                title: "Índice e Introducción",
                indicators: [
                    "Indica las principales secciones del trabajo y las páginas en las que se encuentran.",
                    "Anota las ideas previas que motivan la realización del proyecto.",
                    "Señala la importancia del problema o la necesidad que se desea resolver.",
                    "Presenta la(s) pregunta(s) que orientan la investigación.",
                    "Presenta el objetivo general y de uno a tres objetivos específicos de la investigación."
                ]
            },
            {
                title: "Justificación y Marco teórico",
                indicators: [
                    "Justifica la relevancia del problema y la necesidad a abordar en la investigación (de forma cualitativa o cuantitativa).",
                    "Describe los conceptos o términos técnicos relevantes que se aplican en la investigación, indicando las fuentes de información consultadas.",
                    "Registra información adicional de diferentes fuentes que complementan las ideas previas planteadas.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
                ]
            },
            {
                title: "Metodología aplicada",
                indicators: [
                    "Explica los pasos, procedimientos, métodos o técnicas utilizados en el desarrollo tecnológico.",
                    "Presenta la lista de recursos tecnológicos (digitales o analógicos) y/o material concreto preferiblemente reutilizable, requeridos en el desarrollo.",
                    "Describe las metodologías de evaluación y perfeccionamiento del desarrollo tecnológico.",
                    "Describe los recursos utilizados y el manejo de los residuos que pueden generarse, considerando la sostenibilidad ambiental.",
                    "Incluye diagramas, esquemas, modelos o planos que evidencian el diseño del desarrollo tecnológico (previo y final)."
                ]
            },
            {
                title: "Logros obtenidos (Interpretación de los resultados)",
                indicators: [
                    "Explica cómo los resultados de la investigación tienen un impacto positivo sobre el problema a resolver.",
                    "Analiza posibles aplicaciones del desarrollo tecnológico obtenido en la sociedad.",
                    "Contrasta o compara los resultados obtenidos con la información consultada, complementándola con reflexiones personales.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro).",
                    "Establece conclusiones y recomendaciones derivadas del trabajo realizado.",
                    "Aporta evidencias (fotografías, manuales, listas de asistencia) acerca de la comunicación de los resultados a la comunidad educativa."
                ]
            },
            {
                title: "Referencias consultadas, Resumen y Bitácora",
                indicators: [
                    "Presenta suficientes referencias que sustentan el trabajo.",
                    "Aporta referencias de no más de 10 años y de fuentes confiables.",
                    "Utiliza un formato de referencia bibliográfica consistente sea APA u otro.",
                    "Contiene una síntesis de los aspectos más relevantes (máximo 250 palabras).",
                    "Se presenta completa la bitácora, dando cuenta de las diferentes actividades realizadas (fecha, hora, actividad, resumen)."
                ]
            }
        ]
    };

    const F11C = {
        title: "PRONAFECYT F11C - Quehacer Científico y Tecnológico I y II Ciclos (Diario de Experiencias)",
        sections: [{
                title: "Portada e Índice",
                indicators: [
                    "Contiene los elementos oficiales de la portada.",
                    "El título del proyecto establece una idea general del trabajo realizado.",
                    "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
                ]
            },
            {
                title: "Aspectos iniciales (Introducción y pregunta)",
                indicators: [
                    "Anota las ideas previas que motivan la realización del proyecto.",
                    "Señala la importancia del tema relacionado con el proyecto.",
                    "Indica la(s) pregunta(s) que orientan el proyecto y las suposiciones o predicciones.",
                    "Explica el propósito principal del proyecto."
                ]
            },
            {
                title: "Explorando fuentes de información (Marco teórico)",
                indicators: [
                    "Describe palabras claves, conceptos o términos relevantes, indicando las fuentes de información consultadas.",
                    "Registra información adicional de diferentes fuentes que complementan las ideas previas.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
                ]
            },
            {
                title: "Pasos por seguir (Metodología)",
                indicators: [
                    "Explica los pasos, procedimientos o acciones realizadas en el proyecto.",
                    "Anota la lista de recursos tecnológicos (digitales o analógicos) y/o material concreto requeridos.",
                    "Describe los recursos utilizados y el manejo de residuos considerando la sostenibilidad ambiental."
                ]
            },
            {
                title: "Logros y hallazgos",
                indicators: [
                    "Comunica los hallazgos con la información consultada.",
                    "Comunica los logros del proyecto.",
                    "Comunica las fuentes de información consultadas.",
                    "Expresa ideas propias relacionadas con la temática investigada.",
                    "Evidencia el disfrute y apropiación del proyecto realizado.",
                    "Aporta evidencias (fotografías, listas de asistencia, afiches) acerca de la comunicación de los resultados a la comunidad educativa."
                ]
            },
            {
                title: "Referencias consultadas y Resumen",
                indicators: [
                    "Utiliza mínimo cuatro fuentes de información para realizar el proyecto.",
                    "Aporta referencias de no más de 10 años y de fuentes confiables.",
                    "Utiliza un formato de referencia bibliográfica consistente (APA u otro).",
                    "Presenta una síntesis de los aspectos más relevantes (máximo 250 palabras)."
                ]
            }
        ]
    };

    const F12C = {
        title: "PRONAFECYT F12C - Sumando Experiencias Científicas (Diario de Experiencias)",
        sections: [{
                title: "Portada e Índice",
                indicators: [
                    "Contiene los elementos oficiales de la portada.",
                    "El título del proyecto establece una idea general del trabajo realizado.",
                    "Indica las principales secciones del trabajo y las páginas en las que se encuentran."
                ]
            },
            {
                title: "Aspectos iniciales (Introducción y pregunta)",
                indicators: [
                    "Anota las ideas previas que motivan la realización del proyecto.",
                    "Señala la importancia del tema relacionado con el proyecto.",
                    "Indica la(s) pregunta(s) que orientan el proyecto y las suposiciones o predicciones."
                ]
            },
            {
                title: "Explorando fuentes de información (Marco teórico)",
                indicators: [
                    "Describe palabras claves, conceptos o términos relevantes, indicando las fuentes de información consultadas.",
                    "Registra información adicional de diferentes fuentes que complementan las ideas previas.",
                    "Cita o hace referencia a las fuentes de información utilizando un formato de referencias (APA u otro)."
                ]
            },
            {
                title: "Plan de investigación (Metodología)",
                indicators: [
                    "Explica las acciones o pasos realizados en el proyecto.",
                    "Anota la lista de recursos tecnológicos (digitales o analógicos) y/o material concreto requeridos.",
                    "Describe los recursos utilizados y el manejo de residuos considerando la sostenibilidad ambiental."
                ]
            },
            {
                title: "Logros y hallazgos",
                indicators: [
                    "Comunica los hallazgos con la información consultada.",
                    "Comunica los logros del proyecto.",
                    "Comunica las fuentes de información consultadas.",
                    "Expresa ideas propias relacionadas con la temática investigada.",
                    "Evidencia el disfrute y apropiación del proyecto realizado.",
                    "Aporta evidencias (fotografías, listas de asistencia, afiches) acerca de la comunicación de los resultados a la comunidad educativa."
                ]
            },
            {
                title: "Referencias consultadas y Resumen",
                indicators: [
                    "Utiliza mínimo cuatro fuentes de información para realizar el proyecto.",
                    "Aporta referencias de no más de 10 años y de fuentes confiables.",
                    "Utiliza un formato de referencia bibliográfica consistente (APA u otro).",
                    "Presenta una síntesis de los aspectos más relevantes (máximo 250 palabras)."
                ]
            }
        ]
    };

    const rubrics = {
        "F8B - Demostraciones Científicas y Tecnológicas": F8B,
        "F9B - Investigación Científica": F9B,
        "F10B - Investigación y Desarrollo Tecnológico": F10B,
        "F11B - Quehacer Científico y Tecnológico": F11B,
        "F12B - Sumando Experiencias Científicas": F12B,
        "F13B - Mi Experiencia Científica": F13B,
        "F8C - Demostraciones Científicas y Tecnológicas": F8C,
        "F9C - Investigación Científica": F9C,
        "F10C - Investigación y Desarrollo Tecnológico": F10C,
        "F11C - Quehacer Científico y Tecnológico": F11C,
        "F12C - Sumando Experiencias Científicas": F12C
    };

    const rubric = rubrics[category];
    if (rubric) {
        const allIndicators = rubric.sections.flatMap((section) => [
            { section: `${rubric.title} - ${section.title}` },
            ...section.indicators
        ]);
        return {
            indicators: allIndicators,
            scoreOptions: [
                { value: 3, label: "3 Logrado" },
                { value: 2, label: "2 Parcialmente logrado" },
                { value: 1, label: "1 No logrado" },
                { value: 0, label: "0 Ausente" }
            ]
        };
    }

    return null;
}

export function getFestivalAdvancedScoreOptions() {
    return [
        { value: 3, label: "3 Avanzado" },
        { value: 2, label: "2 Basico" },
        { value: 1, label: "1 Intermedio" }
    ];
}

export function getFestivalRubricBySubcategory(subcategory) {
    const normalizedSubcategory = String(subcategory ?? "").trim();

    const rubricBySubcategory = {
        "COREOGRAFIA DE BAILE": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
            "La coreografia y los temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes acorde con los objetivos, la Normativa y el Manual.",
            "La coreografia es original.",
            "Respeta la cantidad de integrantes: minimo de 2 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Participan unicamente estudiantes en escena.",
            "Dominio tecnico y expresivo del movimiento.",
            "Coherencia estetica, creatividad y relacion con el concepto."
        ],
        "COREOGRAFIA CONCEPTUAL": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "La coreografia se acoge a los objetivos del festival y a las sugerencias de temas.",
            "El contenido, mensaje general y temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "La obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes.",
            "La coreografia es original y desarrolla una historia, tema o idea clara con secuencias logicas.",
            "Respeta la cantidad de integrantes: minimo de 2 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Participan unicamente estudiantes en escena.",
            "Desarrollo conceptual y narrativo en la coreografia.",
            "Coherencia tecnico-artistica y estetica del concepto escenico."
        ],
        "COREOGRAFIA DE PROYECCION FOLCLORICA COSTARRICENSE": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
            "La coreografia y los temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes.",
            "Respeta la cantidad de integrantes: minimo 2 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Transmite ideas, sensaciones o conceptos que reflejan el folclor, las tradiciones y costumbres costarricenses.",
            "Representa o desarrolla una historia o anecdota tradicional, tipica o de costumbres costarricenses.",
            "Participan unicamente estudiantes en escena.",
            "Uso de ritmos y elementos coreograficos.",
            "Aspectos tecnico-artisticos, coherencia estetica y proyeccion escenica."
        ],
        "COREOGRAFIA FOLCLORICA INTERNACIONAL": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
            "La coreografia y los temas musicales respetan la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes.",
            "Respeta la cantidad de integrantes: minimo de 2 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Transmite ideas, sensaciones o conceptos que reflejan el folclor, las tradiciones y costumbres del pais que representa.",
            "Representa o desarrolla una historia o anecdota tradicional, tipica o de costumbres del pais que proyecta.",
            "Presenta pasos, figuras, niveles, formas y vestuarios acordes con la musica que baila.",
            "Participan unicamente estudiantes en escena.",
            "Aspectos tecnico-artisticos, coherencia estetica y proyeccion escenica."
        ],
        "CUENTACUENTOS": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta en su totalidad la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje de la obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "El cuento u obra es original.",
            "Respeta la cantidad de integrantes: 1 estudiante.",
            "Respeta la duracion maxima de 5 minutos.",
            "Expresion oral: diccion y proyeccion vocal.",
            "Expresion corporal: postura, movimientos y desplazamiento.",
            "Entonacion.",
            "Uso del espacio escenico.",
            "Interpretacion.",
            "Sentido de la verdad.",
            "Aspectos tecnico-artisticos, estetica y proyeccion escenica intercultural."
        ],
        "NARRACION O RELATO ORAL INDIGENA ORIGINAL": [
            "La propuesta se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta en su totalidad la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje de la obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica de docentes, autoridades tradicionales y personas gestoras culturales.",
            "La narracion o relato oral indigena es original.",
            "Respeta la cantidad de integrantes: 1 estudiante.",
            "Respeta la duracion maxima de 5 minutos.",
            "Oralidad, voz y transmision del relato.",
            "Expresion general.",
            "Dinamica de la voz.",
            "Uso del espacio y simbolos.",
            "Apropiacion, sentido cultural y memoria.",
            "Presentacion."
        ],
        "NARRACION O RELATO INDIGENA DE TRADICION ANCESTRAL": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta en su totalidad la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje de la obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La narracion o relato indigena es tradicional o ancestral.",
            "Respeta la cantidad de integrantes: 1 estudiante.",
            "Respeta la duracion maxima de 5 minutos.",
            "Oralidad, voz y transmision del relato.",
            "Expresion general.",
            "Dinamica de la voz.",
            "Uso del espacio y simbolos.",
            "Interpretacion.",
            "Apropiacion, sentido cultural y memoria."
        ],
        "POESIA CORAL": [
            "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La poesia coral es original.",
            "Respeta la cantidad de integrantes: minimo tres estudiantes.",
            "Respeta la duracion maxima de 5 minutos.",
            "Participan unicamente estudiantes en escena.",
            "Uso de figuras literarias.",
            "Utilizacion de figuras de construccion.",
            "Unidad de sentido o motivo lirico.",
            "Ritmo, musicalidad y desempeno grupal.",
            "Emotividad.",
            "Expresion oral.",
            "Expresion corporal.",
            "Relacion de la puesta en escena con la poesia.",
            "La poesia coral carece de rima."
        ],
        "RETAHILA": [
            "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La retahila es original.",
            "Respeta la cantidad de integrantes: 1 estudiante.",
            "Si el texto es presentado a mano utiliza letra legible; si es impreso, preferiblemente letra 12 Times New Roman.",
            "Uso de palabras autoctonas o adecuadas a la disciplina.",
            "Uso de figuras de construccion y de sentido.",
            "Tematica alusiva al festival.",
            "Concatenacion de ideas.",
            "Desempeno escenico.",
            "Originalidad.",
            "Musicalidad.",
            "Diccion."
        ],
        "TEATRO DE MUNECOS O TITERES": [
            "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La obra de teatro de titeres o munecos es original.",
            "Respeta la cantidad de integrantes: minimo 2 y maximo 5 estudiantes.",
            "Respeta la duracion maxima de 5 minutos.",
            "Participan unicamente estudiantes como titiriteros/as.",
            "Expresion oral, diccion, entonacion, proyeccion y caracterizacion de voces.",
            "Manipulacion del titere.",
            "Unidad y comunicacion grupal.",
            "Fluidez del espectaculo.",
            "Creatividad y originalidad.",
            "Originalidad en el uso de materiales.",
            "Uniformidad y concordancia entre los titeres y la dramaturgia.",
            "Dramaturgia."
        ],
        "TEATRO DE NINOS Y NINAS": [
            "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La obra de teatro de ninos y ninas es original.",
            "Respeta la cantidad de integrantes: minimo 2 y maximo 10 estudiantes.",
            "Respeta la duracion maxima de 5 minutos.",
            "Participan unicamente ninos y ninas de primaria.",
            "Expresion oral, diccion y proyeccion vocal.",
            "Expresion corporal.",
            "Maquillaje y vestuario.",
            "Uso del espacio escenico.",
            "Interpretacion.",
            "Sentido de la verdad.",
            "Unidad y comunicacion grupal.",
            "Fluidez.",
            "Dramaturgia."
        ],
        "TEATRO": [
            "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La obra de teatro es original.",
            "Respeta la cantidad de integrantes: minimo 2 y maximo 10 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Participan unicamente personas adolescentes, jovenes o adultas matriculadas en primaria o secundaria.",
            "Expresion oral, diccion y proyeccion vocal.",
            "Expresion corporal.",
            "Maquillaje y vestuario.",
            "Uso del espacio escenico.",
            "Interpretacion.",
            "Sentido de la verdad.",
            "Unidad y comunicacion grupal.",
            "Fluidez.",
            "Dramaturgia."
        ],
        "TEATRO DE NINOS Y NINAS INDIGENA": [
            "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La obra de teatro de ninos y ninas indigena es original.",
            "Respeta la cantidad de integrantes: minimo 2 y maximo 12 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Participan unicamente ninos y ninas indigenas de primaria.",
            "Tematica indigena.",
            "Uso de la palabra y la voz.",
            "Expresion corporal.",
            "Maquillaje y vestuario.",
            "Uso del espacio escenico.",
            "Interpretacion.",
            "Sentido de la verdad.",
            "Unidad y comunicacion grupal.",
            "Fluidez.",
            "Dramaturgia."
        ],
        "TEATRO INDIGENA": [
            "La obra se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "La obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Respeta la dignidad humana, diversidad, derechos humanos y equidad de genero.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La obra de teatro indigena es original.",
            "Respeta la cantidad de integrantes: minimo 2 y maximo 12 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Participan unicamente personas adolescentes, jovenes o adultas matriculadas en primaria o secundaria.",
            "Tematica indigena.",
            "Uso de la palabra y la voz.",
            "Expresion corporal.",
            "Maquillaje y vestuario.",
            "Uso del espacio escenico.",
            "Interpretacion.",
            "Sentido de la verdad.",
            "Unidad y comunicacion grupal.",
            "Fluidez.",
            "Dramaturgia."
        ],
        "DANZA CULTURAL INDIGENA COSTARRICENSE": [
            "La propuesta se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
            "Respeta la dignidad, diversidad humana y cosmovision indigena.",
            "Es evidente la mediacion pedagogica desde derechos humanos e interculturalidad.",
            "Respeta la cantidad de integrantes: minimo 2 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Transmite ideas o sensaciones de la cosmovision, saberes y tradiciones indigenas costarricenses.",
            "Representa relatos, vivencias o expresiones culturales indigenas de Costa Rica.",
            "Participan unicamente estudiantes en escena.",
            "Movimientos y elementos dancisticos.",
            "Coherencia cultural y respeto a la cosmovision indigena.",
            "Aspectos generales: coordinacion grupal, presencia escenica, uso del espacio, claridad de movimientos, vestuario y accesorios acordes."
        ],
        "DANZA CULTURAL INDIGENA INTERNACIONAL": [
            "La propuesta se acoge al articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
            "Respeta la dignidad, diversidad humana y cosmovision indigena.",
            "Es evidente la mediacion pedagogica desde derechos humanos e interculturalidad.",
            "Respeta la cantidad de integrantes: minimo 2 estudiantes.",
            "Respeta la duracion maxima de 6 minutos.",
            "Transmite ideas o sensaciones de la cosmovision, saberes y tradiciones culturales indigenas.",
            "Representa relatos, vivencias o expresiones culturales propias de otros pueblos indigenas del mundo.",
            "Participan unicamente estudiantes en escena.",
            "Movimientos y elementos dancisticos.",
            "Coherencia cultural y respeto a la cosmovision indigena.",
            "Aspectos generales: coordinacion grupal, presencia escenica, uso del espacio, claridad de movimientos, vestuario y accesorios acordes."
        ],
        "BANDA DE GARAJE": [
            "La cancion se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "La letra de la cancion se acoge a los objetivos del festival y a las sugerencias de temas.",
            "El contenido general y mensaje de la cancion incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La cancion es original.",
            "Respeta la cantidad de integrantes: minimo 3 y maximo 8 estudiantes.",
            "Respeta la duracion maxima de 5 minutos.",
            "Respeta la instrumentacion base de banda de garaje.",
            "Participan unicamente estudiantes en interpretacion y direccion musical.",
            "Relacion y desarrollo de melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion.",
            "Estabilidad en el pulso.",
            "Afinacion vocal e instrumental.",
            "Mensaje de la letra.",
            "Interpretacion en vivo."
        ],
        "CANCION ORIGINAL": [
            "La cancion se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival y sugerencias de temas.",
            "El contenido y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "La letra es adecuada a la etapa de desarrollo de adolescentes y jovenes.",
            "Es evidente la mediacion pedagogica docente.",
            "La cancion es original.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza un unico instrumento como base armonica.",
            "Relacion y desarrollo melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion vocal y estabilidad en el ritmo.",
            "Entonacion y afinacion."
        ],
        "CANCION ORIGINAL DE NINOS Y NINAS": [
            "La cancion se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "El contenido y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "La letra es adecuada a la edad y etapa de desarrollo de ninos y ninas.",
            "Es evidente la mediacion pedagogica docente.",
            "La cancion es original.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Es cantada unicamente por un nino o una nina.",
            "Utiliza un unico instrumento como base armonica.",
            "Relacion y desarrollo melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion vocal y estabilidad en el ritmo.",
            "Entonacion y afinacion."
        ],
        "CANCION POPULAR": [
            "La cancion se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
            "La letra es adecuada para adolescentes y jovenes.",
            "Es evidente la mediacion pedagogica docente.",
            "La letra promueve valores y buenas practicas.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza un unico instrumento como base armonica.",
            "Relacion y desarrollo melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion vocal y estabilidad en el ritmo.",
            "Entonacion y afinacion."
        ],
        "CANCION POPULAR DE NINOS Y NINAS": [
            "La cancion se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "La letra es adecuada para la edad del nino o nina.",
            "Es evidente la mediacion pedagogica docente.",
            "La cancion tiene un mensaje positivo para la ninez.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza un unico instrumento como base armonica.",
            "Relacion y desarrollo melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion vocal y estabilidad en el ritmo.",
            "Entonacion y afinacion."
        ],
        "CANCION TIPICA ORIGINAL COSTARRICENSE": [
            "La cancion se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
            "La letra es adecuada a la edad de quien la canta.",
            "Es evidente la mediacion pedagogica docente.",
            "La cancion es original.",
            "Expone aspectos propios de la identidad cultural y folclor costarricense.",
            "Utiliza ritmos tradicionales o tipicos costarricenses.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Puede haber hasta 3 personas en escena y maximo 3 instrumentos.",
            "Relacion y desarrollo melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion vocal y estabilidad en el ritmo.",
            "Entonacion y afinacion."
        ],
        "CANCION TIPICA POPULAR COSTARRICENSE": [
            "La cancion se acoge al articulo 3 de la Normativa.",
            "La obra se acoge a los objetivos del festival.",
            "La letra es adecuada a la edad de quien la canta.",
            "Es evidente la mediacion pedagogica docente.",
            "La letra expone aspectos propios de la identidad cultural y folclor costarricense.",
            "Utiliza ritmos tradicionales o tipicos costarricenses.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Puede haber hasta 3 personas en escena y maximo 3 instrumentos.",
            "Relacion y desarrollo melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion vocal y estabilidad en el ritmo.",
            "Entonacion y afinacion.",
            "Letra con rescate de tradiciones, costumbres e historias costarricenses."
        ],
        "CANTAUTOR/A": [
            "La cancion se acoge al articulo 3 de la Normativa.",
            "La obra se acoge a los objetivos del festival.",
            "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la mediacion pedagogica docente.",
            "La cancion es original y compuesta por quien la canta.",
            "La letra promueve valores y experiencias positivas.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza un unico instrumento ejecutado por quien compuso la cancion.",
            "Relacion y desarrollo melodia-armonia-ritmo y letra.",
            "Diccion.",
            "Proyeccion de la voz.",
            "Precision en la ejecucion vocal y estabilidad en el ritmo.",
            "Entonacion y afinacion.",
            "Creatividad en la letra."
        ],
        "CANTO INDIGENA ORIGINAL": [
            "El canto se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "La letra es adecuada a la etapa de desarrollo de quien la interpreta.",
            "Es evidente la mediacion pedagogica docente.",
            "El canto es original.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza maximo 2 instrumentos.",
            "Presenta elementos de cosmovision, memoria viva y saberes indigenas.",
            "Aborda temas relacionados con territorios indigenas, naturaleza, convivencia, familia y valores."
        ],
        "CANTO INDIGENA TRADICIONAL O ANCESTRAL": [
            "El canto se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "La letra es adecuada a la etapa de desarrollo de quien la interpreta.",
            "Es evidente la mediacion pedagogica docente.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza maximo 2 instrumentos.",
            "Presenta elementos de cosmovision, memoria viva y saberes indigenas.",
            "Aborda temas relacionados con territorios indigenas, naturaleza, convivencia, familia y valores."
        ],
        "CANTO INDIGENA ORIGINAL DE NINOS Y NINAS": [
            "El canto se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "La letra es adecuada a la etapa de desarrollo de ninos y ninas.",
            "Es evidente la mediacion pedagogica docente.",
            "El canto es original.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza maximo 2 instrumentos.",
            "Presenta aspectos propios de la cosmovision y saberes indigenas.",
            "Aborda temas relacionados con naturaleza, territorio, convivencia, aprendizaje, juego, familia y valores."
        ],
        "CANTO INDIGENA DE NINOS Y NINAS: TRADICIONAL O ANCESTRAL": [
            "El canto se acoge al articulo 3 de la Normativa.",
            "La letra se acoge a los objetivos del festival.",
            "La letra es adecuada a la etapa de desarrollo de ninos y ninas.",
            "Es evidente la mediacion pedagogica docente.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "Utiliza maximo 2 instrumentos.",
            "Presenta aspectos propios de la cosmovision y saberes indigenas.",
            "Aborda temas relacionados con naturaleza, territorio, convivencia, aprendizaje, juego, familia y valores."
        ],
        "CIMARRONA": [
            "La obra artistica se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "El titulo de la obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "El titulo incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La obra musical es original.",
            "Respeta la cantidad de integrantes: minimo 5 y maximo 12 estudiantes.",
            "Respeta la duracion maxima de 5 minutos.",
            "Participan unicamente estudiantes tanto en la interpretacion como en la direccion musical.",
            "Mantiene el formato tradicional de la cimarrona costarricense.",
            "Desarrollo ritmico, melodico y armonico.",
            "Precision en la ejecucion ritmica.",
            "Afinacion general.",
            "Utiliza ritmos tipicos, folcloricos o tradicionales costarricenses."
        ],
        "CORO": [
            "La cancion se acoge al articulo 3 de la Normativa FEA 2026.",
            "La letra responde a los objetivos y temas del festival.",
            "El mensaje incorpora reflexion critica y analitica.",
            "Existe mediacion pedagogica docente.",
            "La cancion es original.",
            "Minimo 4 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Utiliza un instrumento o puede interpretarse a capela.",
            "Participan unicamente estudiantes en el coro.",
            "Relacion melodia-armonia-ritmo-letra.",
            "Diccion.",
            "Proyeccion vocal.",
            "Precision en la ejecucion.",
            "Estabilidad en el pulso.",
            "Afinacion vocal e instrumental.",
            "Mensaje positivo de la letra.",
            "Interpretacion totalmente en vivo."
        ],
        "ENSAMBLE DE FLAUTAS DULCES": [
            "La obra se acoge a la normativa del festival.",
            "El titulo responde a objetivos y temas del festival.",
            "El titulo incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "La obra es original.",
            "Minimo 3 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Participan unicamente estudiantes.",
            "Utiliza unicamente flautas dulces.",
            "Relacion armonica entre melodia y armonia.",
            "Afinacion, entonacion y armonizacion.",
            "Precision ritmica.",
            "Interpretacion totalmente en vivo."
        ],
        "ENSAMBLE INSTRUMENTAL CON MATERIALES RECICLABLES O REUTILIZABLES": [
            "Se acoge al articulo 3 de la normativa.",
            "El titulo responde a los objetivos del festival.",
            "El titulo incorpora reflexion critica.",
            "Promueve sostenibilidad ambiental.",
            "Existe mediacion pedagogica docente.",
            "La obra es original.",
            "Minimo 4 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Solo participan estudiantes.",
            "Utiliza instrumentos construidos con materiales reciclables o reutilizables.",
            "Acople ritmico grupal.",
            "Creatividad e innovacion.",
            "Precision y claridad ritmica.",
            "Interpretacion totalmente en vivo."
        ],
        "ESTUDIANTINA": [
            "La cancion se acoge a la normativa.",
            "La letra responde a objetivos y temas del festival.",
            "Incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "La cancion es original.",
            "Minimo 10 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Participan unicamente estudiantes.",
            "Mantiene caracteristicas propias de una estudiantina.",
            "Relacion melodia-armonia-ritmo-letra.",
            "Diccion.",
            "Proyeccion vocal.",
            "Precision en la ejecucion.",
            "Estabilidad en el pulso.",
            "Afinacion vocal e instrumental.",
            "Mensaje positivo de la letra.",
            "Interpretacion totalmente en vivo."
        ],
        "GRUPO INSTRUMENTAL EXPERIMENTAL": [
            "La obra se acoge a la normativa.",
            "El titulo responde a los objetivos del festival.",
            "El titulo incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "La obra es original.",
            "Minimo 5 y maximo 15 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Integrado unicamente por estudiantes.",
            "Experimenta con al menos 3 de las 4 categorias sonoras establecidas.",
            "La obra es instrumental y experimental.",
            "Relacion melodia-armonia-ritmo.",
            "Precision en la ejecucion.",
            "Estabilidad en el pulso.",
            "Afinacion instrumental."
        ],
        "GRUPO INSTRUMENTAL": [
            "La obra se acoge a la normativa.",
            "El titulo responde a objetivos y temas del festival.",
            "El titulo incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "La obra es original.",
            "Minimo 3 y maximo 15 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Los instrumentos son ejecutados unicamente por estudiantes.",
            "Relacion precisa entre armonia y melodia.",
            "Uso de melodia, armonia y ritmo.",
            "Afinacion correcta.",
            "Precision ritmica.",
            "Interpretacion totalmente en vivo."
        ],
        "GRUPO MUSICAL CULTURAL INSTRUMENTAL INDIGENA": [
            "La propuesta se acoge a la normativa.",
            "El titulo responde a objetivos y temas del festival.",
            "El titulo incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "Minimo 2 y maximo 15 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Solo estudiantes participan y dirigen.",
            "Interpretacion instrumental totalmente en vivo.",
            "Presenta cosmovision, memoria viva y saberes indigenas.",
            "Aborda territorios indigenas, naturaleza, convivencia y valores.",
            "Puede integrar danza, narracion, poesia y dramatizacion."
        ],
        "GRUPO MUSICAL CULTURAL INDIGENA": [
            "La propuesta se acoge a la normativa.",
            "El titulo responde a objetivos y temas del festival.",
            "El titulo incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "Minimo 2 y maximo 15 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Solo estudiantes participan y dirigen.",
            "Interpretacion totalmente en vivo con canto.",
            "Presenta cosmovision, memoria viva y saberes indigenas.",
            "Aborda territorios indigenas, naturaleza, convivencia y valores.",
            "Puede integrar danza, narracion, poesia y dramatizacion."
        ],
        "MARIMBA": [
            "La obra se acoge a la normativa.",
            "El titulo responde a objetivos y temas del festival.",
            "El titulo incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "La obra es original.",
            "Utiliza unicamente ritmos folcloricos costarricenses autorizados.",
            "Individual o agrupacion de maximo 15 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Solo estudiantes interpretan la obra.",
            "La marimba es el instrumento principal.",
            "Relacion armonica entre melodia y armonia.",
            "Afinacion y armonizacion.",
            "Precision ritmica.",
            "Interpretacion totalmente en vivo."
        ],
        "PERCUSION CORPORAL": [
            "La obra se acoge a la normativa.",
            "El titulo responde a los objetivos del festival.",
            "El titulo incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "La obra es original.",
            "Minimo 2 estudiantes.",
            "Duracion maxima de 5 minutos.",
            "Solo participan estudiantes.",
            "Utiliza unicamente el cuerpo humano como instrumento.",
            "Presenta elementos coreograficos o formaciones.",
            "Acople ritmico grupal.",
            "Originalidad y creatividad.",
            "Precision y claridad ritmica.",
            "Musicalidad.",
            "Interpretacion totalmente en vivo."
        ],
        "RAP": [
            "El rap se acoge a la normativa.",
            "La letra responde a los objetivos y temas del festival.",
            "Incorpora reflexion critica.",
            "Existe mediacion pedagogica docente.",
            "La cancion es original.",
            "Participacion estrictamente individual.",
            "Duracion maxima de 5 minutos.",
            "La mayor parte de la obra es rapeada.",
            "Utiliza un unico instrumento, pista o puede ser a capela.",
            "Relacion entre ritmo y letra.",
            "Diccion.",
            "Precision vocal y estabilidad ritmica.",
            "Proyeccion vocal.",
            "Precision en la ejecucion.",
            "Estabilidad en el pulso.",
            "Uso correcto del vocabulario."
        ],
        "ILUSTRACION DIGITAL": [
            "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "La obra artistica incorpora una reflexion critica y analitica de la realidad actual.",
            "La propuesta artistica no visibiliza algun tipo de discriminacion.",
            "En el titulo de la obra incorpora un uso de lenguaje correcto y se basa en las sugerencias de temas del festival.",
            "Incorpora el uso de lenguaje correcto.",
            "Es evidente la mediacion pedagogica de las personas docentes y del centro educativo.",
            "La obra es original y no constituye copia o replica directa de disenos existentes.",
            "La obra constituye una ilustracion digital creada integramente con herramientas digitales.",
            "El dibujo, pintura, diseno, color, modelado digital, efectos y edicion son realizados por estudiantes.",
            "La obra evidencia uso de composicion, proporciones, iluminacion y color.",
            "La participacion es estrictamente individual.",
            "Integra intencionalmente los elementos del lenguaje visual: linea, forma, color, textura e iluminacion.",
            "Mantiene coherencia estetica y conceptual entre planificacion e ilustracion final.",
            "Desarrolla una composicion equilibrada mediante color, luz, sombra y jerarquias visuales.",
            "Emplea adecuadamente herramientas digitales de dibujo, pintura, capas, pinceles y ajustes.",
            "Produce la ilustracion en el formato, orientacion y resolucion establecidos."
        ],
        "MICRORRELATO ILUSTRADO DIGITAL": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y al tema propuesto.",
            "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "El microrrelato ilustrado, tanto texto como ilustraciones, es original.",
            "Participacion individual o maximo 2 estudiantes.",
            "Respeta la extension de minimo 7 y maximo 200 palabras.",
            "Cumple con el formato digital de presentacion establecido.",
            "Presenta la ficha tecnica visible en la obra.",
            "Presenta narratividad y recursos discursivos como ironia, humor o parodia.",
            "Posee estructura simple, personajes minimamente caracterizados y condensacion temporal.",
            "Emplea adecuadamente recursos tematicos como intertextualidad o metaficcion.",
            "Utiliza correctamente puntuacion y ortografia.",
            "Mantiene extrema brevedad.",
            "Presenta concision, sintesis y condensacion narrativa.",
            "La ilustracion mantiene coherencia estetica y conceptual con el texto.",
            "Utiliza adecuadamente los elementos del lenguaje visual.",
            "Emplea herramientas digitales de ilustracion.",
            "Presenta una composicion equilibrada y clara visualmente."
        ],
        "MUSICA DIGITAL": [
            "La obra musical se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "El titulo de la obra se acoge a los objetivos del festival y a las sugerencias de temas.",
            "El titulo y la letra incorporan una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La obra musical es original.",
            "Participacion individual o maximo 10 estudiantes.",
            "Respeta la duracion maxima de 10 minutos.",
            "Los dispositivos digitales, hardware, software y controladores son ejecutados unicamente por estudiantes.",
            "Presenta creatividad en la composicion.",
            "La armonia y melodia son coherentes.",
            "Utiliza preferiblemente los elementos constitutivos de la musica.",
            "Presenta precision general en la ejecucion.",
            "La ejecucion se realiza unicamente en vivo.",
            "Responde a las caracteristicas propias de la disciplina de musica digital.",
            "No utiliza instrumentos musicales acusticos, electroacusticos o electricos tradicionales."
        ],
        "CANTO POETICO INDIGENA": [
            "La propuesta se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "Participacion estrictamente individual.",
            "Respeta la duracion maxima de 5 minutos.",
            "Presenta caracter poetico, musical, cantado o narrado.",
            "Contiene memorias colectivas culturales, espirituales, linguisticas, territoriales o simbolicas propias de los pueblos indigenas.",
            "Presenta formatos como canto narrativo, canto ritual, poema cantado, relato poetico o fraseos musicales.",
            "Representa aspectos o elementos creativos basados en la tradicion oral ancestral de los pueblos originarios.",
            "Puede incorporar elementos contemporaneos propios de la creatividad estudiantil."
        ],
        "CUENTO": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "El cuento es original.",
            "Participacion estrictamente individual.",
            "Respeta la extension establecida: mas de 2 paginas y maximo 7 paginas.",
            "Presenta creatividad en la construccion narrativa.",
            "Desarrolla adecuadamente el tema.",
            "Presenta espacios narrativos coherentes.",
            "Existe efectividad del narrador.",
            "Presenta desarrollo adecuado de la trama.",
            "Emplea correctamente puntuacion y ortografia.",
            "Contiene introduccion.",
            "Contiene desarrollo.",
            "Contiene conclusion o desenlace."
        ],
        "CUENTO ILUSTRADO": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "El cuento ilustrado es original.",
            "Las ilustraciones se colocan de manera creativa y coherente.",
            "Participacion individual o maximo 2 estudiantes.",
            "Respeta la extension minima de 5 paginas.",
            "Presenta un minimo de 5 escenas ilustradas.",
            "Las ilustraciones estan en consonancia con el tema.",
            "Existe cohesion entre narracion e imagen.",
            "Emplea correctamente ortografia y puntuacion.",
            "Presenta prosa clara y fluida.",
            "Demuestra originalidad.",
            "Presenta creatividad en el empleo de tecnicas."
        ],
        "FOTONOVELA": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y al tema.",
            "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La fotonovela es original.",
            "Las fotografias se colocan de manera creativa y coherente.",
            "Participacion individual o maximo 2 estudiantes.",
            "Respeta la extension maxima de 15 paginas.",
            "Utiliza material adecuado y mantiene tama�o carta.",
            "Presenta calidad fotografica.",
            "Las fotografias son originales y alusivas al tema.",
            "Presenta una historia y trama coherente.",
            "Emplea correctamente ortografia y puntuacion.",
            "Presenta prosa clara y fluida.",
            "Demuestra creatividad mediante el empleo de diversas tecnicas."
        ],
        "MICRORRELATO": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y al tema.",
            "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "El microrrelato es original.",
            "Participacion estrictamente individual.",
            "Respeta la extension minima de 7 palabras y maxima de 200 palabras.",
            "Presenta narratividad y recursos como ironia, parodia o humor.",
            "Posee estructura simple.",
            "Presenta personajes minimamente caracterizados.",
            "Utiliza espacios esquematicos y condensacion temporal.",
            "Emplea recursos como intertextualidad y metaficcion.",
            "Utiliza correctamente puntuacion y ortografia.",
            "Mantiene extrema brevedad.",
            "Presenta concision, sintesis y condensacion narrativa."
        ],
        "NOVELA GRAFICA": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y al tema.",
            "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La novela grafica es original.",
            "Las imagenes se colocan de manera creativa y coherente.",
            "Participacion individual o maximo 3 estudiantes.",
            "Respeta la extension establecida en el manual.",
            "Presenta secuencia de introduccion, desarrollo, climax y conclusion.",
            "Existe relacion entre texto e imagen.",
            "Presenta originalidad en historia, personajes y disenos.",
            "Los personajes tienen representacion visual coherente.",
            "Utiliza correctamente ortografia y puntuacion.",
            "Presenta coherencia textual.",
            "Utiliza diferentes planos visuales.",
            "Crea un mundo narrado propio.",
            "Es una obra ficcional.",
            "Utiliza intertextos, intratextos o metaficcion.",
            "Presenta multiples personajes.",
            "Tiene narrador.",
            "Presenta hilo conductor.",
            "Utiliza vi�etas.",
            "Presenta textos narrativos, dialogos y onomatopeyas.",
            "Utiliza diferentes globos de texto.",
            "Incluye prologo como guia inicial de la historia."
        ],
        "POESIA": [
            "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y al tema.",
            "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La poesia es original.",
            "Participacion estrictamente individual.",
            "Se presenta en forma escrita.",
            "Emplea lenguaje poetico y figuras literarias.",
            "Presenta y desarrolla el motivo lirico.",
            "Expresa adecuadamente el yo lirico.",
            "Presenta fuerza lirica.",
            "Comunica emotividad.",
            "Posee calidad eufonica.",
            "Presenta capacidad de sintesis expresiva.",
            "Emplea correctamente las normas ortograficas.",
            "Carece de rima, acorde con las tendencias contemporaneas."
        ],
        "POESIA INDIGENA": [
            "La poesia se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y al tema.",
            "Respeta la dignidad y diversidad humana, los derechos humanos y la equidad de genero.",
            "El contenido general y mensaje incorpora una reflexion critica y analitica de la realidad actual.",
            "Es evidente la intervencion y mediacion pedagogica de las personas docentes y del centro educativo.",
            "La poesia es original.",
            "Participacion estrictamente individual.",
            "Se presenta de forma escrita con letra legible.",
            "Desde un enfoque de derechos humanos, interculturalidad y no discriminacion, desarrolla una narrativa respetuosa y culturalmente pertinente.",
            "Mantiene coherencia con saberes, valores, cosmovisiones y formas de expresion de los pueblos indigenas.",
            "Resguarda el sentido educativo y formativo de la propuesta."
        ],
        "COLLAGE": [
            "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Promueve derechos humanos, identidad cultural, convivencia pacifica, igualdad, equidad, cultura de paz y conservacion ambiental.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "No visibiliza ningun tipo de discriminacion.",
            "El titulo utiliza lenguaje correcto y acorde con las tematicas del festival.",
            "Es evidente la mediacion pedagogica de las personas docentes y del centro educativo.",
            "La obra es original y no constituye una copia o imitacion.",
            "Se presenta sin marco.",
            "Respeta las dimensiones establecidas (minimo tama�o carta y maximo 30 x 40 cm).",
            "Utiliza materiales permitidos para la tecnica de collage.",
            "Participacion estrictamente individual.",
            "Organiza los elementos con distribucion espacial equilibrada y coherente.",
            "Experimenta con colores, texturas y formas de manera armonica.",
            "Presenta limpieza, acabados adecuados y atencion al detalle."
        ],
        "DIBUJO": [
            "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "El titulo utiliza lenguaje correcto y acorde con las tematicas propuestas.",
            "Evidencia mediacion pedagogica por parte del centro educativo.",
            "La obra es original.",
            "Se presenta sin marco.",
            "Respeta las dimensiones establecidas.",
            "Utiliza materiales y tecnicas permitidas.",
            "Participacion estrictamente individual.",
            "Emplea adecuadamente elementos como linea, forma, textura, luz, sombra y volumen.",
            "Demuestra dominio tecnico de los materiales utilizados.",
            "Relaciona el lenguaje visual con el mensaje o significado de la obra.",
            "Presenta soporte firme y adecuado.",
            "Mantiene limpieza y calidad en la ejecucion artistica."
        ],
        "DISENO DE OBJETO": [
            "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "No visibiliza ningun tipo de discriminacion.",
            "El titulo utiliza lenguaje correcto.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza materiales resistentes y adecuados.",
            "Respeta las dimensiones y caracteristicas establecidas.",
            "Incluye pedestal proporcional cuando corresponde.",
            "Participacion individual o maximo tres estudiantes.",
            "Aplica principios de diseno como equilibrio, proporcion y contraste.",
            "Relaciona el lenguaje visual con el mensaje conceptual de la obra.",
            "Considera ergonomia, estabilidad y funcionalidad.",
            "Presenta acabados limpios y estetica adecuada."
        ],
        "ESCULTURA": [
            "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora una reflexion critica y analitica de la realidad actual.",
            "No visibiliza discriminacion.",
            "El titulo utiliza lenguaje correcto.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza tecnicas escultricas permitidas.",
            "Respeta dimensiones y materiales establecidos.",
            "Participacion estrictamente individual.",
            "Utiliza adecuadamente volumen, textura, equilibrio y proporcion.",
            "Relaciona el lenguaje visual con el significado de la obra.",
            "Evidencia dominio tecnico y buen manejo de materiales.",
            "Presenta base o pedestal estable.",
            "Logra una composicion tridimensional armonica."
        ],
        "ESCULTURAS VIVIENTES": [
            "La propuesta respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora reflexion critica de la realidad actual.",
            "No presenta contenidos discriminatorios.",
            "El titulo utiliza lenguaje correcto.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza materiales seguros para la piel y el cuerpo.",
            "Presenta una propuesta integral de vestuario, maquillaje y utileria.",
            "Respeta los tiempos de preparacion establecidos.",
            "Participacion individual o maximo tres estudiantes.",
            "Utiliza adecuadamente la expresion corporal.",
            "Aprovecha el espacio escenico de forma pertinente.",
            "Emplea materiales y maquillaje coherentes con la propuesta.",
            "Caracteriza adecuadamente al personaje o escena representada.",
            "Relaciona el lenguaje visual con el mensaje de la obra."
        ],
        "FOTOGRAFIA": [
            "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos y tematicas del festival.",
            "Promueve convivencia, identidad cultural y respeto a la diversidad.",
            "Incorpora reflexion critica y analitica.",
            "No presenta discriminacion.",
            "El titulo utiliza lenguaje correcto.",
            "Evidencia mediacion pedagogica.",
            "La fotografia es original.",
            "Fue tomada por la persona estudiante participante.",
            "Respeta las dimensiones establecidas.",
            "Participacion estrictamente individual.",
            "Utiliza adecuadamente encuadre, iluminacion y composicion.",
            "Emplea composiciones fotograficas pertinentes.",
            "Presenta buena calidad de impresion y nitidez.",
            "Demuestra dominio tecnico en el uso de la imagen.",
            "Relaciona los elementos visuales con el mensaje artistico."
        ],
        "GRABADO": [
            "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos y tematicas sugeridas.",
            "Incorpora reflexion critica de la realidad actual.",
            "No visibiliza discriminacion.",
            "Utiliza lenguaje correcto en el titulo.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Se presenta sin marco.",
            "Respeta las dimensiones establecidas.",
            "Utiliza materiales y tecnicas permitidas.",
            "Participacion estrictamente individual.",
            "Presenta dominio tecnico del grabado.",
            "Utiliza soporte adecuado para impresion.",
            "Aplica correctamente los procedimientos de la tecnica seleccionada.",
            "Relaciona el lenguaje visual con el mensaje de la obra."
        ],
        "MASCARA INDIGENA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Promueve identidad cultural y valoracion de las tradiciones indigenas.",
            "No presenta discriminacion.",
            "Rescata valores, costumbres y cosmovisiones indigenas.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Es elaborada por una persona estudiante indigena o matriculada en centro educativo indigena.",
            "Utiliza materiales tradicionales o propios de la cultura indigena.",
            "Emplea tecnicas acordes con la tradicion indigena.",
            "Participacion estrictamente individual.",
            "Aplica adecuadamente color, forma, textura y volumen.",
            "Representa elementos de la cosmovision indigena.",
            "Demuestra dominio tecnico de materiales y procesos.",
            "Mantiene proporcion y armonia en la estructura de la pieza."
        ],
        "MASCARA O CARETA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Promueve identidad cultural y aprecio por las tradiciones.",
            "No presenta discriminacion.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza materiales permitidos.",
            "Emplea tecnicas adecuadas de elaboracion.",
            "No corresponde a una mascara indigena ni a una mascarada tradicional costarricense.",
            "Participacion estrictamente individual.",
            "Aplica principios de diseno como color, forma, textura y volumen.",
            "Relaciona elementos simbolicos con el mensaje de la obra.",
            "Demuestra dominio tecnico y estabilidad estructural.",
            "Presenta proporcion anatomica adecuada.",
            "Garantiza funcionalidad y ergonomia."
        ],
        "MASCARADA TRADICIONAL COSTARRICENSE": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Promueve identidad cultural costarricense.",
            "Rescata tradiciones y costumbres nacionales.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza materiales adecuados para mascaradas tradicionales.",
            "Representa personajes tradicionales, miticos o folcloricos.",
            "Participacion individual o maximo tres estudiantes.",
            "Aplica principios de diseno visual.",
            "Integra personajes y elementos simbolicos de la tradicion costarricense.",
            "Demuestra dominio en construccion y ensamblaje.",
            "Presenta estabilidad, ligereza y funcionalidad.",
            "Mantiene proporcion, volumen y ergonomia.",
            "Comunica claramente la intencion cultural de la obra."
        ],
        "MURAL": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos y tematicas del festival.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No presenta discriminacion.",
            "Utiliza lenguaje correcto en el titulo.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza materiales adecuados para la tecnica mural.",
            "Respeta las dimensiones minimas establecidas.",
            "Participacion individual o maximo cinco estudiantes.",
            "Aplica adecuadamente los elementos del lenguaje visual.",
            "Demuestra dominio de tecnicas murales.",
            "Comunica claramente una idea o narracion visual.",
            "Garantiza durabilidad y acabado adecuado.",
            "Presenta registro visual del proceso de elaboracion."
        ],
        "PINTURA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos y tematicas sugeridas.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "Utiliza lenguaje correcto en el titulo.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza materiales pictoricos permitidos.",
            "Se presenta sin marco.",
            "Respeta las dimensiones establecidas.",
            "Participacion estrictamente individual.",
            "Emplea adecuadamente color, textura, luz, sombra y volumen.",
            "Selecciona tecnicas acordes con la intencion artistica.",
            "Relaciona recursos visuales con el mensaje de la obra.",
            "Demuestra dominio tecnico de la pintura.",
            "Presenta soporte adecuado y estable."
        ],
        "PINTURA CORPORAL": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos y tematicas sugeridas.",
            "Incorpora reflexion critica de la realidad actual.",
            "No presenta discriminacion.",
            "Utiliza lenguaje correcto en el titulo.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Utiliza materiales seguros para la piel.",
            "Combina tecnicas y materiales de forma adecuada.",
            "Respeta el tiempo de ejecucion establecido.",
            "Participacion individual o maximo tres estudiantes.",
            "Emplea adecuadamente punto, linea, color y textura.",
            "Utiliza materiales y pigmentos apropiados.",
            "Integra la postura corporal a la propuesta artistica.",
            "Dise�a composiciones acordes con la anatomia del cuerpo.",
            "Relaciona los elementos visuales con el mensaje de la obra."
        ],
        "PRODUCCION AUDIOVISUAL": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No visibiliza ningun tipo de discriminacion.",
            "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
            "Evidencia mediacion pedagogica docente.",
            "La obra es original.",
            "Respeta el Manual: la obra es un cortometraje, documental, biografia o video musical.",
            "Tiene introduccion, desarrollo, conclusion y creditos completos al final.",
            "Grabacion, filmacion, actuacion, fotografia y edicion realizadas por estudiantes.",
            "Respeta la duracion maxima de 5 minutos.",
            "Participacion individual o maximo 5 estudiantes.",
            "Articula el lenguaje visual con los elementos conceptuales de la obra.",
            "Garantiza coherencia entre sinopsis, guion literario y produccion final.",
            "Desarrolla guion estructurado con introduccion, desarrollo, conclusion y creditos.",
            "Utiliza adecuadamente recursos de audio, edicion y montaje.",
            "Realiza video en formato horizontal y cuida composicion visual, encuadre e iluminacion."
        ],
        "TENIDO TEXTIL": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora reflexion critica de la realidad actual.",
            "No visibiliza discriminacion.",
            "El titulo utiliza lenguaje correcto.",
            "Evidencia mediacion pedagogica.",
            "La obra es original.",
            "Respeta dimensiones: maximo 70 x 70 cm (formato libre).",
            "Utiliza materiales textiles permitidos (telas, fibras, tintes, colorantes, etc.).",
            "Expone obra con soporte adecuado (ganchos, prensas u otros; no se usan personas ni animales como soporte).",
            "Participacion individual o maximo 3 estudiantes.",
            "Emplea puntos, lineas, formas, texturas, color, calidad tonal, luz, sombra, volumen, planos y proporcion en la composicion textil.",
            "Selecciona y aplica tecnicas de tenido textil (estampacion, inkodye, shibori, tie dye u otras) de manera pertinente.",
            "Domina la tecnica de tenido seleccionada con manejo adecuado de materiales, procesos y metodos de fijacion.",
            "Articula el lenguaje visual con los elementos conceptuales de la obra.",
            "Presenta obra en soporte textil apropiado con buena absorcion y durabilidad.",
            "Cuida limpieza, uniformidad y prolijidad del acabado final."
        ],
        "DIBUJO INDIGENA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a objetivos del festival: promueve identidad cultural, aprecio por tradiciones, derechos humanos y diversidad.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No presenta discriminacion.",
            "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
            "Evidencia mediacion pedagogica docente.",
            "La obra es original.",
            "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
            "Se presenta sin marco (formato horizontal o vertical).",
            "Respeta dimensiones: minimo hoja carta, maximo 50 cm x 70 cm.",
            "Usa materiales de dibujo permitidos (lapices, carboncillo, marcadores, pigmentos, etc.).",
            "Participacion estrictamente individual.",
            "Utiliza elementos del lenguaje visual (puntos, lineas, formas, texturas, luz, sombra, color, calidad tonal y volumen) integrando simbolos y patrones de la cosmovision indigena.",
            "Domina la tecnica de dibujo con manejo preciso de materiales, control en linea, mancha, transiciones, degradados y acabados.",
            "Relaciona el lenguaje visual con la cosmovision indigena: naturaleza, memoria cultural y simbolos.",
            "Presenta soporte adecuado, estable y coherente con la tecnica y propuesta indigena."
        ],
        "ESCULTURA INDIGENA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No presenta discriminacion.",
            "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
            "Evidencia mediacion pedagogica docente.",
            "La obra es original.",
            "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
            "Utiliza tecnicas permitidas (modelado, talla, ensamble, intervencion, tecnica mixta).",
            "Respeta dimensiones: pieza de 20-40 cm alto x 10-20 cm ancho, largo max 50 cm.",
            "Usa materiales resistentes (papel mache, arcilla, madera, resina, metal, textil, etc.).",
            "Participacion estrictamente individual.",
            "Utiliza efectivamente elementos visuales (lineas, planos, formas, volumen, textura, peso visual, equilibrio y direccionalidad) integrados en composicion armonica con simbolos de la cosmovision indigena.",
            "Relaciona el lenguaje visual con conceptos de naturaleza, espiritualidad o memoria cultural indigena.",
            "Evidencia manejo tecnico adecuado, ejecucion limpia, estable y acorde a la tradicion indigena.",
            "Presenta base o pedestal solido y estable que soporta el peso de la escultura."
        ],
        "MURAL INDIGENA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No presenta discriminacion.",
            "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
            "Evidencia mediacion pedagogica docente.",
            "La obra es original.",
            "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
            "Usa materiales permitidos (tinta, acrilico, oleo, pintura aerosol, recortes, arcilla, textil, entre otros).",
            "Respeta dimensiones minimas: en pared o paneles 1.5 x 2 m; en plywood 1.22 x 2.44 m.",
            "Participacion individual o maximo 5 estudiantes.",
            "Aplica lenguaje visual (linea, forma, textura, color, proporcionalidad y espacio) con simbolos de la cosmovision indigena, manteniendo unidad estetica y relacion con el soporte.",
            "Utiliza tecnicas murales (pintura, mosaico, grabado, modelado, tecnicas mixtas, altos y bajos relieves o grafiti) con dominio del proceso.",
            "Articula lenguaje visual con el concepto de la obra, disenando propuesta que comunique imagen, narracion o idea desde la cosmovision indigena.",
            "Selecciona materiales y procedimientos que garantizan durabilidad, adherencia y acabado apropiado.",
            "Presenta registro visual claro del proceso de elaboracion."
        ],
        "OBJETO CULTURAL INDIGENA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No presenta discriminacion.",
            "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
            "Evidencia mediacion pedagogica docente.",
            "La obra es original, tiene funcion utilitaria y es coherente con procesos de creacion tradicionales indigenas.",
            "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
            "Utiliza materiales resistentes que evitan deterioro durante traslado, montaje y exposicion.",
            "Respeta dimensiones: maximo 30 cm base, 40 cm fondo, 40 cm altura; pedestal de 60 cm a 1 m.",
            "Participacion estrictamente individual.",
            "Aplica lenguaje visual en el diseno (forma, volumen, color y textura) integrando equilibrio, proporcion y contraste desde la cosmovision indigena para asegurar sentido utilitario.",
            "Relaciona lenguaje visual y diseno con elementos conceptuales de la obra, incorporando significados, simbolos o narrativas de tradiciones indigenas.",
            "Crea objeto que responde a criterios de ergonomia, estabilidad, resistencia estructural, sostenibilidad y utilidad."
        ],
        "PINTURA INDIGENA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a objetivos del festival: promueve identidad cultural, derechos humanos y diversidad.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No presenta discriminacion.",
            "El titulo utiliza lenguaje correcto y se basa en sugerencias de temas del festival.",
            "Evidencia mediacion pedagogica docente.",
            "La obra es original.",
            "Es elaborada por persona estudiante indigena o matriculada en centro educativo indigena.",
            "Utiliza materiales pictoricos permitidos (tintas, tempera, acrilico, acuarela, oleo, pigmentos naturales, etc.).",
            "Se presenta sin marco (formato horizontal, vertical, circular, ovalado u organico irregular).",
            "Respeta dimensiones: minimo hoja carta, maximo 70 cm x 1 m.",
            "Participacion estrictamente individual.",
            "Emplea puntos, lineas, formas, texturas, color, calidad tonal, saturacion, luz, sombra, volumen, planos y proporcion para construir composicion pictorica equilibrada con simbolos de la cosmovision indigena.",
            "Selecciona tecnica pertinente (tradicional o mixta) segun materiales y propositos expresivos, en coherencia con practicas y saberes indigenas.",
            "Articula lenguaje visual con elementos conceptuales de la obra, relacionando recursos plasticos con naturaleza, espiritualidad o memoria cultural indigena.",
            "Domina la tecnica seleccionada con control del material pictorico, precision en aplicacion, solidez en acabados y consistencia en procedimientos.",
            "Presenta obra en soporte firme, adecuado y coherente con la tecnica, garantizando estabilidad, durabilidad y armonia con la intencion indigena."
        ],
        "INSTALACION ARTISTICA": [
            "La obra respeta el articulo 3 de la Normativa del Festival Estudiantil de las Artes 2026.",
            "Se acoge a los objetivos del festival y a las sugerencias de temas.",
            "Incorpora reflexion critica y analitica de la realidad actual.",
            "No visibiliza discriminacion.",
            "El titulo utiliza lenguaje correcto y acorde con la propuesta.",
            "Evidencia mediacion pedagogica docente.",
            "La obra es original: no es copia de montajes existentes.",
            "Se compone de elementos y materiales diversos organizados en un espacio determinado.",
            "Disposicion espacial, materiales y dinamicas de recorrido disenados por estudiantes.",
            "Evidencia uso consciente de composicion espacial, relacion cuerpo-espacio, atmosfera e intencion conceptual-sensorial.",
            "Respeta cantidad de integrantes: individual o maximo 5 estudiantes.",
            "Integra intencionalmente elementos del lenguaje espacial (materialidad, luz, sonido, escala y disposicion) para construir experiencia coherente con la propuesta conceptual.",
            "Articula diseno de montaje, pruebas tecnicas y configuracion final alineados con la intencion conceptual del proyecto.",
            "Desarrolla composicion espacial equilibrada con uso intencional de materiales, recorridos, atmosferas y relaciones entre elementos.",
            "Utiliza adecuadamente tecnicas y recursos de instalacion (montaje, fijacion, distribucion espacial, iluminacion y ambientacion).",
            "Presenta instalacion estable, segura, con ubicacion clara de elementos y percepcion sensorial acorde a criterios del proyecto."
        ]
    };

    const indicators = rubricBySubcategory[normalizedSubcategory];

    if (!indicators) {
        return null;
    }

    return {
        indicators,
        scoreOptions: getFestivalAdvancedScoreOptions()
    };
}

export function getFestivalRubricByCategory(category) {
    const normalizedCategory = String(category ?? "").trim();

    if (normalizedCategory === "Artes Escenicas") {
        return {
            indicators: [
                "La obra se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
                "Se acoge a los objetivos del Festival Estudiantil de las Artes.",
                "La coreografia y temas musicales no irrespetan la dignidad y diversidad humana, derechos humanos y equidad de genero.",
                "Se evidencia mediacion pedagogica docente en pasos, movimientos y letras acordes con la normativa y manual.",
                "Respeta el Manual de disciplinas artisticas en originalidad de la coreografia, cantidad de integrantes (minimo 2), duracion maxima (6 minutos) y participacion exclusiva de estudiantes.",
                "Dominio tecnico y expresivo del movimiento: coordinacion general, presencia escenica, uso del espacio y orden de formaciones.",
                "Limpieza y claridad en movimientos, corporalidad acorde con la musica y musicalidad adecuada.",
                "Nivel de complejidad y control tecnico con cohesion y precision en la ejecucion coreografica.",
                "Coherencia estetica y creatividad: integra pasos, figuras, niveles y formas con concepto/tematica definida.",
                "Vestuario y maquillaje acordes con la musica y propuesta coreografica, reforzando identidad estetica e intencion conceptual."
            ],
            scoreOptions: getFestivalAdvancedScoreOptions()
        };
    }

    if (normalizedCategory === "Artes Musicales") {
        return {
            indicators: [
                "La cancion se acoge al articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
                "La letra se acoge a los objetivos del festival y a las sugerencias de temas.",
                "Promueve derechos humanos, identidad cultural, tradiciones, pertenencia, convivencia pacifica, igualdad, equidad, respeto a la diversidad y cultura de paz.",
                "Promueve conservacion del ambiente, vida silvestre, naturaleza y biodiversidad.",
                "El contenido y mensaje de la cancion incorpora reflexion critica y analitica de la realidad actual.",
                "Se evidencia mediacion pedagogica de docentes y centro educativo, acorde con objetivos del festival, Normativa y Manual.",
                "Respeta el Manual en originalidad de la cancion, cantidad de integrantes (minimo 3, maximo 8) y duracion maxima (5 minutos).",
                "Respeta la instrumentacion base: bateria, bajo, guitarra y una o varias voces (con opcion de otros instrumentos complementarios).",
                "Participan unicamente estudiantes en interpretacion y direccion en escena.",
                "Cuida aspectos tecnico-artisticos: acople melodia-armonia-ritmo-letra, diccion, proyeccion de voz, precision, pulso, afinacion e interpretacion en vivo.",
                "La obra se propone para deliberacion con posibilidad de ser invitada a la siguiente etapa del festival."
            ],
            scoreOptions: getFestivalAdvancedScoreOptions()
        };
    }

    if (normalizedCategory === "Artes Digitales") {
        return {
            indicators: [
                "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
                "Se acoge a los objetivos del festival y a las sugerencias de temas.",
                "Promueve derechos humanos, identidad cultural, tradiciones, pertenencia, convivencia pacifica, igualdad, equidad, respeto a la diversidad y cultura de paz.",
                "Promueve la conservacion del ambiente, la vida silvestre, la naturaleza y la biodiversidad.",
                "La obra incorpora una reflexion critica y analitica de la realidad actual.",
                "La propuesta artistica no visibiliza discriminacion.",
                "El titulo y el contenido de la obra incorporan uso correcto del lenguaje y se basan en sugerencias de temas del festival.",
                "Se evidencia mediacion pedagogica de docentes y centro educativo, acorde con objetivos del festival, Normativa y Manual.",
                "Respeta el Manual en originalidad: la ilustracion no es copia ni replica directa y demuestra autenticidad.",
                "La obra constituye una ilustracion digital final (dibujo o pintura) creada integramente con herramientas digitales.",
                "Dibujo, pintura, diseno, color, modelado digital, efectos y edicion son realizados por estudiantes con software permitido para uso educativo.",
                "La obra evidencia composicion, proporciones, iluminacion y color con intencion visual digital clara.",
                "Respeta la cantidad de integrantes segun el Manual: participacion estrictamente individual.",
                "Integra intencionalmente linea, forma, color, textura e iluminacion para una imagen clara, expresiva y coherente con la propuesta conceptual.",
                "Asegura coherencia entre planificacion visual, referencias seleccionadas e ilustracion final durante todo el proceso creativo.",
                "Desarrolla composicion equilibrada con uso intencional de color, luz y sombra, y distribucion correcta de figuras, fondos y jerarquias.",
                "Emplea adecuadamente herramientas digitales de dibujo, pintura, capas, pinceles y ajustes para una imagen limpia y tecnicamente consistente.",
                "Produce la ilustracion en formato, orientacion y resolucion establecidos, cuidando disposicion de elementos, color y claridad visual.",
                "La obra se propone para deliberacion con posibilidad de ser invitada a la siguiente etapa del festival."
            ],
            scoreOptions: getFestivalAdvancedScoreOptions()
        };
    }

    if (normalizedCategory === "Artes Visuales") {
        return {
            indicators: [
                "La obra respeta el articulo 3 de la Normativa para la organizacion y ejecucion del Festival Estudiantil de las Artes 2026.",
                "Se acoge a los objetivos del festival y a las sugerencias de temas.",
                "Promueve derechos humanos, identidad cultural, tradiciones, pertenencia, convivencia pacifica, igualdad, equidad, respeto a la diversidad y cultura de paz.",
                "Promueve la conservacion del ambiente, vida silvestre, naturaleza y biodiversidad.",
                "La obra incorpora reflexion critica y analitica de la realidad actual y no visibiliza discriminacion.",
                "El titulo incorpora uso correcto del lenguaje y se basa en las sugerencias de temas del festival.",
                "Se evidencia mediacion pedagogica de docentes y centro educativo, acorde con objetivos del festival, Normativa y Manual.",
                "Respeta el Manual en originalidad: el diseno no es imitacion ni copia de otras propuestas.",
                "La obra se presenta sin marco (formato horizontal o vertical).",
                "Respeta dimensiones del Manual: tamano minimo carta y maximo 30 x 40 cm.",
                "Utiliza materiales permitidos (carton, cartulina, papel, recortes, telas, pintura, lapices de color, plastico, entre otros).",
                "Respeta la cantidad de integrantes segun el Manual: participacion estrictamente individual.",
                "Elabora el collage de forma ordenada con distribucion espacial equilibrada, jerarquia visual y recorte preciso de materiales.",
                "Experimenta con color, texturas y formas para lograr un resultado armonico durante el proceso de creacion.",
                "Finaliza el collage con atencion al detalle, acabado limpio y valoracion final de mejora segun la intencion artistica.",
                "La obra se propone para deliberacion con posibilidad de ser invitada a la siguiente etapa del festival."
            ],
            scoreOptions: getFestivalAdvancedScoreOptions()
        };
    }

    return {
        indicators: getRubricIndicatorsByFeria(FESTIVAL_FERIA_NAME),
        scoreOptions: getFestivalAdvancedScoreOptions()
    };
}
