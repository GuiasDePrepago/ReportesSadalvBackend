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
    const numerosConfirmacion = [];
    const kilos = [];
    const kilosAdicionales = [];
    const guiaBase = [];
    const cuenta = [];
    const tipoGuia = [];
    const empresa = 'Estafeta';
    const remitente = [];
    const destinatario = [];
    const costoReexpedicion = 110;
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


    numerosConfirmacion.push([...pdfText.matchAll(regexConfirmacion)].toString().replace('-', ''))
    

    remitente.push([...pdfText.matchAll(regexRemitente)].toString());
    destinatario.push([...pdfText.matchAll(regexDestinatario)].toString());
    kilos.push([...pdfText.matchAll(regexKilos)].toString().replace('KG', ''));

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
        if (numeroConfirmacion.slice(13, 14) === '6') {
            tipoGuia.push("Express");
            return
        }

        if (numeroConfirmacion.slice(13, 14) == '7') {
            tipoGuia.push("Terrestre");
            return
        }    
    });

    if (tipoGuia[0] == "Terrestre") {
        if (numerosConfirmacion[0].slice(1, 3).replace('0', '') == '1') {
            guiaBase.push("1");
        } else {
            guiaBase.push(numerosConfirmacion[0].slice(1, 3).replace('0', ''));
        }
    } else {
        guiaBase.push(numerosConfirmacion[0].slice(1, 3).replace('0', ''));
    }


    if (cuentaBancaria == 'LOGISTICA EMPRESARIAL MEGAMENTE (2889)(8892)' || cuentaBancaria == 'REPOSICION' || cuentaBancaria == 'OXXO MEGAMENTE') {
        if (tipoGuia[0] == "Express") {
            if (kilos[0].slice(0, -3) == 1) {
                costoGuia.push('150');
            }
            if (kilos[0].slice(0, -3) > 1 && kilos[0].slice(0, -3) <= 5) {
                costoGuia.push('240');
            }
            if (kilos[0].slice(0, -3) > 5 && kilos[0].slice(0, -3) <= 10) {
                costoGuia.push('350');
            }
            if (kilos[0].slice(0, -3) > 10 && kilos[0].slice(0, -3) <= 15) {
                costoGuia.push('460');
            }
            if (kilos[0].slice(0, -3) > 15 && kilos[0].slice(0, -3) <= 20) {
                costoGuia.push('570');
            }
            if (kilos[0].slice(0, -3) > 20 && kilos[0].slice(0, -3) <= 25) {
                costoGuia.push('685');
            }
            if (kilos[0].slice(0, -3) > 25 && kilos[0].slice(0, -3) <= 30) {
                costoGuia.push('795');
            }
            if (kilos[0].slice(0, -3) > 30 && kilos[0].slice(0, -3) <= 35) {
                costoGuia.push('905');
            }
            if (kilos[0].slice(0, -3) > 35 && kilos[0].slice(0, -3) <= 40) {
                costoGuia.push('1020');
            }
            if (kilos[0].slice(0, -3) > 40 && kilos[0].slice(0, -3) <= 45) {
                costoGuia.push('1125');
            }
            if (kilos[0].slice(0, -3) > 45 && kilos[0].slice(0, -3) <= 50) {
                costoGuia.push('1240');
            }
        }
    
        if (tipoGuia[0] == "Terrestre") {
            if (kilos[0].slice(0, -3) > 0 && kilos[0].slice(0, -3) <= 5) {
                costoGuia.push('150');
            }
            if (kilos[0].slice(0, -3) > 5 && kilos[0].slice(0, -3) <= 10) {
                costoGuia.push('200');
            }
            if (kilos[0].slice(0, -3) > 10 && kilos[0].slice(0, -3) <= 15) {
                costoGuia.push('225');
            }
            if (kilos[0].slice(0, -3) > 15 && kilos[0].slice(0, -3) <= 20) {
                costoGuia.push('250');
            }
            if (kilos[0].slice(0, -3) > 20 && kilos[0].slice(0, -3) <= 25) {
                costoGuia.push('275');
            }
            if (kilos[0].slice(0, -3) > 25 && kilos[0].slice(0, -3) <= 30) {
                costoGuia.push('310');
            }
            if (kilos[0].slice(0, -3) > 30 && kilos[0].slice(0, -3) <= 35) {
                costoGuia.push('350');
            }
            if (kilos[0].slice(0, -3) > 35 && kilos[0].slice(0, -3) <= 40) {
                costoGuia.push('375');
            }
            if (kilos[0].slice(0, -3) > 40 && kilos[0].slice(0, -3) <= 45) {
                costoGuia.push('415');
            }
            if (kilos[0].slice(0, -3) > 45 && kilos[0].slice(0, -3) <= 50) {
                costoGuia.push('455');
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
    
    console.log("no. confirmacion: " + numerosConfirmacion);
    console.log("Kilos: " + kilos);
    console.log("vendedor: " + vendedor)
    console.log("Cuenta: " + cuenta);
    console.log("Nombre de archivo: " + nombreArchivo);
    console.log("fecha de creacion: " + date + " " + hora)
    console.log("fecha de actualizacion: " + date + " " + hora)
    console.log("fecha de vendedor: " + date + " " + hora)
    console.log("id de carga de archivos: " + toString(idCargaArchivos));
    console.log("Tipo de guia: " + tipoGuia);
    console.log("Generador: " + generador);
    console.log("Empresa: " + empresa)
    console.log("Cuenta bancaria: " + cuentaBancaria)
    console.log("Referencia: " + referencia)
    console.log("Monto deposito: " + deposito)
    console.log("Hora: " + hora)
    console.log("Reexpedicion: " + reexpedicion)
    console.log("Facturar: " + factura)
    console.log("Razon social: " + razonSocial)
    console.log("Remitente: " + remitente);
    console.log("guia base: " + guiaBase);
    console.log("Kilos adicionales: " + kilosAdicionales);
    console.log("Comentarios: " + comentarios);
    console.log("Costo Guia: " + costoGuia); 
    console.log("Credito: " + credito)
    console.log("Cliente Credito: " + clienteCredito);
    console.log("Costo Reexpedicion: " + costoReexpedicion);
    console.log("Destinatario: " + destinatario);
    console.log("Cliente Prepago: " + clientePrepago);
    console.log("Credito Estado: " + creditoEstado);
    console.log("Credito monto depositado: " + creditoMontoDepositado);

    const values = [[numerosConfirmacion[0], kilos[0], vendedor, cuenta[0], nombreArchivo, fechaCreacion, 
    fechaCreacion, fechaCreacion, '' + idCargaArchivos, tipoGuia[0], generador, empresa, cuentaBancaria, referencia,
    deposito, hora, reexpedicion, factura, razonSocial, remitente[0], guiaBase[0],'' + kilosAdicionales, comentarios,
    costoGuia[0], credito, clienteCredito, costoReexpedicion, destinatario[0], clientePrepago, creditoMontoDepositado, creditoEstado]]

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
                console.log(err);
            }

            console.log(res);
        }
    );


    res.status(200).send({message: "hi"})

  });

app.listen(8080, () => console.log('API is running on http://localhost:8080'));