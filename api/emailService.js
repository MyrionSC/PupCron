const nodemailer = require('nodemailer');
const fs = require("fs");

async function sendMail(mailTo, subject, text) {
    const secretBytes = await fs.promises.readFile("apisecrets.json")
    const secrets = JSON.parse(secretBytes.toString())

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'marpht23@gmail.com',
            pass: secrets.pass
        }
    });
    const mailOptions = {
        from: 'Cronpup@marand.dk',
        to: mailTo,
        subject: subject,
        text: text
    };
    await transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

// sendMail("marpht23@gmail.com", "some subject", "body")

module.exports = {
    sendMail: sendMail
}
