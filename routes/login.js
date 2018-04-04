var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;

var app = express();

// importar schema de usuario
var Usuario = require('../models/usuario');
const { OAuth2Client } = require('google-auth-library');


// var GoogleAuth = require('google-auth-library');
// var auth = new GoogleAuth;

const GOOGLE_CLIENT_ID = require('../config/config').GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = require('../config/config').GOOGLE_SECRET;

// ========================================
// Autenticación con google
// ========================================
app.post('/google', (req, res, next) => {

    var token = req.body.token;
    const oAuth2Client = new OAuth2Client(
        GOOGLE_CLIENT_ID,
        GOOGLE_SECRET
    );
    const tiket = oAuth2Client.verifyIdToken({
        idToken: token
            //audience: GOOGLE_CLIENT_ID
    });
    tiket.then(data => {

        Usuario.findOne({ email: data.payload.email }, (err, usuario) => {

            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar usuario - login',
                    errors: err
                });
            }

            if (usuario) {
                if (usuario.google === false) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: 'Debe usar autenticación normal'
                    });
                } else {
                    //crear un token!!!
                    usuario.password = ':)';

                    var token = jwt.sign({ usuario: usuario }, SEED, { expiresIn: 144000 }); //duracion 4 horas

                    res.status(200).json({
                        ok: true,
                        usuario: usuario,
                        token: token,
                        id: usuario.id
                    });
                }

            } else {
                //si el usuario no existe por correo
                var usuario = new Usuario();

                usuario.nombre = data.payload.name;
                usuario.email = data.payload.email;
                usuario.password = ':)';
                usuario.img = data.payload.picture;
                usuario.google = true;

                usuario.save((err, usuarioDB) => {
                    if (err) {
                        return res.status(500).json({
                            ok: false,
                            mensaje: 'Error al crear usuario - google',
                            errors: err
                        });
                    }

                    var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 144000 }); //duracion 4 horas

                    res.status(200).json({
                        ok: true,
                        usuario: usuarioDB,
                        token: token,
                        id: usuarioDB._id
                    });



                });
            }

        });

    });



});

// ========================================
// Autenticación normal
// ========================================
app.post('/', (req, res) => {

    var body = req.body;

    Usuario.findOne({ email: body.email }, (err, usuarioDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar usuario',
                errors: err
            });
        }

        if (!usuarioDB) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - email',
                errors: err
            });
        }

        if (!bcrypt.compareSync(body.password, usuarioDB.password)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - password',
                errors: err
            });
        }

        //crear un token!!!
        usuarioDB.password = ':)';

        var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 144000 }); //duracion 4 horas

        res.status(200).json({
            ok: true,
            usuario: usuarioDB,
            token: token,
            id: usuarioDB.id
        });


    });





});



module.exports = app;