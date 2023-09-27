const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

var allowedOrigins = ['http://localhost:8080',
    'https://score.sanweb.info',
    'https://sanweb.info/'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
            //return callback(new Error(msg), false);
             return callback((msg));
        }
        return callback(null, true);
    }
}));

const home = require('./routes/home');
const live = require('./routes/live');
const score = require('./routes/score');
const ttimg = require('./routes/ttimg');
const ytdl = require('./routes/ytdl');

app.use('/', home);
app.use('/live', live);
app.use('/score', score);
app.use('/api', ttimg);
app.use('/ytdl', ytdl);
app.use('/tmp', express.static('tmp'));

app.disable("x-powered-by");

app.use('/', function(req, res) {
    res.status(404).json({
        error: 1,
        message: 'Data not Found'
    });
})

app.listen(port, function() {
    console.log('listening on port ' + port);
});
