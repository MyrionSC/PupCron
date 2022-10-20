const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');
const {runScript} = require("./helper");

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
app.post('/runscript', async (req, res) => {
    runScript('./static', 'pup_script.js', err => {
        if (err) throw err;
        console.log('finished running pup_script.js');
        res.send({status: true, message: "run finished"})
    });
})
app.post('/savepup', async (req, res) => {
    try {
        if (!req.files) {
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
            let uploadedFile = req.files.file;

            //Use the mv() method to place the file in the upload directory (i.e. "uploads")
            let scriptPath = './static/pup_script.js';
            await uploadedFile.mv(scriptPath);

            res.send({
                status: true,
                message: 'Upload finished',
                data: {
                    filepath: scriptPath,
                    mimetype: uploadedFile.mimetype,
                    size: uploadedFile.size
                }
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
})


//start app
const port = process.env.PORT || 3001;

app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);

