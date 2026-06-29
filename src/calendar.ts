import {startOfMonth, getDayOfWeek, endOfMonth, today, getLocalTimeZone, CalendarDate} from '@internationalized/date';

/**
 * @param  date the date you're getting the month of
 * @return month name
 */
export function getMonth(date :CalendarDate) {
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
export function getWeekday(day:number) {
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

/**
 * Generates HTML to represent days in the calendar
 * @param  date - current date
 * @returns raw HTML string of \<li>s to represent days
 */
export function makeCalendarDays(date:CalendarDate) {
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
        // TODO: how do i check for previous entries and link them in this function?
        else {
            string += `<li>${day}<span class="dot blank"></span></li>`
        }
        day++;
    }   
    return string
}
/**
 * Calculates the first weekday of the month of the date
 * @return weekday the month starts on.
 */
export function calculateFirstWeekday(date: CalendarDate) {
    let day = getDayOfWeek(startOfMonth(date),'en-US');
    
    return day
}