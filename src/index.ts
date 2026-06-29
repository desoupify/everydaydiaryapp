import express, { type Application, type Request, type Response } from "express";
import ejs, { render } from 'ejs';
import {marked} from 'marked';
import Database from 'better-sqlite3';
import { Statement } from "sqlite";
import {today, getLocalTimeZone, CalendarDate} from '@internationalized/date';
import fs from 'fs';
import * as calendar from './calendar.ts'; //ignore error
import bcrypt, { hashSync } from 'bcryptjs';
// import cookies from 'cookies';
// import jwt from 'jsonwebtoken';

const saltRounds = 10;

const app:Application = express(),
      port = 8080,
      print = console.log

app.set('view engine', 'ejs')
app.use(express.static('static'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new Database('./database/diary.sqlite')

db.pragma('journal_mode = WAL');

let todayDate = today(getLocalTimeZone());
let selectedDate = todayDate;
let currentUser:unknown = -1;
let currentUsername:unknown = "";

var renderParams = {
    hasLogin : false,
    month: calendar.getMonth(selectedDate),
    day: selectedDate.day,
    year: selectedDate.year,
    daysString: calendar.makeCalendarDays(selectedDate),
    entry: '',
    currentUsername: currentUsername,

    css: "main.css",
    theme: 'default'
}

interface userRow {
    name: string;
    id: number;
    hash: string;
}

makeTable()

app.get('/', (req:Request, res:Response) => {
    const userLoggedIn:boolean = (typeof currentUser === 'number' && currentUser > -1)

    renderParams.hasLogin = userLoggedIn;
    renderParams.currentUsername = currentUsername; // currentUsername updates in authenticate()

    if (typeof getUserEntries() === 'string') {
        renderParams.entry = getUserEntries() as string;
    }
    else {
        renderParams.entry = '<p>No entry here</p>';
    }
    // check date
    // TODO: ability to change dates

    res.render('index.ejs', renderParams)
})

app.get('/register', (req:Request, res:Response) => {
    res.render('register.ejs', {registerSuccess : 0, hasLogin: renderParams.hasLogin})
})
app.post('/register', (req:Request, res:Response) => {
    const username = req.body.username;
    const password = req.body.password;

    const success = registerUser(username, password);

    const registerSuccess = (success) ? 1 : 2;

    res.render('register.ejs', { registerSuccess, hasLogin: renderParams.hasLogin })
})

app.get('/login', (req:Request, res:Response) => {
    if (typeof currentUser == 'number' && currentUser > -1) {
        res.render('logout.ejs')
    }
    else {
        res.render('login.ejs', {loginStatus : '', hasLogin : false})
    }
})

app.post('/login', (req:Request, res:Response) => {
    const username = req.body.username,
          password = req.body.password;

    const status:string = authenticate(username, password);

    res.render('login.ejs', {loginStatus : status, hasLogin : renderParams.hasLogin})
})

app.get('/logout', (req:Request, res:Response) => {
    currentUser = -1;
    currentUsername = '';

    res.render('login.ejs', {loginStatus : '<p>Successfully logged out</p>'})
})

app.post('/add_entry', async (req:Request, res:Response) => {
    const mdStr = req.body.entry;
    const htmlStr = await Promise.resolve(marked.parse(mdStr))

    newEntry(htmlStr)
    renderParams.entry = htmlStr;

    res.render('index', renderParams)
})

app.get('/about', (req:Request, res:Response) => {
    res.render('about', {hasLogin : renderParams.hasLogin})
})

app.get('/change_theme', (req:Request, res:Response) => {
    const theme = req.query.theme;
    
    print('theme:', theme)

    // TODO: change the css variables

    res.render('index', renderParams)
})

app.listen(port, () => {
    print(`Go to http://localhost:${port}`)
});

/* ------ */


// database schema
function makeTable() {
    const dbCreate1 = db.prepare(`
        CREATE TABLE if not exists "users" (
            "id"	INTEGER,
            "name"	TEXT,
            "hash"	TEXT,
            PRIMARY KEY("id" AUTOINCREMENT)
        )`)

    const dbCreate2 = db.prepare(`
        CREATE TABLE if not exists "entries" (
            "user_id"	INTEGER,
            "description"	TEXT,
            "tag"	TEXT,
            "date"	TEXT,
            FOREIGN KEY("user_id") REFERENCES "users"("id")
        )`)

    const dbCreate3 = db.prepare(`
        CREATE TABLE if not exists "tokens" (
        "id"	INTEGER,
        "token"	TEXT,
        PRIMARY KEY("id" AUTOINCREMENT)
        )`)

    dbCreate1.run();
    dbCreate2.run();
    dbCreate3.run();
}

function authenticate(username:string, password:string) {
    
    const checkId = getUserId(username) as number

    if (checkId === currentUser) {
        return `<p>You are already logged in!</p>`
    }
    if (checkId === -1){
        return `<p style='color: var(--red);'>User doesn't exist</p>`;
    }

    const row:userRow = db.prepare(`
            SELECT hash FROM users WHERE id = ?
        `).get(checkId) as userRow
        
    const isValid = bcrypt.compareSync(password, row.hash)

    if (!isValid) {
        return `<p style='color:var(--red);'>Wrong password</p>`;
    }

    currentUser = checkId;
    updateUsername();
    return `<p>Logged in successfully</p>`
}

function registerUser(username:string, password:string) {
    // first check for user

    const checkExisting = db.prepare('SELECT id FROM users WHERE name = ?').get(username)
    if (checkExisting !== undefined) {
        return false;
    }

    // create hash and insert
    const hash = hashSync(password, saltRounds)
    const create = db.prepare(`
        INSERT INTO 'users' (name,hash)
        VALUES (?,?)
    `).run(username,hash);

    console.log(`User id ${create.lastInsertRowid} created`)
    return true
}   



/**
 * gets the id of a user
 * @param name 
 * @returns number
 */
function getUserId(name:string) {
    const findId = db.prepare(`SELECT id FROM users 
                WHERE name = ?`);
    findId.pluck();

    const userId = findId.get(name)
    if (userId === undefined)
        return -1;

    return userId;
}

function updateUsername() {
    if (typeof currentUser !== 'number') {
        return;
    }
    const findName = db.prepare(`SELECT name FROM users WHERE id = ?`)
    
    currentUsername = findName.get(currentUser);
}

/**
 *  
 * @returns topmost entry for selectedDate 
 */
function getUserEntries() { 

    const stmt = db.prepare(`SELECT * FROM entries WHERE user_id = ? AND date = ?`).pluck()
    const entry = stmt.get(currentUser, selectedDate.toString())

    return entry;
}

function newEntry(entry:string) {
    if (typeof currentUser === 'number' && currentUser < 0 || typeof currentUser !== "number") 
        return false;

    // FIXME: add check for userId against existing ids in users table
    // otherwise foreign key constraint error


    const stmt = db.prepare(`INSERT INTO entries VALUES (?,?,?,?)`)
        .run(currentUser, entry, '', selectedDate.toString());

    print("New entry at:", stmt.lastInsertRowid)

}

function changeDate(date:string) {

}