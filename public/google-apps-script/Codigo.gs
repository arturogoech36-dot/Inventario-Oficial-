/**
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
    'MANT. PREVENTIVO',
    'ESTADO',
    'QUIEN RECIBE',
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
    'QUIEN RECIBE',
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
    .addItem('⚙️ Formatear y Crear las 6 Pestañas', 'menuSetupSpreadsheet')
    .addSeparator()
    .addItem('🔄 Recalcular Stock y Saldos Kardex', 'menuRecalcularSaldos')
    .addItem('🚨 Revisar Alertas de Stock Crítico', 'menuRevisarAlertas')
    .addSeparator()
    .addItem('ℹ️ Ver Estado y URL de API Backend', 'menuVerInformacionApi')
    .addToUi();
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
  if (alertas.length === 0) {
    ui.alert('🟢 Stock Normal', 'No se registran productos en nivel crítico o agotados.', ui.ButtonSet.OK);
  } else {
    var mensaje = 'Se encontraron ' + alertas.length + ' producto(s) en estado crítico:

';
    for (var i = 0; i < Math.min(alertas.length, 10); i++) {
      mensaje += '• ' + alertas[i].codigo + ' - ' + alertas[i].desc + ' (Stock: ' + alertas[i].stock + ' / Mín: ' + alertas[i].stockMin + ')
';
    }
    if (alertas.length > 10) {
      mensaje += '\n... y ' + (alertas.length - 10) + ' más.';
    }
    ui.alert('🚨 Alerta de Inventario', mensaje, ui.ButtonSet.OK);
  }
}

function menuVerInformacionApi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var info = 'Planilla: ' + ss.getName() + '\n' +
             'ID: ' + ss.getId() + '\n\n' +
             'Para conectar con la App Web:\n' +
             '1. Menú "Extensiones" > "Apps Script"\n' +
             '2. Haz clic en el botón azul "Implementar" > "Nueva implementación"\n' +
             '3. Selecciona Tipo: "Aplicación web"\n' +
             '4. Ejecutar como: "Yo" (tu correo)\n' +
             '5. Quién tiene acceso: "Cualquier usuario" (Anyone)\n' +
             '6. Copia la URL generada y pégala en la App Web.';
  ui.alert('ℹ️ Conexión Backend Web App', info, ui.ButtonSet.OK);
}

// =========================================================================================
// API REST - ENDPOINT GET (doGet)
// =========================================================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        status: 'online',
        app: 'Backend Bodega Tránsito HAH',
        version: '2.0.0',
        spreadsheetTitle: ss ? ss.getName() : 'No vinculado',
        spreadsheetId: ss ? ss.getId() : '',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getAll') {
      return jsonResponse({
        success: true,
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
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: 'No se recibieron datos en la solicitud POST.'
      });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

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
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

// =========================================================================================
// CONTROLADORES DE ACCIONES
// =========================================================================================

function handleSyncAll(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

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

  // 2. Registro de Kardex (Productos con valor > 0 y Actas)
  var sheetKardex = getOrCreateSheet(SHEET_NAMES.KARDEX);
  var kardexRows = [];

  if (data.kardex && Array.isArray(data.kardex)) {
    data.kardex.forEach(function(k) {
      var prod = (data.productos || []).find(function(p) { return p.id === k.prodId; });
      var valorUnit = prod ? Number(prod.valor || 0) : 0;
      if (valorUnit > 0) {
        kardexRows.push([
          k.id || '',
          formatDateChile(k.fecha),
          prod ? prod.codigo : (k.codigo || ''),
          prod ? prod.desc : (k.producto || ''),
          k.oc || '',
          k.factura || '',
          k.guia || '',
          Number(k.cant || 0),
          '',
          k.funcionario || k.responsable || 'Bodega Central',
          k.unidad || 'Bodega Central'
        ]);
      }
    });
  }

  if (data.actas && Array.isArray(data.actas)) {
    data.actas.forEach(function(a) {
      if (a.items && Array.isArray(a.items)) {
        a.items.forEach(function(it, idx) {
          var prod = (data.productos || []).find(function(p) { return p.id === it.prodId; });
          var valorUnit = prod ? Number(prod.valor || 0) : Number(it.valor || 0);
          if (valorUnit > 0) {
            kardexRows.push([
              a.id + '-IT' + (idx + 1),
              formatDateChile(a.fecha),
              prod ? prod.codigo : (it.codigo || ''),
              prod ? prod.desc : (it.desc || ''),
              a.numActa ? ('Acta #' + a.numActa) : (a.id || ''),
              '',
              '',
              '',
              Number(it.cant || 0),
              a.recibe || a.funcionario || '',
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
      return [
        item.codigoLocal || item.codigo || item.id || '',
        formatDateChile(item.fecha),
        item.nombreEquipo || item.descripcion || '',
        item.marca || '',
        item.modelo || '',
        item.serie || '',
        item.lote || '',
        cant,
        item.mantPreventivo || 'Semestral',
        item.estado || 'OPERATIVO',
        item.recibe || item.responsable || '',
        vu,
        cant * vu,
        item.observaciones || ''
      ];
    });
    replaceSheetData(sheetEq, SHEET_COLUMNS[SHEET_NAMES.EQUIPOS], eqRows);
    formatCurrencyColumn(sheetEq, 12);
    formatCurrencyColumn(sheetEq, 13);
  }

  // 5. Trazabilidad Herramientas
  if (data.herramientas && Array.isArray(data.herramientas)) {
    var sheetHer = getOrCreateSheet(SHEET_NAMES.HERRAMIENTAS);
    var herRows = data.herramientas.map(function(item) {
      var cant = Number(item.cantidad || 1);
      var vu = Number(item.valorUnitario || 0);
      return [
        item.codigoLocal || item.codigo || item.id || '',
        formatDateChile(item.fecha),
        item.descripcion || item.nombre || '',
        cant,
        item.servicio || item.destino || '',
        item.recibe || item.responsable || '',
        item.oc || '',
        item.factura || '',
        item.guia || '',
        vu,
        cant * vu,
        item.documentoAdjunto ? 'Archivo Adjunto' : 'Sin Adjunto'
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
      return [
        item.codigoLocal || item.codigo || item.id || '',
        formatDateChile(item.fecha),
        item.nombre || item.descripcion || '',
        item.marca || '',
        item.modelo || '',
        item.serie || '',
        item.lote || '',
        cant,
        item.servicio || item.destino || '',
        item.recibe || item.responsable || '',
        item.oc || '',
        item.factura || '',
        item.guia || '',
        vu,
        cant * vu,
        item.documentoAdjunto ? 'Archivo Adjunto' : 'Sin Adjunto'
      ];
    });
    replaceSheetData(sheetEqm, SHEET_COLUMNS[SHEET_NAMES.EQUIPOS_MENORES], eqmRows);
    formatCurrencyColumn(sheetEqm, 14);
    formatCurrencyColumn(sheetEqm, 15);
  }

  return jsonResponse({
    success: true,
    message: 'Sincronización completa de las 6 pestañas ejecutada exitosamente.',
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

  if (tipo === 'herramienta') {
    sheetName = SHEET_NAMES.HERRAMIENTAS;
    row = [
      item.codigoLocal || item.codigo || item.id || '',
      formatDateChile(item.fecha),
      item.descripcion || item.nombre || '',
      cant,
      item.servicio || item.destino || '',
      item.recibe || item.responsable || '',
      item.oc || '',
      item.factura || '',
      item.guia || '',
      vu,
      cant * vu,
      item.documentoAdjunto ? 'Archivo Adjunto' : 'Sin Adjunto'
    ];
  } else if (tipo === 'equipomenor') {
    sheetName = SHEET_NAMES.EQUIPOS_MENORES;
    row = [
      item.codigoLocal || item.codigo || item.id || '',
      formatDateChile(item.fecha),
      item.nombre || item.descripcion || '',
      item.marca || '',
      item.modelo || '',
      item.serie || '',
      item.lote || '',
      cant,
      item.servicio || item.destino || '',
      item.recibe || item.responsable || '',
      item.oc || '',
      item.factura || '',
      item.guia || '',
      vu,
      cant * vu,
      item.documentoAdjunto ? 'Archivo Adjunto' : 'Sin Adjunto'
    ];
  } else {
    sheetName = SHEET_NAMES.EQUIPOS;
    row = [
      item.codigoLocal || item.codigo || item.id || '',
      formatDateChile(item.fecha),
      item.nombreEquipo || item.descripcion || '',
      item.marca || '',
      item.modelo || '',
      item.serie || '',
      item.lote || '',
      cant,
      item.mantPreventivo || 'Semestral',
      item.estado || 'OPERATIVO',
      item.recibe || item.responsable || '',
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

// =========================================================================================
// UTILIDADES DE FORMATO Y ESTRUCTURA
// =========================================================================================

function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SHEET_COLUMNS).forEach(function(title) {
    var columns = SHEET_COLUMNS[title];
    var sheet = getOrCreateSheet(title);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(columns);
    } else {
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    }

    formatHeaderRow(sheet, columns.length);
  });

  try {
    var defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (e) {}
}

function formatHeaderRow(sheet, numColumns) {
  var headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange
    .setBackground('#1e3a8a')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontFamily('Roboto')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.setRowHeight(1, 34);
  sheet.setFrozenRows(1);

  for (var c = 1; c <= numColumns; c++) {
    sheet.autoResizeColumn(c);
    var w = sheet.getColumnWidth(c);
    if (w < 90) sheet.setColumnWidth(c, 90);
    if (w > 260) sheet.setColumnWidth(c, 260);
  }
}

function replaceSheetData(sheet, headers, rows) {
  sheet.clearContents();
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers.length);

  if (rows && rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontFamily('Roboto').setFontSize(9.5).setVerticalAlignment('middle');
    range.setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
  }
}

function formatCurrencyColumn(sheet, colIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, colIndex, lastRow - 1, 1).setNumberFormat('"$"#,##0');
  }
}

function recalcularSaldosYValores() {
  var sheetInv = getOrCreateSheet(SHEET_NAMES.INVENTARIO);
  var sheetKardex = getOrCreateSheet(SHEET_NAMES.KARDEX);

  var lastInvRow = sheetInv.getLastRow();
  var lastKardexRow = sheetKardex.getLastRow();

  if (lastInvRow < 2) return;

  var invData = sheetInv.getRange(2, 1, lastInvRow - 1, 9).getValues();
  var kardexData = lastKardexRow > 1 ? sheetKardex.getRange(2, 1, lastKardexRow - 1, 11).getValues() : [];

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

  sheetInv.getRange(2, 1, invData.length, 9).setValues(invData);
}

function obtenerAlertasStockCritico() {
  var sheetInv = getOrCreateSheet(SHEET_NAMES.INVENTARIO);
  var lastRow = sheetInv.getLastRow();
  if (lastRow < 2) return [];

  var data = sheetInv.getRange(2, 1, lastRow - 1, 9).getValues();
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

  if (lastRow < 2 || lastCol < 1) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

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

function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
