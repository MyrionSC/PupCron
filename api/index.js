require("express-async-errors");
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');
const {runScript, toDirCompat, resWithStatusMessage} = require("./helper");
const fs = require('fs');

const app = express();

// enable files upload
app.use(fileUpload({
    createParentPath: true
}));

//add other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use('/static', express.static('static'))


// routes
app.post('/testpost', async (req, res) => {
    console.log(req.body);
    res.send(req.body)
})

app.post('/runscript', async (req, res, next) => {
    if (!req.body.script)
        return resWithStatusMessage(res, 400, "required body prop 'script' should be name of script to run")
    const scriptName = req.query.script

    // create new run dir
    const timeISO = new Date().toISOString()
        .replace('T', '_')
        .replace(':', '-')
        .substring(0, 19)

    await fs.promises.copyFile(`static/uploaded_scripts/${scriptName}/pup_scripts.js`,
        `static/uploaded_scripts/${scriptName}/runs/${timeISO}/pup_scripts.js`)


    // runScript('./static', 'pup_script.js', err => {
    //     if (err) throw err;
    //     console.log('finished running pup_script.js');
    //     res.send({success: true, message: "run finished"})
    // });
    res.send({test: "lalal", params: req.query})
})

app.post('/uploadscript', async (req, res) => {
    try {
        if (!req.files) {
            res.send({
                success: false,
                message: 'No file uploaded'
            });
        } else {
            let uploadedFile = req.files.file; // file field must be named 'file'

            const timeISO = new Date().toISOString()
                .replace('T', '_')
                .replace(':', '-')
                .substring(0, 16)

            let scriptPath = `./static/uploaded_scripts/${timeISO}_${toDirCompat(uploadedFile.name)}/pup_script.js`;
            await uploadedFile.mv(scriptPath);

            let resObj = {
                success: true,
                message: 'Upload finished',
                data: {
                    filepath: scriptPath,
                    mimetype: uploadedFile.mimetype,
                    size: uploadedFile.size
                }
            };
            console.log(resObj)
            res.send(resObj);
        }
    } catch (err) {
        res.status(500).send(err);
    }
})

// === Error handling (must be after routes)
app.use((err, req, res, next) => {
    console.error(err)
    return resWithStatusMessage(res, 500, err.message)
});

//start app
const port = process.env.PORT || 3001;

app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);
