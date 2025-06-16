import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';

let app = express();
let port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));


let dataBase = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'world',
    password: 'password',
    port: 5432,
});

await dataBase.connect().then(() => {
    console.log('Connected to the database');
}).catch(err => {
    console.error('Database connection error:', err.stack);
});

let score = 0;
let flags = [];
let currentFlag = {};
let highscore;

async function nextFlag() {
    if (flags.length === 0) {
        let result = await dataBase.query('SELECT * FROM flags');
        flags = result.rows;
        if (flags.length === 0) return null;
    }
    let randomIndex = Math.floor(Math.random() * flags.length);
    let selectedFlag = flags[randomIndex];
    flags.splice(randomIndex, 1);
    return selectedFlag;
}

app.get('/', async (req, res) => {
    currentFlag = await nextFlag();
    let highscoreResult = await dataBase.query('SELECT score FROM score WHERE id = 1');
    highscore = highscoreResult.rows[0].score;

    res.render('index.ejs', {
        a: currentFlag,
        score: score,
        highscore: highscore
    });
});

app.post('/flaggame', async (req, res) => {
    let userAnswer = req.body.countryCode?.trim().toLowerCase();
    let correctAnswer = currentFlag.name?.trim().toLowerCase();

    if (userAnswer === correctAnswer) {
        score++;
        currentFlag = await nextFlag();
        return res.render('index.ejs', {
            a: currentFlag,
            score: score,
            highscore: highscore
        });
    } else {
        if (score > highscore) {
            highscore = score;
            await dataBase.query('UPDATE score SET score = $1 WHERE id = 1', [score]);
        }
        let finalScore = score;
        score = 0;
        return res.render('gameover.ejs', {
            score: finalScore,
            highscore
        });
    }
});

app.post('/reset-score', async (req, res) => {
    await dataBase.query("UPDATE score SET score=$1 WHERE id=1", [0]);
    res.redirect('/');
})

app.listen(port, () => {
    console.log(` Server is running on http://localhost:${port}`);
});
