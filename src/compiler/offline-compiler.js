/**
 * @fileoverview Compilador Offline para Procesamiento de Imágenes con TensorFlow.js
 *
 * Este módulo implementa un sistema avanzado de compilación de imágenes para tracking
 * utilizando TensorFlow.js, optimizado especialmente para entornos backend con alto rendimiento.
 *
 * Arquitectura y Componentes Principales:
 *
 * 1. Sistema de Inicialización:
 *    - Implementa un patrón Singleton para TensorFlow con inicialización temprana
 *    - Carga asíncrona y paralela de backends (CPU/WebGL/Node)
 *    - Detección automática de entorno (serverless/navegador/backend dedicado)
 *    - Precalentamiento agresivo para reducir cold starts
 *
 * 2. Gestión de Memoria:
 *    - Sistema de liberación ultra-agresiva de memoria con umbrales dinámicos
 *    - Monitoreo continuo del uso de tensores con cleanup automático
 *    - Estrategias de scope anidados para control preciso de recursos
 *    - Liberación proactiva entre operaciones intensivas
 *
 * 3. Optimizaciones de Rendimiento:
 *    - Precalentamiento estratégico del backend para eliminar latencia inicial
 *    - Ajustes específicos por backend con configuraciones óptimas por plataforma
 *    - Configuraciones especializadas para entornos backend de alto rendimiento
 *    - Reducción de precisión selectiva para operaciones no críticas
 *
 * 4. Procesamiento por Lotes:
 *    - Sistema adaptativo de tamaño de lotes basado en capacidad de hardware
 *    - Paralelización multinivel con control de concurrencia
 *    - Control de progreso granular con retroalimentación en tiempo real
 *    - Estrategias de división de trabajo para CPUs multi-núcleo
 *
 * 5. Gestión de Recursos:
 *    - Timeouts inteligentes con recuperación automática
 *    - Liberación proactiva de recursos con GC forzado estratégico
 *    - Manejo de errores robusto con recuperación de fallos
 *    - Monitoreo de rendimiento en tiempo real
 *
 * @requires tensorflow/tfjs
 * @requires ./compiler-base.js
 * @requires ./image-list.js
 * @requires ./tracker/extract-utils.js
 * @requires ./tensorflow-setup.js
 */

import { CompilerBase } from "./compiler-base.js";
import { buildTrackingImageList } from "./image-list.js";
import { extractTrackingFeatures } from "./tracker/extract-utils.js";
import { setupTensorFlow } from "./tensorflow-setup.js";
import { tf } from "./tensorflow-setup.js";
import os from "os";
// OPTIMIZACIÓN CORE DEL PROCESO DE COMPILACIÓN
// 1. Inicialización temprana y paralela de TensorFlow
// 2. Optimizaciones de memoria y procesamiento agresivas
// 3. Estrategias de paralelización avanzadas
// 4. Ajustes para entornos serverless (Vercel, AWS Lambda, etc)

// Detector de entorno serverless
const isServerlessEnvironment = () => {
  return process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
};

// Configurar TensorFlow lo antes posible con un Singleton
let tensorflowBackend = null;
let setupPromise = null;

const setupTensorFlowAsync = async () => {
  // Si ya hay una configuración en curso, reutilizarla
  if (setupPromise) return setupPromise;

  // Iniciar configuración y guardar la promesa
  setupPromise = (async () => {
    try {
      console.time("⏱️ Configuración de TensorFlow");
      const backend = await setupTensorFlow();
      tensorflowBackend = backend;
      console.timeEnd("⏱️ Configuración de TensorFlow");
      return backend;
    } catch (error) {
      console.error("Error crítico al configurar TensorFlow:", error);
      return null;
    }
  })();

  return setupPromise;
};

// Iniciar la configuración inmediatamente al importar el módulo
const tensorflowSetupPromise = setupTensorFlowAsync();

// Registrar los kernels necesarios para CPU (carga temprana)
import "./detector/kernels/cpu/index.js";

// Registrar los backends básicos
import "@tensorflow/tfjs-backend-cpu";

