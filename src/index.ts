import express, { type Application, type Request, type Response } from "express";
import ejs from 'ejs';
import {startOfMonth, getDayOfWeek, endOfMonth, today, getLocalTimeZone, CalendarDate} from '@internationalized/date';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt, { hashSync } from 'bcryptjs';
import cookies from 'cookies';
import { Statement } from "sqlite";

const saltRounds = 10;

const app:Application = express(),
      port = 8080,
      print = console.log

let todayDate = today(getLocalTimeZone());
let selectedDate = todayDate;
let currentUser:unknown = -1;
let currentUserName:unknown = "";

app.set('view engine', 'ejs')
app.use(express.static('static'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new Database('./database/diary.sqlite')

db.pragma('journal_mode = WAL');

const month = getMonth(selectedDate),
      year = selectedDate.year;

var renderParams = {
    hasLogin : false,
    month: month,
    day: selectedDate.day,
    year: year,
    daysString: makeCalendarDays(selectedDate),
    entry: "No entry here."
}

makeTable()

app.get('/', (req:Request, res:Response) => {

    res.render('index.ejs', renderParams)
})

app.get('/register', (req:Request, res:Response) => {
    res.render('register.ejs', {registerSuccess : 0})
})
app.post('/register', (req:Request, res:Response) => {
    const username = req.body.username;
    const password = req.body.password;

    const success = registerUser(username, password);

    const registerSuccess = (success) ? 1 : 2;

    res.render('register.ejs', {registerSuccess})
})

app.get('/login', (req:Request, res:Response) => {

    res.render('login.ejs')
})

app.post('/login', (req:Request, res:Response) => {
    const username = req.body.username,
          password = req.body.password;

    const status:string = authenticate(username, password);

    res.render('login.ejs')
})

app.post('/add_entry', (req:Request, res:Response) => {
    const entry = req.body.entry;
    const stmt = db.prepare(`INSERT INTO entries VALUES (?,?,?,?)`)
    
    // FIXME figure out how to get user

})

app.listen(port, () => {
    print(`Go to http://localhost:${port}`)
});

/* ------ */
/**
 * Generates HTML to represent days in the calendar
 * @param  date - current date
 * @returns raw HTML string of \<li>s to represent days
 */
function makeCalendarDays(date:CalendarDate) {
    let firstWeekday = calculateFirstWeekday(date)  // index 0
    let numDays = endOfMonth(date).day
    let string = ""
    let day = 1;

    for (let ptr = 0; day <= numDays; ptr++) {
        if (firstWeekday > ptr) {
            string += `<li></li>`
            continue;
        }

        if (day == date.day) {
            string += `<li id="today">${day}<span class="dot red"></span></li>`
        }
        else {
            string += `<li>${day}<span class="dot blank"></span></li>`
        }
        day++;
    }   
    return string
}

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
            "user_id"	INTEGER UNIQUE,
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
    
    const checkId = getUserId(username)

    if (checkId === currentUser) {
        return `<p>You are already logged in!</p>`
    }
    if (checkId === undefined){
        return `<p style='color: red;'>Can't login user: user doesn't exist</p>`;
    }

    const checkHash = db.prepare(`
            SELECT hash FROM users WHERE id = ?
        `).get(checkId)

    print(checkHash, typeof checkHash)

    if (checkHash === undefined) {
        return `<p style='color:red;'>Can't login user: wrong password</p>`;
    }

    currentUser = checkId;
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
 * Calculates the first weekday of the month of the date
 * @return weekday the month starts on.
 */
function calculateFirstWeekday(date: CalendarDate) {
    let day = getDayOfWeek(startOfMonth(date),'en-US');
    
    return day
}

/**
 * @param  date the date you're getting the month of
 * @return month name
 */
function getMonth(date :CalendarDate) {
    let month = date.month,
        string = ""
    if (typeof month !== 'number') return 'Error: not a CalendarDate object'

    switch (month) {
        case 1:
            string = 'January'
            break
        case 2:
            string = 'February'
            break
        case 3:
            string = 'March'
            break;
        case 4:
            string = 'April'
            break;
        case 5:
            string = 'May'
            break;
        case 6:
            string = 'June'
            break;
        case 7:
            string = 'July'
            break;
        case 8:
            string = 'August'
            break;
        case 9:
            string = 'September'
            break;
        case 10:
            string = 'October'
            break;
        case 11:
            string = 'November'
            break;
        case 12:
            string = 'December'
            break;
        default:
            string = "How did you get here???"
            break;
    }
    return string
}

/**
 * 
 * @param  day 
 * @returns weekday of day in string
 */
function getWeekday(day:number) {
    if (typeof day !== 'number') 
        return 'getWeekday needs a number; got ' + (typeof day);
    
    switch (day)
    {
        case 1:
            return 'Monday'
        case 2:
            return 'Tuesday'
        case 3:
            return 'Wednesday'
        case 4:
            return 'Thursday'
        case 5:
            return 'Friday'
        case 6:
            return 'Saturday'
        case 0:
            return 'Sunday'
    }
}

function getUserId(name:string) {
    const findId = db.prepare(`SELECT id FROM users 
                WHERE name = ?`);
                // FIXME very annoying type isues.
    const userId1 = findId.get(name);
    const userId = userId1['hash'];
    type idType = keyof userId1; 
    return userId;
}

function updateUserName(id:number) {
    const findName = db.prepare(`SELECT name FROM users WHERE id = ?`)
    
    currentUserName = findName.get(id);
}
/**
 *  
 * @returns first 50 records of entries 
 */
function getUserEntries() { //TODO: test

    const stmt = db.prepare(`SELECT TOP 50 * FROM entries WHERE id = ?`)
    const entries = stmt.all(currentUser)

    return;
}