/**
 * Código fuente completo de Google Apps Script para el Backend de Bodega HAH
 */
export const APPS_SCRIPT_BACKEND_CODE = `/**
 * =========================================================================================
 * BACKEND GOOGLE APPS SCRIPT - BODEGA DE TRÁNSITO HOSPITAL NAVAL ALMIRANTE NEF (HAH)
 * Archivo: Código.gs
 * Versión: 2.0 Profesional
 * =========================================================================================
 * 
 * Este script actúa como el BACKEND oficial de la aplicación web conectando directamente
 * tu planilla de Google Sheets con la interfaz web.
 * 
 * Proporciona:
 * 1. API REST Web App: Manejo de solicitudes GET y POST (sincronización, consultas, altas).
 * 2. Menú personalizado en Google Sheets: Botones directos dentro de tu planilla para
 *    configurar pestañas, recalcular stocks, verificar alertas críticas y ver estado.
 * 3. Formato y diseño institucional automático: Cabeceras azul marino, bordes, ajuste
 *    automático de columnas y formatos de moneda chilena (CLP).
 * 4. Control de reglas de negocio:
 *    - 'Tránsito Despacho': Exclusivo para productos sin valor (sin costo).
 *    - 'Registro de Kardex': Exclusivo para productos con valor (con precio) y actas de egreso.
 *    - 'Maestro de Inventario': Catálogo maestro de insumos.
 *    - Trazabilidad de Equipos, Herramientas y Equipos Menores.
 */

// =========================================================================================
// CONSTANTES GLOBALES Y ESTRUCTURA DE PESTAÑAS Y COLUMNAS
// =========================================================================================

var SPREADSHEET_TITLE = 'INVENTARIO OFICIAL BODEGA DE TRANSITO HAH - Registro Automático';

var SHEET_NAMES = {
  INVENTARIO: 'Maestro de Inventario',
  KARDEX: 'Registro de Kardex',
  DESPACHO: 'Tránsito Despacho',
  EQUIPOS: 'Trazabilidad Equipos',
  HERRAMIENTAS: 'Trazabilidad Herramientas',
  EQUIPOS_MENORES: 'Trazabilidad Equipos Menores'
};

var SHEET_COLUMNS = {
  'Maestro de Inventario': [
    'CÓDIGO',
    'DESCRIPCIÓN',
    'FAMILIA',
    'TIPO',
    'STOCK ACTUAL',
    'STOCK MÍNIMO',
    'VALOR UNITARIO ($)',
    'VALOR TOTAL ($)',
    'ESTADO'
  ],
  'Registro de Kardex': [
    'ID MOVIMIENTO',
    'FECHA',
    'CÓDIGO',
    'PRODUCTO',
    'ORDEN DE COMPRA (OC)',
    'FACTURA',
    'GUÍA DE DESPACHO',
    'ENTRADA',
    'SALIDA',
    'FUNCIONARIO QUE RECIBE',
    'UNIDAD'
  ],
  'Tránsito Despacho': [
    'FECHA',
    'CÓDIGO',
    'DESCRIPCIÓN',
    'FAMILIA',
    'CANTIDAD INGRESO',
    'CANTIDAD DESPACHADA',
    'SALDO DISPONIBLE',
    'GUÍA DE DESPACHO',
    'FACTURA',
    'ORDEN DE COMPRA (OC)',
    'SERVICIO / UNIDAD DESTINO',
    'FUNCIONARIO QUE RECIBE',
    'OBSERVACIONES'
  ],
  'Trazabilidad Equipos': [
    'CÓDIGO LOCAL',
    'FECHA',
    'NOMBRE DE EQUIPO',
    'MARCA',
    'MODELO',
    'N° SERIE',
    'LOTE',
    'CANTIDAD',
    'SERVICIO DESTINO',
    'PERSONA QUE RECIBE',
    'MANT. PREVENTIVO',
    'ESTADO',
    'VALOR UNITARIO ($)',
    'COSTO TOTAL ($)',
    'OBSERVACIONES'
  ],
  'Trazabilidad Herramientas': [
    'CÓDIGO LOCAL',
    'FECHA',
    'DESCRIPCIÓN HERRAMIENTA',
    'CANTIDAD',
    'SERVICIO DESTINO',
    'PERSONA QUE RECIBE',
    'ORDEN DE COMPRA (OC)',
    'FACTURA',
    'GUÍA DE DESPACHO',
    'VALOR UNITARIO ($)',
    'COSTO TOTAL ($)',
    'DOCUMENTO ADJUNTO'
  ],
  'Trazabilidad Equipos Menores': [
    'CÓDIGO LOCAL',
    'FECHA',
    'NOMBRE EQUIPO MENOR',
    'MARCA',
    'MODELO',
    'N° SERIE',
    'LOTE',
    'CANTIDAD',
    'SERVICIO DESTINO',
    'PERSONA QUE RECIBE',
    'ORDEN DE COMPRA (OC)',
    'FACTURA',
    'GUÍA DE DESPACHO',
    'VALOR UNITARIO ($)',
    'COSTO TOTAL ($)',
    'DOCUMENTO ADJUNTO'
  ]
};

// =========================================================================================
// MENÚ SUPERIOR PERSONALIZADO DENTRO DE GOOGLE SHEETS
// =========================================================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏥 Bodega Tránsito HAH')
    .addItem('📊 Generar Dashboard Completo (Gráficos + KPI)', 'menuGenerarDashboard')
    .addItem('⚙️ Formatear y Crear las 6 Pestañas', 'menuSetupSpreadsheet')
    .addItem('📐 Corregir Desfase de Columnas', 'menuCorregirAlineacion')
    .addItem('🧹 Eliminar Gráficos Vacíos (Cuadros Flotantes)', 'menuLimpiarGraficos')
    .addSeparator()
    .addItem('🔄 Recalcular Stock y Saldos Kardex', 'menuRecalcularSaldos')
    .addItem('🚨 Revisar Alertas de Stock Crítico', 'menuRevisarAlertas')
    .addSeparator()
    .addItem('ℹ️ Ver Estado y URL de API Backend', 'menuVerInformacionApi')
    .addToUi();
}

function menuGenerarDashboard() {
  setupSpreadsheet();
  SpreadsheetApp.getUi().alert('✅ Dashboard Generado', 'Se han generado con éxito los 4 gráficos (Torta, Dona, Columnas y Barras) con datos numéricos junto a la tarjeta de Total en todas las pestañas.', SpreadsheetApp.ButtonSet.OK);
}

function menuLimpiarGraficos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var totalEliminados = 0;
  for (var s = 0; s < sheets.length; s++) {
    var charts = sheets[s].getCharts();
    for (var i = 0; i < charts.length; i++) {
      sheets[s].removeChart(charts[i]);
      totalEliminados++;
    }
  }
  SpreadsheetApp.getUi().alert('🧹 Limpieza Completa', 'Se eliminaron ' + totalEliminados + ' cuadro(s) de gráficos vacíos de la planilla.', SpreadsheetApp.ButtonSet.OK);
}

function menuCorregirAlineacion() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsInfo = [
    { name: SHEET_NAMES.INVENTARIO, cols: SHEET_COLUMNS[SHEET_NAMES.INVENTARIO] },
    { name: SHEET_NAMES.KARDEX, cols: SHEET_COLUMNS[SHEET_NAMES.KARDEX] },
    { name: SHEET_NAMES.DESPACHO, cols: SHEET_COLUMNS[SHEET_NAMES.DESPACHO] },
    { name: SHEET_NAMES.EQUIPOS, cols: SHEET_COLUMNS[SHEET_NAMES.EQUIPOS] },
    { name: SHEET_NAMES.HERRAMIENTAS, cols: SHEET_COLUMNS[SHEET_NAMES.HERRAMIENTAS] },
    { name: SHEET_NAMES.EQUIPOS_MENORES, cols: SHEET_COLUMNS[SHEET_NAMES.EQUIPOS_MENORES] }
  ];

  sheetsInfo.forEach(function(info) {
    var sheet = ss.getSheetByName(info.name);
    if (sheet) {
      // Si existía columna B vacía residual en datos antiguos, limpiarla
      var lastRow = sheet.getLastRow();
      if (lastRow >= 16) {
        var valB16 = sheet.getRange(16, 2).getValue();
        var valC16 = sheet.getRange(16, 3).getValue();
        if ((valB16 === '' || valB16 === null) && valC16 !== '' && valC16 !== null) {
          sheet.deleteColumn(2);
        }
      }
      formatSheetTracker(sheet, info.name, info.cols);
    }
  });

  SpreadsheetApp.getUi().alert('Distribución Unificada', 'Se ha reestablecido la distribución fija de la cabecera, tarjeta KPI y los 4 gráficos en todas las hojas.', SpreadsheetApp.ButtonSet.OK);
}

function menuSetupSpreadsheet() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    'Confirmación de Estructura',
    '¿Deseas inicializar y formatear automáticamente las 6 pestañas de la bodega con sus cabeceras institucionales?',
    ui.ButtonSet.YES_NO
  );
  if (confirm === ui.Button.YES) {
    setupSpreadsheet();
    ui.alert('✅ ¡Éxito!', 'Las 6 pestañas oficiales han sido creadas y formateadas correctamente.', ui.ButtonSet.OK);
  }
}

function menuRecalcularSaldos() {
  recalcularSaldosYValores();
  SpreadsheetApp.getUi().alert('✅ Recálculo Completo', 'Se han actualizado los totales y estados en el Maestro de Inventario.', SpreadsheetApp.ButtonSet.OK);
}

function menuRevisarAlertas() {
  var alertas = obtenerAlertasStockCritico();
  var ui = SpreadsheetApp.getUi();
  var lb = String.fromCharCode(10);
  if (alertas.length === 0) {
    ui.alert('🟢 Stock Normal', 'No se registran productos en nivel crítico o agotados.', ui.ButtonSet.OK);
  } else {
    var mensaje = 'Se encontraron ' + alertas.length + ' producto(s) en estado crítico:' + lb + lb;
    for (var i = 0; i < Math.min(alertas.length, 10); i++) {
      mensaje += '• ' + alertas[i].codigo + ' - ' + alertas[i].desc + ' (Stock: ' + alertas[i].stock + ' / Mín: ' + alertas[i].stockMin + ')' + lb;
    }
    if (alertas.length > 10) {
      mensaje += lb + '... y ' + (alertas.length - 10) + ' más.';
    }
    ui.alert('🚨 Alerta de Inventario', mensaje, ui.ButtonSet.OK);
  }
}

function menuVerInformacionApi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var lb = String.fromCharCode(10);
  var info = 'Planilla: ' + ss.getName() + lb +
             'ID: ' + ss.getId() + lb + lb +
             'Para conectar con la App Web:' + lb +
             '1. Menú "Extensiones" > "Apps Script"' + lb +
             '2. Haz clic en el botón azul "Implementar" > "Nueva implementación"' + lb +
             '3. Selecciona Tipo: "Aplicación web"' + lb +
             '4. Ejecutar como: "Yo" (tu correo)' + lb +
             '5. Quién tiene acceso: "Cualquier usuario" (Anyone)' + lb +
             '6. Copia la URL generada y pégala en la App Web.';
  ui.alert('ℹ️ Conexión Backend Web App', info, ui.ButtonSet.OK);
}

// =========================================================================================
// ACCESO SEGURO A LA PLANILLA DE CÁLCULO
// =========================================================================================

var _cachedAppSpreadsheet = null;

function getAppSpreadsheet(explicitId) {
  if (_cachedAppSpreadsheet) return _cachedAppSpreadsheet;

  // 1. PRIMERA PRIORIDAD: getActiveSpreadsheet()
  // Si el script es container-bound (creado desde Extensiones > Apps Script dentro de la planilla),
  // getActiveSpreadsheet() es INSTANTÁNEO, no genera consultas externas a Drive y NUNCA se agota por timeout.
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      _cachedAppSpreadsheet = activeSs;
      return activeSs;
    }
  } catch (errActive) {
    Logger.log('getActiveSpreadsheet no disponible: ' + errActive);
  }

  // 2. Si viene un ID explícito (para scripts independientes tipo Standalone)
  if (explicitId && typeof explicitId === 'string' && explicitId.trim().length > 5) {
    for (var attempt = 1; attempt <= 2; attempt++) {
      try {
        _cachedAppSpreadsheet = SpreadsheetApp.openById(explicitId.trim());
        if (_cachedAppSpreadsheet) return _cachedAppSpreadsheet;
      } catch (errExplicit) {
        Logger.log('openById intento ' + attempt + ' falló: ' + errExplicit);
        if (attempt < 2) {
          Utilities.sleep(1000);
        }
      }
    }
  }

  // 3. Fallback a PropertiesService si está configurado
  try {
    var savedId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (savedId) {
      _cachedAppSpreadsheet = SpreadsheetApp.openById(savedId);
      if (_cachedAppSpreadsheet) return _cachedAppSpreadsheet;
    }
  } catch (errProps) {}

  return null;
}

// =========================================================================================
// API REST - ENDPOINT GET (doGet)
// =========================================================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    var explicitId = (e && e.parameter && e.parameter.spreadsheetId) ? e.parameter.spreadsheetId : '';
    var ss = getAppSpreadsheet(explicitId);

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        status: 'online',
        app: 'Backend Bodega Tránsito HAH',
        version: '2.0.0',
        spreadsheetTitle: ss ? ss.getName() : 'No vinculado',
        spreadsheetId: ss ? ss.getId() : (explicitId || ''),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getAll') {
      var savedState = getFullAppStateSnapshot();
      return jsonResponse({
        success: true,
        appState: savedState,
        inventario: getSheetDataAsJson(SHEET_NAMES.INVENTARIO),
        kardex: getSheetDataAsJson(SHEET_NAMES.KARDEX),
        transitoDespacho: getSheetDataAsJson(SHEET_NAMES.DESPACHO),
        equipos: getSheetDataAsJson(SHEET_NAMES.EQUIPOS),
        herramientas: getSheetDataAsJson(SHEET_NAMES.HERRAMIENTAS),
        equiposMenores: getSheetDataAsJson(SHEET_NAMES.EQUIPOS_MENORES),
        alertasStock: obtenerAlertasStockCritico(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getInventario') {
      return jsonResponse({
        success: true,
        data: getSheetDataAsJson(SHEET_NAMES.INVENTARIO)
      });
    }

    if (action === 'getKardex') {
      return jsonResponse({
        success: true,
        data: getSheetDataAsJson(SHEET_NAMES.KARDEX)
      });
    }

    if (action === 'getDespacho') {
      return jsonResponse({
        success: true,
        data: getSheetDataAsJson(SHEET_NAMES.DESPACHO)
      });
    }

    if (action === 'getEquipos') {
      return jsonResponse({
        success: true,
        equipos: getSheetDataAsJson(SHEET_NAMES.EQUIPOS),
        herramientas: getSheetDataAsJson(SHEET_NAMES.HERRAMIENTAS),
        equiposMenores: getSheetDataAsJson(SHEET_NAMES.EQUIPOS_MENORES)
      });
    }

    return jsonResponse({
      success: false,
      error: 'Acción GET no reconocida: ' + action
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

// =========================================================================================
// API REST - ENDPOINT POST (doPost)
// =========================================================================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;
  try {
    // Intentar adquirir bloqueo por hasta 15 segundos para evitar colisiones y timeouts
    lockAcquired = lock.tryLock(15000);
    if (!lockAcquired) {
      return jsonResponse({
        success: true,
        message: 'Sincronización en curso por otra petición concurrente; se consolidará en el siguiente ciclo.',
        deferred: true
      });
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: 'No se recibieron datos en la solicitud POST.'
      });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var targetSpreadsheetId = payload.spreadsheetId || (payload.data && payload.data.spreadsheetId) || '';

    if (targetSpreadsheetId) {
      getAppSpreadsheet(targetSpreadsheetId);
    }

    ensureSheetsExist();

    if (action === 'SYNC_ALL') {
      return handleSyncAll(payload.data);
    }

    if (action === 'ADD_INGRESO_KARDEX') {
      return handleAddIngresoKardex(payload.data);
    }

    if (action === 'ADD_EGRESO_KARDEX') {
      return handleAddEgresoKardex(payload.data);
    }

    if (action === 'ADD_TRANSITO_DESPACHO') {
      return handleAddTransitoDespacho(payload.data);
    }

    if (action === 'ADD_TRAZABILIDAD') {
      return handleAddTrazabilidad(payload.tipo, payload.data);
    }

    if (action === 'SEND_EMAIL') {
      return handleSendEmailReport(payload);
    }

    return jsonResponse({
      success: false,
      error: 'Acción POST no reconocida: ' + action
    });

  } catch (err) {
    var errMsg = err.toString();
    if (errMsg.indexOf('no ha podido acceder al documento') !== -1 || errMsg.indexOf('failed while accessing document') !== -1) {
      errMsg = 'Error de Permisos en Google Apps Script: ' + errMsg + '. SOLUCIÓN: En Apps Script ve a Implementar > Administrar implementaciones > ✏️ Editar > Asegúrate de que "Ejecutar como" sea "Yo" (tu correo de Gmail) y "Quién tiene acceso" sea "Cualquier usuario" > Selecciona "Nueva versión" > Implementar.';
    } else if (errMsg.indexOf('tiempo de espera') !== -1 || errMsg.indexOf('timed out') !== -1) {
      errMsg = 'Google Sheets demoró en responder (tiempo de espera). La sincronización automática reintentará sin pérdida de datos.';
    }
    return jsonResponse({
      success: false,
      error: errMsg
    });
  } finally {
    if (lockAcquired) {
      try {
        lock.releaseLock();
      } catch (lockErr) {}
    }
  }
}

// =========================================================================================
// CONTROLADORES DE ACCIONES
// =========================================================================================

function handleSyncAll(data) {
  var ss = getAppSpreadsheet();

  // 1. Maestro de Inventario
  if (data.productos && Array.isArray(data.productos)) {
    var sheetInv = getOrCreateSheet(SHEET_NAMES.INVENTARIO);
    var invRows = data.productos.map(function(p) {
      var stock = Number(p.stock || 0);
      var stockMin = Number(p.stockMin || 0);
      var valor = Number(p.valor || 0);
      var valorTotal = stock * valor;
      var estado = stock <= 0 ? 'AGOTADO' : (stock <= stockMin ? 'CRÍTICO' : 'NORMAL');
      return [
        p.codigo || '',
        p.desc || '',
        p.familia || '',
        p.tipo || 'Insumo',
        stock,
        stockMin,
        valor,
        valorTotal,
        estado
      ];
    });
    replaceSheetData(sheetInv, SHEET_COLUMNS[SHEET_NAMES.INVENTARIO], invRows);
    formatCurrencyColumn(sheetInv, 7);
    formatCurrencyColumn(sheetInv, 8);
  }

  // 2. Registro de Kardex (Historial completo de Entradas y Salidas)
  var sheetKardex = getOrCreateSheet(SHEET_NAMES.KARDEX);
  var kardexRows = [];
  var seenKardexIds = {};

  if (data.kardex && Array.isArray(data.kardex)) {
    data.kardex.forEach(function(k, idx) {
      var id = k.id || ('KDX-' + (idx + 1));
      seenKardexIds[id] = true;
      var cant = Number(k.cantidad || k.cant || 0);
      var tipoUpper = String(k.tipo || '').toUpperCase();
      var esSalida = tipoUpper === 'SALIDA' || tipoUpper === 'EGRESO' || tipoUpper === 'AJUSTE_NEGATIVO';
      var esEntrada = tipoUpper === 'ENTRADA' || tipoUpper === 'INGRESO' || (!esSalida && cant > 0);

      var entradaVal = esEntrada ? cant : (k.entrada !== undefined && k.entrada !== '' ? Number(k.entrada) : '');
      var salidaVal = esSalida ? cant : (k.salida !== undefined && k.salida !== '' ? Number(k.salida) : '');

      kardexRows.push([
        id,
        formatDateChile(k.fechaIngreso || k.fecha),
        k.codigo || '',
        k.producto || k.desc || '',
        k.oc && k.oc !== '—' ? k.oc : '',
        k.factura && k.factura !== '—' ? k.factura : '',
        k.guia && k.guia !== '—' ? k.guia : '',
        entradaVal,
        salidaVal,
        k.persona || k.funcionario || k.responsable || 'Bodega Central',
        k.unidad || k.servicio || 'Bodega Central'
      ]);
    });
  }

  // Si hay actas de salida registradas en la app que no estuvieran en kardex, agregarlas también
  if (data.actas && Array.isArray(data.actas)) {
    data.actas.forEach(function(a) {
      if (a.items && Array.isArray(a.items)) {
        a.items.forEach(function(it, idx) {
          var actaItemId = a.id + '-IT' + (idx + 1);
          if (!seenKardexIds[actaItemId] && !seenKardexIds[a.id]) {
            kardexRows.push([
              actaItemId,
              formatDateChile(a.fecha),
              it.codigo || '',
              it.desc || it.producto || '',
              a.nroSolicitud || a.numActa ? ('Acta #' + (a.numActa || a.nroSolicitud)) : (a.id || ''),
              '',
              '',
              '',
              Number(it.cantidad || it.cant || 0),
              a.responsable || a.recibe || a.funcionario || '',
              a.servicio || a.destino || ''
            ]);
          }
        });
      }
    });
  }
  replaceSheetData(sheetKardex, SHEET_COLUMNS[SHEET_NAMES.KARDEX], kardexRows);

  // 3. Tránsito Despacho (Productos sin costo)
  if (data.sinCostoList && Array.isArray(data.sinCostoList)) {
    var sheetDesp = getOrCreateSheet(SHEET_NAMES.DESPACHO);
    var despRows = data.sinCostoList.map(function(sc) {
      var cantIngreso = Number(sc.cantIngreso || sc.cantidad || 0);
      var cantDesp = Number(sc.cantDespachada || 0);
      var saldo = cantIngreso - cantDesp;
      return [
        formatDateChile(sc.fecha),
        sc.codigo || '',
        sc.desc || '',
        sc.familia || '',
        cantIngreso,
        cantDesp,
        saldo,
        sc.guia || '',
        sc.factura || '',
        sc.oc || '',
        sc.servicio || sc.destino || '',
        sc.recibe || sc.funcionario || '',
        sc.obs || ''
      ];
    });
    replaceSheetData(sheetDesp, SHEET_COLUMNS[SHEET_NAMES.DESPACHO], despRows);
  }

  // 4. Trazabilidad Equipos
  if (data.equipos && Array.isArray(data.equipos)) {
    var sheetEq = getOrCreateSheet(SHEET_NAMES.EQUIPOS);
    var eqRows = data.equipos.map(function(item) {
      var cant = Number(item.cantidad || 1);
      var vu = Number(item.valorUnitario || 0);
      var svcDestino = item.servicioDestino || item.servClinico || item.servicio || item.destino || '';
      var receptor = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
      return [
        item.codigoLocal || item.codigo || item.id || '',
        formatDateChile(item.fecha),
        item.nombreEquipo || item.descripcion || '',
        item.marca || '',
        item.modelo || '',
        item.serie || item.nSerie || '',
        item.lote || '',
        cant,
        svcDestino,
        receptor,
        item.mantPreventivo || 'Semestral',
        item.estado || item.ingresoRetiro || 'OPERATIVO',
        vu,
        cant * vu,
        item.observaciones || ''
      ];
    });
    replaceSheetData(sheetEq, SHEET_COLUMNS[SHEET_NAMES.EQUIPOS], eqRows);
    formatCurrencyColumn(sheetEq, 13);
    formatCurrencyColumn(sheetEq, 14);
  }

  // 5. Trazabilidad Herramientas
  if (data.herramientas && Array.isArray(data.herramientas)) {
    var sheetHer = getOrCreateSheet(SHEET_NAMES.HERRAMIENTAS);
    var herRows = data.herramientas.map(function(item) {
      var cant = Number(item.cantidad || 1);
      var vu = Number(item.valorUnitario || 0);
      var svcDestino = item.servicioDestino || item.servClinico || item.servicio || item.destino || '';
      var receptor = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
      return [
        item.codigoLocal || item.codigo || item.id || '',
        formatDateChile(item.fecha),
        item.descripcion || item.nombre || '',
        cant,
        svcDestino,
        receptor,
        item.oc || '',
        item.factura || '',
        item.guia || '',
        vu,
        cant * vu,
        (item.documentoAdjunto || item.adjunto) ? 'Archivo Adjunto' : 'Sin Adjunto'
      ];
    });
    replaceSheetData(sheetHer, SHEET_COLUMNS[SHEET_NAMES.HERRAMIENTAS], herRows);
    formatCurrencyColumn(sheetHer, 10);
    formatCurrencyColumn(sheetHer, 11);
  }

  // 6. Trazabilidad Equipos Menores
  if (data.equiposMenores && Array.isArray(data.equiposMenores)) {
    var sheetEqm = getOrCreateSheet(SHEET_NAMES.EQUIPOS_MENORES);
    var eqmRows = data.equiposMenores.map(function(item) {
      var cant = Number(item.cantidad || 1);
      var vu = Number(item.valorUnitario || 0);
      var svcDestino = item.servicioDestino || item.servClinico || item.servicio || item.destino || '';
      var receptor = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
      return [
        item.codigoLocal || item.codigo || item.id || '',
        formatDateChile(item.fecha),
        item.nombreEquipo || item.nombre || item.descripcion || '',
        item.marca || '',
        item.modelo || '',
        item.serie || item.nSerie || '',
        item.lote || '',
        cant,
        svcDestino,
        receptor,
        item.oc || '',
        item.factura || '',
        item.guia || '',
        vu,
        cant * vu,
        (item.documentoAdjunto || item.adjunto) ? 'Archivo Adjunto' : 'Sin Adjunto'
      ];
    });
    replaceSheetData(sheetEqm, SHEET_COLUMNS[SHEET_NAMES.EQUIPOS_MENORES], eqmRows);
    formatCurrencyColumn(sheetEqm, 14);
    formatCurrencyColumn(sheetEqm, 15);
  }

  // 7. Guardar instantánea completa para sincronización multi-dispositivo (PC Trabajo, PC Casa y Tablet)
  saveFullAppStateSnapshot(data);

  return jsonResponse({
    success: true,
    message: 'Sincronización completa de las 6 pestañas y estado multi-equipo ejecutada exitosamente.',
    timestamp: new Date().toISOString()
  });
}

function handleAddIngresoKardex(k) {
  var sheetKardex = getOrCreateSheet(SHEET_NAMES.KARDEX);
  var row = [
    k.id || ('MOV-' + Utilities.getUuid().slice(0, 8)),
    formatDateChile(k.fecha),
    k.codigo || '',
    k.producto || '',
    k.oc || '',
    k.factura || '',
    k.guia || '',
    Number(k.cant || 0),
    '',
    k.funcionario || 'Bodega Central',
    k.unidad || 'Bodega Central'
  ];
  sheetKardex.appendRow(row);
  recalcularSaldosYValores();

  return jsonResponse({
    success: true,
    message: 'Ingreso registrado exitosamente en Kardex e Inventario.',
    id: row[0]
  });
}

function handleAddEgresoKardex(a) {
  var sheetKardex = getOrCreateSheet(SHEET_NAMES.KARDEX);
  var rowsAdded = 0;

  if (a.items && Array.isArray(a.items)) {
    a.items.forEach(function(it, idx) {
      var row = [
        a.id + '-IT' + (idx + 1),
        formatDateChile(a.fecha),
        it.codigo || '',
        it.desc || '',
        a.numActa ? ('Acta #' + a.numActa) : (a.id || ''),
        '',
        '',
        '',
        Number(it.cant || 0),
        a.recibe || a.funcionario || '',
        a.servicio || a.destino || ''
      ];
      sheetKardex.appendRow(row);
      rowsAdded++;
    });
  }
  recalcularSaldosYValores();

  return jsonResponse({
    success: true,
    message: 'Egreso de ' + rowsAdded + ' ítem(s) registrado en Kardex.',
    actaId: a.id
  });
}

function handleAddTransitoDespacho(sc) {
  var sheetDesp = getOrCreateSheet(SHEET_NAMES.DESPACHO);
  var cantIngreso = Number(sc.cantIngreso || sc.cantidad || 0);
  var cantDesp = Number(sc.cantDespachada || 0);
  var saldo = cantIngreso - cantDesp;

  var row = [
    formatDateChile(sc.fecha),
    sc.codigo || '',
    sc.desc || '',
    sc.familia || '',
    cantIngreso,
    cantDesp,
    saldo,
    sc.guia || '',
    sc.factura || '',
    sc.oc || '',
    sc.servicio || sc.destino || '',
    sc.recibe || sc.funcionario || '',
    sc.obs || ''
  ];
  sheetDesp.appendRow(row);

  return jsonResponse({
    success: true,
    message: 'Registro añadido exitosamente en Tránsito Despacho.',
    codigo: sc.codigo
  });
}

function handleAddTrazabilidad(tipo, item) {
  var sheetName;
  var row;
  var cant = Number(item.cantidad || 1);
  var vu = Number(item.valorUnitario || 0);
  var svcDestino = item.servicioDestino || item.servClinico || item.servicio || item.destino || '';
  var receptor = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';

  if (tipo === 'herramienta') {
    sheetName = SHEET_NAMES.HERRAMIENTAS;
    row = [
      item.codigoLocal || item.codigo || item.id || '',
      formatDateChile(item.fecha),
      item.descripcion || item.nombre || '',
      cant,
      svcDestino,
      receptor,
      item.oc || '',
      item.factura || '',
      item.guia || '',
      vu,
      cant * vu,
      (item.documentoAdjunto || item.adjunto) ? 'Archivo Adjunto' : 'Sin Adjunto'
    ];
  } else if (tipo === 'equipomenor') {
    sheetName = SHEET_NAMES.EQUIPOS_MENORES;
    row = [
      item.codigoLocal || item.codigo || item.id || '',
      formatDateChile(item.fecha),
      item.nombreEquipo || item.nombre || item.descripcion || '',
      item.marca || '',
      item.modelo || '',
      item.serie || item.nSerie || '',
      item.lote || '',
      cant,
      svcDestino,
      receptor,
      item.oc || '',
      item.factura || '',
      item.guia || '',
      vu,
      cant * vu,
      (item.documentoAdjunto || item.adjunto) ? 'Archivo Adjunto' : 'Sin Adjunto'
    ];
  } else {
    sheetName = SHEET_NAMES.EQUIPOS;
    row = [
      item.codigoLocal || item.codigo || item.id || '',
      formatDateChile(item.fecha),
      item.nombreEquipo || item.descripcion || '',
      item.marca || '',
      item.modelo || '',
      item.serie || item.nSerie || '',
      item.lote || '',
      cant,
      svcDestino,
      receptor,
      item.mantPreventivo || 'Semestral',
      item.estado || item.ingresoRetiro || 'OPERATIVO',
      vu,
      cant * vu,
      item.observaciones || ''
    ];
  }

  var sheet = getOrCreateSheet(sheetName);
  sheet.appendRow(row);

  return jsonResponse({
    success: true,
    message: 'Elemento registrado en ' + sheetName + '.',
    codigo: row[0]
  });
}

function handleSendEmailReport(payload) {
  var to = (payload.to || '').trim();
  if (!to) {
    return jsonResponse({
      success: false,
      error: 'Se requiere una dirección de correo de destino.'
    });
  }

  var subject = payload.subject || 'Reporte Oficial de Bodega de Tránsito HAH';
  var body = payload.body || 'Se remite reporte oficial de Bodega de Tránsito HAH.';
  var htmlBody = payload.htmlBody || undefined;

  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body,
      htmlBody: htmlBody
    });

    return jsonResponse({
      success: true,
      message: 'Reporte oficial enviado exitosamente por correo a ' + to
    });
  } catch (mailErr) {
    return jsonResponse({
      success: false,
      error: 'Error al despachar correo mediante Google Apps Script: ' + mailErr.toString()
    });
  }
}

function seedInitialDataIfEmpty(sheet, title) {
  // Las pestañas se inicializan limpias, profesionales y preparadas exclusivamente para los datos reales
}

function setupSpreadsheet() {
  var ss = getAppSpreadsheet();
  if (!ss) {
    throw new Error('No se pudo acceder a la planilla. Verifica que esté configurada con "Ejecutar como: Yo".');
  }

  Object.keys(SHEET_COLUMNS).forEach(function(title) {
    var columns = SHEET_COLUMNS[title];
    var sheet = getOrCreateSheet(title);
    seedInitialDataIfEmpty(sheet, title);
    formatSheetTracker(sheet, title, columns);
  });

  try {
    var defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (e) {}
}

function formatSheetTracker(sheet, title, columns) {
  var numCols = columns.length;
  sheet.setTabColor('#1b4332');
  // Se establece 0 filas congeladas para que Google Sheets permita anclar los gráficos
  // exactamente en las filas 4 a 13 del panel superior sin empujarlos sobre los datos
  sheet.setFrozenRows(0);

  // 1. Eliminar cualquier gráfico residual o cuadro vacío previo
  try {
    var charts = sheet.getCharts();
    for (var ch = 0; ch < charts.length; ch++) {
      sheet.removeChart(charts[ch]);
    }
  } catch (chartErr) {}

  // 2. Corregir cualquier columna B vacía si los datos están desfasados
  try {
    var lastRow = sheet.getLastRow();
    if (lastRow >= 16) {
      var valA = sheet.getRange(16, 1).getValue();
      var valB = sheet.getRange(16, 2).getValue();
      var valC = sheet.getRange(16, 3).getValue();
      if (valA !== '' && (valB === '' || valB === null) && valC !== '' && valC !== null) {
        sheet.deleteColumn(2); // Eliminar la columna B vacía sobrante
      }
    }
  } catch (colErr) {}

  // 3. Fila 1-3: Banner de Título Verde Bosque Institucional
  var bannerCols = Math.max(numCols, 11);
  var titleRange = sheet.getRange(1, 1, 3, bannerCols);
  titleRange.merge()
    .setValue('HOSPITAL ALTO HOSPICIO — ' + title.toUpperCase())
    .setBackground('#1b4332')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(15)
    .setFontFamily('Roboto')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // 4. Fondo panel Dashboard (Filas 4 a 14) en verde menta suave idéntico a la imagen de referencia
  sheet.getRange(4, 1, 11, bannerCols).setBackground('#eef7ee');

  // 5. Tarjeta Principal Izquierda (Columnas A y B, Filas 5 a 13) - Idéntica a "Total Task"
  var card1Label = 'TOTAL ÍTEMS';
  var card1Formula = '=COUNTA(A16:A1000)';

  if (title === SHEET_NAMES.KARDEX) {
    card1Label = 'TOTAL MOVIMIENTOS';
    card1Formula = '=COUNTA(A16:A1000)';
  } else if (title === SHEET_NAMES.DESPACHO) {
    card1Label = 'INSUMOS TRÁNSITO';
    card1Formula = '=COUNTA(B16:B1000)';
  } else if (title === SHEET_NAMES.EQUIPOS) {
    card1Label = 'TOTAL EQUIPOS';
    card1Formula = '=COUNTA(A16:A1000)';
  } else if (title === SHEET_NAMES.HERRAMIENTAS) {
    card1Label = 'TOTAL HERRAMIENTAS';
    card1Formula = '=COUNTA(A16:A1000)';
  } else if (title === SHEET_NAMES.EQUIPOS_MENORES) {
    card1Label = 'TOTAL EQ. MENORES';
    card1Formula = '=COUNTA(A16:A1000)';
  }

  // Encabezado de la Tarjeta (A5:B6)
  sheet.getRange(5, 1, 2, 2).merge().setValue(card1Label)
    .setBackground('#2d6a4f').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  // Valor Grande de la Tarjeta (A7:B13)
  sheet.getRange(7, 1, 7, 2).merge().setValue(card1Formula)
    .setBackground('#a3d9a5').setFontColor('#0f3d24').setFontWeight('bold').setFontSize(28).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // 6. Generar los 4 Gráficos del Dashboard exactamente como la imagen de referencia
  try {
    createDashboardCharts(sheet, title);
  } catch (errDash) {
    Logger.log('Aviso al generar gráficos de dashboard: ' + errDash);
  }

  // 7. Limpiar fila 15 antes de escribir encabezados oficiales alineados
  try {
    sheet.getRange(15, 1, 1, Math.max(numCols, 26)).clearContent().clearFormat();
  } catch (e) {}

  // 8. Fila 15: Encabezados de la tabla oficial (iniciando estrictamente en Columna A)
  var headerRange = sheet.getRange(15, 1, 1, numCols);
  headerRange.setValues([columns])
    .setBackground('#2d6a4f')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontFamily('Roboto')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  // 9. Aplicar medidas y distribución unificada estándar (filas y columnas fijas)
  applyStandardDashboardLayout(sheet, title, numCols);
}

function applyStandardDashboardLayout(sheet, title, numCols) {
  // 1. Alturas fijas de filas 1 a 15 para garantizar geometría idéntica
  sheet.setRowHeight(1, 22);
  sheet.setRowHeight(2, 24);
  sheet.setRowHeight(3, 22);
  sheet.setRowHeight(4, 8);   // Margen superior contenedor verde salvia
  sheet.setRowHeight(5, 22);  // Cabecera tarjeta KPI
  sheet.setRowHeight(6, 18);  // Subcabecera tarjeta KPI
  for (var r = 7; r <= 13; r++) {
    sheet.setRowHeight(r, 22); // Cuerpo valor grande tarjeta (7 * 22 = 154px)
  }
  sheet.setRowHeight(14, 16); // Fila espaciadora blanca
  sheet.setRowHeight(15, 34); // Fila de encabezados de tabla oficial

  // 2. Anchos de columnas fijos y armonizados por pestaña (A + B = 250px para la Tarjeta)
  var defaultWidths = {
    'INVENTARIO': [115, 135, 120, 95, 95, 95, 110, 125, 110],
    'KARDEX': [130, 120, 100, 230, 120, 100, 115, 85, 85, 150, 140],
    'DESPACHO': [110, 140, 90, 100, 240, 110, 115, 100, 110, 90, 140, 140],
    'EQUIPOS': [120, 130, 220, 115, 115, 120, 100, 85, 150, 140, 130, 110, 105, 115, 180],
    'HERRAMIENTAS': [120, 130, 240, 85, 150, 140, 110, 100, 110, 105, 115, 140],
    'EQUIPOS_MENORES': [120, 130, 220, 115, 115, 120, 100, 85, 150, 140, 130, 110, 110, 100, 115, 140]
  };

  var key = 'INVENTARIO';
  if (title === SHEET_NAMES.KARDEX) key = 'KARDEX';
  else if (title === SHEET_NAMES.DESPACHO) key = 'DESPACHO';
  else if (title === SHEET_NAMES.EQUIPOS) key = 'EQUIPOS';
  else if (title === SHEET_NAMES.HERRAMIENTAS) key = 'HERRAMIENTAS';
  else if (title === SHEET_NAMES.EQUIPOS_MENORES) key = 'EQUIPOS_MENORES';

  var widths = defaultWidths[key] || [];
  for (var c = 1; c <= numCols; c++) {
    var targetWidth = widths[c - 1] || 110;
    sheet.setColumnWidth(c, targetWidth);
  }
}

function setHelperTable(sheet, startCell, data) {
  if (!sheet || !data || data.length === 0) return;
  var colStr = startCell.replace(/[0-9]/g, '').toUpperCase();
  var row = parseInt(startCell.replace(/[^0-9]/g, ''), 10) || 1;
  var col = 0;
  for (var i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  try {
    sheet.getRange(row, col, 8, data[0].length).clearContent();
  } catch (e) {}
  sheet.getRange(row, col, data.length, data[0].length).setValues(data);
}

function setupHelperTables(sheet, title) {
  try {
    sheet.hideColumns(27, 12);
  } catch (e) {}

  if (title === SHEET_NAMES.INVENTARIO) {
    // 1. Gráfico Torta: Cantidad de ítems por Familia
    setHelperTable(sheet, 'AA1', [
      ['Familia', 'Cantidad'],
      ['Alimentación (ALI)', '=COUNTIF(C16:C1000, "*ALI*")'],
      ['Gineco-Obstetricia (GOB)', '=COUNTIF(C16:C1000, "*GOB*")'],
      ['Equipos Médicos (EQM)', '=COUNTIF(C16:C1000, "*EQM*")'],
      ['Tránsito (BOT)', '=COUNTIF(C16:C1000, "*BOT*")'],
      ['Otras Familias', '=MAX(0, COUNTA(A16:A1000)-SUM(AB2:AB5))']
    ]);

    // 2. Gráfico Dona: Estado de Stock de Productos
    setHelperTable(sheet, 'AD1', [
      ['Estado', 'Ítems'],
      ['Normal', '=COUNTIF(I16:I1000, "*NORMAL*") + COUNTIF(I16:I1000, "*Normal*")'],
      ['Crítico', '=COUNTIF(I16:I1000, "*CRÍTICO*") + COUNTIF(I16:I1000, "*Crítico*")'],
      ['Agotado', '=COUNTIF(I16:I1000, "*AGOTADO*") + COUNTIF(I16:I1000, "*Agotado*")']
    ]);

    // 3. Gráfico Columnas: Stock Físico por Familia
    setHelperTable(sheet, 'AG1', [
      ['Familia', 'Stock Físico'],
      ['Alimentación', '=SUMIF(C16:C1000, "*ALI*", E16:E1000)'],
      ['Gineco-Obstetricia', '=SUMIF(C16:C1000, "*GOB*", E16:E1000)'],
      ['Equipos Médicos', '=SUMIF(C16:C1000, "*EQM*", E16:E1000)'],
      ['Tránsito', '=SUMIF(C16:C1000, "*BOT*", E16:E1000)'],
      ['Otros', '=MAX(0, SUM(E16:E1000)-SUM(AH2:AH5))']
    ]);

    // 4. Gráfico Barras Horizontales: Valor Total Neto ($) por Familia
    setHelperTable(sheet, 'AJ1', [
      ['Familia', 'Valor Total ($)'],
      ['Alimentación', '=SUMIF(C16:C1000, "*ALI*", H16:H1000)'],
      ['Gineco-Obstetricia', '=SUMIF(C16:C1000, "*GOB*", H16:H1000)'],
      ['Equipos Médicos', '=SUMIF(C16:C1000, "*EQM*", H16:H1000)'],
      ['Tránsito', '=SUMIF(C16:C1000, "*BOT*", H16:H1000)'],
      ['Otros', '=MAX(0, SUM(H16:H1000)-SUM(AK2:AK5))']
    ]);
  } else if (title === SHEET_NAMES.KARDEX) {
    // 1. Gráfico Torta: Movimientos por Tipo (Transacciones)
    setHelperTable(sheet, 'AA1', [
      ['Tipo Movimiento', 'Registros'],
      ['Entradas', '=COUNTIF(H16:H1000, ">0")'],
      ['Salidas', '=COUNTIF(I16:I1000, ">0")'],
      ['Otros', '=MAX(0, COUNTA(A16:A1000)-SUM(AB2:AB3))']
    ]);

    // 2. Gráfico Dona: Flujo de Unidades Físicas (Entradas vs Salidas)
    setHelperTable(sheet, 'AD1', [
      ['Flujo Unidades', 'Unidades'],
      ['Total Entradas', '=SUM(H16:H1000)'],
      ['Total Salidas', '=SUM(I16:I1000)']
    ]);

    // 3. Gráfico Columnas: Balance Kardex
    setHelperTable(sheet, 'AG1', [
      ['Balance Kardex', 'Cantidad'],
      ['Entradas', '=SUM(H16:H1000)'],
      ['Salidas', '=SUM(I16:I1000)'],
      ['Saldo Kardex', '=SUM(H16:H1000)-SUM(I16:I1000)']
    ]);

    // 4. Gráfico Barras Horizontales: Despachos por Servicio / Unidad
    setHelperTable(sheet, 'AJ1', [
      ['Servicio / Unidad', 'Despachos'],
      ['Urgencia', '=COUNTIF(K16:K1000, "*Urgencia*")'],
      ['Pabellón', '=COUNTIF(K16:K1000, "*Pabellón*")'],
      ['Medicina', '=COUNTIF(K16:K1000, "*Medicina*")'],
      ['Otros Servicios', '=MAX(0, COUNTIF(I16:I1000, ">0")-SUM(AK2:AK4))']
    ]);
  } else if (title === SHEET_NAMES.DESPACHO) {
    // 1. Gráfico Torta: Insumos por Familia
    setHelperTable(sheet, 'AA1', [
      ['Familia', 'Insumos'],
      ['Alimentación', '=COUNTIF(D16:D1000, "*ALI*")'],
      ['Gineco-Obstetricia', '=COUNTIF(D16:D1000, "*GOB*")'],
      ['Equipos Médicos', '=COUNTIF(D16:D1000, "*EQM*")'],
      ['Tránsito', '=COUNTIF(D16:D1000, "*BOT*")'],
      ['Otros', '=MAX(0, COUNTA(B16:B1000)-SUM(AB2:AB5))']
    ]);

    // 2. Gráfico Dona: Despacho vs Saldo Disponible
    setHelperTable(sheet, 'AD1', [
      ['Estado Despacho', 'Unidades'],
      ['Despachado', '=SUM(F16:F1000)'],
      ['Saldo Disponible', '=SUM(G16:G1000)']
    ]);

    // 3. Gráfico Columnas: Flujo de Tránsito
    setHelperTable(sheet, 'AG1', [
      ['Flujo Insumos', 'Total'],
      ['Ingreso Total', '=SUM(E16:E1000)'],
      ['Despachado', '=SUM(F16:F1000)'],
      ['Saldo Bodega', '=SUM(G16:G1000)']
    ]);

    // 4. Gráfico Barras Horizontales: Insumos por Área Destino
    setHelperTable(sheet, 'AJ1', [
      ['Área Destino', 'Insumos'],
      ['Distribución Interna', '=COUNTIF(K16:K1000, "*Distribución*") + COUNTIF(K16:K1000, "*Dist*")'],
      ['Mantención HAH', '=COUNTIF(K16:K1000, "*Mantención*")'],
      ['Servicios Clínicos', '=COUNTIF(K16:K1000, "*Pabellón*") + COUNTIF(K16:K1000, "*Urgencia*")'],
      ['Otros Destinos', '=MAX(0, COUNTA(B16:B1000)-SUM(AK2:AK4))']
    ]);
  } else if (title === SHEET_NAMES.EQUIPOS) {
    // 1. Gráfico Torta: Frecuencia de Mantenimiento Preventivo
    setHelperTable(sheet, 'AA1', [
      ['Mantenimiento', 'Equipos'],
      ['Semestral', '=COUNTIF(K16:K1000, "*Semestral*") + COUNTIF(K16:K1000, "*SEMESTRAL*")'],
      ['Anual', '=COUNTIF(K16:K1000, "*Anual*") + COUNTIF(K16:K1000, "*ANUAL*")'],
      ['Otros / Vigente', '=MAX(0, COUNTA(A16:A1000)-SUM(AB2:AB3))']
    ]);

    // 2. Gráfico Dona: Estado Operativo
    setHelperTable(sheet, 'AD1', [
      ['Estado', 'Cantidad'],
      ['Operativo', '=COUNTIF(L16:L1000, "*Operativo*") + COUNTIF(L16:L1000, "*OPERATIVO*")'],
      ['En Mantención', '=COUNTIF(L16:L1000, "*Mantención*") + COUNTIF(L16:L1000, "*MANTENCION*")'],
      ['Baja', '=COUNTIF(L16:L1000, "*Baja*")']
    ]);

    // 3. Gráfico Columnas: Equipos por Servicio Clínico Destino
    setHelperTable(sheet, 'AG1', [
      ['Servicio Destino', 'Equipos'],
      ['UPC Adulto / Pabellón', '=COUNTIF(I16:I1000, "*UPC*") + COUNTIF(I16:I1000, "*Pabellón*")'],
      ['Mantención / Operaciones', '=COUNTIF(I16:I1000, "*Mantención*") + COUNTIF(I16:I1000, "*Operaciones*")'],
      ['Otros Servicios', '=MAX(0, COUNTA(A16:A1000)-SUM(AH2:AH3))']
    ]);

    // 4. Gráfico Barras Horizontales: Inversión / Costo Total por Área ($)
    setHelperTable(sheet, 'AJ1', [
      ['Área Destino', 'Costo Total ($)'],
      ['UPC / Pabellón', '=SUMIF(I16:I1000, "*UPC*", N16:N1000) + SUMIF(I16:I1000, "*Pabellón*", N16:N1000)'],
      ['Mantención HAH', '=SUMIF(I16:I1000, "*Mantención*", N16:N1000)'],
      ['Otros Servicios', '=MAX(0, SUM(N16:N1000)-SUM(AK2:AK3))']
    ]);
  } else if (title === SHEET_NAMES.HERRAMIENTAS) {
    // 1. Gráfico Torta: Herramientas por Servicio Destino
    setHelperTable(sheet, 'AA1', [
      ['Servicio Destino', 'Herramientas'],
      ['Mantención HAH', '=COUNTIF(E16:E1000, "*Mantención*")'],
      ['Bodega / Operaciones', '=COUNTIF(E16:E1000, "*Bodega*") + COUNTIF(E16:E1000, "*Operaciones*")'],
      ['Otros Servicios', '=MAX(0, COUNTA(A16:A1000)-SUM(AB2:AB3))']
    ]);

    // 2. Gráfico Dona: Documentación Adjunta
    setHelperTable(sheet, 'AD1', [
      ['Documento Adjunto', 'Herramientas'],
      ['Con Archivo Adjunto', '=COUNTIF(L16:L1000, "*Archivo*") + COUNTIF(L16:L1000, "*Adjunto*")'],
      ['Sin Adjunto', '=MAX(0, COUNTA(A16:A1000)-AE2)']
    ]);

    // 3. Gráfico Columnas: Cantidad de Unidades Físicas
    setHelperTable(sheet, 'AG1', [
      ['Unidades Físicas', 'Cantidad'],
      ['Total Unidades', '=SUM(D16:D1000)'],
      ['En Mantención', '=SUMIF(E16:E1000, "*Mantención*", D16:D1000)'],
      ['Otros Destinos', '=MAX(0, SUM(D16:D1000)-AH3)']
    ]);

    // 4. Gráfico Barras Horizontales: Inversión por Área ($) - 4 filas garantizadas
    setHelperTable(sheet, 'AJ1', [
      ['Área Destino', 'Costo Total ($)'],
      ['Mantención HAH', '=SUMIF(E16:E1000, "*Mantención*", K16:K1000)'],
      ['Bodega / Operaciones', '=SUMIF(E16:E1000, "*Bodega*", K16:K1000) + SUMIF(E16:E1000, "*Operaciones*", K16:K1000)'],
      ['Otros Destinos', '=MAX(0, SUM(K16:K1000)-SUM(AK2:AK3))']
    ]);
  } else {
    // Trazabilidad Equipos Menores
    // 1. Gráfico Torta: Equipos Menores por Servicio
    setHelperTable(sheet, 'AA1', [
      ['Servicio Destino', 'Eq. Menores'],
      ['Mantención HAH', '=COUNTIF(I16:I1000, "*Mantención*")'],
      ['Servicios Clínicos', '=COUNTIF(I16:I1000, "*UCI*") + COUNTIF(I16:I1000, "*Pabellón*")'],
      ['Otros Destinos', '=MAX(0, COUNTA(A16:A1000)-SUM(AB2:AB3))']
    ]);

    // 2. Gráfico Dona: Documentación Oficial
    setHelperTable(sheet, 'AD1', [
      ['Documento Adjunto', 'Registros'],
      ['Con Archivo Adjunto', '=COUNTIF(P16:P1000, "*Archivo*") + COUNTIF(P16:P1000, "*Adjunto*")'],
      ['Sin Adjunto', '=MAX(0, COUNTA(A16:A1000)-AE2)']
    ]);

    // 3. Gráfico Columnas: Unidades Físicas
    setHelperTable(sheet, 'AG1', [
      ['Unidades Físicas', 'Cantidad'],
      ['Total Unidades', '=SUM(H16:H1000)'],
      ['En Mantención', '=SUMIF(I16:I1000, "*Mantención*", H16:H1000)'],
      ['Otros Destinos', '=MAX(0, SUM(H16:H1000)-AH3)']
    ]);

    // 4. Gráfico Barras Horizontales: Costo Total por Área ($) - 4 filas garantizadas
    setHelperTable(sheet, 'AJ1', [
      ['Área Destino', 'Costo Total ($)'],
      ['Mantención HAH', '=SUMIF(I16:I1000, "*Mantención*", O16:O1000)'],
      ['Servicios Clínicos', '=SUMIF(I16:I1000, "*UCI*", O16:O1000) + SUMIF(I16:I1000, "*Pabellón*", O16:O1000)'],
      ['Otros Destinos', '=MAX(0, SUM(O16:O1000)-SUM(AK2:AK3))']
    ]);
  }
}

function createDashboardCharts(sheet, title) {
  try {
    setupHelperTables(sheet, title);
  } catch (errHelper) {
    Logger.log('Aviso en setupHelperTables: ' + errHelper);
  }

  var chart1Title = 'Distribución por Familia';
  var chart2Title = 'Estado del Inventario';
  var chart3Title = 'Stock Físico por Familia';
  var chart4Title = 'Valor Total ($) por Familia';

  var range1 = 'AA1:AB6';
  var range2 = 'AD1:AE4';
  var range3 = 'AG1:AH6';
  var range4 = 'AJ1:AK6';

  if (title === SHEET_NAMES.KARDEX) {
    chart1Title = 'Movimientos por Tipo';
    chart2Title = 'Flujo Entradas vs Salidas';
    chart3Title = 'Balance General Kardex';
    chart4Title = 'Despachos por Servicio';
    range1 = 'AA1:AB4';
    range2 = 'AD1:AE3';
    range3 = 'AG1:AH4';
    range4 = 'AJ1:AK5';
  } else if (title === SHEET_NAMES.DESPACHO) {
    chart1Title = 'Insumos por Familia';
    chart2Title = 'Despacho vs Saldo';
    chart3Title = 'Flujo de Tránsito';
    chart4Title = 'Insumos por Área Destino';
    range1 = 'AA1:AB6';
    range2 = 'AD1:AE3';
    range3 = 'AG1:AH4';
    range4 = 'AJ1:AK5';
  } else if (title === SHEET_NAMES.EQUIPOS) {
    chart1Title = 'Frecuencia Mantención';
    chart2Title = 'Estado Operativo';
    chart3Title = 'Equipos por Servicio';
    chart4Title = 'Inversión por Área ($)';
    range1 = 'AA1:AB4';
    range2 = 'AD1:AE4';
    range3 = 'AG1:AH4';
    range4 = 'AJ1:AK4';
  } else if (title === SHEET_NAMES.HERRAMIENTAS) {
    chart1Title = 'Herramientas por Servicio';
    chart2Title = 'Documentación Adjunta';
    chart3Title = 'Unidades Físicas';
    chart4Title = 'Inversión por Área ($)';
    range1 = 'AA1:AB4';
    range2 = 'AD1:AE3';
    range3 = 'AG1:AH4';
    range4 = 'AJ1:AK4';
  } else if (title === SHEET_NAMES.EQUIPOS_MENORES) {
    chart1Title = 'Servicio Destino';
    chart2Title = 'Documento Adjunto';
    chart3Title = 'Unidades Físicas';
    chart4Title = 'Costo Total por Área ($)';
    range1 = 'AA1:AB4';
    range2 = 'AD1:AE3';
    range3 = 'AG1:AH4';
    range4 = 'AJ1:AK4';
  }

  // 1. Limpiar gráficos anteriores para evitar acumulaciones o superposiciones
  try {
    var existingCharts = sheet.getCharts();
    for (var i = 0; i < existingCharts.length; i++) {
      sheet.removeChart(existingCharts[i]);
    }
  } catch (cleanErr) {}

  // 2. Medidas unificadas y establecidas de los 4 gráficos:
  // Ancho uniforme de 230px (235px para barras) y altura de 185px (calce exacto con filas 4 a 13)
  var chartWidth = 230;
  var chartHeight = 185;

  // 3. Posiciones X inamovibles ancladas a la Columna 1 (Columna A):
  // La tarjeta KPI 'TOTAL' ocupa las Columnas A y B (0 a 250px)
  // Espacio 1: 15px -> Gráfico 1 X = 265px
  // Espacio 2: 15px -> Gráfico 2 X = 510px
  // Espacio 3: 15px -> Gráfico 3 X = 755px
  // Espacio 4: 15px -> Gráfico 4 X = 1000px
  // Al anclar todos los gráficos a la Columna 1 con offset en píxeles fijos,
  // cuando el usuario alinea o ajusta las columnas de datos (C, D, E, F...), los gráficos NUNCA se mueven.
  var topY = 6;
  var xG1 = 265;
  var xG2 = 510;
  var xG3 = 755;
  var xG4 = 1000;

  // Gráfico 1: Torta 3D (Pie Chart) - Posición (4, 1, 265, 6)
  try {
    var pieChart = sheet.newChart()
      .asPieChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(sheet.getRange(range1))
      .setTitle(chart1Title)
      .setPosition(4, 1, xG1, topY)
      .setOption('width', chartWidth)
      .setOption('height', chartHeight)
      .setOption('is3D', true)
      .setOption('pieSliceText', 'value')
      .setOption('colors', ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2'])
      .setOption('legend', { position: 'bottom', textStyle: { fontSize: 8.5 } })
      .setOption('backgroundColor', '#f4fbf5')
      .build();
    sheet.insertChart(pieChart);
  } catch (err1) {}

  // Gráfico 2: Dona 3D (Donut Chart) - Posición (4, 1, 510, 6)
  try {
    var donutChart = sheet.newChart()
      .asPieChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(sheet.getRange(range2))
      .setTitle(chart2Title)
      .setPosition(4, 1, xG2, topY)
      .setOption('width', chartWidth)
      .setOption('height', chartHeight)
      .setOption('pieHole', 0.45)
      .setOption('pieSliceText', 'value')
      .setOption('colors', ['#2d6a4f', '#dc2626', '#f59e0b', '#3b82f6'])
      .setOption('legend', { position: 'bottom', textStyle: { fontSize: 8.5 } })
      .setOption('backgroundColor', '#f4fbf5')
      .build();
    sheet.insertChart(donutChart);
  } catch (err2) {}

  // Gráfico 3: Columnas Verticales (Column Chart) - Posición (4, 1, 755, 6)
  try {
    var colChart = sheet.newChart()
      .asColumnChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(sheet.getRange(range3))
      .setTitle(chart3Title)
      .setPosition(4, 1, xG3, topY)
      .setOption('width', chartWidth)
      .setOption('height', chartHeight)
      .setOption('colors', ['#2d6a4f'])
      .setOption('legend', { position: 'none' })
      .setOption('backgroundColor', '#f4fbf5')
      .setOption('vAxis', { textStyle: { fontSize: 8 } })
      .setOption('hAxis', { textStyle: { fontSize: 8 } })
      .build();
    sheet.insertChart(colChart);
  } catch (err3) {}

  // Gráfico 4: Barras Horizontales (Bar Chart) - Posición (4, 1, 1000, 6)
  try {
    var barChart = sheet.newChart()
      .asBarChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(sheet.getRange(range4))
      .setTitle(chart4Title)
      .setPosition(4, 1, xG4, topY)
      .setOption('width', chartWidth + 5)
      .setOption('height', chartHeight)
      .setOption('colors', ['#40916c'])
      .setOption('legend', { position: 'none' })
      .setOption('backgroundColor', '#f4fbf5')
      .setOption('vAxis', { textStyle: { fontSize: 8 } })
      .setOption('hAxis', { textStyle: { fontSize: 8 } })
      .build();
    sheet.insertChart(barChart);
  } catch (err4) {}
}

function replaceSheetData(sheet, headers, rows) {
  var title = sheet.getName();
  sheet.clear();
  try {
    formatSheetTracker(sheet, title, headers);
  } catch (errFmt) {
    Logger.log('Aviso al formatear tracker: ' + errFmt);
  }

  if (rows && rows.length > 0) {
    var targetCols = headers.length;
    var normalizedRows = rows.map(function(r) {
      if (!Array.isArray(r)) return new Array(targetCols).fill('');
      if (r.length === targetCols) return r;
      if (r.length > targetCols) return r.slice(0, targetCols);
      var copy = r.slice();
      while (copy.length < targetCols) copy.push('');
      return copy;
    });

    var range = sheet.getRange(16, 1, normalizedRows.length, targetCols);
    range.setValues(normalizedRows);
    range.setFontFamily('Roboto').setFontSize(9.5).setVerticalAlignment('middle');
    range.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }
}

function formatCurrencyColumn(sheet, colIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 15) {
    sheet.getRange(16, colIndex, lastRow - 15, 1).setNumberFormat('"$"#,##0');
  }
}

function recalcularSaldosYValores() {
  var sheetInv = getOrCreateSheet(SHEET_NAMES.INVENTARIO);
  var sheetKardex = getOrCreateSheet(SHEET_NAMES.KARDEX);

  var lastInvRow = sheetInv.getLastRow();
  var lastKardexRow = sheetKardex.getLastRow();

  if (lastInvRow < 16) return;

  var invData = sheetInv.getRange(16, 1, lastInvRow - 15, 9).getValues();
  var kardexData = lastKardexRow > 15 ? sheetKardex.getRange(16, 1, lastKardexRow - 15, 11).getValues() : [];

  for (var i = 0; i < invData.length; i++) {
    var codigo = String(invData[i][0]).trim();
    if (!codigo) continue;

    var totalEntradas = 0;
    var totalSalidas = 0;

    for (var k = 0; k < kardexData.length; k++) {
      var kardexCod = String(kardexData[k][2]).trim();
      if (kardexCod === codigo) {
        totalEntradas += Number(kardexData[k][7] || 0);
        totalSalidas += Number(kardexData[k][8] || 0);
      }
    }

    var stockCalculado = totalEntradas - totalSalidas;
    var stockMin = Number(invData[i][5] || 0);
    var valorUnitario = Number(invData[i][6] || 0);
    var valorTotal = stockCalculado * valorUnitario;

    var estado = stockCalculado <= 0 ? 'AGOTADO' : (stockCalculado <= stockMin ? 'CRÍTICO' : 'NORMAL');

    invData[i][4] = stockCalculado;
    invData[i][7] = valorTotal;
    invData[i][8] = estado;
  }

  sheetInv.getRange(16, 1, invData.length, 9).setValues(invData);
}

function obtenerAlertasStockCritico() {
  var sheetInv = getOrCreateSheet(SHEET_NAMES.INVENTARIO);
  var lastRow = sheetInv.getLastRow();
  if (lastRow < 16) return [];

  var data = sheetInv.getRange(16, 1, lastRow - 15, 9).getValues();
  var alertas = [];

  for (var i = 0; i < data.length; i++) {
    var stock = Number(data[i][4] || 0);
    var stockMin = Number(data[i][5] || 0);
    if (stock <= stockMin) {
      alertas.push({
        codigo: data[i][0],
        desc: data[i][1],
        stock: stock,
        stockMin: stockMin,
        estado: stock <= 0 ? 'AGOTADO' : 'CRÍTICO'
      });
    }
  }
  return alertas;
}

function getSheetDataAsJson(sheetName) {
  var sheet = getOrCreateSheet(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 16 || lastCol < 1) return [];

  var headers = sheet.getRange(15, 1, 1, lastCol).getValues()[0];
  var rows = sheet.getRange(16, 1, lastRow - 15, lastCol).getValues();

  return rows.map(function(row) {
    var item = {};
    headers.forEach(function(h, idx) {
      var val = row[idx];
      if (val instanceof Date) {
        val = formatDateChile(val);
      }
      item[h] = val;
    });
    return item;
  });
}

function saveFullAppStateSnapshot(data) {
  try {
    var ss = getAppSpreadsheet();
    if (!ss) return;
    var syncSheet = ss.getSheetByName('_DB_SYNC_HAH');
    if (!syncSheet) {
      syncSheet = ss.insertSheet('_DB_SYNC_HAH');
      syncSheet.hideSheet();
    }
    syncSheet.clear();
    var jsonStr = JSON.stringify({
      productos: data.productos || [],
      kardex: data.kardex || [],
      actas: data.actas || [],
      sinCostoList: data.sinCostoList || [],
      equipos: data.equipos || [],
      herramientas: data.herramientas || [],
      equiposMenores: data.equiposMenores || [],
      familias: data.familias || [],
      updatedAt: new Date().toISOString()
    });
    // Dividir en bloques de 40.000 caracteres por celda para superar el límite de 50.000 caracteres por celda de Google Sheets
    var chunkSize = 40000;
    var chunks = [];
    for (var i = 0; i < jsonStr.length; i += chunkSize) {
      chunks.push([jsonStr.substring(i, i + chunkSize)]);
    }
    if (chunks.length > 0) {
      syncSheet.getRange(1, 1, chunks.length, 1).setValues(chunks);
    }
  } catch (e) {
    Logger.log('Error guardando snapshot: ' + e);
  }
}

function getFullAppStateSnapshot() {
  try {
    var ss = getAppSpreadsheet();
    if (!ss) return null;
    var syncSheet = ss.getSheetByName('_DB_SYNC_HAH');
    if (!syncSheet) return null;
    var lastRow = syncSheet.getLastRow();
    if (lastRow < 1) return null;
    var values = syncSheet.getRange(1, 1, lastRow, 1).getValues();
    var fullJson = values.map(function(r) { return r[0]; }).join('');
    if (!fullJson) return null;
    return JSON.parse(fullJson);
  } catch (e) {
    return null;
  }
}

function getOrCreateSheet(sheetName) {
  var ss = getAppSpreadsheet();
  if (!ss) {
    throw new Error('Google Apps Script no tiene permisos para acceder a la planilla de cálculo. Solución: Ve a Extensiones > Apps Script > Implementar > Administrar implementaciones > ✏️ Editar > Ejecutar como: "Yo" > Nueva versión > Implementar.');
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function ensureSheetsExist() {
  Object.keys(SHEET_COLUMNS).forEach(function(title) {
    getOrCreateSheet(title);
  });
}

function formatDateChile(val) {
  if (!val) return '';
  try {
    var d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    var dia = ('0' + d.getDate()).slice(-2);
    var mes = ('0' + (d.getMonth() + 1)).slice(-2);
    var anio = d.getFullYear();
    return dia + '/' + mes + '/' + anio;
  } catch (e) {
    return String(val);
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