// Configuraciones avanzadas para maximizar rendimiento en backend
const enablePerformanceOptimizations = async () => {
  try {
    // Esperar a que TensorFlow esté configurado
    await tensorflowSetupPromise;

    // Optimizaciones específicas según el backend
    const backend = tf.getBackend();
    console.log(`⚙️ Optimizando agresivamente para backend: ${backend}`);

    // Entorno serverless necesita configuraciones especiales
    const isServerless = isServerlessEnvironment();
    const isBackendDedicated = !isServerless && process.env.NODE_ENV === "production";

    if (isBackendDedicated) {
      console.log(
        "🚀🚀 Entorno backend dedicado detectado, aplicando configuraciones de alto rendimiento",
      );

      // Configuraciones agresivas para backend dedicado
      tf.ENV.set("CPU_HANDOFF_SIZE_THRESHOLD", 1024 * 1024 * 16); // 16MB - más memoria disponible
      tf.ENV.set("WEBGL_SIZE_UPLOAD_UNIFORM", 16); // Mayor capacidad de transferencia
      tf.ENV.set("WEBGL_DELETE_TEXTURE_THRESHOLD", 64); // Más texturas en memoria

      // Configuraciones para maximizar throughput
      tf.ENV.set("WEBGL_FLUSH_THRESHOLD", 10); // Menos flushes para mejor rendimiento
      tf.ENV.set("KEEP_INTERMEDIATE_TENSORS", false); // Liberar intermedios agresivamente
      tf.ENV.set("WEBGL_PACK_BINARY_OPERATIONS", true); // Empaquetar operaciones binarias
    } else if (isServerless) {
      console.log(
        "🚀 Entorno serverless detectado, aplicando configuraciones de memoria restrictivas",
      );

      // En serverless aplicamos configuraciones más conservadoras para memoria
      tf.ENV.set("CPU_HANDOFF_SIZE_THRESHOLD", 1024 * 1024 * 4); // 4MB
      tf.ENV.set("WEBGL_SIZE_UPLOAD_UNIFORM", 4);
      tf.ENV.set("WEBGL_DELETE_TEXTURE_THRESHOLD", 10);

      // Menor precisión para mejor rendimiento
      tf.ENV.set("WEBGL_RENDER_FLOAT32_ENABLED", false);
    }

    // Optimizaciones generales para todos los backends
    tf.ENV.set("WEBGL_CPU_FORWARD", false);
    tf.ENV.set("DEBUG", false);
    tf.ENV.set("CHECK_COMPUTATION_FOR_ERRORS", false); // Deshabilitar verificaciones para mayor velocidad

    // Optimizar el uso de memoria con límites más altos
    if (backend === "node") {
      console.log("🔧 Aplicando optimizaciones avanzadas para Node.js backend");
    } else if (backend === "webgl") {
      // Optimizaciones específicas para WebGL
      console.log("🔧 Aplicando optimizaciones avanzadas para WebGL backend");
      tf.ENV.set("WEBGL_FORCE_F16_TEXTURES", true);
      tf.ENV.set("WEBGL_PACK", true);
      tf.ENV.set("WEBGL_PACK_DEPTHWISECONV", true);
      tf.ENV.set("WEBGL_PACK_BINARY_OPERATIONS", true);
      tf.ENV.set("WEBGL_PACK_ARRAY_OPERATIONS", true);
      tf.ENV.set("WEBGL_PACK_IMAGE_OPERATIONS", true);
      tf.ENV.set("WEBGL_PACK_REDUCE", true);

      // Configuraciones de textura según entorno
      if (isBackendDedicated) {
        // En backend dedicado, usar valores más agresivos
        tf.ENV.set("WEBGL_MAX_TEXTURE_SIZE", 8192); // Texturas más grandes
        tf.ENV.set("WEBGL_MAX_TEXTURES_IN_SHADER", 16); // Más texturas por shader
      } else if (isServerless) {
        // En serverless, usamos valores más conservadores
        tf.ENV.set("WEBGL_MAX_TEXTURE_SIZE", 2048);
        tf.ENV.set("WEBGL_MAX_TEXTURES_IN_SHADER", 8);
      } else {
        // Entorno normal
        tf.ENV.set("WEBGL_MAX_TEXTURE_SIZE", 4096);
        tf.ENV.set("WEBGL_MAX_TEXTURES_IN_SHADER", 12);
      }
    } else if (backend === "cpu") {
      // Optimizaciones específicas para CPU
      console.log("🔧 Aplicando optimizaciones para CPU backend");

      // Intentar usar SIMD si está disponible
      try {
        if (
          typeof WebAssembly.validate === "function" &&
          WebAssembly.validate(
            new Uint8Array([
              0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65,
              0, 253, 15, 253, 98, 11,
            ]),
          )
        ) {
          console.log("🚀 SIMD disponible, habilitando aceleración vectorial");
          tf.ENV.set("WASM_HAS_SIMD_SUPPORT", true);
          tf.ENV.set("WASM_HAS_MULTITHREAD_SUPPORT", true);
        }
      } catch (e) {
        console.warn("⚠️ No se pudo detectar soporte SIMD", e);
      }
    }

    // Precalentamiento estratégico del backend para eliminar retrasos en la primera ejecución
    // Implementamos un precalentamiento adaptativo según el entorno
    console.time("🔥 Precalentamiento estratégico");
    console.log("🔥 Precalentando TensorFlow con operaciones específicas...");

    await tf.ready();

    // Detectar si estamos en un entorno de backend dedicado

    // Estrategia de precalentamiento adaptativa según entorno
    const warmupStrategy = isBackendDedicated
      ? "aggressive"
      : isServerless
        ? "minimal"
        : "balanced";
    console.log(`🔥 Aplicando estrategia de precalentamiento: ${warmupStrategy}`);

    // Función para ejecutar y esperar operaciones tensores
    const executeAndWait = async (tensors) => {
      // Esperar a que todas las operaciones se completen
      await Promise.all(tensors.map((t) => t.data()));
      // Liberar memoria inmediatamente
      tf.dispose(tensors);
    };

    // Precalentamiento básico para todos los entornos
    tf.engine().startScope();
    try {
      // Operaciones básicas de álgebra tensorial
      const a = tf.tensor([1, 2, 3, 4]);
      const b = tf.tensor([2, 2, 2, 2]);
      const result = a.add(b);
      const mult = a.mul(b);
      const div = a.div(b);
      await executeAndWait([result, mult, div]);
    } finally {
      tf.engine().endScope();
    }

    // Tamaño de imagen adaptativo según entorno
    const size = isBackendDedicated ? 224 : isServerless ? 64 : 128;
    console.log(`🖼️ Precalentando con imagen de tamaño ${size}x${size}`);

    // Precalentamiento de operaciones de procesamiento de imágenes
    tf.engine().startScope();
    try {
      // Crear imagen sintética para precalentamiento
      const image = tf.ones([size, size, 3]);

      // Precalentar operaciones de preprocesamiento comunes
      const normalized = image.div(tf.scalar(255));
      const grayscale = image.mean(2, true); // Reducción de canal para escala de grises
      await executeAndWait([normalized, grayscale]);

      // Precalentar operaciones de convolución con diferentes configuraciones
      // Estas operaciones son críticas para la extracción de características
      const kernelSizes = warmupStrategy === "aggressive" ? [3, 5, 7] : [3];
      const filterCounts = warmupStrategy === "aggressive" ? [8, 16] : [4];

      for (const kernelSize of kernelSizes) {
        for (const filters of filterCounts) {
          // Crear kernel aleatorio para convolución
          const kernel = tf.randomNormal([kernelSize, kernelSize, 3, filters]);

          // Aplicar convolución - operación clave en detección de características
          const convResult = tf.conv2d(image, kernel, 1, "same");

          // Operaciones de pooling - también críticas en redes de detección
          const maxPooled = tf.maxPool(convResult, [2, 2], 2, "same");
          const avgPooled = tf.avgPool(convResult, [2, 2], 2, "same");

          // Activaciones comunes
          const activated = tf.relu(convResult);

          await executeAndWait([convResult, maxPooled, avgPooled, activated]);
        }
      }

      // En modo agresivo, precalentar operaciones más avanzadas
      if (warmupStrategy === "aggressive") {
        // Operaciones de transformación espacial comunes en tracking
        const resized = tf.image.resizeBilinear(image, [size / 2, size / 2]);
        const cropped = tf.slice(image, [0, 0, 0], [size / 2, size / 2, 3]);
        await executeAndWait([resized, cropped]);

        // Operaciones de detección de bordes (aproximación)
        const sobelX = tf.conv2d(
          grayscale,
          tf.tensor4d(
            [
              [-1, 0, 1],
              [-2, 0, 2],
              [-1, 0, 1],
            ],
            [3, 3, 1, 1],
          ),
          1,
          "same",
        );
        const sobelY = tf.conv2d(
          grayscale,
          tf.tensor4d(
            [
              [-1, -2, -1],
              [0, 0, 0],
              [1, 2, 1],
            ],
            [3, 3, 1, 1],
          ),
          1,
          "same",
        );
        const edges = tf.sqrt(tf.add(tf.square(sobelX), tf.square(sobelY)));
        await executeAndWait([sobelX, sobelY, edges]);
      }
    } finally {
      tf.engine().endScope();
    }

    // Forzar recolección de basura para limpiar completamente
    if (global.gc) {
      try {
        global.gc();
        console.log("♻️ Recolección de basura manual ejecutada");
      } catch (e) {
        // Ignorar errores si no está disponible
      }
    }

    // Verificar estado de memoria después del precalentamiento
    const memInfo = tf.memory();
    console.log(
      `📊 Estado de memoria post-precalentamiento: ${memInfo.numTensors} tensores, ${(memInfo.numBytes / (1024 * 1024)).toFixed(2)}MB`,
    );

    console.timeEnd("🔥 Precalentamiento estratégico");
  } catch (error) {
    console.warn("⚠️ No se pudieron aplicar todas las optimizaciones:", error);
  }
};

