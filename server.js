const express = require('express');
const jwt = require("jsonwebtoken");
const cors = require('cors');
const mysql = require('mysql');
const fs = require('fs')
const pdfParse = require('pdf-parse')
const base64 = require('base64topdf');
const util = require('util');
require('dotenv').config();

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(cors());

const db = mysql.createPool({
    host: process.env.DB_HOST,
    database: process.env.DB,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

const getPDF = async (file) => {
    const promiseReadFile = util.promisify(fs.readFile);
    let readFileSync = await promiseReadFile(file)
    try {
        let pdfExtract = await pdfParse(readFileSync)
        return pdfExtract.text;
    } catch (error) {
        throw new Error(error)
    }
}

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    db.query(
        "SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?",
        [username, password],
        (err, result) => {

            if (err) {
                console.log(err);
            } 

            if (result.length > 0) {
                const token = jwt.sign(
                    {
                      userId: username
                    },
                    "RANDOM-TOKEN",
                    { expiresIn: "24h" }
                  );
                res.status(200).send({message: "Login Successful", token});
                console.log('logged')
                
            } else {
                res.status(500).send({message: "No user found"})
            }
            
        }    
    )
  });

  app.post('/subirReporte', async (req, res) => {
    const date = req.body.date;
    const generador = req.body.generador;
    const vendedor = req.body.vendedor;
    const cuentaBancaria = req.body.cuentaBancaria;
    const referencia = req.body.referencia;
    const deposito = req.body.deposito;
    const reexpedicion = req.body.reexpedicion ? "Si" : "No";
    const hora = req.body.hora;
    const factura = req.body.factura ? "Si" : "No";
    const razonSocial = req.body.razonSocial;
    const clienteCredito = req.body.clienteCredito;
    const clientePrepago = req.body.clientePrepago;
    const comentarios = req.body.comentarios;
    const costoGuia = [];
    const encodedPdf = req.body.pdf;
    const nombreArchivo = req.body.fileName
    let numerosConfirmacion = [];
    let kilos = [];
    const kilosAdicionales = [];
    let guiaBase = [];
    const cuenta = [];
    const tipoGuia = [];
    const empresa = 'Estafeta';
    let remitente = [];
    let destinatario = [];
    const costoReexpedicion = [];
    const creditoMontoDepositado = 0.00;
    const fechaCreacion = date + " " + hora;
    
    let idCargaArchivos = ""; 
    let creditoEstado = 'NA';
    let credito = 'No';

    let decodedBase64 = base64.base64Decode(encodedPdf, 'guia.pdf');

    let pdfText = await getPDF('guia.pdf');

    let regexRemitente = /(?<=Vigencia de guía:\s).*[^0-9]/g;
    let regexDestinatario = /(?<=\n[0-9]{4}\s).*/g
    let regexConfirmacion = /\w{10}-\w{12}/g;
    let regexKilos = /.*KG/g;

    try{
        numerosConfirmacion = ([...pdfText.matchAll(regexConfirmacion)].toString().replaceAll('-','').split(','));
    }
    catch (error) {
        console.log(error)
    }
    
    guiaBase = numerosConfirmacion.map(s => s.slice(1, 3).replace('0', ''));

    remitente = ([...pdfText.matchAll(regexRemitente)].toString().split(','));
    destinatario = ([...pdfText.matchAll(regexDestinatario)].toString().split(','));
    kilos = ([...pdfText.matchAll(regexKilos)].toString().replaceAll(' KG', '').split(','));

    numerosConfirmacion.map((numeroConfirmacion) => {
        
        if (numeroConfirmacion.slice(3, 10) === '5892303') {
            cuenta.push("2303 Ventro");
            return
        }

        if (numeroConfirmacion.slice(3, 10) == '5903104') {
            cuenta.push("3104  ICA HDZ");
            return
        }

        if (numeroConfirmacion.slice(3, 10) == '5895108') {
            cuenta.push("5108 PRIVANZA EXP");
            return
        }
        
    });

    numerosConfirmacion.map((numeroConfirmacion) => {
        if (numeroConfirmacion[13] == 7) {
            tipoGuia.push("Terrestre");
            return
        }
        if (numeroConfirmacion[13] == 6) {
            tipoGuia.push("Express");
            return
        } 
    });


    if (cuentaBancaria == 'LOGISTICA EMPRESARIAL MEGAMENTE (2889)(8892)' || cuentaBancaria == 'REPOSICION' || cuentaBancaria == 'OXXO MEGAMENTE') {
        for (let i = 0; i < tipoGuia.length; i++) {
            if (tipoGuia[i] == "Express") {
                if (kilos[i].slice(0, -2) == 1) {
                    costoGuia.push('150');
                    break
                }
                if (kilos[i].slice(0, -2) > 1 && kilos[i].slice(0, -2) <= 5) {
                    costoGuia.push('240');
                    break
                }
                if (kilos[i].slice(0, -2) > 5 && kilos[i].slice(0, -2) <= 10) {
                    costoGuia.push('350');
                    break
                }
                if (kilos[i].slice(0, -2) > 10 && kilos[i].slice(0, -2) <= 15) {
                    costoGuia.push('460');
                    break
                }
                if (kilos[i].slice(0, -2) > 15 && kilos[i].slice(0, -2) <= 20) {
                    costoGuia.push('570');
                    break
                }
                if (kilos[i].slice(0, -2) > 20 && kilos[i].slice(0, -2) <= 25) {
                    costoGuia.push('685');
                    break
                }
                if (kilos[i].slice(0, -2) > 25 && kilos[i].slice(0, -2) <= 30) {
                    costoGuia.push('795');
                    break
                }
                if (kilos[i].slice(0, -2) > 30 && kilos[i].slice(0, -2) <= 35) {
                    costoGuia.push('905');
                    break
                }
                if (kilos[i].slice(0, -2) > 35 && kilos[i].slice(0, -2) <= 40) {
                    costoGuia.push('1020');
                    break
                }
                if (kilos[i].slice(0, -2) > 40 && kilos[i].slice(0, -2) <= 45) {
                    costoGuia.push('1125');
                    break
                }
                if (kilos[i].slice(0, -2) > 45 && kilos[i].slice(0, -2) <= 50) {
                    costoGuia.push('1240');
                    break
                }
            }

            if (tipoGuia[i] == "Terrestre") {
                if (kilos[i].slice(0, -2) > 0 && kilos[i].slice(0, -2) <= 5) {
                    costoGuia.push('150');
                    break
                }
                if (kilos[i].slice(0, -2) > 5 && kilos[i].slice(0, -2) <= 10) {
                    costoGuia.push('200');
                    break
                }
                if (kilos[i].slice(0, -2) > 10 && kilos[i].slice(0, -2) <= 15) {
                    costoGuia.push('225');
                    break
                }
                if (kilos[i].slice(0, -2) > 15 && kilos[i].slice(0, -2) <= 20) {
                    costoGuia.push('250');
                    break
                }
                if (kilos[i].slice(0, -2) > 20 && kilos[i].slice(0, -2) <= 25) {
                    costoGuia.push('275');
                    break
                }
                if (kilos[i].slice(0, -2) > 25 && kilos[i].slice(0, -2) <= 30) {
                    costoGuia.push('310');
                    break
                }
                if (kilos[i].slice(0, -2) > 30 && kilos[i].slice(0, -2) <= 35) {
                    costoGuia.push('350');
                    break
                }
                if (kilos[i].slice(0, -2) > 35 && kilos[i].slice(0, -2) <= 40) {
                    costoGuia.push('375');
                    break
                }
                if (kilos[i].slice(0, -2) > 40 && kilos[i].slice(0, -2) <= 45) {
                    costoGuia.push('415');
                    break
                }
                if (kilos[i].slice(0, -2) > 45 && kilos[i].slice(0, -2) <= 50) {
                    costoGuia.push('455');
                    break
                }
            }
        }   
    }
    

    if (cuentaBancaria == 'CREDITO') {
        credito = 'Si'
        creditoEstado = 'Pendiente'
        const clientes = await new Promise((resolve, reject) => {
            db.query(
                `SELECT * FROM clientes_credito WHERE cliente = ?;`,
                clienteCredito,
                (err, res) => {
                    if (err) {
                        reject(err);
                    }

                    resolve(res);
                }
            );
        })
         
        if (JSON.parse(clientes[0].precio_especial) == '1') {
            if (tipoGuia[0] == "Express") {
                costoGuia.push(JSON.parse(clientes[0].precio).express.find(element => element.id == kilos[0].slice(0, -3)).val)
            }

            if (tipoGuia[0] == "Terrestre") {
                costoGuia.push(JSON.parse(clientes[0].precio).terrestre.find(element => element.id == kilos[0].slice(0, -3)).val)
            } 
        }
    }

    if (cuentaBancaria == 'PREPAGO') {
        const clientes = await new Promise((resolve, reject) => {
            db.query(
                `SELECT * FROM clientes_prepago WHERE cliente = ?;`,
                clientePrepago,
                (err, res) => {
                    if (err) {
                        reject(err);
                    }

                    resolve(res);
                }
            );
        })
         
        if (JSON.parse(clientes[0].precio_especial) == '1') {
            if (tipoGuia[0] == "Express") {
                costoGuia.push(JSON.parse(clientes[0].precio).express.find(element => element.id == kilos[0].slice(0, -3)).val)
            }

            if (tipoGuia[0] == "Terrestre") {
                costoGuia.push(JSON.parse(clientes[0].precio).terrestre.find(element => element.id == kilos[0].slice(0, -3)).val)
            } 
        }
    }

    for (let i=0; i < kilos.length; i++) {
            kilosAdicionales.push(parseInt(kilos[i]) - parseInt(guiaBase[i]));   
    }

    for (let i = 0; i < guiaBase.length; i++) {
        if (tipoGuia[i] == "Terrestre") {
            if (guiaBase[i] == '5') {
                guiaBase[i] = '1';
            }
        }

    }

    fs.unlink('guia.pdf', (err) => {
        if (err) {
            throw err;
        }
    
        console.log("Delete File successfully.");
    });

    const getIdCargaArchivos = await new Promise((resolve, reject) => {
        db.query(
            `SELECT MAX(id_carga_archivos) FROM reporte;`,
            (err, res) => {
                if (err) {
                    reject(err);
                }

                resolve(res);
            }
        );
    })
    idCargaArchivos = Object.values(getIdCargaArchivos[0])[0] + 1;

    const values = [[numerosConfirmacion[0], kilos[0], vendedor, cuenta[0], nombreArchivo, fechaCreacion, 
    fechaCreacion, fechaCreacion, '' + idCargaArchivos, tipoGuia[0], generador, empresa, cuentaBancaria, referencia,
    deposito, hora, reexpedicion, factura, razonSocial, remitente[0], guiaBase[0],'' + kilosAdicionales, comentarios,
    costoGuia[0], credito, clienteCredito, costoReexpedicion, destinatario[0], clientePrepago, creditoMontoDepositado, creditoEstado]]


    res.status(200).send({
        codigo_confirmacion: numerosConfirmacion, 
        kilos: kilos,
        vendedor: vendedor, 
        cuenta: cuenta, 
        nombre_archivo: nombreArchivo, 
        fecha_creacion: fechaCreacion,
        idCargaArchivos: idCargaArchivos,
        tipo_guia: tipoGuia, 
        generador: generador, 
        empresa: empresa, 
        cuenta_bancaria: cuentaBancaria, 
        referencia: referencia, 
        monto_deposito: deposito, 
        reexpedicion: reexpedicion, 
        facturar: factura,
        razon_social: razonSocial, 
        remitente: remitente, 
        guia_base: guiaBase, 
        kilos_adicionales: kilosAdicionales, 
        comentarios: comentarios, 
        costo_guia: costoGuia, 
        credito: credito,
        cliente_credito: clienteCredito, 
        costo_reexpedicion: costoReexpedicion, 
        destinatario: destinatario, 
        cliente_prepago: clientePrepago, 
        credito_monto_depositado: creditoMontoDepositado, 
        credito_estado: creditoEstado })

  });



  app.post('/confirmReporte', async (req, res) => {
        const codigo_confirmacion = req.body.codigo_confirmacion; 
        const kilos = req.body.kilos;
        const vendedor = req.body.vendedor; 
        const cuenta = req.body.cuenta; 
        const nombre_archivo = req.body.nombre_archivo; 
        const fecha_creacion = req.body.fecha_creacion;
        const idCargaArchivos = req.body.idCargaArchivos;
        const tipo_guia = req.body.tipo_guia; 
        const generador = req.body.generador; 
        const empresa = req.body.empresa; 
        const cuenta_bancaria = req.body.cuenta_bancaria; 
        const referencia = req.body.referencia; 
        const monto_deposito = req.body.monto_deposito; 
        const reexpedicion = req.body.reexpedicion; 
        const factura = req.body.factura;
        const razon_social = req.body.razon_social; 
        const remitente = req.body.remitente; 
        const guia_base = req.body.guia_base; 
        const kilos_adicionales = req.body.kilos_adicionales; 
        const comentarios = req.body.comentarios; 
        const costo_guia = req.body.costo_guia; 
        const credito = req.body.credito;
        const cliente_credito = req.body.cliente_credito; 
        const costo_reexpedicion = req.body.costo_reexpedicion; 
        const destinatario = req.body.destinatario; 
        const cliente_prepago = req.body.cliente_prepago; 
        const credito_monto_depositado = req.body.credito_monto_depositado; 
        const credito_estado = req.body.credito_estado;
        console.log(costo_reexpedicion)

        try {
            for (let i = 0; i < codigo_confirmacion.length; i++) {
    
                const values = [[codigo_confirmacion[i], kilos[i], vendedor, cuenta[i], nombre_archivo, fecha_creacion, 
                    fecha_creacion, fecha_creacion, '' + idCargaArchivos, tipo_guia[i], generador, empresa, cuenta_bancaria, referencia,
                    monto_deposito, '0:00', reexpedicion[i]? 'Si':'No', factura, razon_social, remitente[i], guia_base[i],kilos_adicionales[i], comentarios,
                    costo_guia[i], credito, cliente_credito, (reexpedicion[i] == false)? '0.00' : costo_reexpedicion[i], destinatario[i], cliente_prepago, credito_monto_depositado, credito_estado]]
            
                db.query(
                    `INSERT INTO reporte 
                    (codigo_confirmacion, kilos, vendedor, cuenta, nombre_archivo, fecha_creacion,
                    fecha_actualizacion, fecha_vendedor, id_carga_archivos, tipo_guia, generador, 
                    empresa, cuenta_bancaria, referencia, monto_deposito, hora, reexpedicion, facturar,
                    razon_social, remitente, guia_base, kilos_adicionales, comentarios, costo_guia, credito,
                    cliente_credito, costo_reexpedicion, destinatario, cliente_prepago, credito_monto_depositado, credito_estado ) VALUES ?`,
                    [values],
                    (err, res) => {
                        if (err) {
                            throw(err);
                        }
        
                        console.log('enviado con exito');
                    }
                );
                
    
            }
            
            
            res.status(200).send({
                message: 'exito'
                
            });
        } 

        catch {
            console.log(error)
        }

  })

app.listen(8080, () => console.log('API is running on http://localhost:8080'));