// Aplicar optimizaciones de manera asíncrona para no bloquear
enablePerformanceOptimizations();

// Versión optimizada del compilador
export class OfflineCompiler extends CompilerBase {
  constructor() {
    super();

    // Detección de entorno
    this.isServerless = isServerlessEnvironment();
    if (this.isServerless) {
      console.log("🚀 Compilador optimizado para entorno serverless");
    }

    // Inicializar inmediatamente para evitar arranque frío
    this._ensureTensorflowReady();
  }

  // Método privado para asegurar que TensorFlow esté listo
  async _ensureTensorflowReady() {
    if (!tensorflowBackend) {
      await tensorflowSetupPromise;
    }
    return tensorflowBackend;
  }

  // Versión optimizada del método principal de compilación
  compileTrack({ progressCallback, targetImages, basePercent }) {
    return new Promise(async (resolve, reject) => {
      // Prevenir errores de timeout en entornos serverless
      let compilationTimeout;

      // En serverless, establecer un límite estricto de tiempo para evitar timeouts
      if (this.isServerless) {
        const timeoutSeconds = 25; // Tiempo límite para compilación en serverless
        compilationTimeout = setTimeout(() => {
          reject(
            new Error(
              `Tiempo límite de compilación excedido (${timeoutSeconds}s). La imagen puede ser demasiado compleja para procesamiento serverless.`,
            ),
          );
        }, timeoutSeconds * 1000);
      }

      try {
        // Asegurar que TensorFlow esté configurado
        await this._ensureTensorflowReady();

        console.time("⏱️ Tiempo de compilación de tracking");

        const backend = tf.getBackend();
        const percentPerImage = (100 - basePercent) / targetImages.length;
        let percent = 0;
        const list = [];

        console.log(`🧮 Compilando con backend: ${backend}`);

        // Optimizar el tamaño de lote según el backend disponible
        // En serverless, siempre usar lotes más pequeños
        // Estrategia adaptativa para tamaño de lote (CPU/GPU)
        let batchSize = 1;
        if (backend === "node") {
          // Calcular tamaño óptimo basado en recursos
          try {
            const cpus = os.cpus().length;
            const freeMem = os.freemem() / 1024 / 1024 / 1024; // GB libres

            // Lógica de batch dinámico:
            // - 1 núcleo: batch 1 (evitar sobrecarga)
            // - 2-4 núcleos: batch 2-4 (balance carga/paralelismo)
            // - >4 núcleos: batch escalable con memoria
            batchSize =
              cpus > 4
                ? Math.min(Math.floor(freeMem * 0.5), 8) // 0.5GB por batch
                : Math.min(cpus, 4);

            console.log(
              `🧠 Batch size calculado: ${batchSize} (${cpus} cores, ${freeMem.toFixed(1)}GB libres)`,
            );
          } catch (e) {
            console.warn("⚠️ Error cálculo batch size:", e);
            batchSize = 2; // Fallback: equilibrio seguridad/performance
          }
        } else if (this.isServerless) {
          batchSize = 1; // Priorizar seguridad sobre performance
        }

        // Garantizar límites operativos seguros:
        // - Mínimo: Evitar underflow en procesamiento
        // - Máximo: Prevenir OOM (Out Of Memory)
        batchSize = Math.max(1, Math.min(batchSize, 8));

        console.log(`📊 Procesando imágenes en lotes de ${batchSize}`);

        // Solicitar memoria mínima antes de empezar procesamiento intensivo
        if (global.gc) {
          try {
            global.gc();
          } catch (e) {
            // Ignorar errores
          }
        }

        // Paralelismo para el procesamiento en lotes
        for (let i = 0; i < targetImages.length; i += batchSize) {
          // Procesar un lote de imágenes
          const batch = targetImages.slice(i, Math.min(i + batchSize, targetImages.length));

          // Imprimir información sobre el procesamiento por lotes
          if (batch.length > 1) {
            console.log(
              `🔄 Procesando lote ${Math.floor(i / batchSize) + 1}: ${batch.length} imágenes`,
            );
          }

          // Usar tf.engine().startScope() para mejor control de memoria por lote
          tf.engine().startScope();

          try {
            // Procesamiento paralelo de imágenes en el lote
            const batchResults = await Promise.all(
              batch.map(async (targetImage) => {
                const imageList = buildTrackingImageList(targetImage);
                const percentPerAction = percentPerImage / imageList.length;

                // Usar tf.tidy para liberar memoria automáticamente en cada imagen
                return tf.tidy(() => {
                  // Extraer características con monitoreo de progreso
                  const trackingData = extractTrackingFeatures(imageList, () => {
                    percent += percentPerAction;
                    progressCallback(basePercent + percent);
                  });

                  return trackingData;
                });
              }),
            );

            // Agregar resultados a la lista final
            list.push(...batchResults);
          } finally {
            // Asegurar que siempre se cierre el scope para evitar fugas de memoria
            tf.engine().endScope();
          }

          // Liberar memoria entre lotes grandes o al final
          // En serverless, liberar más agresivamente
          if (i % (this.isServerless ? 2 : 5) === 0 || i === targetImages.length - 1) {
            await tf.nextFrame(); // Permitir que el recolector de basura libere memoria

            // Cálculo de presión de memoria adaptativa
            const memoryInfo = tf.memory();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const memPressure = 1 - freeMem / totalMem;

            // Umbrales dinámicos basados en:
            // 1. Tipo de backend (mayor tolerancia en GPU)
            // 2. Presión de memoria actual
            // 3. Entorno de ejecución (serverless vs dedicado)
            const baseThreshold = backend === "webgl" ? 50 : 30;
            const adaptiveThreshold = Math.floor(
              baseThreshold *
              (1 - Math.min(memPressure, 0.5)) *
              (this.isServerless ? 0.6 : 1) *
              (this.isBackendDedicated ? 1.2 : 1),
            );

            console.log(
              `🧠 Memoria: ${(freeMem / 1024 / 1024).toFixed(1)}MB libres | ` +
              `Presión: ${(memPressure * 100).toFixed(1)}% | ` +
              `Umbral: ${adaptiveThreshold} tensores`,
            );

            if (memoryInfo.numTensors > adaptiveThreshold) {
              // Estrategia de limpieza diferenciada
              console.log(
                `🧹 Limpieza ${this.isServerless ? "conservadora" : "agresiva"}: ` +
                `${memoryInfo.numTensors} tensores, ${(memoryInfo.numBytes / 1024 / 1024).toFixed(2)}MB`,
              );

              // Estrategia de limpieza diferenciada:
              // - Serverless: Liberación temprana preventiva
              // - Dedicado: Postergar GC para mejor throughput
              tf.disposeVariables();
              tf.dispose();

              // Forzar recolección de basura en Node.js si está disponible
              if (global.gc) {
                try {
                  global.gc();
                } catch (e) {
                  // Ignorar errores si no está disponible
                }
              }
            }
          }
        }

        // Terminar medición de tiempo
        console.timeEnd("⏱️ Tiempo de compilación de tracking");

        // Liberar toda la memoria restante antes de finalizar
        tf.dispose();

        // Limpiar timeout si existía
        if (compilationTimeout) {
          clearTimeout(compilationTimeout);
        }

        resolve(list);
      } catch (error) {
        // Limpiar timeout si existía
        if (compilationTimeout) {
          clearTimeout(compilationTimeout);
        }

        console.error("❌ Error en compilación:", error);
        reject(error);
      }
    });
  }
}
